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
  }
  
  // Initialize the game manager with hooks
  initialize(gameState, gameLogic, timer) {
    this.gameState = gameState;
    this.gameLogic = gameLogic;
    this.timer = timer;
    this.isInitialized = true;
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
    
    if (!this.gameState.originalGrid) {
      console.warn('No original grid available for reset');
      return false;
    }
    
    this.gameState.setGrid(this.gameState.originalGrid.map(row => [...row]));
    this.gameState.setSelectedCell(null);
    this.gameState.setSelectedNumber(null);
    this.gameState.setGameStatus('playing');
    this.gameState.setMoveHistory([]);
    this.gameState.setLives(3);
    this.gameState.setPreviousLives(3);
    this.gameState.setIsShaking(false);
    this.gameState.setIsNotesMode(false);
    this.gameState.setNotes(Array(9).fill().map(() => Array(9).fill().map(() => [])));
    this.gameState.setErrorCells([]);
    this.gameState.setUndosUsed(0);
    this.gameState.setGlowingCompletions({
      rows: [],
      columns: [],
      boxes: []
    });
    
    this.timer.resetTimer();
    this.timer.startTimer();
    
    return true;
  }
  
  // Handle digit placement
  handleDigitPlacement(digit, row = null, col = null) {
    this.checkInitialization();
    return this.gameLogic.handleDigitPlacement(digit, row, col);
  }
  
  // Handle cell click
  handleCellClick(row, col) {
    this.checkInitialization();
    const selectedCell = this.gameLogic.handleCellClick(row, col);
    if (selectedCell) {
      this.gameState.setSelectedCell(selectedCell);
    }
    return selectedCell;
  }
  
  // Handle undo
  handleUndo() {
    this.checkInitialization();
    return this.gameLogic.handleUndo();
  }
  
  // Toggle notes mode
  toggleNotesMode() {
    this.checkInitialization();
    this.gameState.setIsNotesMode(!this.gameState.isNotesMode);
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
    return this.gameState.gameStatus === 'completed';
  }
  
  // Check if game is over
  isGameOver() {
    this.checkInitialization();
    return this.gameState.gameStatus === 'game-over';
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
    // Base cleanup - can be extended by subclasses
    if (this.timer) {
      this.timer.stopTimer();
    }
    this.isInitialized = false;
  }
}
