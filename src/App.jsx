import React, { useState, useEffect, Component } from 'react';
import LoadingScreen from './components/LoadingScreen';
import GameContainer from './components/GameContainer';
import { GameProvider, useGameContext } from './contexts/GameContext';
import { MultiplayerProvider, useMultiplayerContext } from './contexts/MultiplayerContext';

// Import popup components directly
import DifficultyPopup from './components/DifficultyPopup';
import ResetConfirmationPopup from './components/ResetConfirmationPopup';
import ContinueGamePopup from './components/ContinueGamePopup';
import CompletionPopup from './components/CompletionPopup';
import GameModeSelector from './components/GameModeSelector';
import RoomCreationPopup from './components/RoomCreationPopup';
import RoomJoiningPopup from './components/RoomJoiningPopup';

// Import custom hooks
import { useGameState } from './hooks/useGameState';
import { useGameLogic } from './hooks/useGameLogic';
import { useHintSystem } from './hooks/useHintSystem';
import { usePopupHandlers } from './hooks/usePopupHandlers';
import { useGameInitialization } from './hooks/useGameInitialization';
import { useMultiplayerGame } from './hooks/useMultiplayerGame';

// Import utilities
import { setupCheatCodes, cleanupCheatCodes, idclip } from './utils/cheatCodes';
import { initGA, trackPageView } from './utils/analytics';
import { addGameRecord, getDifficultyRecord } from './utils/sudokuUtils';
import { createPerfectGameSound, createCompletionSound } from './utils/audioUtils';
import { Add, Refresh, VolumeUp, VolumeOff, Share, Lightbulb, ExitToApp } from '@mui/icons-material';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Box, Typography } from '@mui/material';
import './App.css';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Clear corrupted localStorage
    try {
      localStorage.removeItem('sudoku-game-state');
    } catch (e) {
      console.error('Failed to clear localStorage in error boundary:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ color: '#e53e3e', marginBottom: '20px' }}>
            Oops! Something went wrong
          </h2>
          <p style={{ color: '#4a5568', marginBottom: '30px', maxWidth: '500px' }}>
            The game encountered an unexpected error. Don't worry, your progress has been saved and the game will restart fresh.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              backgroundColor: '#4299e1',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Restart Game
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App component that provides the game context
function App() {
  return (
    <GameProvider>
      <MultiplayerProvider>
        <AppContent />
      </MultiplayerProvider>
    </GameProvider>
  );
}

// App content component that uses the game context
function AppContent() {
  const gameContext = useGameContext();
  const multiplayerContext = useMultiplayerContext();
  
  // Extract game mode manager
  const { gameModeManager, switchGameMode, updateMultiplayerContext } = gameContext;
  
  // Initialize multiplayer game hook
  const multiplayerGame = useMultiplayerGame();
  
  // Update multiplayer context in game mode manager
  useEffect(() => {
    updateMultiplayerContext(multiplayerContext);
  }, [multiplayerContext, updateMultiplayerContext]);
  
  // Handle game exit using strategy pattern
  const handleGameExit = async () => {
    try {
      await gameModeManager.handleGameExit();
      setIsDrawerOpen(false);
      // Reset to single player mode
      switchGameMode('single');
      // Show game mode selector to start a new game
      setShowGameModeSelector(true);
    } catch (error) {
      console.error('Error exiting game:', error);
    }
  };
  const {
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
    timer,
    setTimer,
    isTimerRunning,
    setIsTimerRunning,
    shareMessage,
    setShareMessage,
    isSoundEnabled,
    setIsSoundEnabled,
    isDrawerOpen,
    setIsDrawerOpen,
    longPressTimer,
    setLongPressTimer,
    isLongPressTriggered,
    setIsLongPressTriggered,
    lastMoveTime,
    setLastMoveTime,
    autoHintTimer,
    setAutoHintTimer,
    isLoading,
    setIsLoading,
    loadingMessage,
    setLoadingMessage,
    loadingProgress,
    setLoadingProgress,
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
    gameMode,
    setGameMode,
    showGameModeSelector,
    setShowGameModeSelector,
    showRoomCreationPopup,
    setShowRoomCreationPopup,
    showRoomJoiningPopup,
    setShowRoomJoiningPopup
  } = gameContext;

  // Fallback function to ensure game can always start
  const initializeFallbackGame = () => {
    console.log('🔄 Initializing fallback game due to data corruption');
    try {
      // Clear any corrupted data
      localStorage.removeItem('sudoku-game-state');
      
      // Reset all state to defaults
      setGrid(null);
      setOriginalGrid(null);
      setSolution(null);
      setSelectedCell(null);
      setSelectedNumber(null);
      setDifficulty('medium');
      setGameStatus('playing');
      setTimer(0);
      setIsTimerRunning(false);
      setLives(3);
      setIsShaking(false);
      setHintLevel('medium');
      setIsPaused(false);
      setIsAnimating(false);
      setAnimationGrid(null);
      setNotes(Array(9).fill().map(() => Array(9).fill().map(() => [])));
      setErrorCells([]);
      setGlowingCompletions({ rows: [], columns: [], boxes: [] });
      
      // Show game mode selector to start fresh
      setShowGameModeSelector(true);
    } catch (error) {
      console.error('Failed to initialize fallback game:', error);
      // Last resort: reload the page
      window.location.reload();
    }
  };

  // Initialize custom hooks
  const gameState = useGameState(
    grid, setGrid, originalGrid, setOriginalGrid, solution, setSolution,
    selectedCell, setSelectedCell, selectedNumber, setSelectedNumber,
    difficulty, setDifficulty, gameStatus, setGameStatus, lives, setLives,
    hintLevel, setHintLevel, isNotesMode, setIsNotesMode, notes, setNotes,
    isPaused, setIsPaused, errorCells, setErrorCells,
    timer, setTimer, isTimerRunning, setIsTimerRunning,
    showContinuePopup, setShowContinuePopup, showDifficultyPopup, setShowDifficultyPopup,
    showGameModeSelector, setShowGameModeSelector,
    initializeFallbackGame
  );

  const gameInitialization = useGameInitialization(
    grid, setGrid, originalGrid, setOriginalGrid, solution, setSolution,
    selectedCell, setSelectedCell, selectedNumber, setSelectedNumber,
    difficulty, setDifficulty, gameStatus, setGameStatus, lives, setLives,
    isShaking, setIsShaking, hintLevel, setHintLevel, isPaused, setIsPaused,
    isAnimating, setIsAnimating, animationGrid, setAnimationGrid,
    isNotesMode, setIsNotesMode, notes, setNotes, errorCells, setErrorCells,
    timer, setTimer,
    isTimerRunning, setIsTimerRunning, isLoading, setIsLoading, loadingMessage,
    setLoadingMessage, loadingProgress, setLoadingProgress, lastMoveTime,
    setLastMoveTime, autoHintTimer, setAutoHintTimer, initializeFallbackGame
  );

  // Handle multiplayer game initialization when both players are ready
  useEffect(() => {
    if (multiplayerGame.isGameReady && multiplayerGame.gameRoomData && gameModeManager.isMultiplayerMode()) {
      const initializeMultiplayerGame = async () => {
        try {
          const { boardId, revealedCells } = multiplayerGame.gameRoomData;
          if (boardId && revealedCells) {
            console.log('🎮 Initializing multiplayer game...');
            await gameInitialization.initializeMultiplayerGame(boardId, revealedCells);
            console.log('✅ Multiplayer game initialized successfully');
          }
        } catch (error) {
          console.error('Failed to initialize multiplayer game:', error);
        }
      };
      
      initializeMultiplayerGame();
    }
  }, [multiplayerGame.isGameReady, multiplayerGame.gameRoomData, gameModeManager, gameInitialization]);

  const gameLogic = useGameLogic(
    grid, setGrid, originalGrid, setOriginalGrid, solution, setSolution,
    selectedCell, setSelectedCell, selectedNumber, setSelectedNumber,
    difficulty, setDifficulty, gameStatus, setGameStatus, lives, setLives,
    isShaking, setIsShaking, hintLevel, setHintLevel, isPaused, setIsPaused,
    isAnimating, setIsAnimating, animationGrid, setAnimationGrid,
    isNotesMode, setIsNotesMode, notes, setNotes, highlightedCells, setHighlightedCells,
    errorCells, setErrorCells, correctCells, setCorrectCells,
    glowingCompletions, setGlowingCompletions, timer, setTimer, isTimerRunning, setIsTimerRunning,
    isSoundEnabled, setIsSoundEnabled, completionData, setCompletionData,
    showCompletionPopup, setShowCompletionPopup, initializeFallbackGame
  );

  const hintSystem = useHintSystem(
    grid, difficulty, gameStatus, isPaused, isAnimating,
    setLastMoveTime, autoHintTimer, setAutoHintTimer, hintLevel, setHintLevel,
    highlightedCells, setHighlightedCells, isLongPressTriggered, setIsLongPressTriggered,
    longPressTimer, setLongPressTimer, isSoundEnabled
  );

  const popupHandlers = usePopupHandlers(
    grid, originalGrid, solution, difficulty, timer, lives, hintLevel,
    isNotesMode, notes, gameStatus, selectedCell, selectedNumber,
    isPaused, errorCells, setShowDifficultyPopup, setShowResetPopup,
    setShowContinuePopup, setShowCompletionPopup, setIsPaused, setIsTimerRunning,
    setShareMessage, setCompletionData, gameInitialization.startNewGame,
    setShowGameModeSelector
  );

  // Game mode selection handlers
  const handleGameModeSelect = (mode) => {
    if (mode === 'single') {
      switchGameMode('single');
      setShowGameModeSelector(false);
      setShowDifficultyPopup(true);
    } else if (mode === 'multiplayer') {
      switchGameMode('multiplayer');
      setShowGameModeSelector(false);
      setShowRoomCreationPopup(true);
    }
  };

  const handleCreateRoom = async () => {
    try {
      await multiplayerGame.handleCreateRoom();
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const handleJoinRoom = async (roomCode) => {
    try {
      await multiplayerGame.handleJoinRoom(roomCode);
      setShowRoomJoiningPopup(false);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const handleRoomCreationClose = () => {
    setShowRoomCreationPopup(false);
    if (!multiplayerGame.isGameJoined) {
      setShowGameModeSelector(true);
    }
  };

  const handleRoomJoiningClose = () => {
    setShowRoomJoiningPopup(false);
    setShowGameModeSelector(true);
  };

  const handleDifficultyBack = () => {
    setShowDifficultyPopup(false);
    setShowGameModeSelector(true);
  };


  // Cheat code functions using the extracted utilities
  const idclipFn = () => idclip(
    grid, solution, setGrid, setGameStatus, setIsTimerRunning,
    difficulty, timer, lives, isSoundEnabled, setCompletionData, setShowCompletionPopup,
    addGameRecord, getDifficultyRecord, createPerfectGameSound, createCompletionSound
  );

  // Initialize game and setup cheat codes
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Sudoku app initializing...');
      
      // Initialize Google Analytics
      initGA();
      trackPageView('Sudoku Game - Home');
      
      // Preload all difficulty levels
      await gameInitialization.preloadAllDifficulties();
      
      // Initialize game state
      await gameState.initializeGame();
    };

    initializeApp();
  }, []);

  // Setup cheat codes
  useEffect(() => {
    setupCheatCodes(idclipFn);
    return () => cleanupCheatCodes();
  }, [idclipFn]);

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

  // Format time helper function
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading screen when loading or when no grid exists and not showing popups
  if (isLoading || (!grid && !isAnimating && !showDifficultyPopup && !showContinuePopup && !showGameModeSelector && !showRoomCreationPopup && !showRoomJoiningPopup)) {
    return (
      <LoadingScreen 
        message={loadingMessage || 'Loading Sudoku...'}
        progress={loadingProgress}
        showProgress={loadingProgress !== null}
      />
    );
  }

  return (
    <>
      <div className={`app ${gameStatus === 'game-over' ? 'app-game-over-blurred' : ''} ${showContinuePopup || showCompletionPopup ? 'app-blurred' : ''}`}>
        <GameContainer
          onCellClick={gameLogic.handleCellClick}
          onDigitSelect={gameLogic.handleDigitSelect}
          onHintClick={hintSystem.handleHintClick}
          onHintMouseDown={hintSystem.handleHintMouseDown}
          onHintMouseUp={hintSystem.handleHintMouseUp}
          onHintMouseLeave={hintSystem.handleHintMouseLeave}
          onNotesToggle={gameLogic.handleNotesToggle}
          onPauseToggle={gameLogic.handlePauseToggle}
          onDrawerOpen={() => setIsDrawerOpen(true)}
          getHintIcon={() => <Lightbulb />}
          getHintButtonClass={() => `control-button hint-${hintLevel}`}
          formatDifficulty={gameInitialization.formatDifficulty}
        />

        <ResetConfirmationPopup
          isOpen={showResetPopup}
          onClose={() => setShowResetPopup(false)}
          onConfirm={gameLogic.resetGame}
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
                setShowGameModeSelector(true);
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
                setShowRoomJoiningPopup(true);
                setIsDrawerOpen(false);
              }}
              disabled={isAnimating}
            >
              <ListItemIcon>
                <Share sx={{ color: '#38b2ac' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Join Room" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                popupHandlers.handleResetClick();
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
                popupHandlers.handleShareGame();
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

          {/* Exit Game Button - Using strategy pattern */}
          {gameModeManager.isMultiplayerMode() && (
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleGameExit}
                disabled={isAnimating}
              >
                <ListItemIcon>
                  <ExitToApp sx={{ color: '#e53e3e' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Exit Game" 
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            </ListItem>
          )}

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
            Difficulty: {gameInitialization.formatDifficulty(difficulty)}
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
                onClick={gameLogic.resetGame}
                title="Try the same puzzle again"
              >
                <Refresh />
                Retry
              </button>
              <button 
                className="btn btn-primary"
                onClick={popupHandlers.handleGameOverNewGame}
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
        onContinue={popupHandlers.handleContinueGame}
        onNewGame={popupHandlers.handleContinueNewGame}
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
        onSelectDifficulty={popupHandlers.handleDifficultySelect}
        currentDifficulty={difficulty}
        canClose={!!(grid && originalGrid)} // Only allow closing if there's an existing game
        onBack={handleDifficultyBack}
      />

      {/* Completion Popup - Outside app container to avoid blur */}
      {completionData && (
        <CompletionPopup
          isOpen={showCompletionPopup}
          onClose={() => setShowCompletionPopup(false)}
          onNewGame={popupHandlers.handleCompletionNewGame}
          onShare={popupHandlers.handleCompletionShare}
          difficulty={completionData.difficulty}
          timer={completionData.timer}
          lives={completionData.lives}
          isNewRecord={completionData.isNewRecord}
          bestTime={completionData.bestTime}
          totalGamesPlayed={completionData.totalGamesPlayed}
          averageTime={completionData.averageTime}
        />
      )}

      {/* Game Mode Selector - Outside app container to avoid blur */}
      <GameModeSelector
        isOpen={showGameModeSelector}
        onClose={() => setShowGameModeSelector(false)}
        onSelectMode={handleGameModeSelect}
      />

      {/* Room Creation Popup - Outside app container to avoid blur */}
      <RoomCreationPopup
        isOpen={showRoomCreationPopup}
        onClose={handleRoomCreationClose}
        onCreateRoom={handleCreateRoom}
        roomCode={multiplayerGame.roomCode}
        isCreating={multiplayerGame.isCreatingRoom}
        canClose={!multiplayerGame.isGameJoined}
      />

      {/* Room Joining Popup - Outside app container to avoid blur */}
      <RoomJoiningPopup
        isOpen={showRoomJoiningPopup}
        onClose={handleRoomJoiningClose}
        onJoinRoom={handleJoinRoom}
        isJoining={multiplayerGame.isJoiningRoom}
        error={multiplayerGame.joinError}
      />

      {/* Multiplayer Countdown Overlay */}
      {multiplayerGame.countdown && multiplayerGame.countdown > 0 && (
        <div className="countdown-overlay">
          <div className="countdown-content">
            <div className="countdown-number">{multiplayerGame.countdown}</div>
            <div className="countdown-text">Game starting in...</div>
          </div>
        </div>
      )}
    </>
  );
}

// Wrap App with ErrorBoundary for robust error handling
const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
