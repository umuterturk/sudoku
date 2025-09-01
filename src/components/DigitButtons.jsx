import React from 'react';
import { isValidMove } from '../utils/sudokuUtils';

const DigitButtons = ({ onDigitSelect, selectedCell, grid, originalGrid, hintLevel, disabled = false }) => {
  const firstRowDigits = [1, 2, 3, 4, 5];
  const secondRowDigits = [6, 7, 8, 9, 'X'];

  const handleDigitClick = (digit) => {
    if (disabled) return; // Don't handle clicks when disabled
    if (selectedCell) {
      if (digit === 'X') {
        onDigitSelect(0); // Clear the cell
      } else {
        onDigitSelect(digit);
      }
    }
  };

  const isDigitDisabled = (digit) => {
    if (disabled) return true; // Disable all buttons when animation is running
    if (!selectedCell || !originalGrid) return true;
    const [row, col] = selectedCell;
    if (originalGrid[row][col] !== 0) return true; // Can't change original cells
    
    // Disable if remaining count is 0 (only when count is actually shown)
    if (digit !== 'X') {
      const remainingCount = getRemainingCount(digit);
      if (typeof remainingCount === 'number' && remainingCount === 0) {
        return true;
      }
    }
    
    return false;
  };

  const isClearDisabled = () => {
    if (disabled) return true; // Disable clear button when animation is running
    if (!selectedCell || !grid || !originalGrid) return true;
    const [row, col] = selectedCell;
    // Disable if it's an original cell or if the cell is already empty
    return originalGrid[row][col] !== 0 || grid[row][col] === 0;
  };

  const getRemainingCount = (digit) => {
    if (digit === 'X') return null;
    // For arcade and hard levels, return empty string instead of null
    if (hintLevel === 'arcade' || hintLevel === 'hard') return '';
    // If grid is null (during initialization), return empty string
    if (!grid) return '';
    
    let count = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === digit) {
          count++;
        }
      }
    }
    return 9 - count; // Each digit should appear 9 times total
  };

  const shouldShowRemainingCount = (digit) => {
    return digit !== 'X';
  };

  const isValidDigitForSelectedCell = (digit) => {
    if (digit === 'X' || hintLevel !== 'novice' || !selectedCell || !grid) return false;
    
    const [row, col] = selectedCell;
    if (grid[row][col] !== 0) return false; // Only for empty cells
    
    return isValidMove(grid, row, col, digit);
  };

  const getDigitButtonClass = (digit) => {
    let baseClass = digit === 'X' ? 'digit-button clear-button-style' : 'digit-button';
    
    if (isValidDigitForSelectedCell(digit)) {
      baseClass += ' valid-hint';
    }
    
    // Add class when no remaining count is shown (empty string for arcade/hard)
    if (digit !== 'X' && getRemainingCount(digit) === '') {
      baseClass += ' no-count';
    }
    
    return baseClass;
  };

  return (
    <div className="digit-buttons-container">
      <div className="digit-buttons">
        {firstRowDigits.map(digit => (
          <button
            key={digit}
            className={getDigitButtonClass(digit)}
            onClick={() => handleDigitClick(digit)}
            disabled={isDigitDisabled(digit)}
          >
            <div className="digit-content">
              <span className="digit-number">{digit}</span>
              {shouldShowRemainingCount(digit) && (
                <span className={`remaining-count ${getRemainingCount(digit) === 0 ? 'completed' : ''}`}>
                  {getRemainingCount(digit)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="digit-buttons">
        {secondRowDigits.map(digit => (
          <button
            key={digit}
            className={getDigitButtonClass(digit)}
            onClick={() => handleDigitClick(digit)}
            disabled={digit === 'X' ? isClearDisabled() : isDigitDisabled(digit)}
          >
            <div className="digit-content">
              <span className="digit-number">{digit}</span>
              {shouldShowRemainingCount(digit) && (
                <span className={`remaining-count ${getRemainingCount(digit) === 0 ? 'completed' : ''}`}>
                  {getRemainingCount(digit)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DigitButtons;
