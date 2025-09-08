// Multiplayer game utilities for Sudoku challenge mode
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebaseConfig.js';
import { generatePuzzle, loadPuzzleDatabase, isValidMove } from '../shared/sudokuUtils.js';
import { firestoreRateLimiter, withRateLimit } from './rateLimiter.js';
import { getOrCreatePlayerId, storeMultiplayerGameTiming } from './persistentStorage.js';

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

// Select a random game ID from the easy puzzle database
const selectRandomGameId = async (difficulty = 'easy') => {
  try {
    const puzzleDatabase = await loadPuzzleDatabase(difficulty);
    if (!puzzleDatabase || puzzleDatabase.length === 0) {
      throw new Error(`No puzzles available for difficulty: ${difficulty}`);
    }
    return Math.floor(Math.random() * puzzleDatabase.length);
  } catch (error) {
    console.error('Failed to select random game ID:', error);
    throw error;
  }
};

// Select extra reveals for multiplayer (cells with least information)
const selectExtraReveals = async (gameId, difficulty = 'easy', count = 7) => {
  try {
    const puzzleDatabase = await loadPuzzleDatabase(difficulty);
    if (!puzzleDatabase || gameId >= puzzleDatabase.length) {
      throw new Error('Invalid game ID or puzzle database');
    }
    
    const puzzleEntry = puzzleDatabase[gameId];
    const [puzzleString] = puzzleEntry;
    const originalPuzzle = stringToGrid(puzzleString);
    
    // Find cells with least information (most constrained)
    const emptyCells = [];
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (originalPuzzle[row][col] === 0) {
          const possibilities = [];
          
          // Check each number 1-9 to see if it's valid in this position
          for (let num = 1; num <= 9; num++) {
            if (isValidMove(originalPuzzle, row, col, num)) {
              possibilities.push(num);
            }
          }
          
          emptyCells.push({ 
            row, 
            col, 
            flatIndex: row * 9 + col,
            possibilityCount: possibilities.length,
            possibilities
          });
        }
      }
    }
    
    // Sort by least possibilities (most constrained cells)
    emptyCells.sort((a, b) => a.possibilityCount - b.possibilityCount);
    
    // Select the first 'count' cells with least information
    const selectedCells = emptyCells.slice(0, count);
    
    console.log(`🎯 Selected ${selectedCells.length} cells with least information for extra reveals:`);
    selectedCells.forEach((cell, index) => {
      console.log(`  ${index + 1}. Cell [${cell.row},${cell.col}] (index ${cell.flatIndex}) - ${cell.possibilityCount} possibilities`);
    });
    
    return selectedCells.map(cell => cell.flatIndex);
  } catch (error) {
    console.error('Failed to select extra reveals:', error);
    throw error;
  }
};

// Generate a complete game from game ID and extra reveals
const generateGameFromId = async (gameId, difficulty = 'easy', extraReveals = []) => {
  try {
    const puzzleDatabase = await loadPuzzleDatabase(difficulty);
    if (!puzzleDatabase || gameId >= puzzleDatabase.length) {
      throw new Error('Invalid game ID or puzzle database');
    }
    
    const puzzleEntry = puzzleDatabase[gameId];
    const [puzzleString, solutionString] = puzzleEntry;
    
    // Convert to 2D grids
    const originalPuzzle = stringToGrid(puzzleString);
    const solution = stringToGrid(solutionString);
    
    // Create a copy of the original puzzle to modify
    const puzzle = originalPuzzle.map(row => [...row]);
    
    // Apply extra reveals
    extraReveals.forEach(flatIndex => {
      const row = Math.floor(flatIndex / 9);
      const col = flatIndex % 9;
      
      // Only reveal if the cell was originally empty
      if (row >= 0 && row < 9 && col >= 0 && col < 9 && originalPuzzle[row][col] === 0) {
        puzzle[row][col] = solution[row][col];
      }
    });
    
    console.log(`🎮 Generated game from ID ${gameId} with ${extraReveals.length} extra reveals`);
    
    return {
      puzzle,
      solution
    };
  } catch (error) {
    console.error('Failed to generate game from ID:', error);
    throw error;
  }
};

// Create a new game room with minimal data (game ID and extra reveals only)
export const createGameRoom = async (playerName = 'Player 1') => {
  try {
    const roomId = generateRoomId();
    const difficulty = 'easy'; // Always use easy for multiplayer
    const currentTime = new Date();
    
    // Select a random game from the easy database
    const gameId = await selectRandomGameId(difficulty);
    const extraReveals = await selectExtraReveals(gameId, difficulty);
    
    // Generate the complete game data locally for return
    const gameData = await generateGameFromId(gameId, difficulty, extraReveals);
    
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

    // Create room data with minimal game info
    const roomData = {
      roomId,
      players: [{
        id: getOrCreatePlayerId(),
        name: playerName,
        progress: 0,
        completed: false,
        joinedAt: currentTime,
        hearts: 3 // Track hearts for each player
      }],
      difficulty,
      gameState: GAME_STATES.WAITING,
      timer: 600, // 10 minutes in seconds
      gameStartTime: null, // Will be set when game actually starts
      createdAt: currentTime,
      lastActivity: currentTime,
      totalEmptyCells: countEmptyCells(gameData.puzzle), // Store initial empty cell count
      // New minimal game data structure
      gameId, // Index in the easy puzzles array
      extraReveals // Array of flat indices for cells to reveal
    };

    // Save only the room data (no separate game content document)
    await withRateLimit(
      () => setDoc(doc(db, 'gameRooms', roomId), roomData),
      firestoreRateLimiter
    );
    
    // Return the generated game data for local use
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
    
    // Fetch room data only
    const roomSnap = await withRateLimit(() => getDoc(roomRef), firestoreRateLimiter);
    
    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }
    
    const roomData = roomSnap.data();
    
    // Validate that room has game ID and extra reveals
    if (typeof roomData.gameId !== 'number' || !Array.isArray(roomData.extraReveals)) {
      throw new Error('Invalid room data - missing game ID or extra reveals');
    }
    
    // Check if current persistent player ID is already in the room (reconnection)
    const currentPlayerId = getOrCreatePlayerId();
    const existingPlayer = roomData.players.find(p => p.id === currentPlayerId);
    
    if (existingPlayer) {
      console.log('🔄 Player reconnecting to room:', currentPlayerId);
      // Store player data for session continuity
      storePlayerData(roomId, currentPlayerId);
      
      // Generate game data from room's game ID and extra reveals
      const gameData = await generateGameFromId(roomData.gameId, roomData.difficulty, roomData.extraReveals);
      
      return {
        roomId,
        roomData: {
          ...roomData,
          gameBoard: gameData.puzzle,
          solution: gameData.solution
        }
      };
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
      id: getOrCreatePlayerId(),
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
    
    // Generate game data from room's game ID and extra reveals
    const gameData = await generateGameFromId(roomData.gameId, roomData.difficulty, roomData.extraReveals);
    
    return {
      roomId,
      roomData: { 
        ...roomData, 
        players: [...roomData.players, newPlayer],
        gameBoard: gameData.puzzle,
        solution: gameData.solution
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
    
    console.log('🎯 Countdown started, client will handle timing and transition to playing state');
    
  } catch (error) {
    console.error('Failed to start game:', error);
    throw error;
  }
};

// Transition from countdown to playing state (called by clients after countdown)
export const startPlayingState = async (roomId) => {
  try {
    const roomRef = doc(db, 'gameRooms', roomId);
    const gameStartTime = new Date();
    const gameEndTime = new Date(gameStartTime.getTime() + 600000); // 10 minutes from start
    
    await updateDoc(roomRef, {
      gameState: GAME_STATES.PLAYING,
      gameStartTime: gameStartTime,
      gameEndTime: gameEndTime,
      lastActivity: new Date()
    });
    
    // Store game timing locally for reconnection
    storeMultiplayerGameTiming(roomId, gameStartTime, gameEndTime);
    
    console.log('🎮 Game state updated to playing', { gameStartTime, gameEndTime });
    
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
    
  } catch (error) {
    console.error('Failed to start playing state:', error);
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


// Connection state management
let activeConnections = new Map();

// Clean up connection when component unmounts or page unloads
const cleanupConnection = (roomId) => {
  if (activeConnections.has(roomId)) {
    const unsubscribe = activeConnections.get(roomId);
    try {
      unsubscribe();
      activeConnections.delete(roomId);
      console.log('🧹 Cleaned up connection for room:', roomId);
    } catch (error) {
      console.warn('⚠️ Error cleaning up connection:', error);
    }
  }
};

// Clean up all connections on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    activeConnections.forEach((unsubscribe, roomId) => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('⚠️ Error cleaning up connection on unload:', error);
      }
    });
    activeConnections.clear();
  });
}

// Listen to room changes (lightweight - no board data)
export const subscribeToRoom = async (roomId, callback) => {
  const roomRef = doc(db, 'gameRooms', roomId);
  
  // Clean up any existing connection for this room
  cleanupConnection(roomId);
  
  // Apply rate limiting before setting up the subscription
  await firestoreRateLimiter.throttle();
  
  let retryCount = 0;
  const maxRetries = 2; // Reduced from 3 to prevent connection accumulation
  const retryDelay = 1500; // Reduced from 2000ms
  
  const setupSubscription = () => {
    const unsubscribe = onSnapshot(
      roomRef,
      {
        // Removed includeMetadataChanges to reduce connection overhead
        next: (doc) => {
          if (doc.exists()) {
            const roomData = doc.data();
            // Reset retry count on successful update
            retryCount = 0;
            callback(roomData);
          } else {
            console.warn('⚠️ Room document not found:', roomId);
            callback(null);
          }
        },
        error: async (error) => {
          console.error('Error listening to room:', error.code, error.message);
          
          // Handle specific Firebase errors
          if (error.code === 'permission-denied') {
            console.error('❌ Permission denied - check Firestore security rules');
            callback(null, error);
            return;
          }
          
          // Handle NS_BINDING_ABORTED and similar connection errors
          if (error.code === 'aborted' || error.message?.includes('NS_BINDING_ABORTED')) {
            console.warn('🔄 Connection aborted, likely due to CORS or browser limitations');
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 Retrying after connection abort (${retryCount}/${maxRetries})...`);
              cleanupConnection(roomId);
              setTimeout(() => {
                const newUnsubscribe = setupSubscription();
                activeConnections.set(roomId, newUnsubscribe);
              }, retryDelay * retryCount * 2); // Longer delay for CORS issues
            } else {
              console.error('❌ Max retries reached after connection aborts');
              callback(null, error);
            }
            return;
          }
          
          if (error.code === 'unavailable' || error.code === 'internal') {
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 Retrying connection (${retryCount}/${maxRetries})...`);
              
              // Clean up current connection before retry
              cleanupConnection(roomId);
              
              // Wait before retrying
              setTimeout(() => {
                const newUnsubscribe = setupSubscription();
                activeConnections.set(roomId, newUnsubscribe);
              }, retryDelay * retryCount); // Exponential backoff
            } else {
              console.error('❌ Max retries reached, subscription failed');
              callback(null, error);
            }
          } else {
            // For other errors, don't retry
            console.error('❌ Subscription failed with error:', error.code);
            callback(null, error);
          }
        }
      }
    );
    
    return unsubscribe;
  };
  
  const unsubscribe = setupSubscription();
  activeConnections.set(roomId, unsubscribe);
  
  return () => cleanupConnection(roomId);
};

// Export cleanup function for manual cleanup
export const cleanupRoomConnection = cleanupConnection;

// Attach a newly created next-round room to an ended room so the opponent can join
export const attachNextRoom = async (previousRoomId, nextRoomId, requesterId) => {
  try {
    if (!previousRoomId || !nextRoomId) throw new Error('Missing room IDs for attachNextRoom');
    const roomRef = doc(db, 'gameRooms', previousRoomId);
    // Only add if not already set to avoid accidental overwrites (idempotent)
    const snap = await getDoc(roomRef);
    if (!snap.exists()) throw new Error('Previous room not found');
    const data = snap.data();
    if (data.nextRoomId && data.nextRoomId !== nextRoomId) {
      console.warn('attachNextRoom: nextRoomId already set to different value, leaving as-is');
      return { nextRoomId: data.nextRoomId, unchanged: true };
    }
    await updateDoc(roomRef, {
      nextRoomId,
      rematchRequestedBy: requesterId || null,
      rematchCreatedAt: new Date(),
      lastActivity: new Date()
    });
    return { nextRoomId, updated: true };
  } catch (error) {
    console.error('Failed to attach next room:', error);
    throw error;
  }
};

// Get game content from room data (reconstruct from game ID and extra reveals)
export const getGameContent = async (roomData) => {
  try {
    if (!roomData || typeof roomData.gameId !== 'number' || !Array.isArray(roomData.extraReveals)) {
      throw new Error('Invalid room data - missing game ID or extra reveals');
    }
    
    // Generate game data from room's game ID and extra reveals
    const gameData = await generateGameFromId(roomData.gameId, roomData.difficulty || 'easy', roomData.extraReveals);
    
    return {
      gameBoard: gameData.puzzle,
      solution: gameData.solution
    };
  } catch (error) {
    console.error('Failed to get game content from room data:', error);
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

// Generate a unique player ID (deprecated - use getOrCreatePlayerId from persistentStorage)
const generatePlayerId = () => {
  console.warn('generatePlayerId is deprecated, use getOrCreatePlayerId from persistentStorage');
  return getOrCreatePlayerId();
};

// Helper function to convert string to 2D grid (avoid circular dependency by defining locally)
const stringToGrid = (puzzleString) => {
  if (!puzzleString || puzzleString.length !== 81) {
    console.warn('Invalid puzzle string:', puzzleString);
    return Array(9).fill().map(() => Array(9).fill(0));
  }
  
  const grid = [];
  for (let i = 0; i < 9; i++) {
    const row = [];
    for (let j = 0; j < 9; j++) {
      const char = puzzleString[i * 9 + j];
      row.push(parseInt(char) || 0);
    }
    grid.push(row);
  }
  return grid;
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
export const checkAndHandleGameEnd = async (roomId, players) => {
  try {
    console.log('🔍 Checking game end conditions:', {
      roomId,
      players: players.map(p => ({ id: p.id, hearts: p.hearts, completed: p.completed, name: p.name }))
    });
    
    // Check if any player completed the game
    const completedPlayer = players.find(player => player.completed);
    if (completedPlayer) {
      console.log('🏆 Game ended by completion:', completedPlayer.id);
      await endGameWithWinner(roomId, completedPlayer.id, 'completion');
      return { ended: true, winner: completedPlayer.id, reason: 'completion' };
    }
    
    // Check if any player lost all hearts
    const playersWithHearts = players.filter(player => {
      const hearts = (player.hearts ?? 3);
      return hearts >= 0; // Alive until hearts drops below 0
    });
    console.log('💔 Players with hearts:', playersWithHearts.map(p => ({ id: p.id, hearts: p.hearts, name: p.name })));
    
    if (playersWithHearts.length === 1) {
      console.log('🏆 Game ended by opponent elimination:', playersWithHearts[0].id);
      await endGameWithWinner(roomId, playersWithHearts[0].id, 'opponent_eliminated');
      return { ended: true, winner: playersWithHearts[0].id, reason: 'opponent_eliminated' };
    }
    
    // Check if all players lost all hearts
    if (playersWithHearts.length === 0) {
      console.log('🤝 Game ended by all eliminated');
      await endGameWithDraw(roomId, 'all_eliminated');
      return { ended: true, winner: null, reason: 'all_eliminated' };
    }
    
    console.log('⏳ Game continues - no end conditions met');
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

