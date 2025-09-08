import { GameManager } from './GameManager.js';
import { generatePuzzle, addGameRecord, getDifficultyRecord } from '../utils/shared/sudokuUtils.js';
import { saveGameState, loadGameState, clearSavedGame, hasSavedGame, getSavedGameInfo } from '../utils/singleplayer/saveGameUtils.js';
import { trackGameStarted, trackGameCompleted, trackGameOver } from '../utils/shared/analytics.js';

/**
 * Singleplayer Game Manager
 * Handles singleplayer-specific functionality like save/load, pause/resume
 */
export class SingleplayerManager extends GameManager {
  constructor() {
    super();
    this.hintLevel = 'medium';
    this.autoHintTimer = null;
    this.lastMoveTime = Date.now();
    this.isSoundEnabled = true;
  }
  
  // Initialize with additional singleplayer-specific options
  initialize(gameState, gameLogic, timer, options = {}) {
    console.log('🔄 SingleplayerManager.initialize called with:', {
      hasGameState: !!gameState,
      hasGameLogic: !!gameLogic,
      hasTimer: !!timer,
      options
    });
    
    this.hintLevel = options.hintLevel || 'medium';
    this.isSoundEnabled = options.isSoundEnabled !== undefined ? options.isSoundEnabled : true;
    
    // Initialize base class with callbacks
    super.initialize(gameState, gameLogic, timer, {
      isSoundEnabled: this.isSoundEnabled,
      onGameComplete: this.handleGameComplete.bind(this),
      onGameOver: this.handleGameOver.bind(this),
      onCorrectMove: this.handleCorrectMove.bind(this),
      onWrongMove: this.handleWrongMove.bind(this),
      isMultiplayer: false
    });
    
    console.log('✅ SingleplayerManager initialized successfully');
  }
  
  // Start a new singleplayer game
  async startNewGame(difficulty = 'medium') {
    console.log('🎮 SingleplayerManager.startNewGame called:', {
      difficulty,
      isInitialized: this.isInitialized,
      hasGameState: !!this.gameState,
      hasGameLogic: !!this.gameLogic,
      hasTimer: !!this.timer
    });
    
    this.checkInitialization();
    
    try {
      console.log(`🎮 Starting new ${difficulty} singleplayer game...`);
      
      // Generate puzzle
      const { puzzle, solution } = await generatePuzzle(difficulty, false);
      
      console.log('🧩 Puzzle generated:', {
        hasPuzzle: !!puzzle,
        hasSolution: !!solution,
        puzzleSize: puzzle?.length
      });
      
      // Initialize game state
      this.gameState.initializeGame({
        puzzle,
        solution: solution,
        selectedDifficulty: difficulty
      });
      
      // Clear any existing saved game
      clearSavedGame();
      
      // Reset and start timer
      this.timer.resetTimer(0);
      this.timer.startTimer();
      
      // Reset auto-hint system
      this.resetAutoHintSystem();
      
      // Track game started
      trackGameStarted(difficulty);
      
      console.log(`✨ Singleplayer game started successfully!`);
      return true;
      
    } catch (error) {
      console.error('Failed to start new singleplayer game:', error);
      return false;
    }
  }
  
  // Pause the game
  pauseGame() {
    this.checkInitialization();
    this.timer.pauseTimer();
    this.clearAutoHintTimer();
  }
  
  // Resume the game
  resumeGame() {
    this.checkInitialization();
    if (this.gameState.gameStatus === 'playing') {
      this.timer.resumeTimer();
      this.setupAutoHintTimer();
    }
  }
  
  // Save current game state
  saveGame() {
    this.checkInitialization();
    
    if (this.gameState.gameStatus === 'completed') {
      console.log('Game is completed, not saving');
      return false;
    }
    
    const gameStateSnapshot = {
      ...this.getGameStateSnapshot(),
      hintLevel: this.hintLevel,
      lastMoveTime: this.lastMoveTime
    };
    
    return saveGameState(gameStateSnapshot);
  }
  
  // Load saved game state
  loadGame() {
    this.checkInitialization();
    
    const savedState = loadGameState();
    if (!savedState) {
      return null;
    }
    
    // Restore game state
    this.gameState.setGrid(savedState.grid);
    this.gameState.setOriginalGrid(savedState.originalGrid);
    this.gameState.setSolution(savedState.solution);
    this.gameState.setSelectedCell(savedState.selectedCell);
    this.gameState.setSelectedNumber(savedState.selectedNumber);
    this.gameState.setDifficulty(savedState.difficulty);
    this.gameState.setGameStatus('playing'); // Always set to playing for continue
    this.gameState.setMoveHistory(savedState.moveHistory || []);
    this.gameState.setLives(savedState.lives !== undefined ? savedState.lives : 3);
    this.gameState.setIsNotesMode(savedState.isNotesMode || false);
    this.gameState.setNotes(savedState.notes || Array(9).fill().map(() => Array(9).fill().map(() => [])));
    this.gameState.setErrorCells(savedState.errorCells || []);
    this.gameState.setUndosUsed(savedState.undosUsed || 0);
    
    // Restore timer
    this.timer.resetTimer(savedState.timer || 0);
    
    // Restore hint level
    this.hintLevel = savedState.hintLevel || 'medium';
    this.lastMoveTime = savedState.lastMoveTime || Date.now();
    
    return savedState;
  }
  
  // Check if there's a saved game
  hasSavedGame() {
    return hasSavedGame();
  }
  
  // Get saved game info
  getSavedGameInfo() {
    return getSavedGameInfo();
  }
  
  // Handle game completion
  handleGameComplete(grid) {
    this.timer.stopTimer();
    
    // Track game completion
    trackGameCompleted(this.gameState.difficulty, this.timer.timer, this.gameState.lives);
    
    // Record the completion
    const recordData = addGameRecord(this.gameState.difficulty, this.timer.timer);
    const difficultyRecord = getDifficultyRecord(this.gameState.difficulty);
    
    const completionData = {
      difficulty: this.gameState.difficulty,
      timer: this.timer.timer,
      lives: this.gameState.lives,
      isNewRecord: recordData?.isNewRecord || false,
      bestTime: recordData?.bestTime || difficultyRecord.bestTime,
      totalGamesPlayed: recordData?.totalGames || difficultyRecord.totalGames,
      averageTime: recordData?.averageTime || difficultyRecord.averageTime
    };
    
    // Clear saved game since it's completed
    clearSavedGame();
    
    return completionData;
  }
  
  // Handle game over
  handleGameOver() {
    this.timer.stopTimer();
    this.clearAutoHintTimer();
    
    // Track game over event
    trackGameOver(this.gameState.difficulty, this.timer.timer);
  }
  
  // Handle correct move
  handleCorrectMove(row, col, digit) {
    this.lastMoveTime = Date.now();
    this.setupAutoHintTimer();
  }
  
  // Handle wrong move
  handleWrongMove(row, col) {
    this.lastMoveTime = Date.now();
    this.setupAutoHintTimer();
  }
  
  // Set hint level
  setHintLevel(level) {
    const validLevels = ['arcade', 'hard', 'medium', 'novice'];
    if (validLevels.includes(level)) {
      this.hintLevel = level;
    }
  }
  
  // Cycle hint level
  cycleHintLevel() {
    const hintLevels = ['medium', 'novice', 'arcade', 'hard'];
    const currentIndex = hintLevels.indexOf(this.hintLevel);
    const nextIndex = (currentIndex + 1) % hintLevels.length;
    this.hintLevel = hintLevels[nextIndex];
    return this.hintLevel;
  }
  
  // Set sound enabled
  setSoundEnabled(enabled) {
    this.isSoundEnabled = enabled;
    if (this.sharedGameLogic) {
      this.sharedGameLogic.updateOptions({ isSoundEnabled: enabled });
    }
  }
  
  // Auto-hint system for easy and children modes
  setupAutoHintTimer() {
    // Only enable auto-hint for easy and children modes
    if (this.gameState.difficulty !== 'easy' && this.gameState.difficulty !== 'children') {
      return;
    }
    
    // Only track moves during active gameplay
    if (this.gameState.gameStatus !== 'playing' || this.timer.isPaused || this.gameState.isAnimating) {
      return;
    }
    
    // Clear existing auto-hint timer
    this.clearAutoHintTimer();
    
    // Set up new 2-minute inactivity timer
    this.autoHintTimer = setTimeout(() => {
      console.log('🤖 2 minutes of inactivity detected, triggering auto-hint');
      this.showAutoHint();
    }, 120000); // 2 minutes = 120,000 milliseconds
  }
  
  clearAutoHintTimer() {
    if (this.autoHintTimer) {
      clearTimeout(this.autoHintTimer);
      this.autoHintTimer = null;
    }
  }
  
  resetAutoHintSystem() {
    this.lastMoveTime = Date.now();
    this.clearAutoHintTimer();
  }
  
  // Show automatic hint (placeholder - would need to implement hint logic)
  showAutoHint() {
    console.log('🤖 Auto-hint triggered for inactivity!');
    // This would integrate with the hint system from the original code
    // For now, it's a placeholder
  }
  
  // Auto-save game state periodically
  autoSave() {
    if (this.gameState.grid && this.gameState.originalGrid && this.gameState.gameStatus !== 'completed') {
      this.saveGame();
    }
  }
  
  // Cleanup
  cleanup() {
    console.log('🧹 SingleplayerManager.cleanup called');
    super.cleanup();
    this.clearAutoHintTimer();
    console.log('✅ SingleplayerManager cleaned up successfully');
  }
}
