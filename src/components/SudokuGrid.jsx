import React from 'react';
import SudokuCell from './SudokuCell';
import { isValidMove } from '../utils/sudokuUtils';

const SudokuGrid = ({ 
  grid, 
  originalGrid, 
  selectedCell, 
  selectedNumber,
  onCellClick,
  hintLevel,
  isAnimating
}) => {
  const isOriginalCell = (row, col) => {
    if (isAnimating) return false; // During animation, no cells are "original"
    return originalGrid && originalGrid[row][col] !== 0;
  };

  const isHighlighted = (row, col) => {
    if (isAnimating) return false; // No highlights during animation
    if (!selectedCell) return false;
    if (hintLevel === 'arcade') return false; // No highlights in arcade mode
    
    const [selectedRow, selectedCol] = selectedCell;
    
    // Hard level: only direct highlights (row, column, 3x3 box)
    if (hintLevel === 'hard') {
      return row === selectedRow || 
             col === selectedCol || 
             (Math.floor(row / 3) === Math.floor(selectedRow / 3) && 
              Math.floor(col / 3) === Math.floor(selectedCol / 3));
    }
    
    // Medium and Novice levels: same highlighting as before
    return row === selectedRow || 
           col === selectedCol || 
           (Math.floor(row / 3) === Math.floor(selectedRow / 3) && 
            Math.floor(col / 3) === Math.floor(selectedCol / 3));
  };

  const isSameNumber = (row, col) => {
    if (isAnimating) return false; // No number highlighting during animation
    if (!selectedNumber || grid[row][col] === 0) return false;
    if (hintLevel === 'arcade') return false; // No number highlighting in arcade mode
    return grid[row][col] === selectedNumber;
  };

  const isRelatedToSameNumber = (row, col) => {
    if (isAnimating) return false; // No related highlighting during animation
    if (!selectedNumber || !selectedCell) return false;
    if (hintLevel === 'arcade' || hintLevel === 'hard') return false; // No indirect highlighting for arcade/hard
    
    // Don't highlight cells that contain the same number (they get their own styling)
    if (grid[row][col] === selectedNumber) return false;
    
    const [selectedRow, selectedCol] = selectedCell;
    
    // Find all positions where the selected number appears (excluding the clicked cell)
    const sameNumberPositions = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === selectedNumber && !(r === selectedRow && c === selectedCol)) {
          sameNumberPositions.push([r, c]);
        }
      }
    }
    
    // Check if current cell is in the same row or column as ANY of the unclicked same numbers
    // (Only rows and columns, NOT 3x3 boxes for unclicked same numbers)
    return sameNumberPositions.some(([sameRow, sameCol]) => 
      row === sameRow || col === sameCol
    );
  };

  const hasError = (row, col) => {
    if (isAnimating) return false; // No error checking during animation
    if (grid[row][col] === 0) return false;
    
    const num = grid[row][col];
    const tempGrid = grid.map(r => [...r]);
    tempGrid[row][col] = 0; // Temporarily remove to check validity
    
    return !isValidMove(tempGrid, row, col, num);
  };



  // Handle null grid case
  if (!grid) {
    return <div className="sudoku-grid">Loading grid...</div>;
  }

  return (
    <div className="sudoku-grid">
      {grid.map((row, rowIndex) => (
        <div key={rowIndex} className="sudoku-row">
          {row.map((cell, colIndex) => (
            <SudokuCell
              key={`${rowIndex}-${colIndex}`}
              value={cell}
              isOriginal={isOriginalCell(rowIndex, colIndex)}
              isSelected={selectedCell && selectedCell[0] === rowIndex && selectedCell[1] === colIndex}
              isHighlighted={isHighlighted(rowIndex, colIndex)}
              isSameNumber={isSameNumber(rowIndex, colIndex)}
              isRelatedToSameNumber={isRelatedToSameNumber(rowIndex, colIndex)}
              isError={hasError(rowIndex, colIndex)}
              onClick={onCellClick}
              row={rowIndex}
              col={colIndex}
              isAnimating={isAnimating}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SudokuGrid;
