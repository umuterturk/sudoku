import { isGridComplete, isGridValid, getCompletedSections } from '../utils/shared/sudokuUtils.js';
import { playCompletionSound, playMultipleCompletionSound, createDigitCompletionSound } from '../utils/shared/audioUtils.js';

/**
 * Shared Game Logic Service
 * Contains all core game logic that's common between singleplayer and multiplayer modes
 * This ensures both modes behave identically for game mechanics
 */
export class SharedGameLogic {
  constructor(options = {}) {
    this.options = {
      isSoundEnabled: true,
      onGameComplete: null,
      onGameOver: null,
      onCorrectMove: null,
      onWrongMove: null,
      isMultiplayer: false,
      ...options
    };
  }

  // Update options (useful for dynamic changes)
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }

  // Check if a digit has been completed (all 9 instances placed)
  checkDigitCompletion(grid, digit) {
    let count = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === digit) {
          count++;
        }
      }
    }
    return count === 9;
  }

  // Handle digit placement in a cell
  async handleDigitPlacement(gameState, digit, customRow = null, customCol = null) {
    try {
      console.log('🔄 SharedGameLogic.handleDigitPlacement called:', {
        digit,
        customRow,
        customCol,
        selectedCell: gameState.selectedCell,
        hasOriginalGrid: !!gameState.originalGrid,
        hasGrid: !!gameState.grid,
        hasSolution: !!gameState.solution
      });

      const [row, col] = customRow !== null && customCol !== null 
        ? [customRow, customCol] 
        : gameState.selectedCell || [null, null];
      
      console.log('📍 Resolved cell coordinates:', { row, col });
        
      if (row === null || col === null) {
        console.warn('❌ No cell coordinates available');
        return false;
      }
      
      // Check if game is properly initialized for multiplayer
      if (this.options.isMultiplayer && (!gameState.grid || !gameState.originalGrid || !gameState.solution)) {
        console.warn('❌ Multiplayer game not yet initialized. Please wait for room setup to complete.', {
          hasGrid: !!gameState.grid,
          hasOriginalGrid: !!gameState.originalGrid,
          hasSolution: !!gameState.solution
        });
        return false;
      }
      
      // Can't change original cells
      if (!gameState.originalGrid || !gameState.originalGrid[row] || gameState.originalGrid[row][col] !== 0) {
        return false;
      }
      
      // Handle notes mode
      if (gameState.isNotesMode) {
        return this.handleNotesMode(gameState, digit, row, col);
      }
      
      // Normal digit placement mode
      const previousValue = gameState.grid[row][col];
      
      // Only add to history if the value actually changes
      if (previousValue !== digit) {
        gameState.setMoveHistory(prev => [...prev, { row, col, previousValue, newValue: digit }]);
      }
      
      const oldGrid = gameState.grid.map(r => [...r]);
      const newGrid = gameState.grid.map(r => [...r]);
      newGrid[row][col] = digit;
      gameState.setGrid(newGrid);
      
      // Clear notes for this cell when placing a digit
      if (digit !== 0) {
        const newNotes = gameState.notes.map(r => r.map(c => [...c]));
        newNotes[row][col] = [];
        gameState.setNotes(newNotes);
        
        // Automatically set selectedNumber to show hints for the entered number
        gameState.setSelectedNumber(digit);
      } else {
        // If clearing the cell (digit is 0), clear the selected number and remove from error list
        gameState.setSelectedNumber(null);
        gameState.setErrorCells(prev => prev.filter(cell => !(cell.row === row && cell.col === col)));
      }
      
      // Check if the move is wrong (not the correct solution for this cell)
      if (digit !== 0 && gameState.solution && digit !== gameState.solution[row][col]) {
        this.handleWrongMove(gameState, row, col);
        return false;
      } else if (digit !== 0) {
        this.handleCorrectMove(gameState, oldGrid, newGrid, row, col, digit);
      }
      
      // Check if game is complete
      if (isGridComplete(newGrid)) {
        if (isGridValid(newGrid)) {
          gameState.setGameStatus('completed');
          if (this.options.onGameComplete) {
            this.options.onGameComplete(newGrid);
          }
          return true;
        } else {
          gameState.setGameStatus('error');
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('Error in SharedGameLogic.handleDigitPlacement:', error);
      return false;
    }
  }

  // Handle notes mode digit placement
  handleNotesMode(gameState, digit, row, col) {
    if (digit === 0) {
      // Clear all notes from the selected cell when X is clicked
      const newNotes = gameState.notes.map(r => r.map(c => [...c]));
      newNotes[row][col] = [];
      gameState.setNotes(newNotes);
      return true;
    }
    
    const newNotes = gameState.notes.map(r => r.map(c => [...c]));
    const cellNotes = newNotes[row][col];
    
    if (cellNotes.includes(digit)) {
      // Remove the note if it already exists
      newNotes[row][col] = cellNotes.filter(note => note !== digit);
    } else if (cellNotes.length < 4) {
      // Add the note if there's space (max 4 notes per cell)
      newNotes[row][col] = [...cellNotes, digit].sort();
    }
    
    gameState.setNotes(newNotes);
    return true;
  }

  // Handle wrong move
  handleWrongMove(gameState, row, col) {
    // Trigger shake animation
    gameState.setIsShaking(true);
    setTimeout(() => gameState.setIsShaking(false), 600);
    
    // Add cell to error list
    gameState.setErrorCells(prev => {
      const cellKey = `${row}-${col}`;
      if (!prev.some(cell => cell.key === cellKey)) {
        return [...prev, { row, col, key: cellKey }];
      }
      return prev;
    });
    
    gameState.setLives(prev => {
      const newLives = prev - 1;
      console.log('❤️ Heart decrement (local):', { before: prev, after: newLives, row, col });
      gameState.setPreviousLives(prev);
  if (newLives < 0) {
        gameState.setGameStatus('game-over');
        if (this.options.onGameOver) {
          this.options.onGameOver();
        }
      }
      return newLives;
    });
    
    if (this.options.onWrongMove) {
      this.options.onWrongMove(row, col);
    }
  }

  // Handle correct move
  handleCorrectMove(gameState, oldGrid, newGrid, row, col, digit) {
    // Remove cell from error list if it was corrected
    gameState.setErrorCells(prev => prev.filter(cell => !(cell.row === row && cell.col === col)));
    
    // Check for completed sections
    const completedSections = getCompletedSections(oldGrid, newGrid, row, col);
    
    // Check if the placed digit is now complete (all 9 instances placed)
    const wasDigitIncomplete = !this.checkDigitCompletion(oldGrid, digit);
    const isDigitNowComplete = this.checkDigitCompletion(newGrid, digit);
    
    if (wasDigitIncomplete && isDigitNowComplete) {
      console.log(`🔢 Digit ${digit} is now complete! All 9 instances placed.`);
      
      // Play digit completion sound (only if sound is enabled)
      if (this.options.isSoundEnabled) {
        createDigitCompletionSound();
      }
    }
    
    if (completedSections.rows.length > 0 || completedSections.columns.length > 0 || completedSections.boxes.length > 0) {
      // Set the glowing completions
      gameState.setGlowingCompletions(completedSections);
      
      // Play completion sound (only if sound is enabled) - but don't overlap with digit completion sound
      if (this.options.isSoundEnabled && !(wasDigitIncomplete && isDigitNowComplete)) {
        const totalCompletions = completedSections.rows.length + completedSections.columns.length + completedSections.boxes.length;
        if (totalCompletions > 1) {
          // Multiple completions - play elaborate sound
          playMultipleCompletionSound();
        } else {
          // Single completion - play appropriate sound
          playCompletionSound(completedSections);
        }
      }
      
      // Clear the glow after animation duration
      setTimeout(() => {
        gameState.setGlowingCompletions({
          rows: [],
          columns: [],
          boxes: []
        });
      }, 1200);
    }
    
    if (this.options.onCorrectMove) {
      this.options.onCorrectMove(row, col, digit);
    }
  }

  // Handle cell click
  handleCellClick(gameState, row, col) {
    try {
      console.log('🖱️ SharedGameLogic.handleCellClick called:', {
        row,
        col,
        hasGrid: !!gameState.grid,
        currentSelectedCell: gameState.selectedCell
      });

      // If clicking on a non-empty cell, highlight same numbers
      const cellValue = gameState.grid && gameState.grid[row] ? gameState.grid[row][col] : 0;
      console.log('📱 Cell value:', cellValue);

      if (cellValue !== 0) {
        console.log('🔢 Setting selected number:', cellValue);
        gameState.setSelectedNumber(cellValue);
      } else {
        console.log('🔄 Clearing selected number');
        gameState.setSelectedNumber(null);
      }

      console.log('✅ Returning selected cell:', [row, col]);
      return [row, col];
    } catch (error) {
      console.error('Error in SharedGameLogic.handleCellClick:', error);
      return null;
    }
  }

  // Handle undo
  handleUndo(gameState) {
    try {
      if (gameState.moveHistory.length === 0 || gameState.undosUsed >= 3) return false;
      
      const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
      if (!lastMove || !gameState.grid) {
        console.warn('Invalid undo data, clearing move history');
        gameState.setMoveHistory([]);
        return false;
      }
      
      const newGrid = gameState.grid.map(r => [...r]);
      newGrid[lastMove.row][lastMove.col] = lastMove.previousValue;
      
      gameState.setGrid(newGrid);
      gameState.setMoveHistory(prev => prev.slice(0, -1));
      gameState.setUndosUsed(prev => prev + 1);
      
      // Update error cells based on the undone move
      const { row, col } = lastMove;
      const restoredValue = lastMove.previousValue;
      
      if (restoredValue === 0) {
        // If we're restoring to an empty cell, remove it from error list
        gameState.setErrorCells(prev => prev.filter(cell => !(cell.row === row && cell.col === col)));
      } else if (gameState.solution && restoredValue !== gameState.solution[row][col]) {
        // If we're restoring a wrong value, add it back to error list
        gameState.setErrorCells(prev => {
          const cellKey = `${row}-${col}`;
          if (!prev.some(cell => cell.key === cellKey)) {
            return [...prev, { row, col, key: cellKey }];
          }
          return prev;
        });
      } else {
        // If we're restoring a correct value, remove it from error list
        gameState.setErrorCells(prev => prev.filter(cell => !(cell.row === row && cell.col === col)));
      }
      
      return true;
    } catch (error) {
      console.error('Error in SharedGameLogic.handleUndo:', error);
      // Clear move history and reset to safe state
      gameState.setMoveHistory([]);
      gameState.setUndosUsed(0);
      return false;
    }
  }

  // Toggle notes mode
  toggleNotesMode(gameState) {
    gameState.setIsNotesMode(!gameState.isNotesMode);
  }

  // Check if game is complete
  isGameComplete(gameState) {
    return gameState.gameStatus === 'completed';
  }

  // Check if game is over
  isGameOver(gameState) {
    return gameState.gameStatus === 'game-over';
  }

  // Reset game to original state
  resetGame(gameState, timer) {
    if (!gameState.originalGrid) {
      console.warn('No original grid available for reset');
      return false;
    }
    
    gameState.setGrid(gameState.originalGrid.map(row => [...row]));
    gameState.setSelectedCell(null);
    gameState.setSelectedNumber(null);
    gameState.setGameStatus('playing');
    gameState.setMoveHistory([]);
    gameState.setLives(3);
    gameState.setPreviousLives(3);
    gameState.setIsShaking(false);
    gameState.setIsNotesMode(false);
    gameState.setNotes(Array(9).fill().map(() => Array(9).fill().map(() => [])));
    gameState.setErrorCells([]);
    gameState.setUndosUsed(0);
    gameState.setGlowingCompletions({
      rows: [],
      columns: [],
      boxes: []
    });
    
    if (timer) {
      timer.resetTimer();
      timer.startTimer();
    }
    
    return true;
  }
}
