/**
 * Multiplayer persistent storage utilities
 * Handles localStorage operations for multiplayer game continuation
 */

// Multiplayer-specific storage keys (completely separate from single player)
const MULTIPLAYER_STORAGE_KEY = 'sudoku-multiplayer-session';
const PLAYER_ID_STORAGE_KEY = 'sudoku-multiplayer-player-id';
const MULTIPLAYER_GAME_STATE_KEY = 'sudoku-multiplayer-game-state';
const MULTIPLAYER_LOCAL_GAME_KEY = 'sudoku-multiplayer-local-game';
const MULTIPLAYER_COMPLETE_STATE_KEY = 'sudoku-multiplayer-complete-state';
const STORAGE_EXPIRY_HOURS = 24; // 24 hours before auto-cleanup

/**
 * Generate or retrieve a persistent player ID for this browser
 * @returns {string} - Persistent player ID
 */
export const getOrCreatePlayerId = () => {
  try {
    let playerId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    
    if (!playerId) {
      playerId = 'player_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
      console.log('🆔 Created new persistent player ID:', playerId);
    } else {
      console.log('🆔 Using existing player ID:', playerId);
    }
    
    return playerId;
  } catch (error) {
    console.error('Failed to get/create player ID:', error);
    // Fallback to temporary ID
    return 'player_' + Math.random().toString(36).substring(2, 15);
  }
};

/**
 * Store multiplayer session data for game continuation
 * @param {string} roomId - The multiplayer room ID
 * @param {string} playerId - The player's ID in the room
 * @param {Object} additionalData - Additional session data (including game times)
 */
export const storeMultiplayerSession = (roomId, playerId, additionalData = {}) => {
  try {
    const sessionData = {
      roomId,
      playerId,
      timestamp: Date.now(),
      expiresAt: Date.now() + (STORAGE_EXPIRY_HOURS * 60 * 60 * 1000),
      ...additionalData
    };

    localStorage.setItem(MULTIPLAYER_STORAGE_KEY, JSON.stringify(sessionData));
    console.log('💾 Stored multiplayer session:', { roomId, playerId });
    return true;
  } catch (error) {
    console.error('Failed to store multiplayer session:', error);
    return false;
  }
};

/**
 * Get stored multiplayer session data
 * @returns {Object|null} - Session data or null if not found/expired
 */
export const getMultiplayerSession = () => {
  try {
    const data = localStorage.getItem(MULTIPLAYER_STORAGE_KEY);
    if (!data) {
      console.log('📭 No multiplayer session found');
      return null;
    }

    const sessionData = JSON.parse(data);
    
    // Check if session has expired
    if (Date.now() > sessionData.expiresAt) {
      console.log('⏰ Multiplayer session expired, clearing...');
      clearMultiplayerSession();
      return null;
    }

    // Only log once per session to avoid spam
    const age = Math.round((Date.now() - sessionData.timestamp) / (1000 * 60));
    if (!sessionData.hasBeenLogged || age === 0) {
      console.log('📦 Retrieved multiplayer session:', { 
        roomId: sessionData.roomId, 
        playerId: sessionData.playerId,
        age: age + ' minutes'
      });
      // Mark as logged to prevent future spam
      sessionData.hasBeenLogged = true;
      localStorage.setItem(MULTIPLAYER_STORAGE_KEY, JSON.stringify(sessionData));
    }
    
    return sessionData;
  } catch (error) {
    console.error('Failed to get multiplayer session:', error);
    // Clear corrupted data
    clearMultiplayerSession();
    return null;
  }
};

/**
 * Clear stored multiplayer session
 */
export const clearMultiplayerSession = () => {
  try {
    localStorage.removeItem(MULTIPLAYER_STORAGE_KEY);
    console.log('🗑️ Cleared multiplayer session');
  } catch (error) {
    console.error('Failed to clear multiplayer session:', error);
  }
};

/**
 * Check if there's an active multiplayer session
 * @returns {boolean} - True if there's a valid session
 */
export const hasActiveMultiplayerSession = () => {
  const session = getMultiplayerSession();
  return session !== null;
};

/**
 * Get the room ID from stored session
 * @returns {string|null} - Room ID or null if no session
 */
export const getStoredRoomId = () => {
  const session = getMultiplayerSession();
  return session ? session.roomId : null;
};

/**
 * Update session data (e.g., game state, last activity)
 * @param {Object} updateData - Data to merge with existing session
 */
export const updateMultiplayerSession = (updateData) => {
  try {
    const currentSession = getMultiplayerSession();
    if (!currentSession) {
      console.warn('No existing session to update');
      return false;
    }

    const updatedSession = {
      ...currentSession,
      ...updateData,
      lastUpdated: Date.now()
    };

    localStorage.setItem(MULTIPLAYER_STORAGE_KEY, JSON.stringify(updatedSession));
    console.log('🔄 Updated multiplayer session');
    return true;
  } catch (error) {
    console.error('Failed to update multiplayer session:', error);
    return false;
  }
};

/**
 * Check if session belongs to a specific room
 * @param {string} roomId - Room ID to check
 * @returns {boolean} - True if session is for the given room
 */
export const isSessionForRoom = (roomId) => {
  const session = getMultiplayerSession();
  return session && session.roomId === roomId;
};

/**
 * Store multiplayer game timing data for reconnection
 * @param {string} roomId - The room ID
 * @param {Date} gameStartTime - When the game started
 * @param {Date} gameEndTime - When the game should end
 */
export const storeMultiplayerGameTiming = (roomId, gameStartTime, gameEndTime) => {
  try {
    const timingData = {
      roomId,
      gameStartTime: gameStartTime.toISOString(),
      gameEndTime: gameEndTime.toISOString(),
      timestamp: Date.now()
    };

    localStorage.setItem(`${MULTIPLAYER_GAME_STATE_KEY}-${roomId}`, JSON.stringify(timingData));
    console.log('⏰ Stored multiplayer game timing:', { roomId, gameStartTime, gameEndTime });
    return true;
  } catch (error) {
    console.error('Failed to store multiplayer game timing:', error);
    return false;
  }
};

/**
 * Get stored multiplayer game timing data
 * @param {string} roomId - The room ID
 * @returns {Object|null} - Timing data or null if not found
 */
export const getMultiplayerGameTiming = (roomId) => {
  try {
    const data = localStorage.getItem(`${MULTIPLAYER_GAME_STATE_KEY}-${roomId}`);
    if (!data) return null;

    const timingData = JSON.parse(data);
    return {
      roomId: timingData.roomId,
      gameStartTime: new Date(timingData.gameStartTime),
      gameEndTime: new Date(timingData.gameEndTime),
      timestamp: timingData.timestamp
    };
  } catch (error) {
    console.error('Failed to get multiplayer game timing:', error);
    return null;
  }
};

/**
 * Clear multiplayer game timing data
 * @param {string} roomId - The room ID
 */
export const clearMultiplayerGameTiming = (roomId) => {
  try {
    localStorage.removeItem(`${MULTIPLAYER_GAME_STATE_KEY}-${roomId}`);
    console.log('🗑️ Cleared multiplayer game timing for room:', roomId);
  } catch (error) {
    console.error('Failed to clear multiplayer game timing:', error);
  }
};

/**
 * Check if a multiplayer game is still valid (not expired)
 * @param {string} roomId - The room ID
 * @returns {boolean} - True if game is still valid
 */
export const isMultiplayerGameValid = (roomId) => {
  const timing = getMultiplayerGameTiming(roomId);
  // If no timing stored yet, treat as valid – game may be waiting/countdown/just started
  if (!timing) return true;

  const now = Date.now();
  const gameEndTs = timing.gameEndTime instanceof Date ? timing.gameEndTime.getTime() : new Date(timing.gameEndTime).getTime();
  // If parsing failed, be permissive to avoid blocking user
  if (isNaN(gameEndTs)) return true;
  return now < gameEndTs;
};

/**
 * Store local game state (grid, originalGrid, solution) for multiplayer
 * @param {string} roomId - The room ID
 * @param {Object} gameState - Game state containing grid, originalGrid, solution, difficulty
 */
export const storeMultiplayerLocalGameState = (roomId, gameState) => {
  try {
    const localGameData = {
      roomId,
      grid: gameState.grid,
      originalGrid: gameState.originalGrid,
      solution: gameState.solution,
      difficulty: gameState.difficulty,
      timestamp: Date.now(),
      expiresAt: Date.now() + (STORAGE_EXPIRY_HOURS * 60 * 60 * 1000)
    };

    localStorage.setItem(`${MULTIPLAYER_LOCAL_GAME_KEY}-${roomId}`, JSON.stringify(localGameData));
    console.log('💾 Stored local multiplayer game state for room:', roomId);
    return true;
  } catch (error) {
    console.error('Failed to store local multiplayer game state:', error);
    return false;
  }
};

/**
 * Get stored local game state for multiplayer
 * @param {string} roomId - The room ID
 * @returns {Object|null} - Game state or null if not found/expired
 */
export const getMultiplayerLocalGameState = (roomId) => {
  try {
    const data = localStorage.getItem(`${MULTIPLAYER_LOCAL_GAME_KEY}-${roomId}`);
    if (!data) {
      console.log('📭 No local game state found for room:', roomId);
      return null;
    }

    const localGameData = JSON.parse(data);
    
    // Check if data has expired
    if (Date.now() > localGameData.expiresAt) {
      console.log('⏰ Local game state expired for room:', roomId);
      clearMultiplayerLocalGameState(roomId);
      return null;
    }

    console.log('📦 Retrieved local game state for room:', roomId);
    return {
      grid: localGameData.grid,
      originalGrid: localGameData.originalGrid,
      solution: localGameData.solution,
      difficulty: localGameData.difficulty
    };
  } catch (error) {
    console.error('Failed to get local game state:', error);
    clearMultiplayerLocalGameState(roomId);
    return null;
  }
};

/**
 * Clear local game state for a specific room
 * @param {string} roomId - The room ID
 */
export const clearMultiplayerLocalGameState = (roomId) => {
  try {
    localStorage.removeItem(`${MULTIPLAYER_LOCAL_GAME_KEY}-${roomId}`);
    console.log('🗑️ Cleared local game state for room:', roomId);
  } catch (error) {
    console.error('Failed to clear local game state:', error);
  }
};

/**
 * Clear all multiplayer data for a room (session, game state, complete state)
 * @param {string} roomId - The room ID
 */
export const clearAllMultiplayerDataForRoom = (roomId) => {
  clearMultiplayerLocalGameState(roomId);
  clearCompleteMultiplayerState(roomId);
  clearMultiplayerGameTiming(roomId);
  console.log('🧹 Cleared all multiplayer data for room:', roomId);
};

/**
 * Check if local game state exists for a room
 * @param {string} roomId - The room ID
 * @returns {boolean} - True if local game state exists and is valid
 */
export const hasMultiplayerLocalGameState = (roomId) => {
  const gameState = getMultiplayerLocalGameState(roomId);
  return gameState !== null;
};

/**
 * Store complete multiplayer game state (all game info + player state)
 * @param {string} roomId - The room ID
 * @param {Object} completeState - Complete game state
 */
export const storeCompleteMultiplayerState = (roomId, completeState) => {
  try {
    const stateData = {
      roomId,
      timestamp: Date.now(),
      expiresAt: Date.now() + (STORAGE_EXPIRY_HOURS * 60 * 60 * 1000),
      ...completeState
    };

    localStorage.setItem(`${MULTIPLAYER_COMPLETE_STATE_KEY}-${roomId}`, JSON.stringify(stateData));
    console.log('💾 Stored complete multiplayer state for room:', roomId);
    return true;
  } catch (error) {
    console.error('Failed to store complete multiplayer state:', error);
    return false;
  }
};

/**
 * Get complete stored multiplayer game state
 * @param {string} roomId - The room ID
 * @returns {Object|null} - Complete game state or null if not found/expired
 */
export const getCompleteMultiplayerState = (roomId) => {
  try {
    const data = localStorage.getItem(`${MULTIPLAYER_COMPLETE_STATE_KEY}-${roomId}`);
    if (!data) {
      console.log('📭 No complete game state found for room:', roomId);
      return null;
    }

    const stateData = JSON.parse(data);
    
    // Check if data has expired
    if (Date.now() > stateData.expiresAt) {
      console.log('⏰ Complete game state expired for room:', roomId);
      clearCompleteMultiplayerState(roomId);
      return null;
    }

    console.log('📦 Retrieved complete game state for room:', roomId);
    return stateData;
  } catch (error) {
    console.error('Failed to get complete game state:', error);
    clearCompleteMultiplayerState(roomId);
    return null;
  }
};

/**
 * Update specific fields in the complete multiplayer state
 * @param {string} roomId - The room ID
 * @param {Object} updates - Fields to update
 */
export const updateCompleteMultiplayerState = (roomId, updates) => {
  try {
    const currentState = getCompleteMultiplayerState(roomId);
    if (!currentState) {
      console.warn('No existing complete state to update for room:', roomId);
      return false;
    }

    const updatedState = {
      ...currentState,
      ...updates,
      lastUpdated: Date.now()
    };

    localStorage.setItem(`${MULTIPLAYER_COMPLETE_STATE_KEY}-${roomId}`, JSON.stringify(updatedState));
    console.log('🔄 Updated complete multiplayer state for room:', roomId);
    return true;
  } catch (error) {
    console.error('Failed to update complete multiplayer state:', error);
    return false;
  }
};

/**
 * Clear complete game state for a specific room
 * @param {string} roomId - The room ID
 */
export const clearCompleteMultiplayerState = (roomId) => {
  try {
    localStorage.removeItem(`${MULTIPLAYER_COMPLETE_STATE_KEY}-${roomId}`);
    console.log('🗑️ Cleared complete game state for room:', roomId);
  } catch (error) {
    console.error('Failed to clear complete game state:', error);
  }
};

/**
 * Check if complete game state exists for a room
 * @param {string} roomId - The room ID
 * @returns {boolean} - True if complete state exists and is valid
 */
export const hasCompleteMultiplayerState = (roomId) => {
  const state = getCompleteMultiplayerState(roomId);
  return state !== null;
};

/**
 * Get only opponent-related data from server
 * @param {string} roomId - The room ID
 * @param {string} currentPlayerId - Current player's ID to filter out
 * @returns {Object|null} - Opponent data structure
 */
export const getOpponentStateStructure = (players, currentPlayerId) => {
  if (!players || !Array.isArray(players)) {
    return null;
  }
  
  const opponent = players.find(p => p.id !== currentPlayerId);
  if (!opponent) {
    return null;
  }
  
  return {
    id: opponent.id,
    name: opponent.name,
    progress: opponent.progress || 0,
    hearts: opponent.hearts || 3,
    completed: opponent.completed || false,
    winner: opponent.winner || false,
    heartLost: opponent.heartLost || false,
    lastMove: opponent.lastMove || null
  };
};
