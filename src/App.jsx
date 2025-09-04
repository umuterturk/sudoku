import React, { useState, useEffect, Suspense } from 'react';
import SudokuGrid from './components/SudokuGrid';
import DigitButtons from './components/DigitButtons';
import Hearts from './components/Hearts';
import LoadingScreen from './components/LoadingScreen';

// Lazy load popup components for better initial load performance
const DifficultyPopup = React.lazy(() => import('./components/DifficultyPopup'));
const ResetConfirmationPopup = React.lazy(() => import('./components/ResetConfirmationPopup'));
const ContinueGamePopup = React.lazy(() => import('./components/ContinueGamePopup'));
const CompletionPopup = React.lazy(() => import('./components/CompletionPopup'));
import { generatePuzzle, isGridComplete, isGridValid, isValidMove, loadPuzzleDatabase, enableFlightMode, isFlightModeEnabled, isFlightModeEnabledSync, disableFlightMode, refreshFlightModeCacheIfNeeded, getFlightModeCacheStats, getRandomAnimationPuzzles, stringToGrid, parseGameFromUrl, generateShareableUrl, addGameRecord, getDifficultyRecord, getCompletedSections, findCellsWithOnePossibility, idclipCheat } from './utils/sudokuUtils';
import { playCompletionSound, playMultipleCompletionSound, createCompletionSound, createPerfectGameSound, createHintSound } from './utils/audioUtils';
import { initGA, trackPageView, trackGameStarted, trackGameCompleted, trackGameOver, trackHintUsed, trackFlightModeToggle } from './utils/analytics';
import { Undo, Add, Refresh, Lightbulb, LightbulbOutlined, Circle, FiberManualRecord, Pause, PlayArrow, Share, Menu, VolumeUp, VolumeOff, Edit, EditOutlined, FlightTakeoff, FlightLand } from '@mui/icons-material';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Divider, Box, Typography } from '@mui/material';
import './App.css';

function App() {
  const [grid, setGrid] = useState(null);
  const [originalGrid, setOriginalGrid] = useState(null);
  const [solution, setSolution] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');

  // Safe setDifficulty wrapper to ensure it's always a valid string
  const safSetDifficulty = (newDifficulty) => {
    if (typeof newDifficulty === 'string' && ['easy', 'children', 'medium', 'hard', 'expert'].includes(newDifficulty)) {
      setDifficulty(newDifficulty);
    } else {
      console.warn('Invalid difficulty value:', newDifficulty, 'defaulting to medium');
      setDifficulty('medium');
    }
  };
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
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressTriggered, setIsLongPressTriggered] = useState(false);
  
  // Auto-hint system for easy and children modes
  const [lastMoveTime, setLastMoveTime] = useState(Date.now());
  const [autoHintTimer, setAutoHintTimer] = useState(null);

  // Debug effect to log when highlightedCells changes
  useEffect(() => {
    console.log('🔍 highlightedCells state changed:', highlightedCells);
  }, [highlightedCells]);

  // Auto-hint system: track moves and set up inactivity timer
  useEffect(() => {
    // Only enable auto-hint for easy and children modes
    if (difficulty !== 'easy' && difficulty !== 'children') {
      return;
    }

    // Only track moves during active gameplay
    if (gameStatus !== 'playing' || isPaused || isAnimating) {
      return;
    }

    // Update last move time whenever move history changes
    setLastMoveTime(Date.now());
    
    // Clear existing auto-hint timer
    if (autoHintTimer) {
      clearTimeout(autoHintTimer);
    }

    // Set up new 3-minute inactivity timer
    const timer = setTimeout(() => {
      console.log('🤖 2 minutes of inactivity detected, triggering auto-hint');
      showAutoHint();
    }, 120000); // 2 minutes = 120,000 milliseconds

    setAutoHintTimer(timer);

    // Cleanup timer on unmount or dependency change
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [moveHistory, difficulty, gameStatus, isPaused, isAnimating]);

  // Clean up auto-hint timer when game ends or pauses
  useEffect(() => {
    if (gameStatus !== 'playing' || isPaused) {
      if (autoHintTimer) {
        clearTimeout(autoHintTimer);
        setAutoHintTimer(null);
      }
    }
  }, [gameStatus, isPaused]);

  // Debug function for testing hint long press from console
  const testHintLongPress = () => {
    console.log('🧪 Testing hint long press manually...');
    handleHintLongPress();
  };

  // Debug function for testing auto-hint from console
  const testAutoHint = () => {
    console.log('🧪 Testing auto-hint manually...');
    showAutoHint();
  };

  // Make test functions available globally for debugging
  useEffect(() => {
    window.testHintLongPress = testHintLongPress;
    window.testAutoHint = testAutoHint;
    return () => {
      delete window.testHintLongPress;
      delete window.testAutoHint;
    };
  }, [grid]);
  
  // Loading and flight mode states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [flightModeEnabled, setFlightModeEnabled] = useState(false);
  const [flightModeLoading, setFlightModeLoading] = useState(false);

  // Helper function to safely format difficulty string
  const formatDifficulty = (diff) => {
    if (!diff || typeof diff !== 'string') {
      return 'Medium'; // Default fallback
    }
    return diff.charAt(0).toUpperCase() + diff.slice(1);
  };

  // Cheat code function - DOOM reference!
  const idkfa = () => {
    console.log('🎮 IDKFA activated! All weapons and ammo... err, lives restored!');
    setLives(3);
    console.log('❤️ Lives restored to 3');
    
    // Optional: Also restore some other benefits
    if (gameStatus === 'game-over') {
      setGameStatus('playing');
      setIsTimerRunning(true);
      console.log('🔄 Game over state cleared - you can continue playing!');
    }
  };

  // Additional cheat codes for fun
  const iddqd = () => {
    console.log('🛡️ IDDQD activated! God mode - infinite lives!');
    setLives(999);
    console.log('❤️ Lives set to 999 (basically infinite)');
  };

  const idspispopd = () => {
    if (solution) {
      // Show solution without logging it to console
      alert('Solution revealed in browser developer tools (F12)');
    }
  };

  // IDCLIP cheat code - DOOM reference for no-clipping through walls
  const idclip = () => {
    if (!grid || !solution) {
      console.log('❌ IDCLIP: No active game to cheat in');
      return;
    }
    
    console.log('🎮 IDCLIP activated! No-clipping through a random 3x3 box...');
    const newGrid = idclipCheat(grid, solution);
    
    // Check if the grid actually changed by comparing content
    const gridChanged = JSON.stringify(newGrid) !== JSON.stringify(grid);
    
    if (gridChanged) {
      // Add to move history for undo functionality
      setMoveHistory(prev => [...prev, { 
        type: 'cheat', 
        description: 'IDCLIP cheat activated',
        previousGrid: grid.map(row => [...row]),
        newGrid: newGrid.map(row => [...row])
      }]);
      
      setGrid(newGrid);
      console.log('✅ IDCLIP: Successfully filled a random 3x3 box!');
      
      // Check if game is now complete
      if (isGridComplete(newGrid)) {
        if (isGridValid(newGrid)) {
          setGameStatus('completed');
          setIsTimerRunning(false);
          
          // Record the completion and show popup
          const recordData = addGameRecord(difficulty, timer);
          
          // Play completion sound (only if sound is enabled)
          if (isSoundEnabled) {
            // Use special sound for perfect games (no mistakes) or new records
            const isPerfectGame = lives === 3;
            const isNewRecord = recordData?.isNewRecord || false;
            
            if (isPerfectGame || isNewRecord) {
              createPerfectGameSound();
            } else {
              createCompletionSound();
            }
          }
          const difficultyRecord = getDifficultyRecord(difficulty);
          
          setCompletionData({
            difficulty,
            timer,
            lives,
            isNewRecord: recordData?.isNewRecord || false,
            bestTime: recordData?.bestTime || difficultyRecord.bestTime,
            totalGamesPlayed: recordData?.totalGames || difficultyRecord.totalGames,
            averageTime: recordData?.averageTime || difficultyRecord.averageTime
          });
          
          // Clear saved game since it's completed
          localStorage.removeItem('sudoku-game-state');
          
          // Show completion popup after a brief delay
          setTimeout(() => {
            setShowCompletionPopup(true);
          }, 500);
        }
      }
    } else {
      console.log('🎮 IDCLIP: No changes made (all boxes might be complete or no incomplete boxes found)');
    }
  };

  // Save game state to localStorage
  const saveGameState = (gameState) => {
    try {
      // Create a clean copy of gameState to avoid circular references
      const cleanGameState = {
        grid: gameState.grid,
        originalGrid: gameState.originalGrid,
        solution: gameState.solution,
        selectedCell: gameState.selectedCell,
        selectedNumber: gameState.selectedNumber,
        difficulty: gameState.difficulty,
        gameStatus: gameState.gameStatus,
        timer: gameState.timer,
        moveHistory: gameState.moveHistory,
        lives: gameState.lives,
        hintLevel: gameState.hintLevel,
        isNotesMode: gameState.isNotesMode,
        notes: gameState.notes,
        isPaused: gameState.isPaused,
        lastSaveTime: gameState.lastSaveTime
      };
      
      // Debug: Check each property for circular references
      for (const [key, value] of Object.entries(cleanGameState)) {
        try {
          JSON.stringify(value);
        } catch (err) {
          console.error(`Circular reference in ${key}:`, value, err);
        }
      }
      
      localStorage.setItem('sudoku-game-state', JSON.stringify(cleanGameState));
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

  // Make cheat codes globally accessible from console
  useEffect(() => {
    // Add cheat codes to global window object
    window.idkfa = idkfa;
    window.iddqd = iddqd;
    window.idspispopd = idspispopd;
    
    // Make idclip work without parentheses using a getter
    Object.defineProperty(window, 'idclip', {
      get: function() {
        idclip();
        return 'IDCLIP activated!';
      },
      configurable: true
    });
    
    // Add a help function to list available cheats
    window.cheats = () => {
      console.log('🎮 Available cheat codes:');
      console.log('• idkfa() - Restore lives to 3 (DOOM: all weapons & ammo)');
      console.log('• iddqd() - God mode: 999 lives (DOOM: invincibility)');
      console.log('• idspispopd() - Reveal solution (DOOM: no-clipping)');
      console.log('• idclip - Fill a random 3x3 box (DOOM: no-clipping through walls)');
      console.log('• cheats() - Show this help');
    };
    
    // Cleanup function to remove from window when component unmounts
    return () => {
      delete window.idkfa;
      delete window.iddqd;
      delete window.idspispopd;
      delete window.idclip;
      delete window.cheats;
    };
  }, [idkfa, iddqd, idspispopd, idclip]);

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

    console.log('🚀 Sudoku app initializing...');
    
    // Initialize Google Analytics
    initGA();
    trackPageView('Sudoku Game - Home');
    
    initializeGame();

    // Check if flight mode is enabled and handle daily refresh
    const initializeFlightMode = async () => {
      try {
        // Check flight mode status
        const flightMode = await isFlightModeEnabled();
        setFlightModeEnabled(flightMode);
        console.log(`✈️ Flight mode status: ${flightMode ? 'ENABLED' : 'DISABLED'}`);
        
        // If flight mode is enabled and we're online, check for daily refresh
        if (flightMode && navigator.onLine) {
          console.log('🔄 Checking if flight mode cache needs refresh...');
          const refreshed = await refreshFlightModeCacheIfNeeded((progress) => {
            console.log(`📦 Refreshing cache: ${progress.difficulty} (${progress.completed}/${progress.total})`);
          });
          
          if (refreshed) {
            console.log('✅ Flight mode cache refreshed with latest puzzles');
          }
        }
      } catch (error) {
        console.error('Error initializing flight mode:', error);
        // Fallback to sync check
        const flightMode = isFlightModeEnabledSync();
        setFlightModeEnabled(flightMode);
      }
    };
    
    initializeFlightMode();
    console.log('📱 App ready - databases will load on demand');
  }, []);

  // Auto-save game state
  useEffect(() => {
    if (grid && originalGrid && gameStatus !== 'completed') {
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

  // Animation puzzles now handled by unified cache system in sudokuUtils

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
    
    // Reset auto-hint system for new game
    setLastMoveTime(Date.now());
    if (autoHintTimer) {
      clearTimeout(autoHintTimer);
      setAutoHintTimer(null);
    }
    
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
      console.log(`🎮 Starting new ${selectedDifficulty} game...`);
      
      // Show loading screen with database loading message
      setIsLoading(true);
      setLoadingMessage(`Loading ${formatDifficulty(selectedDifficulty)} puzzles...`);
      setLoadingProgress(0);
      
      // Load the puzzle database for selected difficulty
      console.log(`📦 Requesting ${selectedDifficulty} puzzle database...`);
      await loadPuzzleDatabase(selectedDifficulty);
      setLoadingProgress(50);
      
      // Generate puzzle from loaded database
      setLoadingMessage('Generating puzzle...');
      const { puzzle, solution: puzzleSolution } = await generatePuzzle(selectedDifficulty);
      setLoadingProgress(75);
      console.log(`🧩 Puzzle generated successfully for ${selectedDifficulty} difficulty`);
      
      // Hide loading screen and start animation
      setIsLoading(false);
      setIsAnimating(true);
      console.log(`🎬 Starting game animation...`);
      
      // Start game animation
      await animateGameStart(puzzle, puzzleSolution, selectedDifficulty);
      
      // Track game started event
      trackGameStarted(selectedDifficulty);
      
      console.log(`✨ Game started successfully!`);
    } catch (error) {
      console.error('Failed to start new game:', error);
      setIsLoading(false);
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
      
      // Automatically set selectedNumber to show hints for the entered number
      setSelectedNumber(digit);
    } else {
      // If clearing the cell (digit is 0), clear the selected number
      setSelectedNumber(null);
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
          // Track game over event
          trackGameOver(difficulty, timer);
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
        
        // Track game completion
        trackGameCompleted(difficulty, timer, lives);
        
        // Record the completion and show popup
        const recordData = addGameRecord(difficulty, timer);
        
        // Play completion sound (only if sound is enabled)
        if (isSoundEnabled) {
          // Use special sound for perfect games (no mistakes) or new records
          const isPerfectGame = lives === 3;
          const isNewRecord = recordData?.isNewRecord || false;
          
          if (isPerfectGame || isNewRecord) {
            createPerfectGameSound();
          } else {
            createCompletionSound();
          }
        }
        const difficultyRecord = getDifficultyRecord(difficulty);
        
        setCompletionData({
          difficulty,
          timer,
          lives,
          isNewRecord: recordData?.isNewRecord || false,
          bestTime: recordData?.bestTime || difficultyRecord.bestTime,
          totalGamesPlayed: recordData?.totalGames || difficultyRecord.totalGames,
          averageTime: recordData?.averageTime || difficultyRecord.averageTime
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
    
    // Reset auto-hint system
    setLastMoveTime(Date.now());
    if (autoHintTimer) {
      clearTimeout(autoHintTimer);
      setAutoHintTimer(null);
    }
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
    console.log('🔄 Hint click event triggered, isLongPressTriggered:', isLongPressTriggered);
    
    // Don't change hint level if this was a long press
    if (isLongPressTriggered) {
      console.log('🚫 Preventing hint level change due to long press');
      setIsLongPressTriggered(false); // Reset the flag
      event.target.blur();
      return;
    }
    
    // Cycle through hint levels in round-robin style starting with medium
    const hintLevels = ['medium', 'novice', 'arcade', 'hard'];
    const currentIndex = hintLevels.indexOf(hintLevel);
    const nextIndex = (currentIndex + 1) % hintLevels.length;
    const newHintLevel = hintLevels[nextIndex];
    setHintLevel(newHintLevel);
    
    // Track hint usage
    trackHintUsed(newHintLevel, difficulty);
    
    console.log('🔄 Hint level changed to:', newHintLevel);
    
    // Remove focus from the button
    event.target.blur();
  };

  const handleHintLongPress = () => {
    console.log('🔍 Hint long press triggered!');
    
    // Set flag to prevent click event from changing hint level
    setIsLongPressTriggered(true);
    
    if (!grid) {
      console.log('❌ No grid available for hint long press');
      return;
    }
    
    console.log('🔍 Finding cells with only one possibility...');
    
    // Find cells with only one possibility
    const cellsWithOnePossibility = findCellsWithOnePossibility(grid);
    
    console.log(`🔍 Found ${cellsWithOnePossibility.length} cells with one possibility:`, cellsWithOnePossibility);
    
    if (cellsWithOnePossibility.length === 0) {
      console.log('❌ No cells with single possibility found');
      return;
    }
    
    // Highlight these cells in green
    const highlightCells = cellsWithOnePossibility.map(cell => ({
      row: cell.row,
      col: cell.col
    }));
    
    console.log('✅ Setting highlighted cells:', highlightCells);
    setHighlightedCells(highlightCells);
    
    // Remove the highlight after 2 seconds
    setTimeout(() => {
      console.log('🔍 Removing highlighted cells after 2 seconds');
      setHighlightedCells([]);
    }, 2000);
  };

  // Function to show automatic hint for easy/children modes
  const showAutoHint = () => {
    console.log('🤖 Auto-hint triggered for inactivity!');
    
    if (!grid) {
      console.log('❌ No grid available for auto-hint');
      return;
    }
    
    // Find cells with only one possibility
    const cellsWithOnePossibility = findCellsWithOnePossibility(grid);
    
    if (cellsWithOnePossibility.length === 0) {
      console.log('❌ No cells with single possibility found for auto-hint');
      return;
    }
    
    // Show only ONE random cell with a single possibility
    const randomIndex = Math.floor(Math.random() * cellsWithOnePossibility.length);
    const selectedCell = cellsWithOnePossibility[randomIndex];
    
    console.log(`🤖 Auto-hint: showing cell (${selectedCell.row}, ${selectedCell.col}) with value ${selectedCell.number}`);
    
    // Highlight just this one cell
    setHighlightedCells([{
      row: selectedCell.row,
      col: selectedCell.col
    }]);
    
    // Play gentle hint sound (only if sound is enabled)
    if (isSoundEnabled) {
      createHintSound();
    }
    
    // Remove the highlight after 5 seconds (longer for auto-hint)
    setTimeout(() => {
      console.log('🤖 Removing auto-hint highlight after 5 seconds');
      setHighlightedCells([]);
    }, 5000);
    
    // Track auto-hint usage
    trackHintUsed('auto', difficulty);
  };

  const handleHintMouseDown = (event) => {
    console.log('👇 Hint button mouse/touch down event triggered, event type:', event.type);
    event.preventDefault();
    
    // Clear any existing timer first
    if (longPressTimer) {
      console.log('⏰ Clearing existing timer before setting new one');
      clearTimeout(longPressTimer);
    }
    
    const timer = setTimeout(() => {
      console.log('⏰ Long press timer triggered after 800ms');
      handleHintLongPress();
    }, 800); // 800ms for long press
    setLongPressTimer(timer);
    console.log('⏰ Long press timer set:', timer);
  };

  const handleHintMouseUp = (event) => {
    console.log('👆 Hint button mouse/touch up event triggered, event type:', event.type);
    if (longPressTimer) {
      console.log('⏰ Clearing long press timer (regular release):', longPressTimer);
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      // Reset the long press flag if timer was cleared before triggering
      // Use a small timeout to ensure this happens after any potential click event
      setTimeout(() => {
        if (isLongPressTriggered) {
          console.log('🔄 Resetting long press flag after regular release');
          setIsLongPressTriggered(false);
        }
      }, 10);
    } else {
      console.log('⏰ No long press timer to clear');
    }
  };

  const handleHintMouseLeave = (event) => {
    console.log('🚪 Hint button mouse leave event triggered');
    if (longPressTimer) {
      console.log('⏰ Clearing long press timer on mouse leave:', longPressTimer);
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      // Reset the long press flag when mouse leaves
      setTimeout(() => {
        if (isLongPressTriggered) {
          console.log('🔄 Resetting long press flag after mouse leave');
          setIsLongPressTriggered(false);
        }
      }, 10);
    } else {
      console.log('⏰ No long press timer to clear on mouse leave');
    }
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

  // Flight mode handlers
  const handleFlightModeToggle = async () => {
    if (flightModeEnabled) {
      // Disable flight mode
      console.log('🛬 Disabling flight mode...');
      setFlightModeLoading(true);
      
      try {
        await disableFlightMode();
        setFlightModeEnabled(false);
        trackFlightModeToggle(false);
        console.log('✅ Flight mode disabled - persistent cache cleared');
      } catch (error) {
        console.error('Error disabling flight mode:', error);
        setFlightModeEnabled(false); // Still update UI
      }
      
      setFlightModeLoading(false);
    } else {
      // Enable flight mode with progress tracking and persistent storage
      console.log('🛩️ Enabling flight mode - downloading all puzzles...');
      setFlightModeLoading(true);
      setIsLoading(true);
      setLoadingMessage('Preparing for flight mode...');
      setLoadingProgress(0);
      
      const success = await enableFlightMode((progress) => {
        console.log(`📥 Loading ${progress.difficulty}: ${progress.completed}/${progress.total} (${Math.round(progress.progress)}%)`);
        setLoadingMessage(`Loading ${progress.difficulty} puzzles... (${progress.completed}/${progress.total})`);
        setLoadingProgress(progress.progress);
      });
      
      setFlightModeLoading(false);
      setIsLoading(false);
      
      if (success) {
        setFlightModeEnabled(true);
        trackFlightModeToggle(true);
        setIsDrawerOpen(false); // Close drawer after successful activation
        console.log('✈️ Flight mode enabled! All puzzles cached persistently for offline play.');
      } else {
        console.error('❌ Failed to enable flight mode');
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading screen when loading or when no grid exists and not showing popups
  if (isLoading || (!grid && !isAnimating && !showDifficultyPopup && !showContinuePopup)) {
    return (
      <LoadingScreen 
        message={loadingMessage || 'Loading Sudoku...'}
        progress={loadingProgress}
        showProgress={loadingProgress !== null}
        subMessage={flightModeLoading ? 'Downloading puzzles for offline play' : null}
      />
    );
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
                {formatDifficulty(difficulty)}
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
              highlightedCells={highlightedCells}
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
                <a
                  href="https://buymeacoffee.com/codeonbrew"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="control-button buymeacoffee-button"
                  title="Support Umut - Buy me a coffee!"
                >
                  <div id="logo">
                    <svg width="27" height="39" viewBox="0 0 27 39" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.3206 17.9122C12.9282 18.5083 11.3481 19.1842 9.30013 19.1842C8.44341 19.1824 7.59085 19.0649 6.76562 18.8347L8.18203 33.3768C8.23216 33.9847 8.50906 34.5514 8.95772 34.9645C9.40638 35.3776 9.994 35.6069 10.6039 35.6068C10.6039 35.6068 12.6122 35.7111 13.2823 35.7111C14.0036 35.7111 16.1662 35.6068 16.1662 35.6068C16.776 35.6068 17.3635 35.3774 17.8121 34.9643C18.2606 34.5512 18.5374 33.9846 18.5876 33.3768L20.1046 17.3073C19.4267 17.0757 18.7425 16.9219 17.9712 16.9219C16.6372 16.9214 15.5623 17.3808 14.3206 17.9122Z" fill="#FFDD00"></path>
                      <path d="M26.6584 10.3609L26.4451 9.28509C26.2537 8.31979 25.8193 7.40768 24.8285 7.05879C24.5109 6.94719 24.1505 6.89922 23.907 6.66819C23.6634 6.43716 23.5915 6.07837 23.5351 5.74565C23.4308 5.13497 23.3328 4.52377 23.2259 3.91413C23.1336 3.39002 23.0606 2.80125 22.8202 2.32042C22.5073 1.6748 21.858 1.29723 21.2124 1.04743C20.8815 0.923938 20.5439 0.819467 20.2012 0.734533C18.5882 0.308987 16.8922 0.152536 15.2328 0.0633591C13.241 -0.046547 11.244 -0.0134338 9.25692 0.162444C7.77794 0.296992 6.22021 0.459701 4.81476 0.971295C4.30108 1.15851 3.77175 1.38328 3.38115 1.78015C2.90189 2.26775 2.74544 3.02184 3.09537 3.62991C3.34412 4.06172 3.7655 4.3668 4.21242 4.56862C4.79457 4.82867 5.40253 5.02654 6.02621 5.15896C7.76282 5.54279 9.56148 5.6935 11.3356 5.75765C13.302 5.83701 15.2716 5.77269 17.2286 5.56521C17.7126 5.51202 18.1956 5.44822 18.6779 5.37382C19.2458 5.28673 19.6103 4.54411 19.4429 4.02678C19.2427 3.40828 18.7045 3.16839 18.0959 3.26173C18.0062 3.27581 17.917 3.28885 17.8273 3.30189L17.7626 3.31128C17.5565 3.33735 17.3503 3.36169 17.1441 3.38429C16.7182 3.43018 16.2913 3.46773 15.8633 3.49693C14.9048 3.56368 13.9437 3.59445 12.9831 3.59602C12.0391 3.59602 11.0947 3.56942 10.1529 3.50736C9.72314 3.4792 9.29447 3.44339 8.86684 3.39993C8.67232 3.37959 8.47832 3.35821 8.28432 3.33422L8.0997 3.31076L8.05955 3.30502L7.86816 3.27738C7.47703 3.21845 7.0859 3.15066 6.69895 3.06878C6.6599 3.06012 6.62498 3.03839 6.59994 3.0072C6.57491 2.976 6.56127 2.9372 6.56127 2.8972C6.56127 2.85721 6.57491 2.81841 6.59994 2.78721C6.62498 2.75602 6.6599 2.73429 6.69895 2.72563H6.70625C7.04158 2.65418 7.37951 2.59317 7.71849 2.53997C7.83148 2.52224 7.94482 2.50486 8.05851 2.48782H8.06164C8.27389 2.47374 8.48718 2.43567 8.69839 2.41064C10.536 2.2195 12.3845 2.15434 14.231 2.2156C15.1275 2.24168 16.0234 2.29435 16.9157 2.38509C17.1076 2.40491 17.2985 2.42577 17.4894 2.44923C17.5624 2.4581 17.6359 2.46853 17.7094 2.47739L17.8575 2.49878C18.2893 2.56309 18.7189 2.64115 19.1462 2.73293C19.7793 2.87061 20.5923 2.91546 20.8739 3.60906C20.9636 3.82913 21.0043 4.07371 21.0538 4.30474L21.1169 4.59939C21.1186 4.60467 21.1198 4.61008 21.1206 4.61555C21.2697 5.31089 21.4191 6.00623 21.5686 6.70157C21.5795 6.75293 21.5798 6.80601 21.5693 6.85748C21.5589 6.90895 21.5379 6.95771 21.5078 7.00072C21.4776 7.04373 21.4389 7.08007 21.3941 7.10747C21.3493 7.13487 21.2993 7.15274 21.2473 7.15997H21.2431L21.1519 7.17248L21.0617 7.18448C20.7759 7.22168 20.4897 7.25644 20.2033 7.28878C19.639 7.3531 19.0739 7.40872 18.5079 7.45566C17.3831 7.54918 16.2562 7.61055 15.127 7.63975C14.5516 7.65505 13.9763 7.66217 13.4013 7.66113C11.1124 7.65933 8.82553 7.5263 6.55188 7.2627C6.30574 7.2335 6.05959 7.20221 5.81344 7.1704C6.00431 7.19491 5.67472 7.15162 5.60797 7.14224C5.45152 7.12033 5.29506 7.09756 5.13861 7.07392C4.61346 6.99517 4.09144 6.89817 3.56733 6.81317C2.9337 6.70887 2.32771 6.76102 1.75458 7.07392C1.28413 7.33136 0.903361 7.72614 0.663078 8.20558C0.415886 8.71665 0.342354 9.2731 0.231796 9.82224C0.121237 10.3714 -0.0508594 10.9622 0.0143284 11.526C0.154613 12.7427 1.00518 13.7314 2.22863 13.9525C3.37959 14.1611 4.5368 14.3301 5.69714 14.474C10.2552 15.0323 14.8601 15.0991 19.4325 14.6733C19.8048 14.6385 20.1767 14.6006 20.548 14.5596C20.6639 14.5468 20.7813 14.5602 20.8914 14.5987C21.0016 14.6372 21.1017 14.6998 21.1845 14.782C21.2673 14.8642 21.3307 14.9639 21.37 15.0737C21.4093 15.1836 21.4235 15.3009 21.4116 15.4169L21.2958 16.5423C21.0625 18.8164 20.8292 21.0903 20.596 23.3641C20.3526 25.7519 20.1077 28.1395 19.8612 30.5269C19.7916 31.1993 19.7221 31.8715 19.6526 32.5436C19.5858 33.2054 19.5764 33.888 19.4507 34.542C19.2526 35.5704 18.5564 36.2019 17.5405 36.433C16.6098 36.6448 15.659 36.756 14.7045 36.7646C13.6464 36.7704 12.5888 36.7234 11.5307 36.7292C10.4011 36.7354 9.01755 36.6311 8.1456 35.7905C7.37951 35.052 7.27365 33.8958 7.16935 32.8961C7.03028 31.5725 6.89243 30.2491 6.75579 28.9259L5.98918 21.568L5.49324 16.8072C5.48489 16.7285 5.47655 16.6508 5.46873 16.5715C5.40927 16.0036 5.0072 15.4477 4.37357 15.4764C3.83121 15.5004 3.21479 15.9614 3.27841 16.5715L3.64607 20.1011L4.40642 27.4021C4.62302 29.4759 4.8391 31.5501 5.05465 33.6247C5.09637 34.022 5.13548 34.4205 5.17929 34.8179C5.41762 36.9894 7.07599 38.1596 9.12967 38.4892C10.3291 38.6822 11.5578 38.7218 12.775 38.7416C14.3353 38.7667 15.9113 38.8267 17.4461 38.544C19.7203 38.1268 21.4267 36.6082 21.6702 34.2526C21.7398 33.5725 21.8093 32.8923 21.8788 32.2119C22.11 29.9618 22.3409 27.7115 22.5714 25.4611L23.3255 18.1079L23.6713 14.7379C23.6885 14.5708 23.759 14.4137 23.8725 14.2898C23.986 14.1659 24.1363 14.0819 24.3012 14.0501C24.9515 13.9233 25.5732 13.7069 26.0357 13.212C26.7721 12.424 26.9187 11.3967 26.6584 10.3609ZM2.19525 11.0879C2.20516 11.0832 2.18691 11.1682 2.17909 11.2079C2.17752 11.1479 2.18065 11.0947 2.19525 11.0879ZM2.25836 11.5761C2.26357 11.5724 2.27921 11.5933 2.29538 11.6183C2.27087 11.5953 2.25523 11.5781 2.25783 11.5761H2.25836ZM2.32041 11.6579C2.34284 11.696 2.35483 11.72 2.32041 11.6579V11.6579ZM2.44505 11.7591H2.44818C2.44818 11.7627 2.45392 11.7664 2.456 11.7701C2.45255 11.766 2.4487 11.7624 2.44453 11.7591H2.44505ZM24.271 11.6079C24.0373 11.83 23.6853 11.9333 23.3375 11.9849C19.4366 12.5638 15.479 12.8569 11.5354 12.7275C8.71299 12.6311 5.92035 12.3176 3.12613 11.9229C2.85234 11.8843 2.55561 11.8342 2.36735 11.6324C2.01273 11.2517 2.18691 10.4851 2.27921 10.0251C2.3637 9.60373 2.52536 9.04207 3.02653 8.9821C3.80878 8.89031 4.71724 9.22042 5.49115 9.33776C6.4229 9.47996 7.35813 9.59382 8.29683 9.67935C12.303 10.0444 16.3765 9.98755 20.3649 9.45354C21.0919 9.35584 21.8163 9.24233 22.538 9.11299C23.181 8.99774 23.8939 8.78132 24.2825 9.44728C24.5489 9.90098 24.5844 10.508 24.5432 11.0207C24.5305 11.244 24.4329 11.4541 24.2705 11.6079H24.271Z" fill="#0D0C22"></path>
                    </svg>
                  </div>
                </a>
                <span className="control-label">Support</span>
              </div>
              
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
                  onMouseDown={handleHintMouseDown}
                  onMouseUp={handleHintMouseUp}
                  onMouseLeave={handleHintMouseLeave}
                  onTouchStart={handleHintMouseDown}
                  onTouchEnd={handleHintMouseUp}
                  onTouchCancel={handleHintMouseUp}
                  disabled={isAnimating}
                  title={`Hint Level: ${hintLevel.charAt(0).toUpperCase() + hintLevel.slice(1)} (Long press to show cells with one possibility)`}
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

        <Suspense fallback={null}>
          <ResetConfirmationPopup
            isOpen={showResetPopup}
            onClose={() => setShowResetPopup(false)}
            onConfirm={handleResetConfirm}
          />
        </Suspense>
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

          <ListItem disablePadding>
            <ListItemButton
              onClick={handleFlightModeToggle}
              disabled={flightModeLoading}
            >
              <ListItemIcon>
                {flightModeEnabled ? (
                  <FlightLand sx={{ color: '#48bb78' }} />
                ) : (
                  <FlightTakeoff sx={{ color: '#a0aec0' }} />
                )}
              </ListItemIcon>
              <ListItemText 
                primary={flightModeEnabled ? "Flight Mode: On" : "Flight Mode: Off"}
                secondary={flightModeEnabled ? "All puzzles cached for offline play" : "Tap to download all puzzles"}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </ListItemButton>
          </ListItem>
        </List>

        <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Typography variant="body2" sx={{ color: '#718096', textAlign: 'center' }}>
            Difficulty: {formatDifficulty(difficulty)}
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
      <Suspense fallback={null}>
        <ContinueGamePopup
          isOpen={showContinuePopup}
          onContinue={handleContinueGame}
          onNewGame={handleContinueNewGame}
          onClose={() => setShowContinuePopup(false)}
          difficulty={difficulty}
          timer={timer}
        />
      </Suspense>

      {/* Difficulty Popup - Outside app container to avoid blur */}
      <Suspense fallback={null}>
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
      </Suspense>

      {/* Completion Popup - Outside app container to avoid blur */}
      {completionData && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </>
  );
}

export default App;
