/**
 * Save game utilities for singleplayer mode
 * Handles localStorage operations for saving and loading game state
 */

// Validate game state structure
const isValidGameState = (state) => {
  if (!state || typeof state !== 'object') {
    return false;
  }

  // Check for required properties
  const requiredProps = ['grid', 'originalGrid', 'solution', 'difficulty', 'gameStatus'];
  for (const prop of requiredProps) {
    if (!(prop in state)) {
      console.warn(`Missing required property: ${prop}`);
      return false;
    }
  }

  // Validate grid structure
  if (!Array.isArray(state.grid) || !Array.isArray(state.originalGrid) || !Array.isArray(state.solution)) {
    console.warn('Invalid grid structure');
    return false;
  }

  // Validate grid dimensions (9x9)
  if (state.grid.length !== 9 || state.originalGrid.length !== 9 || state.solution.length !== 9) {
    console.warn('Invalid grid dimensions');
    return false;
  }

  for (let i = 0; i < 9; i++) {
    if (!Array.isArray(state.grid[i]) || state.grid[i].length !== 9 ||
        !Array.isArray(state.originalGrid[i]) || state.originalGrid[i].length !== 9 ||
        !Array.isArray(state.solution[i]) || state.solution[i].length !== 9) {
      console.warn('Invalid grid row structure');
      return false;
    }
  }

  // Validate difficulty
  const validDifficulties = ['easy', 'children', 'medium', 'hard', 'expert'];
  if (!validDifficulties.includes(state.difficulty)) {
    console.warn('Invalid difficulty level');
    return false;
  }

  // Validate game status
  const validStatuses = ['playing', 'completed', 'error', 'game-over'];
  if (!validStatuses.includes(state.gameStatus)) {
    console.warn('Invalid game status');
    return false;
  }

  return true;
};

// Save game state to localStorage with robust error handling
export const saveGameState = (gameState) => {
  try {
    // Validate game state before saving
    if (!gameState || !isValidGameState(gameState)) {
      console.warn('Invalid game state, skipping save');
      return false;
    }

    // Create a clean copy of gameState to avoid circular references
    const cleanGameState = {
      grid: gameState.grid,
      originalGrid: gameState.originalGrid,
      solution: gameState.solution,
      selectedCell: gameState.selectedCell,
      selectedNumber: gameState.selectedNumber,
      difficulty: gameState.difficulty,
      gameStatus: gameState.gameStatus,
      timer: gameState.timer,
      moveHistory: gameState.moveHistory || [],
      lives: gameState.lives || 3,
      hintLevel: gameState.hintLevel || 'medium',
      isNotesMode: gameState.isNotesMode || false,
      notes: gameState.notes || Array(9).fill().map(() => Array(9).fill().map(() => [])),
      isPaused: gameState.isPaused || false,
      errorCells: gameState.errorCells || [],
      undosUsed: gameState.undosUsed || 0,
      lastSaved: new Date().toISOString()
    };

    // Test serialization before saving
    const serializedState = JSON.stringify(cleanGameState);
    console.log(`💾 Saving game state (${Math.round(serializedState.length / 1024)}KB)`);
    
    // Check if serialized data is too large (localStorage has ~5-10MB limit)
    if (serializedState.length > 5 * 1024 * 1024) { // 5MB limit
      console.warn('Game state too large, clearing old data and retrying');
      localStorage.removeItem('sudoku-game-state');
      // Try with minimal data
      const minimalState = {
        grid: cleanGameState.grid,
        originalGrid: cleanGameState.originalGrid,
        solution: cleanGameState.solution,
        difficulty: cleanGameState.difficulty,
        gameStatus: cleanGameState.gameStatus,
        timer: cleanGameState.timer,
        lives: cleanGameState.lives,
        lastSaved: cleanGameState.lastSaved
      };
      localStorage.setItem('sudoku-game-state', JSON.stringify(minimalState));
      return true;
    }
    
    localStorage.setItem('sudoku-game-state', serializedState);
    return true;
  } catch (error) {
    console.error('Failed to save game state:', error);
    // Try to clear localStorage if it's corrupted
    try {
      localStorage.removeItem('sudoku-game-state');
      console.log('Cleared corrupted localStorage, game will continue without saving');
    } catch (clearError) {
      console.error('Failed to clear localStorage:', clearError);
    }
    return false;
  }
};

// Load game state from localStorage with robust error handling
export const loadGameState = () => {
  try {
    console.log('📂 Attempting to load saved game state...');
    const savedState = localStorage.getItem('sudoku-game-state');
    if (!savedState) {
      console.log('📭 No saved game state found');
      return null;
    }

    console.log(`📦 Found saved state (${Math.round(savedState.length / 1024)}KB)`);
    const parsedState = JSON.parse(savedState);
    
    // Validate the loaded state has required properties
    if (!isValidGameState(parsedState)) {
      console.warn('❌ Invalid game state detected, clearing localStorage');
      localStorage.removeItem('sudoku-game-state');
      return null;
    }

    console.log('✅ Game state loaded successfully');
    return parsedState;
  } catch (error) {
    console.error('❌ Failed to load game state, clearing corrupted data:', error);
    // Clear corrupted data
    try {
      localStorage.removeItem('sudoku-game-state');
    } catch (clearError) {
      console.error('Failed to clear corrupted localStorage:', clearError);
    }
    return null;
  }
};

// Clear saved game state
export const clearSavedGame = () => {
  try {
    localStorage.removeItem('sudoku-game-state');
    console.log('🗑️ Cleared saved game state');
    return true;
  } catch (error) {
    console.error('Failed to clear saved game state:', error);
    return false;
  }
};

// Check if there's a saved game
export const hasSavedGame = () => {
  try {
    const savedState = localStorage.getItem('sudoku-game-state');
    return savedState !== null;
  } catch (error) {
    console.error('Failed to check for saved game:', error);
    return false;
  }
};

// Get saved game info without loading the full state
export const getSavedGameInfo = () => {
  try {
    const savedState = localStorage.getItem('sudoku-game-state');
    if (!savedState) return null;
    
    const parsedState = JSON.parse(savedState);
    return {
      difficulty: parsedState.difficulty,
      timer: parsedState.timer,
      lives: parsedState.lives,
      gameStatus: parsedState.gameStatus,
      lastSaved: parsedState.lastSaved || null
    };
  } catch (error) {
    console.error('Failed to get saved game info:', error);
    return null;
  }
};
