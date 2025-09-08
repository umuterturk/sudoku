import { useCallback } from 'react';
import { isGridComplete, isGridValid, getCompletedSections } from '../utils/shared/sudokuUtils.js';
import { playCompletionSound, playMultipleCompletionSound, createDigitCompletionSound } from '../utils/shared/audioUtils.js';

/**
 * Shared game logic hook for both singleplayer and multiplayer modes
 * Contains common game operations like digit placement, validation, etc.
 */
export const useGameLogic = (gameState, options = {}) => {
  const {
    grid,
    originalGrid,
    solution,
    selectedCell,
    lives,
    previousLives,
    moveHistory,
    notes,
    errorCells,
    undosUsed,
    glowingCompletions,
    setGrid,
    setLives,
    setPreviousLives,
    setMoveHistory,
    setNotes,
    setErrorCells,
    setUndosUsed,
    setIsShaking,
    setSelectedNumber,
    setGlowingCompletions,
    setGameStatus
  } = gameState;
  
  const {
    isSoundEnabled = true,
    onGameComplete,
    onGameOver,
    onWrongMove,
    onCorrectMove,
    isMultiplayer = false
  } = options;
  
  // Check if a digit has been completed (all 9 instances placed)
  const checkDigitCompletion = useCallback((grid, digit) => {
    let count = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === digit) {
          count++;
        }
      }
    }
    return count === 9;
  }, []);
  
  // Handle digit placement in a cell
  const handleDigitPlacement = useCallback(async (digit, customRow = null, customCol = null) => {
    try {
      const [row, col] = customRow !== null && customCol !== null 
        ? [customRow, customCol] 
        : selectedCell || [null, null];
        
      if (row === null || col === null) return false;
      
      // Can't change original cells
      if (!originalGrid || !originalGrid[row] || originalGrid[row][col] !== 0) return false;
      
      // Handle notes mode
      if (options.isNotesMode) {
        return handleNotesMode(digit, row, col);
      }
      
      // Normal digit placement mode
      const previousValue = grid[row][col];
      
      // Only add to history if the value actually changes
      if (previousValue !== digit) {
        setMoveHistory(prev => [...prev, { row, col, previousValue, newValue: digit }]);
      }
      
      const oldGrid = grid.map(r => [...r]);
      const newGrid = grid.map(r => [...r]);
      newGrid[row][col] = digit;
      setGrid(newGrid);
      
      // Clear notes for this cell when placing a digit
      if (digit !== 0) {
        const newNotes = notes.map(r => r.map(c => [...c]));
        newNotes[row][col] = [];
        setNotes(newNotes);
        
        // Automatically set selectedNumber to show hints for the entered number
        setSelectedNumber(digit);
      } else {
        // If clearing the cell (digit is 0), clear the selected number and remove from error list
        setSelectedNumber(null);
        setErrorCells(prev => prev.filter(cell => !(cell.row === row && cell.col === col)));
      }
      
      // Check if the move is wrong (not the correct solution for this cell)
      if (digit !== 0 && solution && digit !== solution[row][col]) {
        handleWrongMove(row, col);
        return false;
      } else if (digit !== 0) {
        handleCorrectMove(oldGrid, newGrid, row, col, digit);
      }
      
      // Check if game is complete
      if (isGridComplete(newGrid)) {
        if (isGridValid(newGrid)) {
          setGameStatus('completed');
          if (onGameComplete) {
            onGameComplete(newGrid);
          }
          return true;
        } else {
          setGameStatus('error');
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('Error in handleDigitPlacement:', error);
      return false;
    }
  }, [selectedCell, originalGrid, grid, solution, notes, lives, previousLives, moveHistory, 
      setGrid, setMoveHistory, setNotes, setSelectedNumber, setErrorCells, setLives, 
      setPreviousLives, setIsShaking, setGlowingCompletions, setGameStatus, 
      onGameComplete, onGameOver, onWrongMove, onCorrectMove, checkDigitCompletion, isSoundEnabled]);
  
  // Handle notes mode digit placement
  const handleNotesMode = useCallback((digit, row, col) => {
    if (digit === 0) {
      // Clear all notes from the selected cell when X is clicked
      const newNotes = notes.map(r => r.map(c => [...c]));
      newNotes[row][col] = [];
      setNotes(newNotes);
      return true;
    }
    
    const newNotes = notes.map(r => r.map(c => [...c]));
    const cellNotes = newNotes[row][col];
    
    if (cellNotes.includes(digit)) {
      // Remove the note if it already exists
      newNotes[row][col] = cellNotes.filter(note => note !== digit);
    } else if (cellNotes.length < 4) {
      // Add the note if there's space (max 4 notes per cell)
      newNotes[row][col] = [...cellNotes, digit].sort();
    }
    
    setNotes(newNotes);
    return true;
  }, [notes, setNotes]);
  
  // Handle wrong move
  const handleWrongMove = useCallback((row, col) => {
    // Trigger shake animation
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
    
    // Add cell to error list
    setErrorCells(prev => {
      const cellKey = `${row}-${col}`;
      if (!prev.some(cell => cell.key === cellKey)) {
        return [...prev, { row, col, key: cellKey }];
      }
      return prev;
    });
    
    setLives(prev => {
      const newLives = prev - 1;
      setPreviousLives(prev);
      if (newLives <= 0) {
        setGameStatus('game-over');
        if (onGameOver) {
          onGameOver();
        }
      }
      return newLives;
    });
    
    if (onWrongMove) {
      onWrongMove(row, col);
    }
  }, [setIsShaking, setErrorCells, setLives, setPreviousLives, setGameStatus, onGameOver, onWrongMove]);
  
  // Handle correct move
  const handleCorrectMove = useCallback((oldGrid, newGrid, row, col, digit) => {
    // Remove cell from error list if it was corrected
    setErrorCells(prev => prev.filter(cell => !(cell.row === row && cell.col === col)));
    
    // Check for completed sections
    const completedSections = getCompletedSections(oldGrid, newGrid, row, col);
    
    // Check if the placed digit is now complete (all 9 instances placed)
    const wasDigitIncomplete = !checkDigitCompletion(oldGrid, digit);
    const isDigitNowComplete = checkDigitCompletion(newGrid, digit);
    
    if (wasDigitIncomplete && isDigitNowComplete) {
      console.log(`🔢 Digit ${digit} is now complete! All 9 instances placed.`);
      
      // Play digit completion sound (only if sound is enabled)
      if (isSoundEnabled) {
        createDigitCompletionSound();
      }
    }
    
    if (completedSections.rows.length > 0 || completedSections.columns.length > 0 || completedSections.boxes.length > 0) {
      // Set the glowing completions
      setGlowingCompletions(completedSections);
      
      // Play completion sound (only if sound is enabled) - but don't overlap with digit completion sound
      if (isSoundEnabled && !(wasDigitIncomplete && isDigitNowComplete)) {
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
        setGlowingCompletions({
          rows: [],
          columns: [],
          boxes: []
        });
      }, 1200);
    }
    
    if (onCorrectMove) {
      onCorrectMove(row, col, digit);
    }
  }, [setErrorCells, setGlowingCompletions, checkDigitCompletion, isSoundEnabled, onCorrectMove]);
  
  // Handle cell click
  const handleCellClick = useCallback((row, col) => {
    try {
      // If clicking on a non-empty cell, highlight same numbers
      const cellValue = grid && grid[row] ? grid[row][col] : 0;
      if (cellValue !== 0) {
        setSelectedNumber(cellValue);
      } else {
        // If clicking on empty cell, clear number highlighting
        setSelectedNumber(null);
      }
      return [row, col];
    } catch (error) {
      console.error('Error in handleCellClick:', error);
      return null;
    }
  }, [grid, setSelectedNumber]);
  
  // Handle undo
  const handleUndo = useCallback(() => {
    try {
      if (moveHistory.length === 0 || undosUsed >= 3) return false;
      
      const lastMove = moveHistory[moveHistory.length - 1];
      if (!lastMove || !grid) {
        console.warn('Invalid undo data, clearing move history');
        setMoveHistory([]);
        return false;
      }
      
      const newGrid = grid.map(r => [...r]);
      newGrid[lastMove.row][lastMove.col] = lastMove.previousValue;
      
      setGrid(newGrid);
      setMoveHistory(prev => prev.slice(0, -1));
      setUndosUsed(prev => prev + 1);
      
      // Update error cells based on the undone move
      const { row, col } = lastMove;
      const restoredValue = lastMove.previousValue;
      
      if (restoredValue === 0) {
        // If we're restoring to an empty cell, remove it from error list
        setErrorCells(prev => prev.filter(cell => !(cell.row === row && cell.col === col)));
      } else if (solution && restoredValue !== solution[row][col]) {
        // If we're restoring a wrong value, add it back to error list
        setErrorCells(prev => {
          const cellKey = `${row}-${col}`;
          if (!prev.some(cell => cell.key === cellKey)) {
            return [...prev, { row, col, key: cellKey }];
          }
          return prev;
        });
      } else {
        // If we're restoring a correct value, remove it from error list
        setErrorCells(prev => prev.filter(cell => !(cell.row === row && cell.col === col)));
      }
      
      return true;
    } catch (error) {
      console.error('Error in handleUndo:', error);
      // Clear move history and reset to safe state
      setMoveHistory([]);
      setUndosUsed(0);
      return false;
    }
  }, [moveHistory, undosUsed, grid, solution, setGrid, setMoveHistory, setUndosUsed, setErrorCells]);
  
  return {
    handleDigitPlacement,
    handleCellClick,
    handleUndo,
    checkDigitCompletion
  };
};
