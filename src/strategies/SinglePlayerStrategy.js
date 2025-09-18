import { GameModeStrategy } from './GameModeStrategy';
import { trackGameCompleted, trackGameOver } from '../utils/analytics';

/**
 * Single player game mode strategy
 * Handles all single player game logic and state management
 */
export class SinglePlayerStrategy extends GameModeStrategy {
  constructor() {
    super();
    this.modeName = 'single';
  }

  async initializeGame(gameData) {
    // Single player initialization logic
    return {
      success: true,
      data: gameData
    };
  }

  saveGameState(gameState) {
    const storageKey = this.getStorageKey();
    const minimalState = {
      grid: gameState.grid,
      originalGrid: gameState.originalGrid,
      difficulty: gameState.difficulty,
      gameStatus: gameState.gameStatus,
      timer: gameState.timer,
      lives: gameState.lives,
      isPaused: gameState.isPaused || false,
      errorCells: gameState.errorCells || []
    };
    localStorage.setItem(storageKey, JSON.stringify(minimalState));
  }

  loadGameState() {
    const storageKey = this.getStorageKey();
    const savedState = localStorage.getItem(storageKey);
    
    if (savedState) {
      try {
        const gameState = JSON.parse(savedState);
        return {
          grid: gameState.grid,
          originalGrid: gameState.originalGrid,
          difficulty: gameState.difficulty,
          gameStatus: gameState.gameStatus,
          timer: gameState.timer,
          lives: gameState.lives,
          isPaused: gameState.isPaused || false,
          errorCells: gameState.errorCells || []
        };
      } catch (error) {
        console.error('Error loading game state:', error);
        return null;
      }
    }
    return null;
  }

  updateProgress(progress, lives, lostHeart) {
    // Single player doesn't need to update progress to external service
    // Progress is tracked locally
    return Promise.resolve();
  }

  handleGameCompletion(lives, timer) {
    // Track completion in analytics
    const difficulty = this.getCurrentDifficulty();
    trackGameCompleted(difficulty, timer, lives);
    
    return {
      showCompletionPopup: true,
      completionData: {
        time: timer,
        lives: lives,
        difficulty: difficulty
      }
    };
  }

  handleGameOver(difficulty, timer) {
    // Track game over in analytics
    trackGameOver(difficulty, timer);
    
    return {
      showGameOver: true,
      gameOverData: {
        time: timer,
        difficulty: difficulty
      }
    };
  }

  getTimerProps() {
    return {
      isMultiplayerMode: false,
      gameStartTime: null,
      gameEndTime: null,
      gameState: null
    };
  }

  getProgressComponent() {
    return null; // Single player doesn't show progress component
  }

  getDifficultyDisplay() {
    return {
      show: true,
      difficulty: this.getCurrentDifficulty()
    };
  }

  handleGameExit() {
    // Single player exit logic
    return Promise.resolve();
  }

  validateMove(cellIndex, value, grid, originalGrid) {
    // Single player validation logic
    const row = Math.floor(cellIndex / 9);
    const col = cellIndex % 9;
    
    // Check if cell is already filled
    if (originalGrid[row][col] !== 0) {
      return { isValid: false, reason: 'Cell is already filled' };
    }
    
    // Check row, column, and box constraints
    const isValid = this.isValidMove(grid, row, col, value);
    
    return { isValid, reason: isValid ? null : 'Invalid move' };
  }

  getStorageKey() {
    return 'sudoku-game-state';
  }

  getModeName() {
    return this.modeName;
  }

  // Helper methods
  getCurrentDifficulty() {
    // This should be injected or retrieved from context
    return 'easy'; // Default fallback
  }

  isValidMove(grid, row, col, value) {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (grid[row][x] === value) return false;
    }
    
    // Check column
    for (let x = 0; x < 9; x++) {
      if (grid[x][col] === value) return false;
    }
    
    // Check 3x3 box
    const startRow = row - row % 3;
    const startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[i + startRow][j + startCol] === value) return false;
      }
    }
    
    return true;
  }
}



