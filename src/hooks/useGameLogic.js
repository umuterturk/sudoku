import { useEffect } from 'react';
import { isGridComplete, isGridValid, getCompletedSections, addGameRecord, getDifficultyRecord } from '../utils/sudokuUtils';
import { playCompletionSound, playMultipleCompletionSound, createCompletionSound, createPerfectGameSound, createDigitCompletionSound } from '../utils/audioUtils';
import { useGameContext } from '../contexts/GameContext';

/**
 * Custom hook for managing core game logic
 */
export const useGameLogic = (
  grid,
  setGrid,
  originalGrid,
  setOriginalGrid,
  solution,
  setSolution,
  selectedCell,
  setSelectedCell,
  selectedNumber,
  setSelectedNumber,
  difficulty,
  setDifficulty,
  gameStatus,
  setGameStatus,
  lives,
  setLives,
  isShaking,
  setIsShaking,
  hintLevel,
  setHintLevel,
  isPaused,
  setIsPaused,
  isAnimating,
  setIsAnimating,
  animationGrid,
  setAnimationGrid,
  isNotesMode,
  setIsNotesMode,
  notes,
  setNotes,
  highlightedCells,
  setHighlightedCells,
  errorCells,
  setErrorCells,
  correctCells,
  setCorrectCells,
  glowingCompletions,
  setGlowingCompletions,
  timer,
  setTimer,
  isTimerRunning,
  setIsTimerRunning,
  isSoundEnabled,
  setIsSoundEnabled,
  completionData,
  setCompletionData,
  showCompletionPopup,
  setShowCompletionPopup,
  initializeFallbackGame
) => {
  // Get game context with strategy pattern
  const { gameModeManager } = useGameContext();

  // Function to check if a digit has been completed (all 9 instances placed)
  const checkDigitCompletion = (grid, digit) => {
    let count = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === digit) {
          count++;
        }
      }
    }
    return count === 9; // Return true if all 9 instances are placed
  };

  // Calculate progress using strategy pattern
  const calculateProgress = (currentGrid, originalGrid) => {
    return gameModeManager.calculateProgress(currentGrid, originalGrid);
  };

  const handleDigitSelect = (digit) => {
    try {
      if (!selectedCell) return;
      
      const [row, col] = selectedCell;
      if (!originalGrid || !originalGrid[row] || originalGrid[row][col] !== 0) return; // Can't change original cells
      
      // Check if this cell has a correct digit that shouldn't be changed
      const cellKey = `${row}-${col}`;
      const isCorrectCell = correctCells.some(cell => cell.key === cellKey);
      if (isCorrectCell) {
        // Don't allow changing or clearing correct digits
        return;
      }
      
      // If there are error cells and user is trying to select a different cell, block it
      if (errorCells.length > 0 && digit !== 0) {
        const hasErrorInSelectedCell = errorCells.some(cell => cell.key === cellKey);
        if (!hasErrorInSelectedCell) {
          // User is trying to enter a digit in a cell that doesn't have an error
          // Block this action until errors are cleared
          return;
        }
      }
      
      if (isNotesMode) {
        // Handle notes mode
        if (digit === 0) {
          // Clear all notes from the selected cell when X is clicked
          const newNotes = notes.map(r => r.map(c => [...c]));
          newNotes[row][col] = [];
          setNotes(newNotes);
          return;
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
        return;
      }
      
      // Normal digit placement mode
      const previousValue = grid[row][col];
      
      
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
        // Trigger shake animation
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600); // Match animation duration
        
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
          if (newLives < 0) {
            setGameStatus('game-over');
            setIsTimerRunning(false);
            // Track game over event
            trackGameOver(difficulty, timer);
            
            // Handle game over using strategy pattern
            const gameOverResult = gameModeManager.handleGameOver(difficulty, timer);
            if (gameOverResult.showGameOver) {
              // Handle game over UI if needed
            }
          }
          
          // Update progress when losing a heart using strategy pattern
          const progress = calculateProgress(newGrid, originalGrid);
          gameModeManager.updateProgress(progress, newLives, true);
          
          return newLives;
        });
      } else if (digit !== 0) {
        // Remove cell from error list if it was corrected
        setErrorCells(prev => prev.filter(cell => !(cell.row === row && cell.col === col)));
        
        // Add this cell to correct cells list since it's a correct digit
        setCorrectCells(prev => {
          const cellKey = `${row}-${col}`;
          if (!prev.some(cell => cell.key === cellKey)) {
            return [...prev, { row, col, key: cellKey }];
          }
          return prev;
        });
        
        // Update progress for correct moves using strategy pattern
        const progress = calculateProgress(newGrid, originalGrid);
        gameModeManager.updateProgress(progress, lives, false);
        
        // Check for completed sections (only if it's a correct move)
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
          }, 1200); // Match CSS animation duration (1.2s)
        }
      }

      // Check if game is complete
      if (isGridComplete(newGrid)) {
        if (isGridValid(newGrid)) {
          setGameStatus('completed');
          setIsTimerRunning(false);
          
          // Track game completion
          trackGameCompleted(difficulty, timer, lives);
          
          // Handle game completion using strategy pattern
          const completionResult = gameModeManager.handleGameCompletion(lives, timer);
          if (completionResult.showCompletionPopup) {
            setCompletionData(completionResult.completionData);
            setShowCompletionPopup(true);
          } else {
            // Single player game completion logic
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
            
            // Show completion popup after a brief delay for better UX
            setTimeout(() => {
              setShowCompletionPopup(true);
            }, 500);
          }
        } else {
          setGameStatus('error');
        }
      } else if (gameStatus === 'error' && isGridValid(newGrid)) {
        setGameStatus('playing');
      }
    } catch (error) {
      console.error('Error in handleDigitSelect:', error);
      // Try to recover by resetting to a safe state
      try {
        if (grid && originalGrid) {
          setGrid(originalGrid.map(row => [...row]));
          setErrorCells([]);
          setGameStatus('playing');
        }
      } catch (recoveryError) {
        console.error('Failed to recover from digit select error:', recoveryError);
        initializeFallbackGame();
      }
    }
  };

  const handleCellClick = (row, col) => {
    try {
      // If there are error cells, only allow clicking on cells with errors
      if (errorCells.length > 0) {
        const cellKey = `${row}-${col}`;
        const hasErrorInClickedCell = errorCells.some(cell => cell.key === cellKey);
        if (!hasErrorInClickedCell) {
          // Block clicking on cells that don't have errors
          return;
        }
      }
      
      setSelectedCell([row, col]);
      
      // If clicking on a non-empty cell, highlight same numbers
      const cellValue = grid && grid[row] ? grid[row][col] : 0;
      if (cellValue !== 0) {
        setSelectedNumber(cellValue);
      } else {
        // If clicking on empty cell, clear number highlighting
        setSelectedNumber(null);
      }
    } catch (error) {
      console.error('Error in handleCellClick:', error);
      // Reset to safe state
      setSelectedCell(null);
      setSelectedNumber(null);
    }
  };

  const resetGame = () => {
    try {
      if (!originalGrid) {
        console.warn('No original grid available for reset, initializing fallback');
        initializeFallbackGame();
        return;
      }
      
      setGrid(originalGrid.map(row => [...row]));
      setSelectedCell(null);
      setSelectedNumber(null);
      setGameStatus('playing');
      setTimer(0);
      setIsTimerRunning(true);
      setLives(3);
      setIsShaking(false);
      setIsNotesMode(false);
      setNotes(Array(9).fill().map(() => Array(9).fill().map(() => [])));
      setIsPaused(false);
      setErrorCells([]);
      setCorrectCells([]);
      setGlowingCompletions({
        rows: [],
        columns: [],
        boxes: []
      });
    } catch (error) {
      console.error('Error in resetGame:', error);
      initializeFallbackGame();
    }
  };


  const handleNotesToggle = () => {
    setIsNotesMode(!isNotesMode);
  };

  const handlePauseToggle = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    // Start or stop timer based on pause state and game status
    if (!newPausedState && gameStatus === 'playing') {
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
    }
  };

  // Opponent disconnection is now handled by the multiplayer strategy
  // No need for this logic in the main game logic hook

  return {
    handleDigitSelect,
    handleCellClick,
    resetGame,
    handleNotesToggle,
    handlePauseToggle,
    checkDigitCompletion,
    calculateProgress
  };
};
