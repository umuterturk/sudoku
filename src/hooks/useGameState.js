import { useState, useRef, useMemo } from 'react';

/**
 * Shared game state hook for both singleplayer and multiplayer modes
 * Contains core game state that's common to both modes
 */
export const useGameState = () => {
  // Core game state
  const [grid, setGrid] = useState(null);
  const [originalGrid, setOriginalGrid] = useState(null);
  const [solution, setSolution] = useState(null);
  const [selectedCell, _setSelectedCell] = useState(null);
  const setSelectedCell = (cell) => {
    console.log('🎯 Setting selectedCell:', cell);
    _setSelectedCell(cell);
  };
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [gameStatus, setGameStatus] = useState('playing'); // playing, completed, error, game-over
  
  // Game mechanics
  const [lives, setLives] = useState(3);
  const [previousLives, setPreviousLives] = useState(3);
  const [isShaking, setIsShaking] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [undosUsed, setUndosUsed] = useState(0);
  
  // UI state
  const [isNotesMode, setIsNotesMode] = useState(false);
  const [notes, setNotes] = useState(Array(9).fill().map(() => Array(9).fill().map(() => [])));
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [errorCells, setErrorCells] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationGrid, setAnimationGrid] = useState(null);
  
  // Visual effects
  const [glowingCompletions, setGlowingCompletions] = useState({
    rows: [],
    columns: [],
    boxes: []
  });
  
  // Refs for internal tracking
  const currentGridRef = useRef(grid);
  
  // Update grid ref whenever grid changes
  const updateGrid = (newGrid) => {
    setGrid(newGrid);
    currentGridRef.current = newGrid;
  };
  
  // Reset game state to initial values
  const resetGameState = () => {
    setGrid(null);
    setOriginalGrid(null);
    setSolution(null);
    setSelectedCell(null);
    setSelectedNumber(null);
    setGameStatus('playing');
    setLives(3);
    setPreviousLives(3);
    setIsShaking(false);
    setMoveHistory([]);
    setUndosUsed(0);
    setIsNotesMode(false);
    setNotes(Array(9).fill().map(() => Array(9).fill().map(() => [])));
    setHighlightedCells([]);
    setErrorCells([]);
    setIsAnimating(false);
    setAnimationGrid(null);
    setGlowingCompletions({ rows: [], columns: [], boxes: [] });
  };
  
  // Initialize game with puzzle data
  const initializeGame = (puzzleData) => {
    const { puzzle, solution: puzzleSolution, selectedDifficulty } = puzzleData;
    
    setGrid(puzzle.map(row => [...row]));
    setOriginalGrid(puzzle.map(row => [...row]));
    setSolution(puzzleSolution.map(row => [...row]));
    setDifficulty(selectedDifficulty);
    setSelectedCell(null);
    setSelectedNumber(null);
    setGameStatus('playing');
    setLives(3);
    setPreviousLives(3);
    setIsShaking(false);
    setMoveHistory([]);
    setUndosUsed(0);
    setIsNotesMode(false);
    setNotes(Array(9).fill().map(() => Array(9).fill().map(() => [])));
    setErrorCells([]);
    setGlowingCompletions({ rows: [], columns: [], boxes: [] });
  };
  
  return useMemo(() => ({
    // State
    grid,
    originalGrid,
    solution,
    selectedCell,
    selectedNumber,
    difficulty,
    gameStatus,
    lives,
    previousLives,
    isShaking,
    moveHistory,
    undosUsed,
    isNotesMode,
    notes,
    highlightedCells,
    errorCells,
    isAnimating,
    animationGrid,
    glowingCompletions,
    currentGridRef,
    
    // Setters
    setGrid: updateGrid,
    setOriginalGrid,
    setSolution,
    setSelectedCell,
    setSelectedNumber,
    setDifficulty,
    setGameStatus,
    setLives,
    setPreviousLives,
    setIsShaking,
    setMoveHistory,
    setUndosUsed,
    setIsNotesMode,
    setNotes,
    setHighlightedCells,
    setErrorCells,
    setIsAnimating,
    setAnimationGrid,
    setGlowingCompletions,
    
    // Utility functions
    resetGameState,
    initializeGame
  }), [
    grid, originalGrid, solution, selectedCell, selectedNumber, difficulty, gameStatus,
    lives, previousLives, isShaking, moveHistory, undosUsed, isNotesMode, notes,
    highlightedCells, errorCells, isAnimating, animationGrid, glowingCompletions,
    currentGridRef, updateGrid, setOriginalGrid, setSolution, setSelectedCell,
    setSelectedNumber, setDifficulty, setGameStatus, setLives, setPreviousLives,
    setIsShaking, setMoveHistory, setUndosUsed, setIsNotesMode, setNotes,
    setHighlightedCells, setErrorCells, setIsAnimating, setAnimationGrid,
    setGlowingCompletions, resetGameState, initializeGame
  ]);
};
