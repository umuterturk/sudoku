import React, { useState, useEffect } from 'react';
import SudokuGrid from './components/SudokuGrid';
import DigitButtons from './components/DigitButtons';
import DifficultyPopup from './components/DifficultyPopup';
import ResetConfirmationPopup from './components/ResetConfirmationPopup';
import Hearts from './components/Hearts';
import { generatePuzzle, isGridComplete, isGridValid, isValidMove } from './utils/sudokuUtils';
import { Undo, Add, Refresh, Lightbulb, LightbulbOutlined, Circle, FiberManualRecord } from '@mui/icons-material';
import './App.css';

function App() {
  const [grid, setGrid] = useState(null);
  const [originalGrid, setOriginalGrid] = useState(null);
  const [solution, setSolution] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [gameStatus, setGameStatus] = useState('playing'); // playing, completed, error
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [showDifficultyPopup, setShowDifficultyPopup] = useState(false);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [lives, setLives] = useState(3);
  const [isShaking, setIsShaking] = useState(false);
  const [hintLevel, setHintLevel] = useState('medium'); // arcade, hard, medium, novice

  // Save game state to localStorage
  const saveGameState = (gameState) => {
    try {
      localStorage.setItem('sudoku-game-state', JSON.stringify(gameState));
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  };

  // Load game state from localStorage
  const loadGameState = () => {
    try {
      const savedState = localStorage.getItem('sudoku-game-state');
      return savedState ? JSON.parse(savedState) : null;
    } catch (error) {
      console.error('Failed to load game state:', error);
      return null;
    }
  };

  // Initialize game
  useEffect(() => {
    const savedState = loadGameState();
    if (savedState) {
      // Restore saved game state
      setGrid(savedState.grid);
      setOriginalGrid(savedState.originalGrid);
      setSolution(savedState.solution);
      setSelectedCell(savedState.selectedCell);
      setSelectedNumber(savedState.selectedNumber);
      setDifficulty(savedState.difficulty);
      setGameStatus(savedState.gameStatus);
      setMoveHistory(savedState.moveHistory || []);
      setLives(savedState.lives !== undefined ? savedState.lives : 3);
      setHintLevel(savedState.hintLevel || 'medium');
      
      // Handle timer restoration
      const currentTime = Date.now();
      const elapsedTime = Math.floor((currentTime - savedState.lastSaveTime) / 1000);
      const restoredTimer = savedState.timer + (savedState.gameStatus === 'playing' ? elapsedTime : 0);
      setTimer(restoredTimer);
      setIsTimerRunning(savedState.gameStatus === 'playing');
    } else {
      startNewGame();
    }
  }, []);

  // Auto-save game state
  useEffect(() => {
    if (grid && originalGrid) {
      const gameState = {
        grid,
        originalGrid,
        solution,
        selectedCell,
        selectedNumber,
        difficulty,
        gameStatus,
        timer,
        moveHistory,
        lives,
        hintLevel,
        lastSaveTime: Date.now()
      };
      saveGameState(gameState);
    }
  }, [grid, originalGrid, solution, selectedCell, selectedNumber, difficulty, gameStatus, timer, moveHistory, lives, hintLevel]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
    } else if (!isTimerRunning && timer !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  const startNewGame = (selectedDifficulty = difficulty) => {
    const { puzzle, solution: puzzleSolution } = generatePuzzle(selectedDifficulty);
    setGrid(puzzle.map(row => [...row]));
    setOriginalGrid(puzzle.map(row => [...row]));
    setSolution(puzzleSolution.map(row => [...row]));
    setSelectedCell(null);
    setSelectedNumber(null);
    setGameStatus('playing');
    setTimer(0);
    setIsTimerRunning(true);
    setMoveHistory([]);
    setLives(3);
    setIsShaking(false);
    setDifficulty(selectedDifficulty);
    setHintLevel('medium');
    
    // Clear any existing saved state when starting new game
    localStorage.removeItem('sudoku-game-state');
  };

  const handleNewGameClick = () => {
    setShowDifficultyPopup(true);
  };

  const handleDifficultySelect = (selectedDifficulty) => {
    startNewGame(selectedDifficulty);
  };

  const handleResetClick = () => {
    setShowResetPopup(true);
  };

  const handleResetConfirm = () => {
    resetGame();
  };

  const handleDigitSelect = (digit) => {
    if (!selectedCell) return;
    
    const [row, col] = selectedCell;
    if (originalGrid[row][col] !== 0) return; // Can't change original cells
    
    const previousValue = grid[row][col];
    
    // Only add to history if the value actually changes
    if (previousValue !== digit) {
      setMoveHistory(prev => [...prev, { row, col, previousValue, newValue: digit }]);
    }
    
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = digit;
    setGrid(newGrid);

    // Check if the move is wrong (not the correct solution for this cell)
    if (digit !== 0 && solution && digit !== solution[row][col]) {
      // Trigger shake animation
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600); // Match animation duration
      
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameStatus('game-over');
          setIsTimerRunning(false);
        }
        return newLives;
      });
    }

    // Check if game is complete
    if (isGridComplete(newGrid)) {
      if (isGridValid(newGrid)) {
        setGameStatus('completed');
        setIsTimerRunning(false);
      } else {
        setGameStatus('error');
      }
    } else if (gameStatus === 'error' && isGridValid(newGrid)) {
      setGameStatus('playing');
    }
  };

  const handleCellClick = (row, col) => {
    setSelectedCell([row, col]);
    
    // If clicking on a non-empty cell, highlight same numbers
    const cellValue = grid[row][col];
    if (cellValue !== 0) {
      setSelectedNumber(cellValue);
    } else {
      // If clicking on empty cell, clear number highlighting
      setSelectedNumber(null);
    }
  };

  const resetGame = () => {
    setGrid(originalGrid.map(row => [...row]));
    setSelectedCell(null);
    setSelectedNumber(null);
    setGameStatus('playing');
    setTimer(0);
    setIsTimerRunning(true);
    setMoveHistory([]);
    setLives(3);
    setIsShaking(false);
  };

  const handleUndo = () => {
    if (moveHistory.length === 0) return;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    const newGrid = grid.map(r => [...r]);
    newGrid[lastMove.row][lastMove.col] = lastMove.previousValue;
    
    setGrid(newGrid);
    setMoveHistory(prev => prev.slice(0, -1));
    
    // Update game status if needed
    if (gameStatus === 'completed' || gameStatus === 'error') {
      setGameStatus('playing');
      setIsTimerRunning(true);
    }
  };

  const handleHintClick = (event) => {
    // Cycle through hint levels in round-robin style starting with medium
    const hintLevels = ['medium', 'novice', 'arcade', 'hard'];
    const currentIndex = hintLevels.indexOf(hintLevel);
    const nextIndex = (currentIndex + 1) % hintLevels.length;
    setHintLevel(hintLevels[nextIndex]);
    
    // Remove focus from the button
    event.target.blur();
  };

  const getHintIcon = () => {
    return <Lightbulb />;
  };

  const getHintButtonClass = () => {
    return `control-button hint-${hintLevel}`;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!grid) {
    return <div className="loading">Loading...</div>;
  }

  if (gameStatus === 'game-over') {
    return (
      <div className="app">
        <div className="game-over-screen">
          <h1>Game Over!</h1>
          <p>You ran out of lives. Better luck next time!</p>
          <button className="btn" onClick={() => startNewGame()}>
            Start New Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left"></div>
        <div className="timer">{formatTime(timer)}</div>
        <Hearts lives={lives} isShaking={isShaking} />
      </header>

      <main className="game-container">
        <SudokuGrid
          grid={grid}
          originalGrid={originalGrid}
          selectedCell={selectedCell}
          selectedNumber={selectedNumber}
          onCellClick={handleCellClick}
          hintLevel={hintLevel}
        />

        <DigitButtons
          onDigitSelect={handleDigitSelect}
          selectedCell={selectedCell}
          grid={grid}
          originalGrid={originalGrid}
          hintLevel={hintLevel}
        />

        <div className="control-buttons">
          <button 
            className="control-button"
            onClick={handleUndo}
            disabled={moveHistory.length === 0}
            title="Undo"
          >
            <Undo />
          </button>
          
          <button 
            className="control-button"
            onClick={handleNewGameClick}
            title="New Game"
          >
            <Add />
          </button>
          
          <button 
            className="control-button"
            onClick={handleResetClick}
            title="Reset"
          >
            <Refresh />
          </button>
          
          <button 
            className={getHintButtonClass()}
            onClick={handleHintClick}
            title={`Hint Level: ${hintLevel.charAt(0).toUpperCase() + hintLevel.slice(1)}`}
          >
            {getHintIcon()}
          </button>
        </div>
      </main>

      <DifficultyPopup
        isOpen={showDifficultyPopup}
        onClose={() => setShowDifficultyPopup(false)}
        onSelectDifficulty={handleDifficultySelect}
        currentDifficulty={difficulty}
      />

      <ResetConfirmationPopup
        isOpen={showResetPopup}
        onClose={() => setShowResetPopup(false)}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
}

export default App;
