import React, { useState, useEffect } from 'react';
import SudokuGrid from './components/SudokuGrid';
import DigitButtons from './components/DigitButtons';
import DifficultyPopup from './components/DifficultyPopup';
import ResetConfirmationPopup from './components/ResetConfirmationPopup';
import ContinueGamePopup from './components/ContinueGamePopup';
import Hearts from './components/Hearts';
import { generatePuzzle, isGridComplete, isGridValid, isValidMove, preloadPuzzleDatabase, stringToGrid } from './utils/sudokuUtils';
import { Undo, Add, Refresh, Lightbulb, LightbulbOutlined, Circle, FiberManualRecord, Pause, PlayArrow } from '@mui/icons-material';
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
  const [showContinuePopup, setShowContinuePopup] = useState(false);
  const [lives, setLives] = useState(3);
  const [isShaking, setIsShaking] = useState(false);
  const [hintLevel, setHintLevel] = useState('medium'); // arcade, hard, medium, novice
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationGrid, setAnimationGrid] = useState(null);
  
  // Cache for animation puzzles to avoid re-loading
  const [animationPuzzleCache, setAnimationPuzzleCache] = useState(new Map());

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
    const initializeGame = async () => {
      const savedState = loadGameState();
      if (savedState) {
        // Show continue game popup instead of directly restoring
        setShowContinuePopup(true);
        
        // Restore saved game state (but don't start timer yet)
        setGrid(savedState.grid);
        setOriginalGrid(savedState.originalGrid);
        setSolution(savedState.solution);
        setSelectedCell(savedState.selectedCell);
        setSelectedNumber(savedState.selectedNumber);
        setDifficulty(savedState.difficulty);
        setGameStatus('playing'); // Always set to playing for continue popup
        setMoveHistory(savedState.moveHistory || []);
        setLives(savedState.lives !== undefined ? savedState.lives : 3);
        setHintLevel(savedState.hintLevel || 'medium');
        setIsPaused(true); // Start paused when showing continue popup
        
        // Handle timer restoration
        const currentTime = Date.now();
        const elapsedTime = Math.floor((currentTime - savedState.lastSaveTime) / 1000);
        const restoredTimer = savedState.timer + (savedState.gameStatus === 'playing' ? elapsedTime : 0);
        setTimer(restoredTimer);
        setIsTimerRunning(false); // Don't start timer until they continue
      } else {
        // No saved game, show difficulty popup
        setShowDifficultyPopup(true);
      }
    };

    initializeGame();

    // Preload easy and hard difficulties in the background for better UX
    setTimeout(() => {
      preloadPuzzleDatabase('easy');
      preloadPuzzleDatabase('hard');
    }, 2000); // Wait 2 seconds after app load
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
        isPaused,
        lastSaveTime: Date.now()
      };
      saveGameState(gameState);
    }
  }, [grid, originalGrid, solution, selectedCell, selectedNumber, difficulty, gameStatus, timer, moveHistory, lives, hintLevel, isPaused]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && !isPaused) {
      interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
    } else if (!isTimerRunning && timer !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isPaused, timer]);

  // Get random puzzle grids for animation
  const getRandomAnimationPuzzles = async (difficulty, count = 20) => {
    try {
      // Check cache first
      const cacheKey = `${difficulty}_${count}`;
      if (animationPuzzleCache.has(cacheKey)) {
        return animationPuzzleCache.get(cacheKey);
      }
      
      // Import the puzzle database for the selected difficulty
      let puzzleModule;
      switch (difficulty) {
        case 'easy':
          puzzleModule = await import('./game_database/easy.js');
          break;
        case 'medium':
          puzzleModule = await import('./game_database/medium.js');
          break;
        case 'hard':
          puzzleModule = await import('./game_database/hard.js');
          break;
        case 'expert':
          puzzleModule = await import('./game_database/expert.js');
          break;
        default:
          puzzleModule = await import('./game_database/medium.js');
      }
      
      const puzzles = puzzleModule.puzzles;
      const animationPuzzles = [];
      
      // Get random puzzles for animation
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * puzzles.length);
        const puzzleString = puzzles[randomIndex];
        const puzzleGrid = stringToGrid(puzzleString);
        animationPuzzles.push(puzzleGrid);
      }
      
      // Cache the result
      setAnimationPuzzleCache(prev => new Map(prev).set(cacheKey, animationPuzzles));
      
      return animationPuzzles;
    } catch (error) {
      console.error('Failed to load animation puzzles:', error);
      // Fallback to random grids if loading fails
      return Array(20).fill().map(() => 
        Array(9).fill().map(() => 
          Array(9).fill().map(() => {
            return Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 9) + 1;
          })
        )
      );
    }
  };

  const animateGameStart = async (puzzle, puzzleSolution, selectedDifficulty) => {
    // Set the basic game state first so the grid renders
    setGrid(puzzle.map(row => [...row]));
    setOriginalGrid(puzzle.map(row => [...row]));
    setSolution(puzzleSolution.map(row => [...row]));
    setSelectedCell(null);
    setSelectedNumber(null);
    setGameStatus('playing');
    setTimer(0);
    setIsTimerRunning(false); // Don't start timer during animation
    setMoveHistory([]);
    setLives(3);
    setIsShaking(false);
    setDifficulty(selectedDifficulty);
    setHintLevel('medium');
    setIsPaused(false);
    
    // Clear any existing saved state when starting new game
    localStorage.removeItem('sudoku-game-state');
    
    // Start animation after a brief delay
    setTimeout(async () => {
      setIsAnimating(true);
      
      // Get random puzzles from the database for animation
      const animationPuzzles = await getRandomAnimationPuzzles(selectedDifficulty, 20);
      
      let animationStep = 0;
      const totalSteps = animationPuzzles.length; // Use the number of available puzzles
      const animationDuration = 600; // 600ms total animation
      const stepDuration = animationDuration / totalSteps;
      
      // Set initial animation grid (first puzzle)
      setAnimationGrid(animationPuzzles[0]);
      
      const animationInterval = setInterval(() => {
        animationStep++;
        if (animationStep < totalSteps) {
          // Show next puzzle from the animation array
          setAnimationGrid(animationPuzzles[animationStep]);
        } else {
          // Animation complete - clean up
          clearInterval(animationInterval);
          setAnimationGrid(null);
          setIsAnimating(false);
          setIsTimerRunning(true); // Start timer after animation
        }
      }, stepDuration);
    }, 100); // Small delay to ensure grid is rendered first
  };

  const startNewGame = async (selectedDifficulty = difficulty) => {
    try {
      // Show loading state during puzzle generation
      setIsAnimating(true);
      const { puzzle, solution: puzzleSolution } = await generatePuzzle(selectedDifficulty);
      // Don't set isAnimating to false here - let animateGameStart handle it
      await animateGameStart(puzzle, puzzleSolution, selectedDifficulty);
    } catch (error) {
      console.error('Failed to start new game:', error);
      setIsAnimating(false);
      // Could show an error message to user here
    }
  };

  const handleNewGameClick = () => {
    setShowDifficultyPopup(true);
  };

  const handleGameOverNewGame = () => {
    // Clear game over state first, then show difficulty popup
    setGameStatus('playing');
    setShowDifficultyPopup(true);
  };

  const handleDifficultySelect = (selectedDifficulty) => {
    setShowDifficultyPopup(false);
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
        if (newLives < 0) {
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
    setIsPaused(false);
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

  const handlePauseToggle = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    // Start or stop timer based on pause state and game status
    if (!newPausedState && gameStatus === 'playing') {
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
    }
  };

  const handleContinueGame = () => {
    setShowContinuePopup(false);
    setIsPaused(false);
    setIsTimerRunning(true);
  };

  const handleContinueNewGame = () => {
    setShowContinuePopup(false);
    setShowDifficultyPopup(true);
    // Keep game paused until new game is actually started
    setIsPaused(true);
    setIsTimerRunning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!grid && !isAnimating) {
    return <div className="loading">Loading...</div>;
  }



  return (
    <>
      <div className={`app ${gameStatus === 'game-over' ? 'app-game-over-blurred' : ''} ${showContinuePopup ? 'app-blurred' : ''}`}>
        <header className="app-header">
          <div className="header-left">
            <div className="difficulty-display">
              <span className="difficulty-value">
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </span>
            </div>
          </div>
          <div className="timer-container">
            <div className="timer">{formatTime(timer)}</div>
            <button 
              className="pause-button"
              onClick={handlePauseToggle}
              disabled={gameStatus !== 'playing' || isAnimating}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <PlayArrow /> : <Pause />}
            </button>
          </div>
          <Hearts lives={lives} isShaking={isShaking} />
        </header>

        <main className="game-container">
          <div className={`game-content ${isPaused ? 'game-blurred' : ''}`}>
            <SudokuGrid
              grid={isAnimating && animationGrid ? animationGrid : grid}
              originalGrid={originalGrid}
              selectedCell={selectedCell}
              selectedNumber={selectedNumber}
              onCellClick={handleCellClick}
              hintLevel={hintLevel}
              isAnimating={isAnimating}
            />

            <DigitButtons
              onDigitSelect={handleDigitSelect}
              selectedCell={selectedCell}
              grid={grid}
              originalGrid={originalGrid}
              hintLevel={hintLevel}
              disabled={isAnimating}
            />

            <div className="control-buttons">
              <button 
                className="control-button"
                onClick={handleUndo}
                disabled={moveHistory.length === 0 || isAnimating}
                title="Undo"
              >
                <Undo />
              </button>
              
              <button 
                className="control-button"
                onClick={handleNewGameClick}
                disabled={isAnimating}
                title="New Game"
              >
                <Add />
              </button>
              
              <button 
                className="control-button"
                onClick={handleResetClick}
                disabled={isAnimating}
                title="Reset"
              >
                <Refresh />
              </button>
              
              <button 
                className={getHintButtonClass()}
                onClick={handleHintClick}
                disabled={isAnimating}
                title={`Hint Level: ${hintLevel.charAt(0).toUpperCase() + hintLevel.slice(1)}`}
              >
                {getHintIcon()}
              </button>
            </div>
          </div>

          {/* Pause Overlay */}
          {isPaused && (
            <div className="pause-overlay">
              <div className="pause-content">
                <h2>Game Paused</h2>
                <p>Click resume to continue playing</p>
                <button 
                  className="btn btn-primary resume-button"
                  onClick={handlePauseToggle}
                >
                  <PlayArrow />
                  Resume Game
                </button>
              </div>
            </div>
          )}

        </main>

        <ResetConfirmationPopup
          isOpen={showResetPopup}
          onClose={() => setShowResetPopup(false)}
          onConfirm={handleResetConfirm}
        />
      </div>

      {/* Game Over Overlay - Outside app container to avoid blur */}
      {gameStatus === 'game-over' && (
        <div className="game-over-overlay-fullscreen">
          <div className="game-over-content">
            <h2>Game Over!</h2>
            <p>You ran out of lives. Better luck next time!</p>
            <div className="game-over-buttons">
              <button 
                className="btn btn-secondary"
                onClick={resetGame}
                title="Try the same puzzle again"
              >
                <Refresh />
                Retry
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleGameOverNewGame}
              >
                <Add />
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continue Game Popup - Outside app container to avoid blur */}
      <ContinueGamePopup
        isOpen={showContinuePopup}
        onContinue={handleContinueGame}
        onNewGame={handleContinueNewGame}
        onClose={() => setShowContinuePopup(false)}
        difficulty={difficulty}
        timer={timer}
      />

      {/* Difficulty Popup - Outside app container to avoid blur */}
      <DifficultyPopup
        isOpen={showDifficultyPopup}
        onClose={() => {
          setShowDifficultyPopup(false);
          // If game is paused when difficulty popup closes, ensure proper state
          if (isPaused && grid && originalGrid) {
            // Game exists, just resume it
            setIsPaused(false);
            setIsTimerRunning(gameStatus === 'playing');
          }
        }}
        onSelectDifficulty={handleDifficultySelect}
        currentDifficulty={difficulty}
      />
    </>
  );
}

export default App;
