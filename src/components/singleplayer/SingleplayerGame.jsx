import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import { useSingleplayerTimer } from '../../hooks/useGameTimer.js';
import './SingleplayerGame.css';

// Shared components
import SudokuGrid from '../shared/SudokuGrid.jsx';
import DigitButtons from '../shared/DigitButtons.jsx';
import Hearts from '../shared/Hearts.jsx';
import LoadingScreen from '../shared/LoadingScreen.jsx';

// Singleplayer-specific components
import SingleplayerControls from './SingleplayerControls.jsx';

// Shared popups
const DifficultyPopup = React.lazy(() => import('./DifficultyPopup.jsx'));
const CompletionPopup = React.lazy(() => import('../shared/popups/CompletionPopup.jsx'));
const ResetConfirmationPopup = React.lazy(() => import('../shared/popups/ResetConfirmationPopup.jsx'));

// Icons
import { 
  Pause, 
  PlayArrow, 
  Menu,
  VolumeUp, 
  VolumeOff, 
  AirplanemodeActive, 
  AirplanemodeInactive,
  Casino,
  RestartAlt,
  Share as ShareIcon,
  ExitToApp
} from '@mui/icons-material';
import { 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Box, 
  Typography 
} from '@mui/material';

/**
 * Singleplayer Game Component
 * Handles the complete singleplayer game experience
 */
const SingleplayerGame = ({ manager, onModeChange, onShowMenu, initialShowContinue = false }) => {
  // Game state hook
  const gameState = useGameState();
  const timer = useSingleplayerTimer();
  
  // UI state
  const [showDifficultyPopup, setShowDifficultyPopup] = useState(false);
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
  const [isFlightMode, setIsFlightMode] = useState(false);

  // Placeholder gameLogic object (legacy param expected by manager for initialization checks)
  // The underlying logic now lives inside SharedGameLogic created within the managers.
  // We keep a stable reference to satisfy checkInitialization without duplicating logic.
  const gameLogicRef = useRef({ legacy: true });
  const gameLogic = gameLogicRef.current;
  
  // Initialize manager when component mounts
  useEffect(() => {
    if (manager && !manager.isInitialized) {
      manager.initialize(gameState, gameLogic, timer, {
        hintLevel,
        isSoundEnabled
      });
      
      // Always show difficulty popup - it will handle continue game if there's a saved game
      setShowDifficultyPopup(true);
    }
  }, [manager, initialShowContinue]);
  
  // Update manager hooks only when grid data changes (indicating a new game started)
  useEffect(() => {
    if (manager && manager.isInitialized && gameState.grid) {
      manager.initialize(gameState, gameLogic, timer, {
        hintLevel,
        isSoundEnabled
      });
    }
  }, [manager, gameState.grid, gameState.originalGrid, gameState.solution]);
  
  // Auto-save effect - only on meaningful game state changes
  useEffect(() => {
    if (manager && manager.isInitialized && gameState.grid) {
      manager.autoSave();
    }
  }, [manager, gameState.grid, gameState.gameStatus, gameState.moveHistory.length]);
  
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
    setShowDifficultyPopup(false);
    const savedState = manager.loadGame();
    if (savedState) {
      timer.resetTimer(savedState.timer);
      timer.startTimer();
    }
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
  
  // Handle flight mode toggle (offline/airplane mode). If manager supports it, call through; otherwise local only.
  const handleFlightModeToggle = () => {
    const newState = !isFlightMode;
    setIsFlightMode(newState);
    if (manager && typeof manager.setFlightMode === 'function') {
      try { manager.setFlightMode(newState); } catch (e) { /* swallow */ }
    }
  };
  
  // Handle share game
  const handleShareGame = () => {
    if (!gameState.grid || !gameState.originalGrid || !gameState.solution) {
      setShareMessage('❌ No active game to share');
      setTimeout(() => setShareMessage(''), 3000);
      return;
    }

    try {
      // Serialize game state similar to legacy implementation (compact)
      const flatten = (g) => g.flat().join('');
      const payload = {
        g: flatten(gameState.grid),
        o: flatten(gameState.originalGrid),
        s: flatten(gameState.solution),
        d: gameState.difficulty,
        t: timer.elapsedSeconds || 0,
        l: gameState.lives,
        h: hintLevel,
        m: gameState.moveHistory || []
      };
      const json = JSON.stringify(payload);
      const b64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}?game=${b64}`;

      // Try native share first if supported
      if (navigator.share) {
        navigator.share({
          title: 'Sudoku Game',
            text: `Try my ${gameState.difficulty} Sudoku!`,
          url: shareUrl
        }).then(() => {
          setShareMessage('✅ Share dialog opened');
          setTimeout(() => setShareMessage(''), 2500);
        }).catch(() => {/* ignore */});
      }

      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          setShareMessage('✅ Link copied to clipboard');
          setTimeout(() => setShareMessage(''), 2500);
        }).catch(() => {
          // Fallback: select a hidden textarea
          const ta = document.createElement('textarea');
          ta.value = shareUrl;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch (e) { /* ignore */ }
          document.body.removeChild(ta);
          setShareMessage('✅ Link ready: manually copy if needed');
          setTimeout(() => setShareMessage(''), 3000);
        });
      } else {
        setShareMessage('🔗 ' + shareUrl.slice(0, 60) + '...');
        setTimeout(() => setShareMessage(''), 4000);
      }
    } catch (err) {
      console.error('Share failed', err);
      setShareMessage('⚠️ Failed to generate share link');
      setTimeout(() => setShareMessage(''), 3000);
    }
  };
  
  // Format difficulty for display
  const formatDifficulty = (diff) => {
    if (!diff || typeof diff !== 'string') return 'Medium';
    return diff.charAt(0).toUpperCase() + diff.slice(1);
  };
  
  // Show loading screen when needed
  if (isLoading) {
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
        showCompletionPopup ? 'app-blurred' : ''
      }`}>
        
        {/* Header */}
        <header className="app-header singleplayer-header">
          <div className="header-left">
            <IconButton
              onClick={() => setIsDrawerOpen(true)}
              className="sp-menu-button"
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
            {gameState.grid ? (
              <>
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
                  onDigitSelect={manager ? async (digit, row, col) => await manager.handleDigitPlacement(digit, row, col) : async () => {}}
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
              </>
            ) : (
              <div className="no-game-message">
                <p>Select a difficulty to start playing</p>
              </div>
            )}

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
        className="singleplayer-drawer"
      >
        <Box className="sp-drawer-header">
          <Typography variant="h6" className="sp-drawer-title">
            Singleplayer Game
          </Typography>
        </Box>
        
        <List className="sp-drawer-list">
          <ListItem className="sp-controls-heading">
            <Typography variant="subtitle2" className="sp-section-heading">GAME CONTROLS</Typography>
          </ListItem>
          <ListItemButton className="sp-drawer-item" onClick={() => { setIsDrawerOpen(false); handleNewGame(); }}>
            <ListItemIcon><Casino className="sp-icon" /></ListItemIcon>
            <ListItemText primary="New Game" secondary={gameState.difficulty ? `Current: ${formatDifficulty(gameState.difficulty)}` : undefined} />
          </ListItemButton>
          <ListItemButton className="sp-drawer-item" onClick={() => { setIsDrawerOpen(false); handleReset(); }} disabled={!gameState.grid}>
            <ListItemIcon><RestartAlt className="sp-icon" /></ListItemIcon>
            <ListItemText primary="Reset Game" secondary="Restart this puzzle" />
          </ListItemButton>
            <ListItemButton className="sp-drawer-item" onClick={() => { setIsDrawerOpen(false); handleShareGame(); }} disabled={!gameState.grid}>
            <ListItemIcon><ShareIcon className="sp-icon" /></ListItemIcon>
            <ListItemText primary="Share Game" secondary="Copy / share progress" />
          </ListItemButton>
          <ListItemButton className="sp-drawer-item" onClick={() => { handleSoundToggle(); }}>
            <ListItemIcon>
              {isSoundEnabled ? <VolumeUp className="sp-icon" /> : <VolumeOff className="sp-icon" />}
            </ListItemIcon>
            <ListItemText primary={`Sound ${isSoundEnabled ? 'On' : 'Off'}`} />
          </ListItemButton>
          <ListItemButton className="sp-drawer-item" onClick={() => { handleFlightModeToggle(); }}>
            <ListItemIcon>
              {isFlightMode ? <AirplanemodeActive className="sp-icon" /> : <AirplanemodeInactive className="sp-icon" />}
            </ListItemIcon>
            <ListItemText primary={`Flight Mode ${isFlightMode ? 'On' : 'Off'}`} secondary={isFlightMode ? 'Connectivity limited' : 'Normal mode'} />
          </ListItemButton>
          <Divider className="sp-divider" />
          <ListItemButton className="sp-drawer-item" onClick={() => { setIsDrawerOpen(false); onShowMenu && onShowMenu(); }}>
            <ListItemIcon><ExitToApp className="sp-icon" /></ListItemIcon>
            <ListItemText primary="Exit to Main Menu" />
          </ListItemButton>
          <Divider className="sp-divider-lg" />
          <ListItem className="sp-footer-status">
            <Typography variant="caption" className="sp-status-text">
              Lives: {gameState.lives} • Hints: {hintLevel} • {timer.formattedTime}
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
        <DifficultyPopup
          isOpen={showDifficultyPopup}
          onClose={() => setShowDifficultyPopup(false)}
          onSelectDifficulty={handleDifficultySelect}
          currentDifficulty={gameState.difficulty}
          canClose={!!(gameState.grid && gameState.originalGrid)}
          savedGame={manager && manager.hasSavedGame() ? manager.getSavedGameInfo() : null}
          onContinueGame={handleContinueGame}
          onMainPage={onShowMenu}
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
