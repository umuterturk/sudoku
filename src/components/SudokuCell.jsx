import React from 'react';

const SudokuCell = ({ 
  value, 
  isOriginal, 
  isSelected, 
  isHighlighted,
  isSameNumber,
  isRelatedToSameNumber,
  isError,
  onClick,
  row,
  col,
  isAnimating,
  shouldGlow
}) => {
  return (
    <div className="cell-container">
      <button
        className={`sudoku-cell ${isOriginal ? 'original' : 'user'} 
                    ${isSelected ? 'selected' : ''} 
                    ${isHighlighted ? 'highlighted' : ''}
                    ${isSameNumber ? 'same-number' : ''}
                    ${isRelatedToSameNumber ? 'related-to-same-number' : ''}
                    ${isError ? 'error' : ''}
                    ${isAnimating ? 'animating' : ''}
                    ${shouldGlow ? 'glow-completed' : ''}`}
        onClick={() => !isAnimating && onClick(row, col)}
        disabled={isAnimating}
      >
        {value === 0 ? '' : value}
      </button>
    </div>
  );
};

export default SudokuCell;
