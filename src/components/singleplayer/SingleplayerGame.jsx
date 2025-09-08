import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import { useGameLogic } from '../../hooks/useGameLogic.js';
import { useSingleplayerTimer } from '../../hooks/useGameTimer.js';

// Shared components
import SudokuGrid from '../shared/SudokuGrid.jsx';
import DigitButtons from '../shared/DigitButtons.jsx';
import Hearts from '../shared/Hearts.jsx';
import LoadingScreen from '../shared/LoadingScreen.jsx';

// Singleplayer-specific components
import ContinueGamePopup from './ContinueGamePopup.jsx';
import SingleplayerControls from './SingleplayerControls.jsx';

// Shared popups
const DifficultyPopup = React.lazy(() => import('../shared/popups/DifficultyPopup.jsx'));
const CompletionPopup = React.lazy(() => import('../shared/popups/CompletionPopup.jsx'));
const ResetConfirmationPopup = React.lazy(() => import('../shared/popups/ResetConfirmationPopup.jsx'));

// Icons
import { Pause, PlayArrow, Menu } from '@mui/icons-material';
import { IconButton, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Box, Typography } from '@mui/material';

/**
 * Singleplayer Game Component
 * Handles the complete singleplayer game experience
 */
const SingleplayerGame = ({ manager, onModeChange, onShowMenu }) => {
  // Game state and logic hooks
  const gameState = useGameState();
  const gameLogic = useGameLogic(gameState, {
    isSoundEnabled: true, // This will be managed by the manager
    isMultiplayer: false
  });
  const timer = useSingleplayerTimer();
  
  // UI state
  const [showDifficultyPopup, setShowDifficultyPopup] = useState(false);
  const [showContinuePopup, setShowContinuePopup] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [shareMessage, setShareMessage] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Manager state
  const [hintLevel, setHintLevel] = useState('medium');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  
  // Initialize manager when component mounts
  useEffect(() => {
    if (manager && !manager.isInitialized) {
      manager.initialize(gameState, gameLogic, timer, {
        hintLevel,
        isSoundEnabled
      });
      
      // Check for saved game
      if (manager.hasSavedGame()) {
        setShowContinuePopup(true);
      } else {
        setShowDifficultyPopup(true);
      }
    }
  }, [manager, gameState, gameLogic, timer, hintLevel, isSoundEnabled]);
  
  // Auto-save effect
  useEffect(() => {
    if (manager && manager.isInitialized) {
      manager.autoSave();
    }
  }, [manager, gameState.grid, gameState.gameStatus, timer.timer]);
  
  // Handle new game
  const handleNewGame = () => {
    setShowDifficultyPopup(true);
  };
  
  // Handle difficulty selection
  const handleDifficultySelect = async (difficulty) => {
    setShowDifficultyPopup(false);
    setIsLoading(true);
    setLoadingMessage(`Starting ${difficulty} game...`);
    
    try {
      await manager.startNewGame(difficulty);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to start new game:', error);
      setIsLoading(false);
      setShowDifficultyPopup(true);
    }
  };
  
  // Handle continue game
  const handleContinueGame = () => {
    setShowContinuePopup(false);
    const savedState = manager.loadGame();
    if (savedState) {
      timer.resetTimer(savedState.timer);
      timer.startTimer();
    }
  };
  
  // Handle continue new game
  const handleContinueNewGame = () => {
    setShowContinuePopup(false);
    setShowDifficultyPopup(true);
  };
  
  // Handle game completion
  const handleGameComplete = () => {
    const completionData = manager.handleGameComplete();
    setCompletionData(completionData);
    setShowCompletionPopup(true);
  };
  
  // Handle reset
  const handleReset = () => {
    setShowResetPopup(true);
  };
  
  const handleResetConfirm = () => {
    setShowResetPopup(false);
    manager.resetGame();
  };
  
  // Handle pause/resume
  const handlePauseToggle = () => {
    if (timer.isPaused) {
      manager.resumeGame();
    } else {
      manager.pauseGame();
    }
  };
  
  // Handle hint level change
  const handleHintLevelChange = () => {
    const newLevel = manager.cycleHintLevel();
    setHintLevel(newLevel);
  };
  
  // Handle sound toggle
  const handleSoundToggle = () => {
    const newSoundState = !isSoundEnabled;
    setIsSoundEnabled(newSoundState);
    manager.setSoundEnabled(newSoundState);
  };
  
  // Handle share game
  const handleShareGame = () => {
    // This would integrate with the sharing functionality
    setShareMessage('Game shared successfully!');
    setTimeout(() => setShareMessage(''), 3000);
  };
  
  // Format difficulty for display
  const formatDifficulty = (diff) => {
    if (!diff || typeof diff !== 'string') return 'Medium';
    return diff.charAt(0).toUpperCase() + diff.slice(1);
  };
  
  // Show loading screen when needed
  if (isLoading || (!gameState.grid && !showDifficultyPopup && !showContinuePopup)) {
    return (
      <LoadingScreen 
        message={loadingMessage || 'Loading Sudoku...'}
        showProgress={false}
      />
    );
  }
  
  return (
    <>
      <div className={`app singleplayer-app ${
        gameState.gameStatus === 'game-over' ? 'app-game-over-blurred' : ''
      } ${
        showContinuePopup || showCompletionPopup ? 'app-blurred' : ''
      }`}>
        
        {/* Header */}
        <header className="app-header singleplayer-header">
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
                {formatDifficulty(gameState.difficulty)}
              </span>
            </div>
          </div>
          
          <div className="timer-container">
            <div className="timer">
              {timer.formattedTime}
            </div>
            <button 
              className="pause-button"
              onClick={handlePauseToggle}
              disabled={gameState.gameStatus !== 'playing' || gameState.isAnimating}
              title={timer.isPaused ? 'Resume' : 'Pause'}
            >
              {timer.isPaused ? <PlayArrow /> : <Pause />}
            </button>
          </div>
          
          <Hearts lives={gameState.lives} isShaking={gameState.isShaking} />
        </header>

        {/* Main game area */}
        <main className="game-container">
          <div className={`game-content ${timer.isPaused ? 'game-blurred' : ''}`}>
            <SudokuGrid
              grid={gameState.isAnimating && gameState.animationGrid ? gameState.animationGrid : gameState.grid}
              originalGrid={gameState.originalGrid}
              selectedCell={gameState.selectedCell}
              selectedNumber={gameState.selectedNumber}
              onCellClick={manager ? (row, col) => manager.handleCellClick(row, col) : () => {}}
              hintLevel={hintLevel}
              isAnimating={gameState.isAnimating}
              shakingCompletions={gameState.glowingCompletions}
              notes={gameState.notes}
              isNotesMode={gameState.isNotesMode}
              highlightedCells={gameState.highlightedCells}
              errorCells={gameState.errorCells}
              solution={gameState.solution}
            />

            <DigitButtons
              onDigitSelect={manager ? (digit) => manager.handleDigitPlacement(digit) : () => {}}
              selectedCell={gameState.selectedCell}
              grid={gameState.grid}
              originalGrid={gameState.originalGrid}
              hintLevel={hintLevel}
              disabled={gameState.isAnimating}
              isNotesMode={gameState.isNotesMode}
              notes={gameState.notes}
            />

            <SingleplayerControls
              onUndo={manager ? () => manager.handleUndo() : () => {}}
              onHintLevelChange={handleHintLevelChange}
              onNotesToggle={manager ? () => manager.toggleNotesMode() : () => {}}
              canUndo={gameState.moveHistory.length > 0 && gameState.undosUsed < 3}
              undosUsed={gameState.undosUsed}
              hintLevel={hintLevel}
              isNotesMode={gameState.isNotesMode}
              isAnimating={gameState.isAnimating}
            />

            {/* Share Message */}
            {shareMessage && (
              <div className="share-message">
                {shareMessage}
              </div>
            )}
          </div>

          {/* Pause Overlay */}
          {timer.isPaused && (
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
      </div>

      {/* Side Drawer */}
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
            Singleplayer Game
          </Typography>
        </Box>
        
        <List sx={{ pt: 1 }}>
          {/* Menu items would go here */}
          <ListItem>
            <Typography variant="body2" sx={{ color: '#718096' }}>
              Difficulty: {formatDifficulty(gameState.difficulty)}
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="body2" sx={{ color: '#718096' }}>
              Lives: {gameState.lives} • Hints: {hintLevel}
            </Typography>
          </ListItem>
        </List>
      </Drawer>

      {/* Game Over Overlay */}
      {gameState.gameStatus === 'game-over' && (
        <div className="game-over-overlay-fullscreen">
          <div className="game-over-content">
            <h2>Game Over!</h2>
            <p>You ran out of lives. Better luck next time!</p>
            <div className="game-over-buttons">
              <button 
                className="btn btn-secondary"
                onClick={() => manager && manager.resetGame()}
                title="Try the same puzzle again"
              >
                Retry
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleNewGame}
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popups */}
      <Suspense fallback={null}>
        <ContinueGamePopup
          isOpen={showContinuePopup}
          onContinue={handleContinueGame}
          onNewGame={handleContinueNewGame}
          onClose={() => setShowContinuePopup(false)}
          difficulty={gameState.difficulty}
          timer={timer.timer}
        />
      </Suspense>

      <Suspense fallback={null}>
        <DifficultyPopup
          isOpen={showDifficultyPopup}
          onClose={() => setShowDifficultyPopup(false)}
          onSelectDifficulty={handleDifficultySelect}
          currentDifficulty={gameState.difficulty}
          canClose={!!(gameState.grid && gameState.originalGrid)}
          onChallengeFriend={() => onModeChange && onModeChange('multiplayer')}
        />
      </Suspense>

      {completionData && (
        <Suspense fallback={null}>
          <CompletionPopup
            isOpen={showCompletionPopup}
            onClose={() => setShowCompletionPopup(false)}
            onNewGame={handleNewGame}
            onShare={handleShareGame}
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

      <Suspense fallback={null}>
        <ResetConfirmationPopup
          isOpen={showResetPopup}
          onClose={() => setShowResetPopup(false)}
          onConfirm={handleResetConfirm}
        />
      </Suspense>
    </>
  );
};

export default SingleplayerGame;
