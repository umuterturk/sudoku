import React from 'react';
import SudokuCell from './SudokuCell';
import { isValidMove, getBoxIndex } from '../utils/sudokuUtils';

const SudokuGrid = ({ 
  grid, 
  originalGrid, 
  selectedCell, 
  selectedNumber,
  onCellClick,
  hintLevel,
  isAnimating,
  shakingCompletions,
  notes,
  isNotesMode,
  highlightedCells = []
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
    
    // Don't show highlights if the selected cell contains an invalid value
    const selectedCellValue = grid[selectedRow][selectedCol];
    if (selectedCellValue !== 0) {
      // Check if the selected cell's value is valid
      const tempGrid = grid.map(r => [...r]);
      tempGrid[selectedRow][selectedCol] = 0; // Temporarily remove to check validity
      const isSelectedCellValid = isValidMove(tempGrid, selectedRow, selectedCol, selectedCellValue);
      
      if (!isSelectedCellValid) {
        return false; // Don't show any highlights if selected cell has invalid value
      }
    }
    
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
    
    // Don't show same number highlights if the selected cell contains an invalid value
    if (selectedCell) {
      const [selectedRow, selectedCol] = selectedCell;
      const selectedCellValue = grid[selectedRow][selectedCol];
      if (selectedCellValue !== 0) {
        const tempGrid = grid.map(r => [...r]);
        tempGrid[selectedRow][selectedCol] = 0;
        const isSelectedCellValid = isValidMove(tempGrid, selectedRow, selectedCol, selectedCellValue);
        
        if (!isSelectedCellValid) {
          return false; // Don't show same number highlights if selected cell has invalid value
        }
      }
    }
    
    return grid[row][col] === selectedNumber;
  };

  const isRelatedToSameNumber = (row, col) => {
    if (isAnimating) return false; // No related highlighting during animation
    if (!selectedNumber || !selectedCell) return false;
    if (hintLevel === 'arcade' || hintLevel === 'hard') return false; // No indirect highlighting for arcade/hard
    
    // Don't show related highlights if the selected cell contains an invalid value
    const [selectedRow, selectedCol] = selectedCell;
    const selectedCellValue = grid[selectedRow][selectedCol];
    if (selectedCellValue !== 0) {
      const tempGrid = grid.map(r => [...r]);
      tempGrid[selectedRow][selectedCol] = 0;
      const isSelectedCellValid = isValidMove(tempGrid, selectedRow, selectedCol, selectedCellValue);
      
      if (!isSelectedCellValid) {
        return false; // Don't show related highlights if selected cell has invalid value
      }
    }
    
    // Don't highlight cells that contain the same number (they get their own styling)
    if (grid[row][col] === selectedNumber) return false;
    
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

  // Check if a cell should shake due to completed row
  const shouldShakeForRow = (row) => {
    return shakingCompletions && shakingCompletions.rows && shakingCompletions.rows.includes(row);
  };

  // Check if a cell should shake due to completed column
  const shouldShakeForColumn = (col) => {
    return shakingCompletions && shakingCompletions.columns && shakingCompletions.columns.includes(col);
  };

  // Check if a cell should shake due to completed box
  const shouldShakeForBox = (row, col) => {
    if (!shakingCompletions || !shakingCompletions.boxes) return false;
    const boxIndex = getBoxIndex(row, col);
    return shakingCompletions.boxes.includes(boxIndex);
  };

  // Check if a cell should have glow animation
  const shouldGlow = (row, col) => {
    return shouldShakeForRow(row) || shouldShakeForColumn(col) || shouldShakeForBox(row, col);
  };

  // Check if a cell should be highlighted green (for single possibility hint)
  const isGreenHighlighted = (row, col) => {
    return highlightedCells.some(cell => cell.row === row && cell.col === col);
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
              shouldGlow={shouldGlow(rowIndex, colIndex)}
              notes={notes ? notes[rowIndex][colIndex] : []}
              isNotesMode={isNotesMode}
              isGreenHighlighted={isGreenHighlighted(rowIndex, colIndex)}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SudokuGrid;
