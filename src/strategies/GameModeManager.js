import { SinglePlayerStrategy } from './SinglePlayerStrategy';
import { MultiplayerStrategy } from './MultiplayerStrategy';

/**
 * Game Mode Manager
 * Manages the switching between different game mode strategies
 * Implements the Strategy pattern with dependency injection
 */
export class GameModeManager {
  constructor() {
    this.strategies = new Map();
    this.currentStrategy = null;
    this.multiplayerContext = null;
  }

  /**
   * Initialize the manager with available strategies
   * @param {Object} multiplayerContext - The multiplayer context for multiplayer strategy
   */
  initialize(multiplayerContext = null) {
    this.multiplayerContext = multiplayerContext;
    
    // Register available strategies
    this.strategies.set('single', new SinglePlayerStrategy());
    this.strategies.set('multiplayer', new MultiplayerStrategy(multiplayerContext));
    
    // Set default strategy
    this.setStrategy('single');
  }

  /**
   * Set the current game mode strategy
   * @param {string} mode - The game mode ('single' or 'multiplayer')
   */
  setStrategy(mode) {
    const strategy = this.strategies.get(mode);
    if (!strategy) {
      throw new Error(`Unknown game mode: ${mode}`);
    }
    
    this.currentStrategy = strategy;
    console.log(`Switched to ${mode} player mode`);
  }

  /**
   * Get the current strategy
   * @returns {GameModeStrategy} The current strategy
   */
  getCurrentStrategy() {
    if (!this.currentStrategy) {
      throw new Error('No strategy set. Call initialize() first.');
    }
    return this.currentStrategy;
  }

  /**
   * Get the current mode name
   * @returns {string} The current mode name
   */
  getCurrentMode() {
    return this.getCurrentStrategy().getModeName();
  }

  /**
   * Check if currently in multiplayer mode
   * @returns {boolean} True if in multiplayer mode
   */
  isMultiplayerMode() {
    return this.getCurrentMode() === 'multiplayer';
  }

  /**
   * Check if currently in single player mode
   * @returns {boolean} True if in single player mode
   */
  isSinglePlayerMode() {
    return this.getCurrentMode() === 'single';
  }

  /**
   * Update multiplayer context (needed when context changes)
   * @param {Object} multiplayerContext - The new multiplayer context
   */
  updateMultiplayerContext(multiplayerContext) {
    this.multiplayerContext = multiplayerContext;
    // Update the multiplayer strategy with new context
    const multiplayerStrategy = this.strategies.get('multiplayer');
    if (multiplayerStrategy) {
      multiplayerStrategy.multiplayerContext = multiplayerContext;
    }
  }

  // Delegate methods to current strategy
  async initializeGame(gameData) {
    return this.getCurrentStrategy().initializeGame(gameData);
  }

  saveGameState(gameState) {
    return this.getCurrentStrategy().saveGameState(gameState);
  }

  loadGameState() {
    return this.getCurrentStrategy().loadGameState();
  }

  updateProgress(progress, lives, lostHeart) {
    return this.getCurrentStrategy().updateProgress(progress, lives, lostHeart);
  }

  handleGameCompletion(lives, timer) {
    return this.getCurrentStrategy().handleGameCompletion(lives, timer);
  }

  handleGameOver(difficulty, timer) {
    return this.getCurrentStrategy().handleGameOver(difficulty, timer);
  }

  getTimerProps() {
    return this.getCurrentStrategy().getTimerProps();
  }

  getProgressComponent() {
    return this.getCurrentStrategy().getProgressComponent();
  }

  getDifficultyDisplay() {
    return this.getCurrentStrategy().getDifficultyDisplay();
  }

  handleGameExit() {
    return this.getCurrentStrategy().handleGameExit();
  }

  validateMove(cellIndex, value, grid, originalGrid) {
    return this.getCurrentStrategy().validateMove(cellIndex, value, grid, originalGrid);
  }

  getStorageKey(gameRoomId = null) {
    return this.getCurrentStrategy().getStorageKey(gameRoomId);
  }

  // Multiplayer-specific methods (delegated to multiplayer strategy when applicable)
  calculateProgress(grid, originalGrid) {
    const strategy = this.getCurrentStrategy();
    if (strategy.modeName === 'multiplayer' && strategy.calculateProgress) {
      return strategy.calculateProgress(grid, originalGrid);
    }
    return 0; // Single player doesn't need progress calculation
  }
}



