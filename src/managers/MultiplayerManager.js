import { GameManager } from './GameManager.js';
import { 
  createGameRoom, 
  joinGameRoom, 
  startGame, 
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
    
    // Real-time subscription
    this.roomSubscription = null;
  }
  
  // Initialize with multiplayer-specific options
  initialize(gameState, gameLogic, timer, options = {}) {
    super.initialize(gameState, gameLogic, timer);
    
    // Set up game logic options for multiplayer
    if (this.gameLogic) {
      this.gameLogic.options = {
        ...this.gameLogic.options,
        isSoundEnabled: options.isSoundEnabled !== undefined ? options.isSoundEnabled : true,
        onGameComplete: this.handleGameComplete.bind(this),
        onGameOver: this.handleGameOver.bind(this),
        onCorrectMove: this.handleCorrectMove.bind(this),
        onWrongMove: this.handleWrongMove.bind(this),
        isMultiplayer: true
      };
    }
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
      this.gameState.initializeGame({
        puzzle: gameBoard,
        solution: solution,
        selectedDifficulty: roomData.difficulty
      });
      
      // Don't start timer yet - wait for game to actually start
      this.timer.resetTimer(0);
      
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
      
      // Find our player ID (we might not always be player 2)
      const ourPlayer = roomData.players[roomData.players.length - 1];
      this.currentPlayerId = ourPlayer.id;
      this.isHost = false;
      this.connectionState = CONNECTION_STATES.CONNECTED;
      
      // Initialize game state
      this.gameState.initializeGame({
        puzzle: gameBoard,
        solution: solution,
        selectedDifficulty: roomData.difficulty
      });
      
      // Don't start timer yet
      this.timer.resetTimer(0);
      
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
        
        console.log('📡 Room update received:', roomData);
        
        // Update derived state
        this.multiplayerPlayers = roomData.players;
        this.multiplayerGameState = roomData.gameState;
        
        // Handle game state changes
        this.handleGameStateChange(roomData);
        
        // Set flag to auto-start game when both players join (only if host and game is still waiting)
        if (this.isHost && roomData.gameState === GAME_STATES.WAITING && roomData.players.length === 2) {
          console.log('🚀 Both players joined, setting auto-start flag...');
          this.shouldAutoStart = true;
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
        break;
        
      case GAME_STATES.PLAYING:
        console.log('🎮 Game started!');
        this.timer.startTimer();
        
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
        }
        break;
        
      case 'player_won':
      case 'draw':
      case 'time_up':
        console.log('🏁 Game ended:', roomData.gameState);
        this.timer.stopTimer();
        this.multiplayerGameEndData = {
          gameState: roomData.gameState,
          winner: roomData.winner,
          gameEndReason: roomData.gameEndReason,
          players: roomData.players
        };
        
        // Clear player data when game ends
        clearPlayerData();
        break;
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
  
  // Handle digit placement with multiplayer sync
  async handleDigitPlacement(digit, row = null, col = null) {
    const result = await super.handleDigitPlacement(digit, row, col);
    
    // Update multiplayer if successful and we have room data
    if (result && this.multiplayerRoom && this.currentPlayerId) {
      try {
        const [actualRow, actualCol] = row !== null && col !== null 
          ? [row, col] 
          : this.gameState.selectedCell || [null, null];
          
        if (actualRow !== null && actualCol !== null) {
          const isCorrect = digit === 0 || (this.gameState.solution && digit === this.gameState.solution[actualRow][actualCol]);
          await updatePlayerDigit(this.multiplayerRoom.roomId, this.currentPlayerId, actualRow, actualCol, digit, isCorrect);
        }
      } catch (error) {
        console.warn('Failed to update multiplayer digit:', error);
        // Continue with local game - don't block the user
      }
    }
    
    return result;
  }
  
  // Update multiplayer progress
  async updateProgress() {
    if (!this.multiplayerRoom || !this.currentPlayerId || !this.gameState.solution) return;
    
    const progress = calculateProgress(this.gameState.grid, this.gameState.originalGrid, this.gameState.solution);
    const isCompleted = this.isGameComplete() && this.gameState.gameStatus === 'completed';
    
    try {
      await updatePlayerProgress(this.multiplayerRoom.roomId, this.currentPlayerId, progress, isCompleted);
      
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
      await updatePlayerHearts(this.multiplayerRoom.roomId, this.currentPlayerId, this.gameState.lives, this.gameState.previousLives);
      
      // Check if losing all hearts ends the game
      if (this.gameState.lives <= 0) {
        console.log('💔 Player lost all hearts - checking for game end!');
        const gameEndResult = await checkAndHandleGameEnd(this.multiplayerRoom.roomId, this.multiplayerPlayers);
        if (gameEndResult.ended) {
          console.log('🎉 Game ended:', gameEndResult);
        }
      }
    } catch (error) {
      console.error('Failed to update player hearts:', error);
    }
  }
  
  // Handle game completion
  handleGameComplete(grid) {
    // Don't stop timer - multiplayer timer is managed by server
    this.updateProgress(); // Sync completion with other players
  }
  
  // Handle game over
  handleGameOver() {
    // Don't stop timer - multiplayer timer is managed by server
    this.updateHearts(); // Sync hearts with other players
  }
  
  // Handle correct/wrong moves
  handleCorrectMove(row, col, digit) {
    this.updateProgress();
  }
  
  handleWrongMove(row, col) {
    this.updateHearts();
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
  
  // Cleanup
  cleanup() {
    super.cleanup();
    
    // Unsubscribe from room updates
    if (this.roomSubscription && typeof this.roomSubscription === 'function') {
      this.roomSubscription();
      this.roomSubscription = null;
    }
  }
}
