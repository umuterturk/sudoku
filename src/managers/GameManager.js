import { SharedGameLogic } from './SharedGameLogic.js';

/**
 * Base Game Manager class
 * Contains common functionality for both singleplayer and multiplayer modes
 */
export class GameManager {
  constructor() {
    this.gameState = null;
    this.gameLogic = null;
    this.timer = null;
    this.isInitialized = false;
    this.sharedGameLogic = null;
  }
  
  // Initialize the game manager with hooks
  initialize(gameState, gameLogic, timer, options = {}) {
    console.log('🔄 GameManager.initialize called with:', {
      hasGameState: !!gameState,
      hasGameLogic: !!gameLogic,
      hasTimer: !!timer,
      wasInitialized: this.isInitialized,
      options
    });
    
    this.gameState = gameState;
    this.gameLogic = gameLogic;
    this.timer = timer;
    this.isInitialized = true;
    
    // Create shared game logic instance
    this.sharedGameLogic = new SharedGameLogic({
      isSoundEnabled: options.isSoundEnabled !== undefined ? options.isSoundEnabled : true,
      onGameComplete: options.onGameComplete,
      onGameOver: options.onGameOver,
      onCorrectMove: options.onCorrectMove,
      onWrongMove: options.onWrongMove,
      isMultiplayer: options.isMultiplayer || false
    });
    
    console.log('✅ GameManager initialized successfully');
  }
  
  // Check if manager is properly initialized
  checkInitialization() {
    if (!this.isInitialized || !this.gameState || !this.gameLogic || !this.timer) {
      throw new Error('GameManager not properly initialized');
    }
  }
  
  // Reset game state
  resetGame() {
    this.checkInitialization();
    return this.sharedGameLogic.resetGame(this.gameState, this.timer);
  }
  
  // Handle digit placement
  async handleDigitPlacement(digit, row = null, col = null) {
    console.log('🔢 GameManager.handleDigitPlacement called:', {
      digit,
      row,
      col,
      isInitialized: this.isInitialized,
      hasSharedGameLogic: !!this.sharedGameLogic
    });
    
    // Check if manager is properly initialized, return early if not
    if (!this.isInitialized || !this.gameState || !this.sharedGameLogic) {
      console.warn('⚠️ GameManager not initialized, ignoring digit placement');
      return false;
    }
    // Resolve coordinates actually used (SharedGameLogic will also resolve internally, but we need them for hooks)
    const [actualRow, actualCol] = row !== null && col !== null
      ? [row, col]
      : (this.gameState.selectedCell || [null, null]);

    const result = await this.sharedGameLogic.handleDigitPlacement(this.gameState, digit, actualRow, actualCol);
    
    // Post-move hook for subclasses (e.g., multiplayer sync) without duplicating core logic
    if (typeof this.afterDigitPlacement === 'function') {
      try {
        const hookResult = this.afterDigitPlacement({ digit, row: actualRow, col: actualCol, success: result });
        if (hookResult && typeof hookResult.then === 'function') {
          await hookResult;
        }
      } catch (hookError) {
        console.error('afterDigitPlacement hook error:', hookError);
      }
    }
    
    console.log('✅ GameManager.handleDigitPlacement result:', result);
    return result;
  }
  
  // Handle cell click
  handleCellClick(row, col) {
    console.log('🖱️ GameManager.handleCellClick called:', {
      row,
      col,
      isInitialized: this.isInitialized,
      hasSharedGameLogic: !!this.sharedGameLogic,
      hasGameState: !!this.gameState
    });

    // Check if manager is properly initialized, return early if not
    if (!this.isInitialized || !this.gameState || !this.sharedGameLogic) {
      console.warn('⚠️ GameManager not initialized, ignoring cell click');
      return null;
    }

    const selectedCell = this.sharedGameLogic.handleCellClick(this.gameState, row, col);
    
    console.log('📱 SharedGameLogic returned selectedCell:', selectedCell);

    if (selectedCell) {
      console.log('✅ Setting selectedCell in gameState');
      this.gameState.setSelectedCell(selectedCell);
    }
    
    return selectedCell;
  }
  
  // Handle undo
  handleUndo() {
    // Check if manager is properly initialized, return early if not
    if (!this.isInitialized || !this.gameState || !this.sharedGameLogic) {
      console.warn('⚠️ GameManager not initialized, ignoring undo');
      return false;
    }
    const result = this.sharedGameLogic.handleUndo(this.gameState);
    if (result && typeof this.afterUndo === 'function') {
      try {
        const hookResult = this.afterUndo();
        if (hookResult && typeof hookResult.then === 'function') {
          hookResult.catch(err => console.error('afterUndo hook error (async):', err));
        }
      } catch (hookError) {
        console.error('afterUndo hook error:', hookError);
      }
    }
    return result;
  }
  
  // Toggle notes mode
  toggleNotesMode() {
    // Check if manager is properly initialized, return early if not
    if (!this.isInitialized || !this.gameState || !this.sharedGameLogic) {
      console.warn('⚠️ GameManager not initialized, ignoring notes toggle');
      return;
    }

    this.sharedGameLogic.toggleNotesMode(this.gameState);
  }
  
  // Get current game state snapshot
  getGameStateSnapshot() {
    this.checkInitialization();
    
    return {
      grid: this.gameState.grid,
      originalGrid: this.gameState.originalGrid,
      solution: this.gameState.solution,
      selectedCell: this.gameState.selectedCell,
      selectedNumber: this.gameState.selectedNumber,
      difficulty: this.gameState.difficulty,
      gameStatus: this.gameState.gameStatus,
      timer: this.timer.timer,
      moveHistory: this.gameState.moveHistory,
      lives: this.gameState.lives,
      isNotesMode: this.gameState.isNotesMode,
      notes: this.gameState.notes,
      errorCells: this.gameState.errorCells,
      undosUsed: this.gameState.undosUsed,
      isPaused: this.timer.isPaused,
      isTimerRunning: this.timer.isTimerRunning
    };
  }
  
  // Check if game is complete
  isGameComplete() {
    this.checkInitialization();
    return this.sharedGameLogic.isGameComplete(this.gameState);
  }
  
  // Check if game is over
  isGameOver() {
    this.checkInitialization();
    return this.sharedGameLogic.isGameOver(this.gameState);
  }
  
  // Get formatted time
  getFormattedTime() {
    this.checkInitialization();
    return this.timer.formatTime(this.timer.timer);
  }
  
  // Abstract methods to be implemented by subclasses
  startNewGame(difficulty) {
    throw new Error('startNewGame must be implemented by subclass');
  }
  
  pauseGame() {
    throw new Error('pauseGame must be implemented by subclass');
  }
  
  resumeGame() {
    throw new Error('resumeGame must be implemented by subclass');
  }
  
  cleanup() {
    console.log('🧹 GameManager.cleanup called, current state:', {
      isInitialized: this.isInitialized,
      hasGameState: !!this.gameState,
      hasGameLogic: !!this.gameLogic,
      hasTimer: !!this.timer,
      hasSharedGameLogic: !!this.sharedGameLogic
    });
    
    // Base cleanup - can be extended by subclasses
    if (this.timer) {
      this.timer.stopTimer();
    }
    
    this.gameState = null;
    this.gameLogic = null;
    this.timer = null;
    this.sharedGameLogic = null;
    this.isInitialized = false;
    
    console.log('✅ GameManager cleaned up successfully');
  }
}
