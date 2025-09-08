import { GameManager } from './GameManager.js';
import { 
  createGameRoom, 
  joinGameRoom, 
  startGame, 
  startPlayingState,
  updatePlayerProgress, 
  updatePlayerHearts,
  updatePlayerDigit,
  subscribeToRoom, 
  calculateProgress,
  parseRoomFromUrl,
  clearPlayerData,
  checkAndHandleGameEnd,
  GAME_STATES,
  CONNECTION_STATES
} from '../utils/multiplayer/multiplayerUtils.js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig.js';
import {
  storeMultiplayerSession,
  getMultiplayerSession,
  clearMultiplayerSession,
  hasActiveMultiplayerSession,
  getStoredRoomId,
  updateMultiplayerSession,
  getMultiplayerGameTiming,
  isMultiplayerGameValid,
  storeMultiplayerGameTiming,
  getOrCreatePlayerId,
  storeMultiplayerLocalGameState,
  getMultiplayerLocalGameState,
  clearMultiplayerLocalGameState,
  hasMultiplayerLocalGameState,
  storeCompleteMultiplayerState,
  getCompleteMultiplayerState,
  updateCompleteMultiplayerState,
  clearCompleteMultiplayerState,
  hasCompleteMultiplayerState,
  getOpponentStateStructure,
  clearAllMultiplayerDataForRoom
} from '../utils/multiplayer/persistentStorage.js';

/**
 * Multiplayer Game Manager
 * Handles multiplayer-specific functionality like room management, real-time sync
 */
export class MultiplayerManager extends GameManager {
  constructor() {
    super();
    
    // Multiplayer-specific state
    this.multiplayerRoom = null;
    this.multiplayerPlayers = [];
    this.multiplayerGameState = GAME_STATES.WAITING;
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.currentPlayerId = null;
    this.isHost = false;
    this.multiplayerGameStartTime = null;
    this.multiplayerGameEndData = null;
    this.shouldAutoStart = false;
    this.countdownTimer = null;
    
    // Real-time subscription
    this.roomSubscription = null;
  }
  
  // Initialize with multiplayer-specific options
  initialize(gameState, gameLogic, timer, options = {}) {
    // Initialize base class with callbacks
    super.initialize(gameState, gameLogic, timer, {
      isSoundEnabled: options.isSoundEnabled !== undefined ? options.isSoundEnabled : true,
      onGameComplete: this.handleGameComplete.bind(this),
      onGameOver: this.handleGameOver.bind(this),
      onCorrectMove: this.handleCorrectMove.bind(this),
      onWrongMove: this.handleWrongMove.bind(this),
      isMultiplayer: true
    });
  }
  
  // Create a new multiplayer room
  async createRoom(playerName = 'Player 1') {
    try {
      console.log('🎮 Creating multiplayer challenge room...');
      
      this.connectionState = CONNECTION_STATES.CONNECTING;
      
      const { roomId, roomData } = await createGameRoom(playerName);
      
      // Separate room metadata from game content
      const { gameBoard, solution, ...roomMetadata } = roomData;
      this.multiplayerRoom = roomMetadata;
      this.multiplayerPlayers = roomData.players;
      this.currentPlayerId = roomData.players[0].id; // First player is host
      this.isHost = true;
      this.connectionState = CONNECTION_STATES.CONNECTED;
      
      // Initialize game state
      console.log('🎯 Initializing create room game state with:', {
        hasGameBoard: !!gameBoard,
        hasSolution: !!solution,
        difficulty: roomData.difficulty
      });
      this.gameState.initializeGame({
        puzzle: gameBoard,
        solution: solution,
        selectedDifficulty: roomData.difficulty
      });
      
      // Sync hearts with server data for the current player
      const currentPlayer = roomData.players.find(p => p.id === this.currentPlayerId);
      if (currentPlayer && currentPlayer.hearts !== undefined) {
        console.log('💖 Syncing hearts from server:', currentPlayer.hearts);
        this.gameState.setLives(currentPlayer.hearts);
      }
      
      // Store initial complete state when room is created
      this.storeInitialCompleteState(roomId, roomData, gameBoard, solution);
      
      console.log('✅ Create room game state initialized and complete state stored locally');
      
      // Don't start timer yet - wait for game to actually start
      this.timer.resetTimer(0);
      
      // Store initial complete state after timer setup
      this.updateCompleteLocalState();
      
      // Store session for game continuation
      storeMultiplayerSession(roomId, this.currentPlayerId, {
        isHost: true,
        gameState: GAME_STATES.WAITING
      });
      
      // Subscribe to room updates
      await this.subscribeToRoom();
      
      console.log('✅ Challenge room created:', roomId);
      return { roomId, roomData };
      
    } catch (error) {
      console.error('Failed to create challenge room:', error);
      this.connectionState = CONNECTION_STATES.DISCONNECTED;
      throw error;
    }
  }
  
  // Join an existing multiplayer room
  async joinRoom(roomId, playerName = 'Player 2') {
    try {
      console.log('🎮 Joining multiplayer room:', roomId);
      
      this.connectionState = CONNECTION_STATES.CONNECTING;
      
      const { roomData } = await joinGameRoom(roomId, playerName);
      
      // Separate room metadata from game content
      const { gameBoard, solution, ...roomMetadata } = roomData;
      this.multiplayerRoom = roomMetadata;
      this.multiplayerPlayers = roomData.players;
      
      // Find our player ID using the persistent player ID
      const persistentPlayerId = getOrCreatePlayerId();
      const ourPlayer = roomData.players.find(p => p.id === persistentPlayerId);
      
      if (!ourPlayer) {
        throw new Error('Player not found in room after joining');
      }
      
      this.currentPlayerId = ourPlayer.id;
      this.isHost = roomData.players[0].id === this.currentPlayerId;
      this.connectionState = CONNECTION_STATES.CONNECTED;
      
      // Try to get complete game state from local storage first
      let completeGameState = getCompleteMultiplayerState(roomId);
      
      if (completeGameState) {
        console.log('🎯 Using complete locally stored game state for room:', roomId);
        this.gameState.initializeGame({
          puzzle: completeGameState.originalGrid,
          solution: completeGameState.solution,
          selectedDifficulty: completeGameState.difficulty
        });
        
        // Restore the current progress and all game state
        if (completeGameState.grid && JSON.stringify(completeGameState.grid) !== JSON.stringify(completeGameState.originalGrid)) {
          console.log('🔄 Restoring complete game progress from local storage');
          this.gameState.setGrid(completeGameState.grid.map(row => [...row]));
        }
        
        // Restore additional game state
        if (completeGameState.selectedCell) {
          this.gameState.setSelectedCell(completeGameState.selectedCell);
        }
        if (completeGameState.selectedNumber) {
          this.gameState.setSelectedNumber(completeGameState.selectedNumber);
        }
        if (completeGameState.moveHistory) {
          this.gameState.setMoveHistory(completeGameState.moveHistory);
        }
        if (completeGameState.notes) {
          this.gameState.setNotes(completeGameState.notes);
        }
        if (completeGameState.isNotesMode !== undefined) {
          this.gameState.setIsNotesMode(completeGameState.isNotesMode);
        }
        if (completeGameState.undosUsed !== undefined) {
          this.gameState.setUndosUsed(completeGameState.undosUsed);
        }
        if (completeGameState.hearts !== undefined) {
          this.gameState.setLives(completeGameState.hearts);
        }
        
        // Restore timer if available
        if (completeGameState.timer !== undefined && this.timer) {
          this.timer.resetTimer(completeGameState.timer);
        }
        
        console.log('✅ Join room complete game state initialized from local storage');
        
        // Sync hearts with server data even when using local storage
        const currentPlayer = roomData.players.find(p => p.id === this.currentPlayerId);
        if (currentPlayer && currentPlayer.hearts !== undefined) {
          console.log('💖 Syncing hearts from server (local storage case):', currentPlayer.hearts);
          this.gameState.setLives(currentPlayer.hearts);
        }
        
        // Update complete state with current room data
        this.updateCompleteLocalState();
      } else {
        console.log('🎯 Initializing join room game state from server with:', {
          hasGameBoard: !!gameBoard,
          hasSolution: !!solution,
          difficulty: roomData.difficulty
        });
        this.gameState.initializeGame({
          puzzle: gameBoard,
          solution: solution,
          selectedDifficulty: roomData.difficulty
        });
        
        // Sync hearts with server data for the current player
        const currentPlayer = roomData.players.find(p => p.id === this.currentPlayerId);
        if (currentPlayer && currentPlayer.hearts !== undefined) {
          console.log('💖 Syncing hearts from server:', currentPlayer.hearts);
          this.gameState.setLives(currentPlayer.hearts);
        }
        
        // Store initial complete state when joining
        this.storeInitialCompleteState(roomId, roomData, gameBoard, solution);
        
        console.log('✅ Join room game state initialized from server and complete state stored locally');
      }
      
      // Don't start timer yet
      this.timer.resetTimer(0);
      
      // Store session for game continuation
      storeMultiplayerSession(roomId, this.currentPlayerId, {
        isHost: false,
        gameState: this.multiplayerGameState
      });
      
      // Subscribe to room updates
      await this.subscribeToRoom();
      
      console.log('✅ Joined room successfully');
      return { roomId, roomData };
      
    } catch (error) {
      console.error('Failed to join room:', error);
      this.connectionState = CONNECTION_STATES.DISCONNECTED;
      throw error;
    }
  }
  
  // Start the multiplayer game (host only)
  async startMultiplayerGame() {
    try {
      if (!this.multiplayerRoom || !this.isHost) {
        throw new Error('Only host can start the game');
      }
      
      console.log('🚀 Starting multiplayer game...');
      await startGame(this.multiplayerRoom.roomId);
      
    } catch (error) {
      console.error('Failed to start multiplayer game:', error);
      throw error;
    }
  }
  
  // Subscribe to room updates
  async subscribeToRoom() {
    if (!this.multiplayerRoom) return;
    
    console.log('🔗 Subscribing to multiplayer room updates...');
    
    try {
      this.roomSubscription = await subscribeToRoom(this.multiplayerRoom.roomId, (roomData, error) => {
        if (error) {
          console.error('Multiplayer room subscription error:', error);
          this.connectionState = CONNECTION_STATES.DISCONNECTED;
          return;
        }
        
        if (!roomData) {
          console.log('Room no longer exists');
          this.connectionState = CONNECTION_STATES.DISCONNECTED;
          return;
        }
        
        console.log('📡 Room update received:', {
          gameState: roomData.gameState,
          players: roomData.players.map(p => ({ 
            id: p.id, 
            name: p.name, 
            hearts: p.hearts, 
            progress: p.progress, 
            completed: p.completed,
            heartLost: p.heartLost 
          }))
        });
        
        // Update derived state
        this.multiplayerPlayers = roomData.players;
        this.multiplayerGameState = roomData.gameState;
        
        // Sync local game state hearts with server data for current player
        const currentPlayer = roomData.players.find(p => p.id === this.currentPlayerId);
        if (currentPlayer && currentPlayer.hearts !== undefined && this.gameState) {
          const serverHearts = currentPlayer.hearts;
          const localHearts = this.gameState.lives;
          // Only accept authoritative server decrease for our player
          if (serverHearts < localHearts) {
            console.log('💖 Applying server heart decrease (authoritative):', { serverHearts, localHearts });
            this.gameState.setLives(serverHearts);
          }
          // Never overwrite a local decrease with a higher server value; server will update after our write
        }
        
        // Handle game state changes
        this.handleGameStateChange(roomData);
        
        // Set flag to auto-start game when both players join (only if host and game is still waiting)
        if (this.isHost && roomData.gameState === GAME_STATES.WAITING && roomData.players.length === 2) {
          console.log('🚀 Both players joined, setting auto-start flag...');
          this.shouldAutoStart = true;
          // Immediately check and trigger auto-start
          this.checkAutoStart();
        }
      });
    } catch (error) {
      console.error('Failed to set up room subscription:', error);
      this.connectionState = CONNECTION_STATES.DISCONNECTED;
    }
  }
  
  // Handle game state changes from room updates
  handleGameStateChange(roomData) {
    switch (roomData.gameState) {
      case GAME_STATES.COUNTDOWN:
        console.log('⏰ Countdown started!');
        this.handleCountdownStart(roomData);
        // Update complete state with countdown info
        this.updateCompleteLocalState();
        break;
        
      case GAME_STATES.PLAYING:
        console.log('🎮 Game started!');
        this.timer.startTimer();
        
        // Clear any pending countdown timer
        if (this.countdownTimer) {
          clearTimeout(this.countdownTimer);
          this.countdownTimer = null;
        }
        
        // Set game start time for local timer calculation
        if (roomData.gameStartTime) {
          let startTime;
          if (roomData.gameStartTime.seconds) {
            // Firestore timestamp format
            startTime = new Date(roomData.gameStartTime.seconds * 1000);
          } else if (roomData.gameStartTime instanceof Date) {
            // Already a Date object
            startTime = roomData.gameStartTime;
          } else {
            // String format
            startTime = new Date(roomData.gameStartTime);
          }
          this.multiplayerGameStartTime = startTime;
          console.log('🕐 Game start time set:', startTime);
          
          // Ensure we have a stored timing window so session continuation works mid-game
          try {
            const existingTiming = getMultiplayerGameTiming(roomData.roomId);
            let endTime;
            if (roomData.gameEndTime) {
              if (roomData.gameEndTime.seconds) {
                endTime = new Date(roomData.gameEndTime.seconds * 1000);
              } else if (roomData.gameEndTime instanceof Date) {
                endTime = roomData.gameEndTime;
              } else {
                endTime = new Date(roomData.gameEndTime);
              }
            } else {
              // Provisional end time = start + 10 minutes (600s)
              endTime = new Date(startTime.getTime() + 600 * 1000);
            }
            // Store or refresh timing (if gameEndTime later updates, this will be overwritten)
            if (!existingTiming || (roomData.gameEndTime && existingTiming.gameEndTime < endTime)) {
              storeMultiplayerGameTiming(roomData.roomId, startTime, endTime);
            }
          } catch (timingErr) {
            console.warn('Failed to store provisional multiplayer timing:', timingErr);
          }
        }
        
        // Update complete state when game starts
        this.updateCompleteLocalState();
        break;
        
      case 'player_won':
      case 'draw':
      case 'time_up':
        console.log('🏁 Game ended:', roomData.gameState);
        this.timer.stopTimer();
        
        // Clear any pending countdown timer
        if (this.countdownTimer) {
          clearTimeout(this.countdownTimer);
          this.countdownTimer = null;
        }
        
        this.multiplayerGameEndData = {
          gameState: roomData.gameState,
          winner: roomData.winner,
          gameEndReason: roomData.gameEndReason,
          players: roomData.players
        };
        
        // Update complete state with end game data
        this.updateCompleteLocalState();
        
        // Clear player data when game ends
        clearPlayerData();
        break;
    }
  }
  
  // Handle countdown start - set up client-side timer to transition to playing
  handleCountdownStart(roomData) {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
    }
    
    // Calculate how much time is left in countdown
    let countdownStartTime;
    if (roomData.countdownStart) {
      if (roomData.countdownStart.seconds) {
        // Firestore timestamp format
        countdownStartTime = new Date(roomData.countdownStart.seconds * 1000);
      } else if (roomData.countdownStart instanceof Date) {
        // Already a Date object
        countdownStartTime = roomData.countdownStart;
      } else {
        // String format
        countdownStartTime = new Date(roomData.countdownStart);
      }
      
      const now = new Date();
      const elapsed = Math.floor((now - countdownStartTime) / 1000);
      const remaining = Math.max(0, 5 - elapsed); // 5 second countdown
      
      console.log(`⏱️ Countdown: ${remaining} seconds remaining`);
      
      if (remaining > 0) {
        // Set timer for remaining time
        this.countdownTimer = setTimeout(async () => {
          console.log('⏰ Countdown complete, transitioning to playing state');
          try {
            await startPlayingState(this.multiplayerRoom.roomId);
          } catch (error) {
            console.error('Failed to transition to playing state:', error);
          }
          this.countdownTimer = null;
        }, remaining * 1000);
      } else {
        // Countdown already finished, immediately transition to playing
        console.log('⏰ Countdown already finished, transitioning to playing state immediately');
        setTimeout(async () => {
          try {
            await startPlayingState(this.multiplayerRoom.roomId);
          } catch (error) {
            console.error('Failed to transition to playing state:', error);
          }
        }, 100);
      }
    }
  }
  
  // Check if should auto-start and do it
  checkAutoStart() {
    if (this.shouldAutoStart && this.isHost && this.multiplayerRoom) {
      console.log('🚀 Auto-starting multiplayer game...');
      this.startMultiplayerGame();
      this.shouldAutoStart = false;
    }
  }
  
  // After move hook from GameManager
  async afterDigitPlacement({ digit, row = null, col = null, success = true }) {
    // Update complete local state on every move
    this.updateCompleteLocalState();
    
    // Update multiplayer if we have room data
    if (this.multiplayerRoom && this.currentPlayerId) {
      try {
        const [actualRow, actualCol] = row !== null && col !== null 
          ? [row, col] 
          : this.gameState.selectedCell || [null, null];
          
        if (actualRow !== null && actualCol !== null) {
          const isCorrect = digit === 0 || (this.gameState.solution && digit === this.gameState.solution[actualRow][actualCol]);
          await updatePlayerDigit(this.multiplayerRoom.roomId, this.currentPlayerId, actualRow, actualCol, digit, isCorrect);
        }
        
        // Update progress for successful moves
        if (success) {
          await this.updateProgress();
        }
        
        // Update hearts for both successful and unsuccessful moves
        // This ensures wrong moves are reflected on the server
        await this.updateHearts();
      } catch (error) {
        console.warn('Failed to update multiplayer digit:', error);
        // Continue with local game - don't block the user
      }
    }
  }
  
  // Update the complete local state storage with all game info
  updateCompleteLocalState() {
    if (!this.multiplayerRoom || !this.gameState.grid || !this.gameState.originalGrid || !this.gameState.solution || !this.isInitialized) {
      return;
    }
    
    try {
      const completeState = {
        // Server game info
        gameId: this.multiplayerRoom.gameId,
        difficulty: this.multiplayerRoom.difficulty,
        extraReveals: this.multiplayerRoom.extraReveals,
        gameState: this.multiplayerGameState,
        timer: this.timer ? this.timer.timer : 600,
        gameStartTime: this.multiplayerGameStartTime ? this.multiplayerGameStartTime.toISOString() : null,
        gameEndTime: this.multiplayerRoom.gameEndTime ? this.safeDateToISOString(this.multiplayerRoom.gameEndTime) : null,
        
        // Complete game grids
        grid: this.gameState.grid.map(row => [...row]),
        originalGrid: this.gameState.originalGrid.map(row => [...row]),
        solution: this.gameState.solution.map(row => [...row]),
        
        // Player state
        currentPlayerId: this.currentPlayerId,
        isHost: this.isHost,
        hearts: this.gameState.lives,
        progress: this.calculateCurrentProgress(),
        completed: this.gameState.gameStatus === 'completed',
        
        // Game state details
        selectedCell: this.gameState.selectedCell,
        selectedNumber: this.gameState.selectedNumber,
        moveHistory: this.gameState.moveHistory,
        undosUsed: this.gameState.undosUsed,
        notes: this.gameState.notes,
        isNotesMode: this.gameState.isNotesMode,
        
        // Multiplayer specific
        players: this.multiplayerPlayers,
        connectionState: this.connectionState,
        multiplayerGameEndData: this.multiplayerGameEndData
      };
      
      storeCompleteMultiplayerState(this.multiplayerRoom.roomId, completeState);
    } catch (error) {
      console.warn('Failed to update complete local state:', error);
    }
  }
  
  // Helper method to calculate current progress
  calculateCurrentProgress() {
    if (!this.gameState.grid || !this.gameState.originalGrid || !this.gameState.solution) {
      return 0;
    }
    
    let correctCells = 0;
    let totalEmptyCells = 0;
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.gameState.originalGrid[row][col] === 0) {
          totalEmptyCells++;
          if (this.gameState.grid[row][col] === this.gameState.solution[row][col]) {
            correctCells++;
          }
        }
      }
    }
    
    return totalEmptyCells > 0 ? Math.round((correctCells / totalEmptyCells) * 100) : 0;
  }
  
  // Helper method to safely convert date to ISO string
  safeDateToISOString(dateValue) {
    if (!dateValue) return null;
    
    try {
      let date;
      if (dateValue.seconds) {
        // Firestore timestamp format
        date = new Date(dateValue.seconds * 1000);
      } else if (dateValue instanceof Date) {
        // Already a Date object
        date = dateValue;
      } else {
        // String or other format
        date = new Date(dateValue);
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date value:', dateValue);
        return null;
      }
      
      return date.toISOString();
    } catch (error) {
      console.warn('Error converting date to ISO string:', error, 'Value:', dateValue);
      return null;
    }
  }
  
  // Helper method to store initial complete state when creating/joining room
  storeInitialCompleteState(roomId, roomData, gameBoard, solution) {
    try {
      const initialState = {
        // Server game info
        gameId: roomData.gameId || null,
        difficulty: roomData.difficulty || 'easy',
        extraReveals: roomData.extraReveals || [],
        gameState: roomData.gameState || GAME_STATES.WAITING,
        timer: 600,
        gameStartTime: null,
        gameEndTime: null,
        
        // Complete game grids
        grid: gameBoard.map(row => [...row]),
        originalGrid: gameBoard.map(row => [...row]),
        solution: solution.map(row => [...row]),
        
        // Player state
        currentPlayerId: this.currentPlayerId,
        isHost: this.isHost,
        hearts: this.gameState ? this.gameState.lives : 3,
        progress: 0,
        completed: false,
        
        // Game state details
        selectedCell: null,
        selectedNumber: null,
        moveHistory: [],
        undosUsed: 0,
        notes: Array(9).fill().map(() => Array(9).fill().map(() => new Set())),
        isNotesMode: false,
        
        // Multiplayer specific
        players: roomData.players || [],
        connectionState: this.connectionState,
        multiplayerGameEndData: null
      };
      
      storeCompleteMultiplayerState(roomId, initialState);
      console.log('💾 Initial complete state stored for room:', roomId);
    } catch (error) {
      console.error('Failed to store initial complete state:', error);
    }
  }
  
  // Legacy method for backward compatibility
  updateLocalGameState() {
    this.updateCompleteLocalState();
  }
  
  // After undo hook from GameManager
  async afterUndo() {
    // Update complete local state after undo
    this.updateCompleteLocalState();
    
    // Update progress after undo if we have room data
    if (this.multiplayerRoom && this.currentPlayerId) {
      try {
        await this.updateProgress();
      } catch (error) {
        console.warn('Failed to update progress after undo:', error);
      }
    }
  }
  
  // Update multiplayer progress
  async updateProgress() {
    if (!this.multiplayerRoom || !this.currentPlayerId || !this.gameState.solution) return;
    
    const progress = calculateProgress(this.gameState.grid, this.gameState.originalGrid, this.gameState.solution);
    const isCompleted = this.gameState.gameStatus === 'completed';
    
    console.log('📊 Updating progress:', {
      currentPlayerId: this.currentPlayerId,
      progress,
      isCompleted,
      gameStatus: this.gameState.gameStatus
    });
    
    try {
      await updatePlayerProgress(this.multiplayerRoom.roomId, this.currentPlayerId, progress, isCompleted);
      
      // Update local players array with new progress and completion status
      this.multiplayerPlayers = this.multiplayerPlayers.map(player => {
        if (player.id === this.currentPlayerId) {
          return { ...player, progress, completed: isCompleted };
        }
        return player;
      });
      
      // Check if this completion wins the game
      if (isCompleted) {
        console.log('🏆 Player completed the board - checking for win!');
        const gameEndResult = await checkAndHandleGameEnd(this.multiplayerRoom.roomId, this.multiplayerPlayers);
        if (gameEndResult.ended) {
          console.log('🎉 Game ended:', gameEndResult);
        }
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }
  
  // Update player hearts
  async updateHearts() {
    if (!this.multiplayerRoom || !this.currentPlayerId) return;
    
    try {
      // Find current player in the room data to get their previous hearts
      const currentPlayer = this.multiplayerPlayers.find(p => p.id === this.currentPlayerId);
      const previousHearts = currentPlayer ? currentPlayer.hearts : 3;
      
      console.log('💔 Updating hearts:', {
        currentPlayerId: this.currentPlayerId,
        previousHearts,
        newHearts: this.gameState.lives,
        heartLost: this.gameState.lives < previousHearts
      });
      
      await updatePlayerHearts(this.multiplayerRoom.roomId, this.currentPlayerId, this.gameState.lives, previousHearts);
      
      // Update local players array with new hearts value
      this.multiplayerPlayers = this.multiplayerPlayers.map(player => {
        if (player.id === this.currentPlayerId) {
          return { ...player, hearts: this.gameState.lives };
        }
        return player;
      });
      
      // Check if losing all hearts ends the game
  if (this.gameState.lives < 0) {
        console.log('💔 Player lost all hearts - checking for game end!', {
          currentLives: this.gameState.lives,
          roomId: this.multiplayerRoom.roomId,
          currentPlayerId: this.currentPlayerId
        });
        
        // Get fresh room data to ensure we have the latest player hearts
        const roomRef = doc(db, 'gameRooms', this.multiplayerRoom.roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
          const roomData = roomSnap.data();
          console.log('📊 Room data for game end check:', {
            players: roomData.players.map(p => ({ id: p.id, hearts: p.hearts, name: p.name })),
            gameState: roomData.gameState
          });
          
          const gameEndResult = await checkAndHandleGameEnd(this.multiplayerRoom.roomId, roomData.players);
          console.log('🎯 Game end result:', gameEndResult);
          
          if (gameEndResult.ended) {
            console.log('🎉 Game ended:', gameEndResult);
          } else {
            console.log('⚠️ Game end check returned false - game should continue');
          }
        } else {
          console.error('❌ Room not found when checking game end');
        }
      }
    } catch (error) {
      console.error('Failed to update player hearts:', error);
    }
  }
  
  // Handle game completion
  async handleGameComplete(grid) {
    console.log('🏆 Game completed! Broadcasting to other players...');
    // Don't stop timer - multiplayer timer is managed by server
    await this.updateProgress(); // Sync completion with other players
  }
  
  // Handle game over
  async handleGameOver() {
    // Set game status to game-over locally
    this.gameState.setGameStatus('game-over');
    // Don't stop timer - multiplayer timer is managed by server
    
    // Also trigger game end logic to ensure opponent sees game won screen
    if (this.multiplayerRoom && this.currentPlayerId) {
      try {
        console.log('💔 Game over triggered - ensuring game end logic runs');
        // Get fresh room data to ensure we have the latest player hearts
        const roomRef = doc(db, 'gameRooms', this.multiplayerRoom.roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
          const roomData = roomSnap.data();
          const gameEndResult = await checkAndHandleGameEnd(this.multiplayerRoom.roomId, roomData.players);
          if (gameEndResult.ended) {
            console.log('🎉 Game ended from handleGameOver:', gameEndResult);
          }
        }
      } catch (error) {
        console.error('Failed to trigger game end from handleGameOver:', error);
      }
    }
  }
  
  // Handle correct/wrong moves
  async handleCorrectMove(row, col, digit) {
    console.log('✅ Correct move made, updating progress...', { row, col, digit });
    
    // Note: SharedGameLogic.handleCorrectMove is already called by the base GameManager.handleDigitPlacement
    // We just need to update multiplayer state here
    
    // Update multiplayer state
    await this.updateProgress();
    this.updateCompleteLocalState();
  }

  async handleWrongMove(row, col) {
    console.log('❌ Wrong move made, updating hearts...', { row, col });
    
    // Note: SharedGameLogic.handleWrongMove is already called by the base GameManager.handleDigitPlacement
    // We just need to update multiplayer state here
    
    // Update multiplayer state
    await this.updateHearts();
    this.updateCompleteLocalState();
  }
  
  // Exit multiplayer mode
  exitMultiplayer() {
    console.log('🚪 Exiting multiplayer mode...');
    
    this.multiplayerRoom = null;
    this.multiplayerPlayers = [];
    this.currentPlayerId = null;
    this.isHost = false;
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.multiplayerGameState = GAME_STATES.WAITING;
    this.multiplayerGameEndData = null;
    this.multiplayerGameStartTime = null;
    this.shouldAutoStart = false;
    
    // Clear player data from localStorage
    clearPlayerData();
    
    // Unsubscribe from room updates
    if (this.roomSubscription && typeof this.roomSubscription === 'function') {
      this.roomSubscription();
      this.roomSubscription = null;
    }
  }
  
  // Parse room ID from URL
  parseRoomFromUrl() {
    return parseRoomFromUrl();
  }
  
  // Multiplayer doesn't support pause/resume in the traditional sense
  pauseGame() {
    console.log('Pause not supported in multiplayer mode');
  }
  
  resumeGame() {
    console.log('Resume not supported in multiplayer mode');
  }
  
  // Multiplayer doesn't support traditional new game
  async startNewGame(difficulty) {
    console.log('Use createRoom() or joinRoom() for multiplayer games');
    return false;
  }
  
  // Check if there's an active multiplayer session to continue
  hasActiveSession() {
    return hasActiveMultiplayerSession();
  }
  
  // Get stored room ID from session
  getStoredRoomId() {
    return getStoredRoomId();
  }
  
  // Continue an existing session by rejoining the room
  async continueSession() {
    try {
      const session = getMultiplayerSession();
      if (!session) {
        throw new Error('No active session found');
      }
      
      // Check if the game is still valid (not expired)
      if (!isMultiplayerGameValid(session.roomId)) {
        console.log('🕐 Previous game session has expired');
        clearMultiplayerSession();
        throw new Error('Game session has expired');
      }
      
      console.log('🔄 Continuing multiplayer session:', session.roomId);
      
      // Try to rejoin the room
      await this.joinRoom(session.roomId, `Player (returning)`);
      
      return { roomId: session.roomId };
    } catch (error) {
      console.error('Failed to continue session:', error);
      // Clear invalid session
      clearMultiplayerSession();
      throw error;
    }
  }
  
  // Get multiplayer-specific state
  getMultiplayerState() {
    return {
      multiplayerRoom: this.multiplayerRoom,
      multiplayerPlayers: this.multiplayerPlayers,
      multiplayerGameState: this.multiplayerGameState,
      connectionState: this.connectionState,
      currentPlayerId: this.currentPlayerId,
      isHost: this.isHost,
      multiplayerGameStartTime: this.multiplayerGameStartTime,
      multiplayerGameEndData: this.multiplayerGameEndData
    };
  }
  
  // Fetch only opponent state from server (for rejoin)
  async fetchOpponentStateOnly(roomId) {
    try {
      console.log('🚀 Fetching opponent state from server...');
      
      // Subscribe to room to get current opponent data
      const roomRef = doc(db, 'gameRooms', roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room no longer exists');
      }
      
      const roomData = roomSnap.data();
      
      // Extract opponent data
      const opponentData = getOpponentStateStructure(roomData.players, this.currentPlayerId);
      
      if (opponentData) {
        // Update our local players array with fresh opponent data
        this.multiplayerPlayers = this.multiplayerPlayers.map(player => {
          if (player.id === opponentData.id) {
            return { ...player, ...opponentData };
          }
          return player;
        });
        
        // If opponent not in our local list, add them
        if (!this.multiplayerPlayers.find(p => p.id === opponentData.id)) {
          this.multiplayerPlayers.push(opponentData);
        }
        
        console.log('✅ Opponent state updated:', opponentData);
      }
      
      // Update room-level state if it has changed
      this.multiplayerGameState = roomData.gameState;
      
      // Subscribe to ongoing updates
      await this.subscribeToRoom();
      
      console.log('✅ Opponent state fetched and subscription established');
    } catch (error) {
      console.error('Failed to fetch opponent state:', error);
      // Don't throw - opponent data is non-critical for continuing the game
    }
  }
  
  // Exit multiplayer and clear session
  exitMultiplayer() {
    console.log('🚪 Exiting multiplayer mode');
    clearMultiplayerSession();
    this.cleanup();
  }
  
  // Cleanup
  cleanup() {
    super.cleanup();
    
    // Clear all local data if we have a room
    if (this.multiplayerRoom?.roomId) {
      clearAllMultiplayerDataForRoom(this.multiplayerRoom.roomId);
    }
    
    // Clear countdown timer
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    
    // Unsubscribe from room updates
    if (this.roomSubscription && typeof this.roomSubscription === 'function') {
      this.roomSubscription();
      this.roomSubscription = null;
    }
    
    // Reset multiplayer state
    this.multiplayerRoom = null;
    this.multiplayerPlayers = [];
    this.multiplayerGameState = GAME_STATES.WAITING;
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.currentPlayerId = null;
    this.isHost = false;
    this.multiplayerGameStartTime = null;
    this.multiplayerGameEndData = null;
    this.shouldAutoStart = false;
  }
}
