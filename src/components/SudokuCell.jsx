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
  shouldGlow,
  notes,
  isNotesMode
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
        {value === 0 ? (
          notes && notes.length > 0 ? (
            <div className="notes-container">
              <div className="note top-left">{notes[0] || ''}</div>
              <div className="note top-right">{notes[1] || ''}</div>
              <div className="note bottom-left">{notes[2] || ''}</div>
              <div className="note bottom-right">{notes[3] || ''}</div>
            </div>
          ) : ''
        ) : value}
      </button>
    </div>
  );
};

export default SudokuCell;
