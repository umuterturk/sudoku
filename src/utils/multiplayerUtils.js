// Multiplayer game utilities for Sudoku challenge mode
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebaseConfig.js';
import { generatePuzzle } from './sudokuUtils.js';
import { firestoreRateLimiter, withRateLimit } from './rateLimiter.js';

// Game room states
export const GAME_STATES = {
  WAITING: 'waiting',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  COMPLETED: 'completed',
  DISCONNECTED: 'disconnected',
  PLAYER_WON: 'player_won',
  PLAYER_LOST: 'player_lost',
  TIME_UP: 'time_up',
  DRAW: 'draw'
};

// Connection states
export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected'
};

// Generate a unique room ID
export const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Create a new game room
export const createGameRoom = async (playerName = 'Player 1') => {
  try {
    const roomId = generateRoomId();
    const gameData = await generatePuzzle('easy', true); // Always start with easy difficulty, pass multiplayer flag
    const currentTime = new Date();
    
    // Convert 2D arrays to flat arrays for Firebase compatibility
    const flatPuzzle = gameData.puzzle.flat();
    const flatSolution = gameData.solution.flat();
    
    // Count initial empty cells
    const countEmptyCells = (puzzle) => {
      let count = 0;
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (puzzle[row][col] === 0) {
            count++;
          }
        }
      }
      return count;
    };

    // Create room data with board and solution stored separately
    const roomData = {
      roomId,
      players: [{
        id: generatePlayerId(),
        name: playerName,
        progress: 0,
        completed: false,
        joinedAt: currentTime,
        hearts: 3 // Track hearts for each player
      }],
      difficulty: 'easy',
      gameState: GAME_STATES.WAITING,
      timer: 600, // 10 minutes in seconds
      gameStartTime: null, // Will be set when game actually starts
      createdAt: currentTime,
      lastActivity: currentTime,
      totalEmptyCells: countEmptyCells(gameData.puzzle) // Store initial empty cell count
    };

    // Store the board and solution in a separate document for initial sharing only
    const gameContentData = {
      gameBoard: flatPuzzle,
      solution: flatSolution,
      roomId: roomId
    };

    // Save both documents
    await Promise.all([
      withRateLimit(
        () => setDoc(doc(db, 'gameRooms', roomId), roomData),
        firestoreRateLimiter
      ),
      withRateLimit(
        () => setDoc(doc(db, 'gameContent', roomId), gameContentData),
        firestoreRateLimiter
      )
    ]);
    
    // Return the original 2D arrays for the app to use
    return {
      roomId,
      roomData: {
        ...roomData,
        gameBoard: gameData.puzzle,
        solution: gameData.solution
      }
    };
  } catch (error) {
    console.error('Failed to create game room:', error);
    throw error;
  }
};

// Store player data in localStorage
const storePlayerData = (roomId, playerId) => {
  try {
    localStorage.setItem('sudoku-player-data', JSON.stringify({
      roomId,
      playerId,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to store player data:', error);
  }
};

// Get stored player data
const getStoredPlayerData = () => {
  try {
    const data = localStorage.getItem('sudoku-player-data');
    if (!data) return null;
    
    const playerData = JSON.parse(data);
    // Only return data if it's less than 24 hours old
    if (Date.now() - playerData.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('sudoku-player-data');
      return null;
    }
    return playerData;
  } catch (error) {
    console.error('Failed to get player data:', error);
    return null;
  }
};

// Clear stored player data
export const clearPlayerData = () => {
  try {
    localStorage.removeItem('sudoku-player-data');
  } catch (error) {
    console.error('Failed to clear player data:', error);
  }
};

// Join an existing game room
export const joinGameRoom = async (roomId, playerName = 'Player 2') => {
  try {
    const roomRef = doc(db, 'gameRooms', roomId);
    const gameContentRef = doc(db, 'gameContent', roomId);
    
    // Fetch both room data and game content
    const [roomSnap, gameContentSnap] = await Promise.all([
      withRateLimit(() => getDoc(roomRef), firestoreRateLimiter),
      withRateLimit(() => getDoc(gameContentRef), firestoreRateLimiter)
    ]);
    
    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }
    
    if (!gameContentSnap.exists()) {
      throw new Error('Game content not found');
    }
    
    const roomData = roomSnap.data();
    const gameContentData = gameContentSnap.data();
    
    // Check for stored player data
    const storedData = getStoredPlayerData();
    const isRejoining = storedData && storedData.roomId === roomId;
    
    if (isRejoining) {
      // Find the player in the room
      const existingPlayer = roomData.players.find(p => p.id === storedData.playerId);
      if (existingPlayer) {
        console.log('🔄 Player rejoining room:', storedData.playerId);
        // Convert flat arrays back to 2D arrays for the app
        const gameBoard2D = flatArrayTo2D(gameContentData.gameBoard);
        const solution2D = flatArrayTo2D(gameContentData.solution);
        
        return {
          roomId,
          roomData: {
            ...roomData,
            gameBoard: gameBoard2D,
            solution: solution2D
          }
        };
      }
    }
    
    // For new players, check if room is full
    if (roomData.players.length >= 2) {
      throw new Error('Room is full');
    }
    
    // For new players, check if game has started
    if (roomData.gameState !== GAME_STATES.WAITING) {
      throw new Error('Game has already started');
    }
    
    const newPlayer = {
      id: generatePlayerId(),
      name: playerName,
      progress: 0,
      completed: false,
      joinedAt: new Date(),
      hearts: 3 // Track hearts for each player
    };
    
    await withRateLimit(
      () => updateDoc(roomRef, {
        players: [...roomData.players, newPlayer],
        lastActivity: new Date()
      }),
      firestoreRateLimiter
    );
    
    // Store player data for rejoining
    storePlayerData(roomId, newPlayer.id);
    
    // Convert flat arrays back to 2D arrays for the app
    const gameBoard2D = flatArrayTo2D(gameContentData.gameBoard);
    const solution2D = flatArrayTo2D(gameContentData.solution);
    
    return {
      roomId,
      roomData: { 
        ...roomData, 
        players: [...roomData.players, newPlayer],
        gameBoard: gameBoard2D,
        solution: solution2D
      }
    };
  } catch (error) {
    console.error('Failed to join game room:', error);
    throw error;
  }
};

// Start the game (begin countdown)
export const startGame = async (roomId) => {
  try {
    const roomRef = doc(db, 'gameRooms', roomId);
    
    await updateDoc(roomRef, {
      gameState: GAME_STATES.COUNTDOWN,
      countdownStart: new Date(),
      lastActivity: new Date()
    });
    
    // Start the actual game after 5 seconds
    setTimeout(async () => {
      const gameStartTime = new Date();
      await updateDoc(roomRef, {
        gameState: GAME_STATES.PLAYING,
        gameStartTime: gameStartTime,
        lastActivity: new Date()
      });
      
      // Set up 10-minute timer to end the game
      setTimeout(async () => {
        try {
          // Check if game is still playing before ending by timer
          const roomSnap = await getDoc(roomRef);
          if (roomSnap.exists()) {
            const roomData = roomSnap.data();
            if (roomData.gameState === GAME_STATES.PLAYING) {
              console.log('⏰ 10-minute timer expired, ending game by progress');
              await endGameByTimer(roomId);
            }
          }
        } catch (error) {
          console.error('Failed to end game by timer:', error);
        }
      }, 600000); // 10 minutes = 600,000 milliseconds
    }, 5000);
    
  } catch (error) {
    console.error('Failed to start game:', error);
    throw error;
  }
};

// Update player progress (lightweight - only progress and completion status)
export const updatePlayerProgress = async (roomId, playerId, progress, completed = false) => {
  try {
    const roomRef = doc(db, 'gameRooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }
    
    const roomData = roomSnap.data();
    const updatedPlayers = roomData.players.map(player => 
      player.id === playerId 
        ? { ...player, progress, completed }
        : player
    );
    
    await updateDoc(roomRef, {
      players: updatedPlayers,
      lastActivity: new Date()
    });
    
  } catch (error) {
    console.error('Failed to update player progress:', error);
    throw error;
  }
};

// Update player hearts and trigger heart lost event for opponent flash effect
export const updatePlayerHearts = async (roomId, playerId, hearts, previousHearts) => {
  try {
    const roomRef = doc(db, 'gameRooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }
    
    const roomData = roomSnap.data();
    
    // Check if this is a heart lost event (hearts decreased)
    const heartLost = previousHearts !== undefined && hearts < previousHearts;
    
    const updatedPlayers = roomData.players.map(player => {
      if (player.id === playerId) {
        return { 
          ...player, 
          hearts,
          heartLost: heartLost // Add flash trigger for opponent
        };
      } else if (heartLost) {
        // Clear any existing heartLost flag for other players
        return { ...player, heartLost: false };
      }
      return player;
    });
    
    await updateDoc(roomRef, {
      players: updatedPlayers,
      lastActivity: new Date()
    });
    
    // If heart was lost, clear the flash effect after a short delay
    if (heartLost) {
      setTimeout(async () => {
        try {
          const currentRoomSnap = await getDoc(roomRef);
          if (currentRoomSnap.exists()) {
            const currentRoomData = currentRoomSnap.data();
            const clearedPlayers = currentRoomData.players.map(player => ({
              ...player,
              heartLost: false
            }));
            
            await updateDoc(roomRef, {
              players: clearedPlayers,
              lastActivity: new Date()
            });
          }
        } catch (error) {
          console.error('Failed to clear heart lost flag:', error);
        }
      }, 1000); // Clear after 1 second
    }
    
  } catch (error) {
    console.error('Failed to update player hearts:', error);
    throw error;
  }
};

// Update game state only (no board data)
export const updateGameState = async (roomId, gameState, additionalData = {}) => {
  try {
    const roomRef = doc(db, 'gameRooms', roomId);
    
    await updateDoc(roomRef, {
      gameState,
      lastActivity: new Date(),
      ...additionalData
    });
    
  } catch (error) {
    console.error('Failed to update game state:', error);
    throw error;
  }
};

// Track player digit updates (lightweight - only row, col, value)
export const updatePlayerDigit = async (roomId, playerId, row, col, value, isCorrect) => {
  try {
    const roomRef = doc(db, 'gameRooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }
    
    const roomData = roomSnap.data();
    const updatedPlayers = roomData.players.map(player => {
      if (player.id === playerId) {
        return {
          ...player,
          lastMove: {
            row,
            col,
            value,
            isCorrect,
            timestamp: new Date()
          }
        };
      }
      return player;
    });
    
    await updateDoc(roomRef, {
      players: updatedPlayers,
      lastActivity: new Date()
    });
    
  } catch (error) {
    console.error('Failed to update player digit:', error);
    throw error;
  }
};

// DEPRECATED: updateGameBoard - no longer used for simplified multiplayer
// Only track player actions, not full game state
export const updateGameBoard = async (roomId, newBoard) => {
  console.warn('updateGameBoard is deprecated - use updatePlayerDigit instead');
  // This function is now a no-op to prevent storing full game state
  return Promise.resolve();
};

// Listen to room changes (lightweight - no board data)
export const subscribeToRoom = async (roomId, callback) => {
  const roomRef = doc(db, 'gameRooms', roomId);
  
  // Apply rate limiting before setting up the subscription
  await firestoreRateLimiter.throttle();
  
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds
  
  const setupSubscription = () => {
    return onSnapshot(
      roomRef,
      {
        includeMetadataChanges: true, // Include cache state changes
        next: (doc) => {
          if (doc.exists()) {
            const roomData = doc.data();
            // Reset retry count on successful update
            retryCount = 0;
            callback(roomData);
          } else {
            callback(null);
          }
        },
        error: async (error) => {
          console.error('Error listening to room:', error);
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying subscription (attempt ${retryCount}/${maxRetries})...`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            
            // Retry subscription
            return setupSubscription();
          } else {
            console.error('Max retries reached, subscription failed');
            callback(null, error);
          }
        }
      }
    );
  };
  
  return setupSubscription();
};

// Get game content (board and solution) - only call when needed
export const getGameContent = async (roomId) => {
  try {
    const gameContentRef = doc(db, 'gameContent', roomId);
    const gameContentSnap = await withRateLimit(
      () => getDoc(gameContentRef),
      firestoreRateLimiter
    );
    
    if (!gameContentSnap.exists()) {
      throw new Error('Game content not found');
    }
    
    const gameContentData = gameContentSnap.data();
    
    // Convert flat arrays back to 2D arrays for the app
    return {
      gameBoard: flatArrayTo2D(gameContentData.gameBoard),
      solution: flatArrayTo2D(gameContentData.solution)
    };
  } catch (error) {
    console.error('Failed to get game content:', error);
    throw error;
  }
};

// Clean up old rooms (optional cleanup function)
export const cleanupOldRooms = async () => {
  try {
    const roomsRef = collection(db, 'gameRooms');
    const q = query(
      roomsRef,
      where('lastActivity', '<', new Date(Date.now() - 24 * 60 * 60 * 1000)), // 24 hours ago
      orderBy('lastActivity'),
      limit(10)
    );
    
    // This would need to be implemented on the server side for security
    console.log('Cleanup function called - implement on server side');
  } catch (error) {
    console.error('Failed to cleanup old rooms:', error);
  }
};

// Generate a unique player ID
const generatePlayerId = () => {
  return 'player_' + Math.random().toString(36).substring(2, 15);
};

// Convert flat array to 2D array (9x9)
const flatArrayTo2D = (flatArray) => {
  if (!flatArray || flatArray.length !== 81) {
    console.warn('Invalid flat array for 2D conversion:', flatArray);
    return Array(9).fill().map(() => Array(9).fill(0));
  }
  
  const grid = [];
  for (let i = 0; i < 9; i++) {
    const row = [];
    for (let j = 0; j < 9; j++) {
      row.push(flatArray[i * 9 + j]);
    }
    grid.push(row);
  }
  return grid;
};

// Convert 2D array to flat array
const array2DToFlat = (grid2D) => {
  if (!grid2D || grid2D.length !== 9) {
    console.warn('Invalid 2D array for flat conversion:', grid2D);
    return Array(81).fill(0);
  }
  
  return grid2D.flat();
};

// Calculate progress percentage based on initial empty cells
export const calculateProgress = (grid, originalGrid, solution) => {
  if (!grid || !originalGrid || !solution) return 0;
  
  let correctCells = 0;
  let totalEmptyCells = 0;
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      // Only count cells that were initially empty
      if (originalGrid[row][col] === 0) {
        totalEmptyCells++;
        // Check if the player filled it correctly
        if (grid[row][col] === solution[row][col]) {
          correctCells++;
        }
      }
    }
  }
  
  return totalEmptyCells > 0 ? Math.round((correctCells / totalEmptyCells) * 100) : 0;
};

// End game with winner
export const endGameWithWinner = async (roomId, winnerId, reason = 'completion') => {
  try {
    const roomRef = doc(db, 'gameRooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }
    
    const roomData = roomSnap.data();
    const updatedPlayers = roomData.players.map(player => ({
      ...player,
      winner: player.id === winnerId,
      gameEndReason: reason
    }));
    
    await updateDoc(roomRef, {
      gameState: GAME_STATES.PLAYER_WON,
      players: updatedPlayers,
      winner: winnerId,
      gameEndReason: reason,
      gameEndTime: new Date(),
      lastActivity: new Date()
    });
    
  } catch (error) {
    console.error('Failed to end game with winner:', error);
    throw error;
  }
};

// End game with draw
export const endGameWithDraw = async (roomId, reason = 'time_up') => {
  try {
    const roomRef = doc(db, 'gameRooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }
    
    const roomData = roomSnap.data();
    const updatedPlayers = roomData.players.map(player => ({
      ...player,
      winner: false,
      gameEndReason: reason
    }));
    
    await updateDoc(roomRef, {
      gameState: GAME_STATES.DRAW,
      players: updatedPlayers,
      winner: null,
      gameEndReason: reason,
      gameEndTime: new Date(),
      lastActivity: new Date()
    });
    
  } catch (error) {
    console.error('Failed to end game with draw:', error);
    throw error;
  }
};

// Check game end conditions and handle accordingly
export const checkAndHandleGameEnd = async (roomId, players, gameContent = null) => {
  try {
    // Check if any player completed the game
    const completedPlayer = players.find(player => player.completed);
    if (completedPlayer) {
      await endGameWithWinner(roomId, completedPlayer.id, 'completion');
      return { ended: true, winner: completedPlayer.id, reason: 'completion' };
    }
    
    // Check if any player lost all hearts
    const playersWithHearts = players.filter(player => (player.hearts || 3) > 0);
    if (playersWithHearts.length === 1) {
      await endGameWithWinner(roomId, playersWithHearts[0].id, 'opponent_eliminated');
      return { ended: true, winner: playersWithHearts[0].id, reason: 'opponent_eliminated' };
    }
    
    // Check if all players lost all hearts
    if (playersWithHearts.length === 0) {
      await endGameWithDraw(roomId, 'all_eliminated');
      return { ended: true, winner: null, reason: 'all_eliminated' };
    }
    
    return { ended: false };
  } catch (error) {
    console.error('Failed to check game end conditions:', error);
    return { ended: false, error };
  }
};

// End game due to timer expiration
export const endGameByTimer = async (roomId) => {
  try {
    const roomRef = doc(db, 'gameRooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }
    
    const roomData = roomSnap.data();
    const players = roomData.players;
    
    // Find player with highest progress
    const sortedPlayers = [...players].sort((a, b) => (b.progress || 0) - (a.progress || 0));
    const highestProgress = sortedPlayers[0].progress || 0;
    const playersWithHighestProgress = sortedPlayers.filter(p => (p.progress || 0) === highestProgress);
    
    if (playersWithHighestProgress.length === 1) {
      // Single winner by progress
      await endGameWithWinner(roomId, playersWithHighestProgress[0].id, 'time_up_progress');
      return { ended: true, winner: playersWithHighestProgress[0].id, reason: 'time_up_progress' };
    } else {
      // Draw - equal progress
      await endGameWithDraw(roomId, 'time_up_draw');
      return { ended: true, winner: null, reason: 'time_up_draw' };
    }
  } catch (error) {
    console.error('Failed to end game by timer:', error);
    throw error;
  }
};

// Generate shareable invite link
export const generateInviteLink = (roomId) => {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?room=${roomId}`;
};

// Parse room ID from URL
export const parseRoomFromUrl = () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
  } catch (error) {
    console.error('Failed to parse room from URL:', error);
    return null;
  }
};

