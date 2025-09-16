import React from 'react';
import SudokuGrid from './SudokuGrid';

const SudokuBoard = ({ 
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
  highlightedCells,
  errorCells,
  correctCells,
  solution
}) => {
  return (
    <div className="sudoku-board">
      <SudokuGrid
        grid={grid}
        originalGrid={originalGrid}
        selectedCell={selectedCell}
        selectedNumber={selectedNumber}
        onCellClick={onCellClick}
        hintLevel={hintLevel}
        isAnimating={isAnimating}
        shakingCompletions={shakingCompletions}
        notes={notes}
        isNotesMode={isNotesMode}
        highlightedCells={highlightedCells}
        errorCells={errorCells}
        correctCells={correctCells}
        solution={solution}
      />
    </div>
  );
};

export default SudokuBoard;
