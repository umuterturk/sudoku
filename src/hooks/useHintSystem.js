import { useEffect } from 'react';
import { findCellsWithOnePossibility } from '../utils/sudokuUtils';
import { trackHintUsed } from '../utils/analytics';
import { createHintSound } from '../utils/audioUtils';

/**
 * Custom hook for managing hint system functionality
 */
export const useHintSystem = (
  grid,
  difficulty,
  gameStatus,
  isPaused,
  isAnimating,
  setLastMoveTime,
  autoHintTimer,
  setAutoHintTimer,
  hintLevel,
  setHintLevel,
  highlightedCells,
  setHighlightedCells,
  isLongPressTriggered,
  setIsLongPressTriggered,
  longPressTimer,
  setLongPressTimer,
  isSoundEnabled
) => {

  // Auto-hint system: track moves and set up inactivity timer
  useEffect(() => {
    // Only enable auto-hint for easy and children modes
    if (difficulty !== 'easy' && difficulty !== 'children') {
      return;
    }

    // Only track moves during active gameplay
    if (gameStatus !== 'playing' || isPaused || isAnimating) {
      return;
    }

    // Update last move time whenever move history changes
    setLastMoveTime(Date.now());
    
    // Clear existing auto-hint timer
    if (autoHintTimer) {
      clearTimeout(autoHintTimer);
    }

    // Set up new 3-minute inactivity timer
    const timer = setTimeout(() => {
      console.log('🤖 2 minutes of inactivity detected, triggering auto-hint');
      showAutoHint();
    }, 120000); // 2 minutes = 120,000 milliseconds

    setAutoHintTimer(timer);

    // Cleanup timer on unmount or dependency change
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [difficulty, gameStatus, isPaused, isAnimating]);

  // Clean up auto-hint timer when game ends or pauses
  useEffect(() => {
    if (gameStatus !== 'playing' || isPaused) {
      if (autoHintTimer) {
        clearTimeout(autoHintTimer);
        setAutoHintTimer(null);
      }
    }
  }, [gameStatus, isPaused]);

  // Function to show automatic hint for easy/children modes
  const showAutoHint = () => {
    console.log('🤖 Auto-hint triggered for inactivity!');
    
    if (!grid) {
      console.log('❌ No grid available for auto-hint');
      return;
    }
    
    // Find cells with only one possibility
    const cellsWithOnePossibility = findCellsWithOnePossibility(grid);
    
    if (cellsWithOnePossibility.length === 0) {
      console.log('❌ No cells with single possibility found for auto-hint');
      return;
    }
    
    // Show only ONE random cell with a single possibility
    const randomIndex = Math.floor(Math.random() * cellsWithOnePossibility.length);
    const selectedCell = cellsWithOnePossibility[randomIndex];
    
    console.log(`🤖 Auto-hint: showing cell (${selectedCell.row}, ${selectedCell.col}) with value ${selectedCell.number}`);
    
    // Highlight just this one cell
    setHighlightedCells([{
      row: selectedCell.row,
      col: selectedCell.col
    }]);
    
    // Play gentle hint sound (only if sound is enabled)
    if (isSoundEnabled) {
      createHintSound();
    }
    
    // Remove the highlight after 5 seconds (longer for auto-hint)
    setTimeout(() => {
      console.log('🤖 Removing auto-hint highlight after 5 seconds');
      setHighlightedCells([]);
    }, 5000);
    
    // Track auto-hint usage
    trackHintUsed('auto', difficulty);
  };

  const handleHintClick = (event) => {
    console.log('🔄 Hint click event triggered, isLongPressTriggered:', isLongPressTriggered);
    
    // Don't change hint level if this was a long press
    if (isLongPressTriggered) {
      console.log('🚫 Preventing hint level change due to long press');
      setIsLongPressTriggered(false); // Reset the flag
      event.target.blur();
      return;
    }
    
    // Cycle through hint levels in round-robin style starting with medium
    const hintLevels = ['medium', 'novice', 'arcade', 'hard'];
    const currentIndex = hintLevels.indexOf(hintLevel);
    const nextIndex = (currentIndex + 1) % hintLevels.length;
    const newHintLevel = hintLevels[nextIndex];
    setHintLevel(newHintLevel);
    
    // Track hint usage
    trackHintUsed(newHintLevel, difficulty);
    
    console.log('🔄 Hint level changed to:', newHintLevel);
    
    // Remove focus from the button
    event.target.blur();
  };

  const handleHintLongPress = () => {
    console.log('🔍 Hint long press triggered!');
    
    // Set flag to prevent click event from changing hint level
    setIsLongPressTriggered(true);
    
    if (!grid) {
      console.log('❌ No grid available for hint long press');
      return;
    }
    
    console.log('🔍 Finding cells with only one possibility...');
    
    // Find cells with only one possibility
    const cellsWithOnePossibility = findCellsWithOnePossibility(grid);
    
    console.log(`🔍 Found ${cellsWithOnePossibility.length} cells with one possibility:`, cellsWithOnePossibility);
    
    if (cellsWithOnePossibility.length === 0) {
      console.log('❌ No cells with single possibility found');
      return;
    }
    
    // Highlight these cells in green
    const highlightCells = cellsWithOnePossibility.map(cell => ({
      row: cell.row,
      col: cell.col
    }));
    
    console.log('✅ Setting highlighted cells:', highlightCells);
    setHighlightedCells(highlightCells);
    
    // Remove the highlight after 2 seconds
    setTimeout(() => {
      console.log('🔍 Removing highlighted cells after 2 seconds');
      setHighlightedCells([]);
    }, 2000);
  };

  const handleHintMouseDown = (event) => {
    console.log('👇 Hint button mouse/touch down event triggered, event type:', event.type);
    event.preventDefault();
    
    // Clear any existing timer first
    if (longPressTimer) {
      console.log('⏰ Clearing existing timer before setting new one');
      clearTimeout(longPressTimer);
    }
    
    const timer = setTimeout(() => {
      console.log('⏰ Long press timer triggered after 800ms');
      handleHintLongPress();
    }, 800); // 800ms for long press
    setLongPressTimer(timer);
    console.log('⏰ Long press timer set:', timer);
  };

  const handleHintMouseUp = (event) => {
    console.log('👆 Hint button mouse/touch up event triggered, event type:', event.type);
    if (longPressTimer) {
      console.log('⏰ Clearing long press timer (regular release):', longPressTimer);
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      // Reset the long press flag if timer was cleared before triggering
      // Use a small timeout to ensure this happens after any potential click event
      setTimeout(() => {
        if (isLongPressTriggered) {
          console.log('🔄 Resetting long press flag after regular release');
          setIsLongPressTriggered(false);
        }
      }, 10);
    } else {
      console.log('⏰ No long press timer to clear');
    }
  };

  const handleHintMouseLeave = (event) => {
    console.log('🚪 Hint button mouse leave event triggered');
    if (longPressTimer) {
      console.log('⏰ Clearing long press timer on mouse leave:', longPressTimer);
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      // Reset the long press flag when mouse leaves
      setTimeout(() => {
        if (isLongPressTriggered) {
          console.log('🔄 Resetting long press flag after mouse leave');
          setIsLongPressTriggered(false);
        }
      }, 10);
    } else {
      console.log('⏰ No long press timer to clear on mouse leave');
    }
  };

  // Debug functions for testing
  const testHintLongPress = () => {
    console.log('🧪 Testing hint long press manually...');
    handleHintLongPress();
  };

  const testAutoHint = () => {
    console.log('🧪 Testing auto-hint manually...');
    showAutoHint();
  };

  // Make test functions available globally for debugging
  useEffect(() => {
    window.testHintLongPress = testHintLongPress;
    window.testAutoHint = testAutoHint;
    return () => {
      delete window.testHintLongPress;
      delete window.testAutoHint;
    };
  }, [grid]);

  return {
    showAutoHint,
    handleHintClick,
    handleHintLongPress,
    handleHintMouseDown,
    handleHintMouseUp,
    handleHintMouseLeave,
    testHintLongPress,
    testAutoHint
  };
};
