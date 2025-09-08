import { SingleplayerManager } from './SingleplayerManager.js';
import { MultiplayerManager } from './MultiplayerManager.js';

/**
 * Game Mode Manager
 * Coordinates between singleplayer and multiplayer modes
 * Handles mode switching and provides a unified interface
 */
export class GameModeManager {
  constructor() {
    this.currentMode = 'menu'; // menu, singleplayer, multiplayer
    this.singleplayerManager = new SingleplayerManager();
    this.multiplayerManager = new MultiplayerManager();
    this.activeManager = null;
  }
  
  // Get the current active manager
  getCurrentManager() {
    return this.activeManager;
  }
  
  // Get current mode
  getCurrentMode() {
    return this.currentMode;
  }
  
  // Switch to singleplayer mode
  switchToSingleplayer() {
    console.log('🎯 Switching to singleplayer mode');
    
    // Cleanup previous mode if needed
    if (this.activeManager && this.activeManager !== this.singleplayerManager) {
      this.activeManager.cleanup();
    }
    
    this.currentMode = 'singleplayer';
    this.activeManager = this.singleplayerManager;
    
    return this.singleplayerManager;
  }
  
  // Switch to multiplayer mode
  switchToMultiplayer() {
    console.log('🎮 Switching to multiplayer mode');
    
    // Cleanup previous mode if needed
    if (this.activeManager && this.activeManager !== this.multiplayerManager) {
      this.activeManager.cleanup();
    }
    
    this.currentMode = 'multiplayer';
    this.activeManager = this.multiplayerManager;
    
    return this.multiplayerManager;
  }
  
  // Switch to menu mode
  switchToMenu() {
    console.log('🏠 Switching to menu mode');
    
    // Cleanup current mode
    if (this.activeManager) {
      this.activeManager.cleanup();
    }
    
    this.currentMode = 'menu';
    this.activeManager = null;
  }
  
  // Initialize a mode with game hooks
  initializeMode(mode, gameState, gameLogic, timer, options = {}) {
    switch (mode) {
      case 'singleplayer':
        this.switchToSingleplayer();
        this.singleplayerManager.initialize(gameState, gameLogic, timer, options);
        break;
        
      case 'multiplayer':
        this.switchToMultiplayer();
        this.multiplayerManager.initialize(gameState, gameLogic, timer, options);
        break;
        
      default:
        console.warn(`Unknown mode: ${mode}`);
        break;
    }
  }
  
  // Check if currently in singleplayer mode
  isSingleplayer() {
    return this.currentMode === 'singleplayer';
  }
  
  // Check if currently in multiplayer mode
  isMultiplayer() {
    return this.currentMode === 'multiplayer';
  }
  
  // Check if currently in menu mode
  isMenu() {
    return this.currentMode === 'menu';
  }
  
  // Get mode-specific capabilities
  getModeCapabilities() {
    switch (this.currentMode) {
      case 'singleplayer':
        return {
          canPause: true,
          canSave: true,
          canUndo: true,
          hasHints: true,
          hasNotes: true,
          canReset: true,
          canShare: true
        };
        
      case 'multiplayer':
        return {
          canPause: false,
          canSave: false,
          canUndo: true,
          hasHints: false,
          hasNotes: true,
          canReset: false,
          canShare: false
        };
        
      default:
        return {
          canPause: false,
          canSave: false,
          canUndo: false,
          hasHints: false,
          hasNotes: false,
          canReset: false,
          canShare: false
        };
    }
  }
  
  // Proxy common methods to active manager
  handleDigitPlacement(digit, row, col) {
    if (this.activeManager) {
      return this.activeManager.handleDigitPlacement(digit, row, col);
    }
    return false;
  }
  
  handleCellClick(row, col) {
    if (this.activeManager) {
      return this.activeManager.handleCellClick(row, col);
    }
    return null;
  }
  
  handleUndo() {
    if (this.activeManager) {
      return this.activeManager.handleUndo();
    }
    return false;
  }
  
  toggleNotesMode() {
    if (this.activeManager) {
      this.activeManager.toggleNotesMode();
    }
  }
  
  resetGame() {
    if (this.activeManager) {
      return this.activeManager.resetGame();
    }
    return false;
  }
  
  pauseGame() {
    if (this.activeManager) {
      this.activeManager.pauseGame();
    }
  }
  
  resumeGame() {
    if (this.activeManager) {
      this.activeManager.resumeGame();
    }
  }
  
  getFormattedTime() {
    if (this.activeManager) {
      return this.activeManager.getFormattedTime();
    }
    return '00:00';
  }
  
  getGameStateSnapshot() {
    if (this.activeManager) {
      return this.activeManager.getGameStateSnapshot();
    }
    return null;
  }
  
  isGameComplete() {
    if (this.activeManager) {
      return this.activeManager.isGameComplete();
    }
    return false;
  }
  
  isGameOver() {
    if (this.activeManager) {
      return this.activeManager.isGameOver();
    }
    return false;
  }
  
  // Singleplayer-specific methods
  saveGame() {
    if (this.isSingleplayer()) {
      return this.singleplayerManager.saveGame();
    }
    return false;
  }
  
  loadGame() {
    if (this.isSingleplayer()) {
      return this.singleplayerManager.loadGame();
    }
    return null;
  }
  
  hasSavedGame() {
    if (this.isSingleplayer()) {
      return this.singleplayerManager.hasSavedGame();
    }
    return false;
  }
  
  getSavedGameInfo() {
    if (this.isSingleplayer()) {
      return this.singleplayerManager.getSavedGameInfo();
    }
    return null;
  }
  
  cycleHintLevel() {
    if (this.isSingleplayer()) {
      return this.singleplayerManager.cycleHintLevel();
    }
    return null;
  }
  
  setSoundEnabled(enabled) {
    if (this.isSingleplayer()) {
      this.singleplayerManager.setSoundEnabled(enabled);
    }
  }
  
  // Multiplayer-specific methods
  async createRoom(playerName) {
    if (this.isMultiplayer()) {
      return await this.multiplayerManager.createRoom(playerName);
    }
    throw new Error('Not in multiplayer mode');
  }
  
  async joinRoom(roomId, playerName) {
    if (this.isMultiplayer()) {
      return await this.multiplayerManager.joinRoom(roomId, playerName);
    }
    throw new Error('Not in multiplayer mode');
  }
  
  async startMultiplayerGame() {
    if (this.isMultiplayer()) {
      return await this.multiplayerManager.startMultiplayerGame();
    }
    throw new Error('Not in multiplayer mode');
  }
  
  exitMultiplayer() {
    if (this.isMultiplayer()) {
      this.multiplayerManager.exitMultiplayer();
      this.switchToMenu();
    }
  }
  
  getMultiplayerState() {
    if (this.isMultiplayer()) {
      return this.multiplayerManager.getMultiplayerState();
    }
    return null;
  }
  
  checkAutoStart() {
    if (this.isMultiplayer()) {
      this.multiplayerManager.checkAutoStart();
    }
  }
  
  parseRoomFromUrl() {
    return this.multiplayerManager.parseRoomFromUrl();
  }
  
  // Cleanup all managers
  cleanup() {
    console.log('🧹 Cleaning up GameModeManager');
    
    if (this.singleplayerManager) {
      this.singleplayerManager.cleanup();
    }
    
    if (this.multiplayerManager) {
      this.multiplayerManager.cleanup();
    }
    
    this.activeManager = null;
    this.currentMode = 'menu';
  }
}
