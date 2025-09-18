/**
 * Base strategy interface for game modes
 * This defines the contract that all game mode strategies must implement
 */
export class GameModeStrategy {
  constructor() {
    if (this.constructor === GameModeStrategy) {
      throw new Error('GameModeStrategy is an abstract class and cannot be instantiated directly');
    }
  }

  // Game initialization
  async initializeGame(gameData) {
    throw new Error('initializeGame must be implemented by subclass');
  }

  // Game state management
  saveGameState(gameState) {
    throw new Error('saveGameState must be implemented by subclass');
  }

  loadGameState() {
    throw new Error('loadGameState must be implemented by subclass');
  }

  // Progress tracking
  updateProgress(progress, lives, lostHeart) {
    throw new Error('updateProgress must be implemented by subclass');
  }

  // Game completion
  handleGameCompletion(lives, timer) {
    throw new Error('handleGameCompletion must be implemented by subclass');
  }

  // Game over
  handleGameOver(difficulty, timer) {
    throw new Error('handleGameOver must be implemented by subclass');
  }

  // Timer management
  getTimerProps() {
    throw new Error('getTimerProps must be implemented by subclass');
  }

  // UI components
  getProgressComponent() {
    throw new Error('getProgressComponent must be implemented by subclass');
  }

  getDifficultyDisplay() {
    throw new Error('getDifficultyDisplay must be implemented by subclass');
  }

  // Game exit
  handleGameExit() {
    throw new Error('handleGameExit must be implemented by subclass');
  }

  // Validation
  validateMove(cellIndex, value, grid, originalGrid) {
    throw new Error('validateMove must be implemented by subclass');
  }

  // Storage key
  getStorageKey(gameRoomId = null) {
    throw new Error('getStorageKey must be implemented by subclass');
  }

  // Game mode identifier
  getModeName() {
    throw new Error('getModeName must be implemented by subclass');
  }
}



