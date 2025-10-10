import { GameModeStrategy } from './GameModeStrategy';

/**
 * Multiplayer game mode strategy
 * Handles all multiplayer game logic and state management
 */
export class MultiplayerStrategy extends GameModeStrategy {
  constructor(multiplayerContext) {
    super();
    this.modeName = 'multiplayer';
    this.multiplayerContext = multiplayerContext;
  }

  async initializeGame(gameData) {
    // Multiplayer initialization logic
    const { gameRoomData, isGameJoined } = this.multiplayerContext;
    
    if (!isGameJoined || !gameData) {
      return { success: false, error: 'Not connected to multiplayer game' };
    }

    // For multiplayer, we just return the game data
    // The actual initialization will be handled by the useMultiplayerGame hook
    return {
      success: true,
      data: gameData,
      revealedCells: gameData.revealedCells || []
    };
  }

  saveGameState(gameState) {
    const storageKey = this.getStorageKey(gameState.gameRoomId);
    const minimalState = {
      grid: gameState.grid,
      originalGrid: gameState.originalGrid,
      difficulty: 'easy', // Multiplayer is always easy
      gameStatus: gameState.gameStatus,
      timer: gameState.timer,
      lives: gameState.lives,
      isPaused: false, // Multiplayer games can't be paused
      errorCells: gameState.errorCells || [],
      gameRoomId: gameState.gameRoomId
    };
    localStorage.setItem(storageKey, JSON.stringify(minimalState));
  }

  loadGameState() {
    const { gameRoomId } = this.multiplayerContext;
    const storageKey = this.getStorageKey(gameRoomId);
    const savedState = localStorage.getItem(storageKey);
    
    if (savedState) {
      try {
        const gameState = JSON.parse(savedState);
        return {
          grid: gameState.grid,
          originalGrid: gameState.originalGrid,
          difficulty: 'easy',
          gameStatus: gameState.gameStatus,
          timer: gameState.timer,
          lives: gameState.lives,
          isPaused: false,
          errorCells: gameState.errorCells || [],
          gameRoomId: gameState.gameRoomId
        };
      } catch (error) {
        console.error('Error loading multiplayer game state:', error);
        return null;
      }
    }
    return null;
  }

  updateProgress(progress, lives, lostHeart) {
    const { updatePlayerProgress } = this.multiplayerContext;
    return updatePlayerProgress(progress, lives, lostHeart);
  }

  handleGameCompletion(lives, timer) {
    const { endGame } = this.multiplayerContext;
    
    // Update final progress to 100%
    this.updateProgress(100, lives, false);
    
    // End the multiplayer game
    endGame('player_won');
    
    return {
      showCompletionPopup: true,
      completionData: {
        time: timer,
        lives: lives,
        difficulty: 'easy',
        isMultiplayer: true
      }
    };
  }

  handleGameOver(difficulty, timer) {
    const { endGame } = this.multiplayerContext;
    
    // End the multiplayer game
    endGame('player_lost');
    
    return {
      showGameOver: true,
      gameOverData: {
        time: timer,
        difficulty: 'easy',
        isMultiplayer: true
      }
    };
  }

  getTimerProps() {
    const { gameStartTime, gameEndTime, gameState } = this.multiplayerContext;
    console.log('🕐 MultiplayerStrategy.getTimerProps() called with:', {
      gameStartTime,
      gameEndTime,
      gameState,
      hasGameStartTime: !!gameStartTime,
      hasGameEndTime: !!gameEndTime,
      gameStartTimeType: gameStartTime ? typeof gameStartTime : 'null',
      gameEndTimeType: gameEndTime ? typeof gameEndTime : 'null'
    });
    
    return {
      isMultiplayerMode: true,
      gameStartTime,
      gameEndTime,
      gameState
    };
  }

  getProgressComponent() {
    const { gameRoomData } = this.multiplayerContext;
    
    if (!gameRoomData) return null;
    
    return {
      type: 'MultiplayerProgress',
      props: {
        creatorProgress: gameRoomData.creator?.progress || 0,
        challengerProgress: gameRoomData.challenger?.progress || 0,
        isCreator: this.multiplayerContext.isGameCreator,
        creatorHearts: gameRoomData.creator?.heartsLeft || 3,
        challengerHearts: gameRoomData.challenger?.heartsLeft || 3,
        creatorLostHeart: gameRoomData.creator?.lostHeart || false,
        challengerLostHeart: gameRoomData.challenger?.lostHeart || false
      }
    };
  }

  getDifficultyDisplay() {
    return {
      show: false // Multiplayer doesn't show difficulty
    };
  }

  handleGameExit() {
    const { exitGame } = this.multiplayerContext;
    return exitGame();
  }

  validateMove(cellIndex, value, grid, originalGrid) {
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

  getStorageKey(gameRoomId = null) {
    const { gameRoomId: contextGameRoomId } = this.multiplayerContext;
    const roomId = gameRoomId || contextGameRoomId;
    return `sudoku-multiplayer-game-${roomId}`;
  }

  getModeName() {
    return this.modeName;
  }

  // Helper methods
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

  // Multiplayer-specific methods
  calculateProgress(grid, originalGrid) {
    let correctCells = 0;
    let totalCells = 0;
    
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (originalGrid[i][j] === 0) {
          totalCells++;
          if (grid[i][j] !== 0) {
            correctCells++;
          }
        }
      }
    }
    
    return totalCells > 0 ? Math.round((correctCells / totalCells) * 100) : 0;
  }
}
