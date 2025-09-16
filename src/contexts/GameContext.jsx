import React, { createContext, useContext, useState, useEffect } from 'react';

const GameContext = createContext();

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  // Core game state
  const [grid, setGrid] = useState(null);
  const [originalGrid, setOriginalGrid] = useState(null);
  const [solution, setSolution] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [gameStatus, setGameStatus] = useState('playing');
  const [lives, setLives] = useState(3);
  const [isShaking, setIsShaking] = useState(false);
  const [hintLevel, setHintLevel] = useState('medium');
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationGrid, setAnimationGrid] = useState(null);
  const [isNotesMode, setIsNotesMode] = useState(false);
  const [notes, setNotes] = useState(Array(9).fill().map(() => Array(9).fill().map(() => [])));
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [errorCells, setErrorCells] = useState([]);
  const [correctCells, setCorrectCells] = useState([]);
  const [glowingCompletions, setGlowingCompletions] = useState({
    rows: [],
    columns: [],
    boxes: []
  });

  // Timer state
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // UI state
  const [shareMessage, setShareMessage] = useState('');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Long press and auto-hint state
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressTriggered, setIsLongPressTriggered] = useState(false);
  const [lastMoveTime, setLastMoveTime] = useState(Date.now());
  const [autoHintTimer, setAutoHintTimer] = useState(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(null);

  // Popup states
  const [showDifficultyPopup, setShowDifficultyPopup] = useState(false);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [showContinuePopup, setShowContinuePopup] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [completionData, setCompletionData] = useState(null);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && !isPaused) {
      interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning, isPaused]);

  const contextValue = {
    // Core game state
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
    highlightedCells,
    setHighlightedCells,
    errorCells,
    setErrorCells,
    correctCells,
    setCorrectCells,
    glowingCompletions,
    setGlowingCompletions,

    // Timer state
    timer,
    setTimer,
    isTimerRunning,
    setIsTimerRunning,

    // UI state
    shareMessage,
    setShareMessage,
    isSoundEnabled,
    setIsSoundEnabled,
    isDrawerOpen,
    setIsDrawerOpen,

    // Long press and auto-hint state
    longPressTimer,
    setLongPressTimer,
    isLongPressTriggered,
    setIsLongPressTriggered,
    lastMoveTime,
    setLastMoveTime,
    autoHintTimer,
    setAutoHintTimer,

    // Loading states
    isLoading,
    setIsLoading,
    loadingMessage,
    setLoadingMessage,
    loadingProgress,
    setLoadingProgress,

    // Popup states
    showDifficultyPopup,
    setShowDifficultyPopup,
    showResetPopup,
    setShowResetPopup,
    showContinuePopup,
    setShowContinuePopup,
    showCompletionPopup,
    setShowCompletionPopup,
    completionData,
    setCompletionData,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};
