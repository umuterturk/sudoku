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
  isAnimating
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
                    ${isAnimating ? 'animating' : ''}`}
        onClick={() => !isAnimating && onClick(row, col)}
        disabled={isAnimating}
      >
        {value === 0 ? '' : value}
      </button>
    </div>
  );
};

export default SudokuCell;
