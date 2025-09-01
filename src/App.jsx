import React, { useState, useEffect } from 'react';
import SudokuGrid from './components/SudokuGrid';
import DigitButtons from './components/DigitButtons';
import DifficultyPopup from './components/DifficultyPopup';
import ResetConfirmationPopup from './components/ResetConfirmationPopup';
import ContinueGamePopup from './components/ContinueGamePopup';
import CompletionPopup from './components/CompletionPopup';
import Hearts from './components/Hearts';
import { generatePuzzle, isGridComplete, isGridValid, isValidMove, preloadPuzzleDatabase, stringToGrid, parseGameFromUrl, generateShareableUrl, addGameRecord, getDifficultyRecord, getCompletedSections } from './utils/sudokuUtils';
import { playCompletionSound, playMultipleCompletionSound } from './utils/audioUtils';
import { Undo, Add, Refresh, Lightbulb, LightbulbOutlined, Circle, FiberManualRecord, Pause, PlayArrow, Share, Menu, VolumeUp, VolumeOff, Edit, EditOutlined } from '@mui/icons-material';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Divider, Box, Typography } from '@mui/material';
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
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [lives, setLives] = useState(3);
  const [isShaking, setIsShaking] = useState(false);
  const [hintLevel, setHintLevel] = useState('medium'); // arcade, hard, medium, novice
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationGrid, setAnimationGrid] = useState(null);
  const [shareMessage, setShareMessage] = useState('');
  const [glowingCompletions, setGlowingCompletions] = useState({
    rows: [],
    columns: [],
    boxes: []
  });
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotesMode, setIsNotesMode] = useState(false);
  const [notes, setNotes] = useState(Array(9).fill().map(() => Array(9).fill().map(() => [])));
  
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
      // First, check for URL game parameter
      const urlGameState = parseGameFromUrl();
      if (urlGameState) {
        // Load game from URL
        setGrid(urlGameState.grid);
        setOriginalGrid(urlGameState.originalGrid);
        setSolution(urlGameState.solution);
        setSelectedCell(urlGameState.selectedCell);
        setSelectedNumber(urlGameState.selectedNumber);
        setDifficulty(urlGameState.difficulty);
        setGameStatus(urlGameState.gameStatus);
        setTimer(urlGameState.timer);
        setMoveHistory(urlGameState.moveHistory);
        setLives(urlGameState.lives);
        setHintLevel(urlGameState.hintLevel);
        setIsNotesMode(urlGameState.isNotesMode || false);
        setNotes(urlGameState.notes || Array(9).fill().map(() => Array(9).fill().map(() => [])));
        setIsPaused(urlGameState.isPaused);
        setIsTimerRunning(!urlGameState.isPaused && urlGameState.gameStatus === 'playing');
        
        // Clear the URL parameter after loading
        const url = new URL(window.location);
        url.searchParams.delete('game');
        window.history.replaceState({}, document.title, url.toString());
        
        return; // Skip saved game check when loading from URL
      }
      
      // Check for saved game in localStorage
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
        setIsNotesMode(savedState.isNotesMode || false);
        setNotes(savedState.notes || Array(9).fill().map(() => Array(9).fill().map(() => [])));
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
        isNotesMode,
        notes,
        isPaused,
        lastSaveTime: Date.now()
      };
      saveGameState(gameState);
    }
  }, [grid, originalGrid, solution, selectedCell, selectedNumber, difficulty, gameStatus, timer, moveHistory, lives, hintLevel, isNotesMode, notes, isPaused]);

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
    setIsNotesMode(false);
    setNotes(Array(9).fill().map(() => Array(9).fill().map(() => [])));
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
    
    if (isNotesMode) {
      // Handle notes mode
      if (digit === 0) {
        // Clear all notes from the selected cell when X is clicked
        const newNotes = notes.map(r => r.map(c => [...c]));
        newNotes[row][col] = [];
        setNotes(newNotes);
        return;
      }
      
      const newNotes = notes.map(r => r.map(c => [...c]));
      const cellNotes = newNotes[row][col];
      
      if (cellNotes.includes(digit)) {
        // Remove the note if it already exists
        newNotes[row][col] = cellNotes.filter(note => note !== digit);
      } else if (cellNotes.length < 4) {
        // Add the note if there's space (max 4 notes per cell)
        newNotes[row][col] = [...cellNotes, digit].sort();
      }
      
      setNotes(newNotes);
      return;
    }
    
    // Normal digit placement mode
    const previousValue = grid[row][col];
    
    // Only add to history if the value actually changes
    if (previousValue !== digit) {
      setMoveHistory(prev => [...prev, { row, col, previousValue, newValue: digit }]);
    }
    
    const oldGrid = grid.map(r => [...r]);
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = digit;
    setGrid(newGrid);
    
    // Clear notes for this cell when placing a digit
    if (digit !== 0) {
      const newNotes = notes.map(r => r.map(c => [...c]));
      newNotes[row][col] = [];
      setNotes(newNotes);
    }

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
    } else if (digit !== 0) {
      // Check for completed sections (only if it's a correct move)
      const completedSections = getCompletedSections(oldGrid, newGrid, row, col);
      
      if (completedSections.rows.length > 0 || completedSections.columns.length > 0 || completedSections.boxes.length > 0) {
        // Set the glowing completions
        setGlowingCompletions(completedSections);
        
        // Play completion sound (only if sound is enabled)
        if (isSoundEnabled) {
          const totalCompletions = completedSections.rows.length + completedSections.columns.length + completedSections.boxes.length;
          if (totalCompletions > 1) {
            // Multiple completions - play elaborate sound
            playMultipleCompletionSound();
          } else {
            // Single completion - play appropriate sound
            playCompletionSound(completedSections);
          }
        }
        
        // Clear the glow after animation duration
        setTimeout(() => {
          setGlowingCompletions({
            rows: [],
            columns: [],
            boxes: []
          });
        }, 1200); // Match CSS animation duration (1.2s)
      }
    }

    // Check if game is complete
    if (isGridComplete(newGrid)) {
      if (isGridValid(newGrid)) {
        setGameStatus('completed');
        setIsTimerRunning(false);
        
        // Record the completion and show popup
        const recordData = addGameRecord(difficulty, timer);
        const difficultyRecord = getDifficultyRecord(difficulty);
        
        setCompletionData({
          difficulty,
          timer,
          lives,
          isNewRecord: recordData.isNewRecord,
          bestTime: recordData.bestTime,
          totalGamesPlayed: recordData.totalGames,
          averageTime: recordData.averageTime
        });
        
        // Clear saved game since it's completed
        localStorage.removeItem('sudoku-game-state');
        
        // Show completion popup after a brief delay for better UX
        setTimeout(() => {
          setShowCompletionPopup(true);
        }, 500);
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
    setIsNotesMode(false);
    setNotes(Array(9).fill().map(() => Array(9).fill().map(() => [])));
    setIsPaused(false);
    setGlowingCompletions({
      rows: [],
      columns: [],
      boxes: []
    });
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

  const handleNotesToggle = () => {
    setIsNotesMode(!isNotesMode);
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

  const handleShareGame = async () => {
    if (!grid || !originalGrid || !solution) {
      console.error('Cannot share: game not properly initialized');
      setShareMessage('❌ Cannot share: game not ready');
      setTimeout(() => setShareMessage(''), 3000);
      return;
    }

    const gameState = {
      grid,
      originalGrid,
      solution,
      difficulty,
      timer,
      lives,
      hintLevel,
      isNotesMode,
      notes,
      moveHistory,
      gameStatus,
      selectedCell,
      selectedNumber,
      isPaused,
      lastSaveTime: Date.now()
    };

    const shareableUrl = generateShareableUrl(gameState);
    if (!shareableUrl) {
      console.error('Failed to generate shareable URL');
      setShareMessage('❌ Failed to generate share link');
      setTimeout(() => setShareMessage(''), 3000);
      return;
    }

    try {
      // Always copy to clipboard
      await navigator.clipboard.writeText(shareableUrl);
      setShareMessage('✅ Game link copied to clipboard!');
      setTimeout(() => setShareMessage(''), 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: show the URL in the message
      setShareMessage('⚠️ Copy failed. Share this URL: ' + shareableUrl.substring(0, 50) + '...');
      setTimeout(() => setShareMessage(''), 5000);
    }
  };

  const handleCompletionNewGame = (selectedDifficulty) => {
    setShowCompletionPopup(false);
    if (selectedDifficulty) {
      // Start new game with specific difficulty
      startNewGame(selectedDifficulty);
    } else {
      // Show difficulty popup
      setShowDifficultyPopup(true);
    }
  };

  const handleCompletionShare = () => {
    handleShareGame();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!grid && !isAnimating && !showDifficultyPopup && !showContinuePopup) {
    return <div className="loading">Loading...</div>;
  }



  return (
    <>
      <div className={`app ${gameStatus === 'game-over' ? 'app-game-over-blurred' : ''} ${showContinuePopup || showCompletionPopup ? 'app-blurred' : ''}`}>
        <header className="app-header">
          <div className="header-left">
            <IconButton
              onClick={() => setIsDrawerOpen(true)}
              sx={{ 
                color: '#2d3748',
                marginRight: '8px',
                '&:hover': { backgroundColor: 'rgba(45, 55, 72, 0.1)' }
              }}
            >
              <Menu />
            </IconButton>
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
              shakingCompletions={glowingCompletions}
              notes={notes}
              isNotesMode={isNotesMode}
            />

            <DigitButtons
              onDigitSelect={handleDigitSelect}
              selectedCell={selectedCell}
              grid={grid}
              originalGrid={originalGrid}
              hintLevel={hintLevel}
              disabled={isAnimating}
              isNotesMode={isNotesMode}
              notes={notes}
            />

            <div className="control-buttons">
              <div className="control-button-group">
                <button 
                  className="control-button"
                  onClick={handleUndo}
                  disabled={moveHistory.length === 0 || isAnimating}
                  title="Undo"
                >
                  <Undo />
                </button>
                <span className="control-label">Undo</span>
              </div>
              
              <div className="control-button-group">
                <button 
                  className={getHintButtonClass()}
                  onClick={handleHintClick}
                  disabled={isAnimating}
                  title={`Hint Level: ${hintLevel.charAt(0).toUpperCase() + hintLevel.slice(1)}`}
                >
                  {getHintIcon()}
                </button>
                <span className="control-label">
                  {hintLevel.charAt(0).toUpperCase() + hintLevel.slice(1)}
                </span>
              </div>
              
              <div className="control-button-group">
                <button 
                  className={`control-button ${isNotesMode ? 'notes-active' : ''}`}
                  onClick={handleNotesToggle}
                  disabled={isAnimating}
                  title={isNotesMode ? 'Exit Notes Mode' : 'Enter Notes Mode'}
                >
                  {isNotesMode ? <Edit /> : <EditOutlined />}
                </button>
                <span className="control-label">
                  {isNotesMode ? 'Notes' : 'Notes'}
                </span>
              </div>
            </div>

            {/* Share Message */}
            {shareMessage && (
              <div className="share-message">
                {shareMessage}
              </div>
            )}
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

      {/* Left Drawer */}
      <Drawer
        anchor="left"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            backgroundColor: '#f8f9fa',
            borderRight: '1px solid #e2e8f0',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
            Game Controls
          </Typography>
        </Box>
        
        <List sx={{ pt: 1 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                handleNewGameClick();
                setIsDrawerOpen(false);
              }}
              disabled={isAnimating}
            >
              <ListItemIcon>
                <Add sx={{ color: '#4299e1' }} />
              </ListItemIcon>
              <ListItemText 
                primary="New Game" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                handleResetClick();
                setIsDrawerOpen(false);
              }}
              disabled={isAnimating}
            >
              <ListItemIcon>
                <Refresh sx={{ color: '#ed8936' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Reset Game" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                handleShareGame();
                setIsDrawerOpen(false);
              }}
              disabled={isAnimating || !grid || !originalGrid}
            >
              <ListItemIcon>
                <Share sx={{ color: '#38b2ac' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Share Game" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

          <Divider sx={{ my: 1 }} />

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                setIsSoundEnabled(!isSoundEnabled);
              }}
            >
              <ListItemIcon>
                {isSoundEnabled ? (
                  <VolumeUp sx={{ color: '#48bb78' }} />
                ) : (
                  <VolumeOff sx={{ color: '#a0aec0' }} />
                )}
              </ListItemIcon>
              <ListItemText 
                primary={isSoundEnabled ? "Sound On" : "Sound Off"}
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        </List>

        <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Typography variant="body2" sx={{ color: '#718096', textAlign: 'center' }}>
            Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </Typography>
          <Typography variant="body2" sx={{ color: '#718096', textAlign: 'center', mt: 0.5 }}>
            Lives: {lives} • Hints: {hintLevel}
          </Typography>
        </Box>
      </Drawer>

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
        canClose={!!(grid && originalGrid)} // Only allow closing if there's an existing game
      />

      {/* Completion Popup - Outside app container to avoid blur */}
      {completionData && (
        <CompletionPopup
          isOpen={showCompletionPopup}
          onClose={() => setShowCompletionPopup(false)}
          onNewGame={handleCompletionNewGame}
          onShare={handleCompletionShare}
          difficulty={completionData.difficulty}
          timer={completionData.timer}
          lives={completionData.lives}
          isNewRecord={completionData.isNewRecord}
          bestTime={completionData.bestTime}
          totalGamesPlayed={completionData.totalGamesPlayed}
          averageTime={completionData.averageTime}
        />
      )}
    </>
  );
}

export default App;
