import { useEffect } from 'react';
import { generatePuzzle, loadPuzzleDatabase, getRandomAnimationPuzzles, preloadPuzzleDatabases, stringToGrid } from '../utils/sudokuUtils';
import { trackGameStarted } from '../utils/analytics';
import { useGameContext } from '../contexts/GameContext';

/**
 * Custom hook for managing game initialization and animation
 */
export const useGameInitialization = (
  grid,
  setGrid,
  originalGrid,
  setOriginalGrid,
  solution,
  setSolution,
  selectedCell,
  setSelectedCell,
  selectedNumber,
  setSelectedNumber,
  difficulty,
  setDifficulty,
  gameStatus,
  setGameStatus,
  lives,
  setLives,
  isShaking,
  setIsShaking,
  hintLevel,
  setHintLevel,
  isPaused,
  setIsPaused,
  isAnimating,
  setIsAnimating,
  animationGrid,
  setAnimationGrid,
  isNotesMode,
  setIsNotesMode,
  notes,
  setNotes,
  errorCells,
  setErrorCells,
  timer,
  setTimer,
  isTimerRunning,
  setIsTimerRunning,
  isLoading,
  setIsLoading,
  loadingMessage,
  setLoadingMessage,
  loadingProgress,
  setLoadingProgress,
  lastMoveTime,
  setLastMoveTime,
  autoHintTimer,
  setAutoHintTimer,
  initializeFallbackGame
) => {
  // Get game context with strategy pattern
  const { gameModeManager } = useGameContext();

  // Helper function to safely format difficulty string
  const formatDifficulty = (diff) => {
    if (!diff || typeof diff !== 'string') {
      return 'Medium'; // Default fallback
    }
    return diff.charAt(0).toUpperCase() + diff.slice(1);
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
    setLives(3);
    setIsShaking(false);
    setDifficulty(selectedDifficulty);
    setHintLevel('medium');
    setIsNotesMode(false);
    setNotes(Array(9).fill().map(() => Array(9).fill().map(() => [])));
    setIsPaused(false);
    setErrorCells([]);
    
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

  const preloadAllDifficulties = async () => {
    try {
      console.log('🔄 Preloading all difficulty levels...');
      setIsLoading(true);
      setLoadingMessage('Loading all puzzle databases...');
      setLoadingProgress(0);
      
      const allDifficulties = ['easy', 'children', 'medium', 'hard', 'expert'];
      
      await preloadPuzzleDatabases(allDifficulties, (progress) => {
        console.log(`📦 Loading ${progress.difficulty}: ${progress.completed}/${progress.total} (${Math.round(progress.progress)}%)`);
        setLoadingMessage(`Loading ${progress.difficulty} puzzles... (${progress.completed}/${progress.total})`);
        setLoadingProgress(progress.progress);
      });
      
      console.log('✅ All difficulty levels preloaded successfully');
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Failed to preload all difficulties:', error);
      setIsLoading(false);
      return false;
    }
  };

  // Initialize multiplayer game with revealed cells
  const initializeMultiplayerGame = async (boardId, revealedCells) => {
    try {
      console.log(`🎮 Initializing multiplayer game with board ID: ${boardId}`);
      
      setLoadingMessage('Loading multiplayer puzzle...');
      setLoadingProgress(50);
      
      // Load the specific puzzle from the easy database (multiplayer uses easy difficulty)
      const puzzleDatabase = await loadPuzzleDatabase('easy');
      
      // boardId is the index in the array (0-499 for easy puzzles)
      const puzzleIndex = parseInt(boardId);
      if (puzzleIndex < 0 || puzzleIndex >= puzzleDatabase.length) {
        throw new Error(`Puzzle with ID ${boardId} not found (valid range: 0-${puzzleDatabase.length - 1})`);
      }
      
      const puzzleData = puzzleDatabase[puzzleIndex];
      
      setLoadingProgress(80);
      
      // Extract puzzle string, solution string, and rating from the array format
      const [puzzleString, solutionString, rating] = puzzleData;
      
      // Convert the puzzle and solution strings to 9x9 grids
      const puzzle = stringToGrid(puzzleString);
      const solution = stringToGrid(solutionString);
      
      // Apply revealed cells to the puzzle
      revealedCells.forEach(cellIndex => {
        const row = Math.floor(cellIndex / 9);
        const col = cellIndex % 9;
        puzzle[row][col] = solution[row][col];
      });
      
      setLoadingProgress(100);
      console.log(`🧩 Multiplayer puzzle loaded with ${revealedCells.length} revealed cells`);
      
      // Hide loading screen and start animation
      setIsLoading(false);
      setIsAnimating(true);
      console.log(`🎬 Starting multiplayer game animation...`);
      
      // Start game animation
      await animateGameStart(puzzle, solution, 'easy');
      
      // Track game started event
      trackGameStarted('easy');
      
      console.log(`✨ Multiplayer game started successfully!`);
    } catch (error) {
      console.error('Failed to initialize multiplayer game:', error);
      setIsLoading(false);
      setIsAnimating(false);
      
      // Try fallback initialization
      console.log('🔄 Attempting fallback game initialization...');
      try {
        initializeFallbackGame();
      } catch (fallbackError) {
        console.error('Fallback initialization also failed:', fallbackError);
        // Last resort: show error message and reload
        alert('Multiplayer game failed to load. The page will reload.');
        window.location.reload();
      }
    }
  };

  const startNewGame = async (selectedDifficulty = difficulty) => {
    try {
      console.log(`🎮 Starting new ${selectedDifficulty} game...`);
      
      // Since all difficulties are preloaded, we can directly generate the puzzle
      setLoadingMessage('Generating puzzle...');
      setLoadingProgress(90);
      
      // Generate puzzle from already loaded database
      const { puzzle, solution: puzzleSolution } = await generatePuzzle(selectedDifficulty);
      setLoadingProgress(100);
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
      
      // Try fallback initialization
      console.log('🔄 Attempting fallback game initialization...');
      try {
        initializeFallbackGame();
      } catch (fallbackError) {
        console.error('Fallback initialization also failed:', fallbackError);
        // Last resort: show error message and reload
        alert('Game failed to load. The page will reload.');
        window.location.reload();
      }
    }
  };

  return {
    startNewGame,
    initializeMultiplayerGame,
    animateGameStart,
    formatDifficulty,
    preloadAllDifficulties
  };
};
