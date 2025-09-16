import { idclipCheat } from './sudokuUtils';

/**
 * Cheat code functions for the Sudoku game
 * These are DOOM-inspired cheat codes for fun and debugging
 */

/**
 * IDCLIP - Fill a random 3x3 box (DOOM: no-clipping through walls)
 */
export const idclip = (
  grid, 
  solution, 
  setGrid, 
  setGameStatus, 
  setIsTimerRunning, 
  difficulty, 
  timer, 
  lives, 
  isSoundEnabled, 
  setCompletionData, 
  setShowCompletionPopup,
  addGameRecord,
  getDifficultyRecord,
  createPerfectGameSound,
  createCompletionSound
) => {
  if (!grid || !solution) {
    console.log('❌ IDCLIP: No active game to cheat in');
    return;
  }
  
  console.log('🎮 IDCLIP activated! No-clipping through a random 3x3 box...');
  const newGrid = idclipCheat(grid, solution);
  
  // Check if the grid actually changed by comparing content
  const gridChanged = JSON.stringify(newGrid) !== JSON.stringify(grid);
  
  if (gridChanged) {
    
    setGrid(newGrid);
    console.log('✅ IDCLIP: Successfully filled a random 3x3 box!');
    
    // Check if game is now complete
    if (isGridComplete(newGrid)) {
      if (isGridValid(newGrid)) {
        setGameStatus('completed');
        setIsTimerRunning(false);
        
        // Record the completion and show popup
        const recordData = addGameRecord(difficulty, timer);
        
        // Play completion sound (only if sound is enabled)
        if (isSoundEnabled) {
          // Use special sound for perfect games (no mistakes) or new records
          const isPerfectGame = lives === 3;
          const isNewRecord = recordData?.isNewRecord || false;
          
          if (isPerfectGame || isNewRecord) {
            createPerfectGameSound();
          } else {
            createCompletionSound();
          }
        }
        const difficultyRecord = getDifficultyRecord(difficulty);
        
        setCompletionData({
          difficulty,
          timer,
          lives,
          isNewRecord: recordData?.isNewRecord || false,
          bestTime: recordData?.bestTime || difficultyRecord.bestTime,
          totalGamesPlayed: recordData?.totalGames || difficultyRecord.totalGames,
          averageTime: recordData?.averageTime || difficultyRecord.averageTime
        });
        
        // Clear saved game since it's completed
        localStorage.removeItem('sudoku-game-state');
        
        // Show completion popup after a brief delay
        setTimeout(() => {
          setShowCompletionPopup(true);
        }, 500);
      }
    }
  } else {
    console.log('🎮 IDCLIP: No changes made (all boxes might be complete or no incomplete boxes found)');
  }
};

/**
 * Setup cheat codes globally for console access
 */
export const setupCheatCodes = (idclipFn) => {
  // Make idclip work without parentheses using a getter
  Object.defineProperty(window, 'idclip', {
    get: function() {
      idclipFn();
      return 'IDCLIP activated!';
    },
    configurable: true
  });
  
  // Add a help function to list available cheats
  window.cheats = () => {
    console.log('🎮 Available cheat codes:');
    console.log('• idclip - Fill a random 3x3 box (DOOM: no-clipping through walls)');
    console.log('• cheats() - Show this help');
  };
};

/**
 * Cleanup cheat codes from global scope
 */
export const cleanupCheatCodes = () => {
  delete window.idclip;
  delete window.cheats;
};

// Import the required functions from sudokuUtils
import { isGridComplete, isGridValid, addGameRecord, getDifficultyRecord } from './sudokuUtils';
