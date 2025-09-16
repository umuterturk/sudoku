import { useEffect } from 'react';
import { parseGameFromUrl } from '../utils/sudokuUtils';

/**
 * Custom hook for managing game state persistence and initialization
 */
export const useGameState = (
  grid,
  setGrid,
  originalGrid,
  setOriginalGrid,
  solution,
  setSolution,
  selectedCell,
  setSelectedCell,
  selectedNumber,
  setSelectedNumber,
  difficulty,
  setDifficulty,
  gameStatus,
  setGameStatus,
  lives,
  setLives,
  hintLevel,
  setHintLevel,
  isNotesMode,
  setIsNotesMode,
  notes,
  setNotes,
  isPaused,
  setIsPaused,
  errorCells,
  setErrorCells,
  timer,
  setTimer,
  isTimerRunning,
  setIsTimerRunning,
  showContinuePopup,
  setShowContinuePopup,
  showDifficultyPopup,
  setShowDifficultyPopup,
  initializeFallbackGame
) => {
  
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
  const saveGameState = (gameState) => {
    try {
      // Validate game state before saving
      if (!gameState || !isValidGameState(gameState)) {
        console.warn('Invalid game state, skipping save');
        return;
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
        lives: gameState.lives || 3,
        hintLevel: gameState.hintLevel || 'medium',
        isNotesMode: gameState.isNotesMode || false,
        notes: gameState.notes || Array(9).fill().map(() => Array(9).fill().map(() => [])),
        isPaused: gameState.isPaused || false,
        errorCells: gameState.errorCells || [],
      };
      
      // Test serialization before saving
      const serializedState = JSON.stringify(cleanGameState);
      
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
          lives: cleanGameState.lives
        };
        localStorage.setItem('sudoku-game-state', JSON.stringify(minimalState));
        return;
      }
      
      localStorage.setItem('sudoku-game-state', serializedState);
    } catch (error) {
      console.error('Failed to save game state:', error);
      // Try to clear localStorage if it's corrupted
      try {
        localStorage.removeItem('sudoku-game-state');
        console.log('Cleared corrupted localStorage, game will continue without saving');
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
    }
  };

  // Load game state from localStorage with robust error handling
  const loadGameState = () => {
    try {
      const savedState = localStorage.getItem('sudoku-game-state');
      if (!savedState) {
        return null;
      }

      const parsedState = JSON.parse(savedState);
      
      // Validate the loaded state has required properties
      if (!isValidGameState(parsedState)) {
        console.warn('Invalid game state detected, clearing localStorage');
        localStorage.removeItem('sudoku-game-state');
        return null;
      }

      return parsedState;
    } catch (error) {
      console.error('Failed to load game state, clearing corrupted data:', error);
      // Clear corrupted data
      try {
        localStorage.removeItem('sudoku-game-state');
      } catch (clearError) {
        console.error('Failed to clear corrupted localStorage:', clearError);
      }
      return null;
    }
  };

  // Initialize game with comprehensive error handling
  const initializeGame = async () => {
    try {
      // First, check for URL game parameter
      const urlGameState = parseGameFromUrl();
      if (urlGameState) {
        try {
          // Load game from URL
          setGrid(urlGameState.grid);
          setOriginalGrid(urlGameState.originalGrid);
          setSolution(urlGameState.solution);
          setSelectedCell(urlGameState.selectedCell);
          setSelectedNumber(urlGameState.selectedNumber);
          setDifficulty(urlGameState.difficulty);
          setGameStatus(urlGameState.gameStatus);
          setTimer(urlGameState.timer);
          setLives(urlGameState.lives);
          setHintLevel(urlGameState.hintLevel);
          setIsNotesMode(urlGameState.isNotesMode || false);
          setNotes(urlGameState.notes || Array(9).fill().map(() => Array(9).fill().map(() => [])));
          setErrorCells(urlGameState.errorCells || []);
          setIsPaused(urlGameState.isPaused);
          setIsTimerRunning(!urlGameState.isPaused && urlGameState.gameStatus === 'playing');
          
          // Clear the URL parameter after loading
          const url = new URL(window.location);
          url.searchParams.delete('game');
          window.history.replaceState({}, document.title, url.toString());
          
          return; // Skip saved game check when loading from URL
        } catch (urlError) {
          console.error('Failed to load URL game, falling back:', urlError);
          initializeFallbackGame();
          return;
        }
      }
      
      // Check for saved game in localStorage
      const savedState = loadGameState();
      if (savedState) {
        try {
          // Show continue game popup instead of directly restoring
          setShowContinuePopup(true);
          
          // Restore saved game state (but don't start timer yet)
          setGrid(savedState.grid);
          setOriginalGrid(savedState.originalGrid);
          setSolution(savedState.solution);
          setSelectedCell(savedState.selectedCell);
          setSelectedNumber(savedState.selectedNumber);
          setDifficulty(savedState.difficulty);
          setGameStatus('playing'); // Always set to playing for continue popup
          setLives(savedState.lives !== undefined ? savedState.lives : 3);
          setHintLevel(savedState.hintLevel || 'medium');
          setIsNotesMode(savedState.isNotesMode || false);
          setNotes(savedState.notes || Array(9).fill().map(() => Array(9).fill().map(() => [])));
          setErrorCells(savedState.errorCells || []);
          setIsPaused(true); // Start paused when showing continue popup
          
          // Handle timer restoration - use saved timer value directly (incremental only)
          setTimer(savedState.timer || 0);
          setIsTimerRunning(false); // Don't start timer until they continue
        } catch (restoreError) {
          console.error('Failed to restore saved game, falling back:', restoreError);
          initializeFallbackGame();
        }
      } else {
        // No saved game, show difficulty popup
        setShowDifficultyPopup(true);
      }
    } catch (error) {
      console.error('Game initialization failed, using fallback:', error);
      initializeFallbackGame();
    }
  };

  // Auto-save game state
  useEffect(() => {
    if (grid && originalGrid && gameStatus !== 'completed') {
      const gameState = {
        grid,
        originalGrid,
        solution,
        selectedCell,
        selectedNumber,
        difficulty,
        gameStatus,
        timer,
        lives,
        hintLevel,
        isNotesMode,
        notes,
        isPaused,
        errorCells,
      };
      saveGameState(gameState);
    }
  }, [grid, originalGrid, solution, selectedCell, selectedNumber, difficulty, gameStatus, timer, lives, hintLevel, isNotesMode, notes, isPaused, errorCells]);

  return {
    saveGameState,
    loadGameState,
    initializeGame,
    isValidGameState
  };
};
