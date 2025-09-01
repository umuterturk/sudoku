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
  col
}) => {
  return (
    <div className="cell-container">
      <button
        className={`sudoku-cell ${isOriginal ? 'original' : 'user'} 
                    ${isSelected ? 'selected' : ''} 
                    ${isHighlighted ? 'highlighted' : ''}
                    ${isSameNumber ? 'same-number' : ''}
                    ${isRelatedToSameNumber ? 'related-to-same-number' : ''}
                    ${isError ? 'error' : ''}`}
        onClick={() => onClick(row, col)}
      >
        {value === 0 ? '' : value}
      </button>
    </div>
  );
};

export default SudokuCell;
