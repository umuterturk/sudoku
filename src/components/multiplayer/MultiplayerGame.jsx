import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameState } from '../../hooks/useGameState.js';
import { useMultiplayerTimer } from '../../hooks/useGameTimer.js';

// Shared components
import SudokuGrid from '../shared/SudokuGrid.jsx';
import DigitButtons from '../shared/DigitButtons.jsx';
import Hearts from '../shared/Hearts.jsx';
import LoadingScreen from '../shared/LoadingScreen.jsx';

// Multiplayer-specific components
import { 
  PlayerProgressBars, 
  CountdownDisplay, 
  GameStateIndicator, 
  WaitingRoom,
  MultiplayerGameResult
} from './MultiplayerUI.jsx';
import MultiplayerControls from './MultiplayerControls.jsx';
import MultiplayerOptionsPopup from './MultiplayerOptionsPopup.jsx';

// Icons
import { Menu } from '@mui/icons-material';
import { IconButton, Button } from '@mui/material';

/**
 * Multiplayer Game Component
 * Handles the complete multiplayer game experience
 */
const MultiplayerGame = ({ manager, onModeChange, onShowMenu }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Game state hook
  const gameState = useGameState();
  const timer = useMultiplayerTimer({
    initialTime: 600, // 10 minutes
    onTimeUp: () => {
      console.log('⏰ Multiplayer timer reached 0');
      // Server should handle game end
    }
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showMultiplayerOptions, setShowMultiplayerOptions] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  
  // Multiplayer state
  const [multiplayerState, setMultiplayerState] = useState(null);
  const lastStateRef = useRef(null);
  const lastGameStateRef = useRef(null);
  
  // Initialize manager when component mounts
  useEffect(() => {
    if (manager && !manager.isInitialized && timer) {
      console.log('🔧 Initializing manager for the first time');
      manager.initialize(gameState, null, timer, {
        isSoundEnabled: true
      });
      
      // Check for room parameter in URL using React Router
      const roomId = searchParams.get('r');
      if (roomId) {
        handleJoinRoom(roomId);
      }
    }
  }, [manager, timer, searchParams]); // Removed gameState and gameLogic dependencies to prevent re-initialization
  
  // Bridge latest reactive game state into manager without spamming logs every render
  useEffect(() => {
    if (!manager?.isInitialized) return;
    manager.gameState = gameState; // Always keep reference fresh (values mutate each render)
    if (lastGameStateRef.current !== gameState) {
      // Log only first few structural reference changes then silence
      if (!lastGameStateRef.logCount) lastGameStateRef.logCount = 0;
      if (lastGameStateRef.logCount < 3) {
        console.log('🔄 Updating manager hook references');
      } else if (lastGameStateRef.logCount === 3) {
        console.log('🔕 Further manager hook reference logs suppressed');
      }
      lastGameStateRef.logCount += 1;
      lastGameStateRef.current = gameState;
    }
  // Depend only on fields whose identity changes meaningfully rather than whole object
  }, [
    manager,
    gameState.grid,
    gameState.originalGrid,
    gameState.solution,
    gameState.selectedCell,
    gameState.selectedNumber,
    gameState.gameStatus,
    gameState.lives,
    gameState.isNotesMode,
    gameState.moveHistory,
    gameState.undosUsed
  ]);
  
  
  // Update multiplayer state when manager state changes
  useEffect(() => {
    if (!manager || !manager.isInitialized) return;

    const updateState = () => {
      const state = manager.getMultiplayerState();
      // Only update if state has actually changed
      if (JSON.stringify(state) !== JSON.stringify(lastStateRef.current)) {
        console.log('🔄 Multiplayer state updated:', {
          hasRoom: !!state.multiplayerRoom,
          roomId: state.multiplayerRoom?.roomId,
          gameState: state.multiplayerGameState,
          playerCount: state.multiplayerPlayers?.length,
          players: state.multiplayerPlayers?.map(p => ({ 
            id: p.id, 
            hearts: p.hearts, 
            progress: p.progress, 
            completed: p.completed,
            heartLost: p.heartLost 
          }))
        });
        lastStateRef.current = state;
        setMultiplayerState(state);
      }
    };

    // Update immediately
    updateState();

    // Set up a lighter polling mechanism only if no room data yet
    let interval;
    if (!lastStateRef.current?.multiplayerRoom) {
      interval = setInterval(updateState, 1000); // Check every 1 second only when needed
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [manager]); // Removed timer dependency to prevent unnecessary re-runs
  
  // Handle timer updates when game state changes
  useEffect(() => {
    if (!multiplayerState || !timer) return;
    
    // Update timer with game start time if available
    if (multiplayerState.multiplayerGameStartTime) {
      // Calculate elapsed time and set remaining time
      const now = new Date();
      const elapsed = Math.floor((now - multiplayerState.multiplayerGameStartTime) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      timer.resetTimer(remaining);
      if (multiplayerState.multiplayerGameState === 'playing') {
        timer.startTimer();
      }
    }
  }, [multiplayerState?.multiplayerGameState, multiplayerState?.multiplayerGameStartTime]); // Only react to game state changes

  // Handle auto-start check only when game state changes
  useEffect(() => {
    if (manager?.isInitialized && multiplayerState?.multiplayerGameState === 'waiting') {
      manager.checkAutoStart();
    }
  }, [manager, multiplayerState?.multiplayerGameState]);

  // Check for active session
  useEffect(() => {
    if (manager?.isInitialized) {
      const hasSession = manager.hasActiveSession();
      setHasActiveSession(hasSession);
      console.log('🔍 Checked for active session:', hasSession);
    }
  }, [manager]);

  // Handle multiplayer options popup visibility
  useEffect(() => {
    if (!multiplayerState || !multiplayerState.multiplayerRoom) {
      setShowMultiplayerOptions(true);
    } else {
      setShowMultiplayerOptions(false);
      // Clear loading state when room is available
      if (isLoading) {
        console.log('🏠 Room data loaded, clearing loading state');
        setIsLoading(false);
      }
    }
  }, [multiplayerState, isLoading]);
  
  // Handle create room
  const handleCreateRoom = async () => {
    setIsLoading(true);
    setLoadingMessage('Creating challenge room...');
    
    try {
      console.log('🚀 Starting room creation...');
      const { roomId } = await manager.createRoom('Player 1');
      console.log('✅ Room created successfully:', roomId);
      
      // Navigate to the room URL using React Router
      navigate(`/m?r=${roomId}`, { replace: true });
      
      // Loading will be cleared when room state is available
      console.log('📍 Navigated to room URL');
    } catch (error) {
      console.error('Failed to create room:', error);
      setIsLoading(false);
      // Could show error message here
    }
  };

  // Handle continue previous game
  const handleContinuePreviousGame = async () => {
    setIsLoading(true);
    setLoadingMessage('Rejoining previous game...');
    try {
      const { roomId } = await manager.continueSession();
      navigate(`/m?r=${roomId}`, { replace: true });
      // Loading will be cleared when room state is available
    } catch (error) {
      console.error('Failed to continue game:', error);
      setIsLoading(false);
      
      // Clear invalid session and show options
      if (error.message.includes('Room is full') || 
          error.message.includes('Room not found') || 
          error.message.includes('Game has already started') ||
          error.message.includes('Game session has expired')) {
        console.log('🚫 Previous session no longer valid, clearing and showing options');
        manager.exitMultiplayer();
        setHasActiveSession(false);
        setShowMultiplayerOptions(true);
      }
    }
  };
  
  // Handle join room
  const handleJoinRoom = async (roomId) => {
    setIsLoading(true);
    setLoadingMessage('Joining multiplayer game...');
    
    try {
      await manager.joinRoom(roomId, 'Player 2');
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to join room:', error);
      setIsLoading(false);
      
      // Handle specific errors for better UX
      if (error.message.includes('Room is full') || error.message.includes('Room not found') || error.message.includes('Game has already started')) {
        console.log('🚫 Room no longer available, clearing session and showing options');
        // Clear the invalid session
        manager.exitMultiplayer();
        setHasActiveSession(false);
        // Show multiplayer options instead of going back to menu
        setShowMultiplayerOptions(true);
      } else {
        // For other errors, redirect to menu
        if (onModeChange) {
          onModeChange('menu');
        }
      }
    }
  };
  
  // Handle start game (host only)
  const handleStartGame = async () => {
    try {
      await manager.startMultiplayerGame();
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };
  
  // Handle countdown complete
  const handleCountdownComplete = () => {
    console.log('⏰ Countdown complete, game starting!');
    timer.startTimer();
  };
  
  // Handle exit multiplayer
  const handleExitMultiplayer = () => {
    manager.exitMultiplayer();
    if (onModeChange) {
      onModeChange('menu');
    }
  };
  
  // Handle new multiplayer game
  const handleNewMultiplayerGame = () => {
    // Ensure any game-over state is cleared before starting a new room to avoid overlay stacking
    try {
      if (gameState.gameStatus === 'game-over') {
        gameState.setGameStatus('playing');
      }
      // Hide options popup if currently visible (will reopen if creation fails)
      setShowMultiplayerOptions(false);
      // Reset basic board state so old grid doesn't flash under loading
      gameState.resetGameState && gameState.resetGameState();
      // Clear any multiplayer end result so win/lose/draw overlay disappears immediately
      if (manager) {
        manager.multiplayerGameEndData = null;
        // Optimistically update local state snapshot so overlay hides without waiting for subscription
        setMultiplayerState(prev => prev ? { ...prev, multiplayerGameEndData: null } : prev);
      }
    } catch (e) {
      console.warn('Failed to pre-reset state for new multiplayer game:', e);
    }
    handleCreateRoom();
  };
  
  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Show loading screen when needed
  if (isLoading) {
    return (
      <LoadingScreen 
        message={loadingMessage || 'Loading Multiplayer...'}
        showProgress={false}
      />
    );
  }
  
  // If manager is not initialized or no game state, show loading
  if (!manager?.isInitialized) {
    return (
      <LoadingScreen 
        message={'Initializing game...'}
        showProgress={false}
      />
    );
  }
  
  // If no room exists and popup is not shown, show loading
  if ((!multiplayerState || !multiplayerState.multiplayerRoom) && !showMultiplayerOptions) {
    return (
      <LoadingScreen 
        message={'Loading room data...'}
        showProgress={false}
      />
    );
  }
  
  const { 
    multiplayerRoom, 
    multiplayerPlayers, 
    multiplayerGameState, 
    connectionState,
    currentPlayerId,
    isHost,
    multiplayerGameEndData
  } = multiplayerState;
  
  return (
    <>
      <div className={`app multiplayer-app ${
        multiplayerGameState === 'countdown' ? 'countdown-active' : ''
      } ${
        multiplayerGameState === 'waiting' ? 'waiting-active' : ''
      } ${
        gameState.gameStatus === 'game-over' ? 'app-game-over-blurred' : ''
      }`}>
        
        {/* Header */}
        <header className="app-header multiplayer-header">
          <div className="header-left">
            <IconButton
              onClick={() => onShowMenu && onShowMenu()}
              sx={{ 
                color: '#2d3748',
                marginRight: '8px',
                '&:hover': { backgroundColor: 'rgba(45, 55, 72, 0.1)' }
              }}
            >
              <Menu />
            </IconButton>
            <div className="multiplayer-room-info">
              <span className="room-id">Room: {multiplayerRoom?.roomId || 'Loading...'}</span>
            </div>
          </div>
          
          <div className="timer-progress-section">
            <div className="timer-container">
              <div className="timer">
                {multiplayerGameState === 'playing' 
                  ? formatTime(timer.timer) 
                  : '10:00'
                }
              </div>
            </div>
            
            {/* Multiplayer Progress Bars */}
            {multiplayerGameState === 'playing' && multiplayerRoom && (
              <div className="header-multiplayer-section">
                <PlayerProgressBars 
                  players={multiplayerPlayers} 
                  currentPlayerId={currentPlayerId}
                  roomData={multiplayerRoom}
                />
              </div>
            )}
          </div>
          
          <Hearts lives={gameState.lives} isShaking={gameState.isShaking} />
        </header>

        {/* Main game area */}
        <main className="game-container">
          {/* Multiplayer Game State Indicator (only when not playing) */}
          {multiplayerGameState !== 'playing' && (
            <div className="multiplayer-ui">
              <GameStateIndicator 
                gameState={multiplayerGameState}
                connectionState={connectionState}
                timer={timer.timer}
              />
            </div>
          )}

          <div className={`game-content ${
            multiplayerGameState === 'countdown' || 
            multiplayerGameState === 'waiting'
            ? 'game-blurred' : ''
          }`}>
            <SudokuGrid
              grid={gameState.grid}
              originalGrid={gameState.originalGrid}
              selectedCell={gameState.selectedCell}
              selectedNumber={gameState.selectedNumber}
              onCellClick={manager && multiplayerGameState === 'playing' && gameState.grid && gameState.originalGrid && gameState.solution ? 
                (row, col) => manager.handleCellClick(row, col) : () => {}}
              hintLevel="medium" // Fixed for multiplayer
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
              hintLevel="medium" // Fixed for multiplayer
              disabled={gameState.isAnimating || multiplayerGameState !== 'playing' || !gameState.grid || !gameState.originalGrid || !gameState.solution}
              isNotesMode={gameState.isNotesMode}
              notes={gameState.notes}
            />

            <MultiplayerControls
              onUndo={manager ? async () => await manager.handleUndo() : () => {}}
              onNotesToggle={manager ? () => manager.toggleNotesMode() : () => {}}
              canUndo={gameState.moveHistory.length > 0 && gameState.undosUsed < 3}
              undosUsed={gameState.undosUsed}
              isNotesMode={gameState.isNotesMode}
              isAnimating={gameState.isAnimating || multiplayerGameState !== 'playing' || !gameState.grid || !gameState.originalGrid || !gameState.solution}
            />
          </div>
        </main>
      </div>

      {/* Multiplayer Waiting Room */}
      {multiplayerGameState === 'waiting' && multiplayerRoom && (
        <div className="multiplayer-overlay">
          <WaitingRoom
            roomId={multiplayerRoom.roomId}
            players={multiplayerPlayers}
            onStartGame={handleStartGame}
            isHost={isHost}
          />
          <button
            onClick={handleExitMultiplayer}
            className="exit-multiplayer-button"
          >
            Exit Multiplayer
          </button>
        </div>
      )}

      {/* Multiplayer Countdown */}
      {multiplayerGameState === 'countdown' && (
        <CountdownDisplay
          countdown={true}
          onComplete={handleCountdownComplete}
        />
      )}

      {/* Multiplayer Game Result */}
      {multiplayerGameEndData && (
        <MultiplayerGameResult
          gameState={multiplayerGameEndData.gameState}
          players={multiplayerGameEndData.players}
          currentPlayerId={currentPlayerId}
          winner={multiplayerGameEndData.winner}
          gameEndReason={multiplayerGameEndData.gameEndReason}
          onNewGame={handleNewMultiplayerGame}
          onExit={handleExitMultiplayer}
        />
      )}

      {/* Game Over Overlay */}
      {gameState.gameStatus === 'game-over' && (
        <div className="game-over-overlay-fullscreen">
          <div className="game-over-content">
            <h2>Game Over!</h2>
            <p>You've lost all your hearts!</p>
            <div className="game-over-buttons">
              <Button
                variant="contained"
                onClick={handleNewMultiplayerGame}
                sx={{ 
                  backgroundColor: '#4CAF50',
                  '&:hover': { backgroundColor: '#45a049' },
                  marginRight: '10px'
                }}
              >
                New Game
              </Button>
              <Button
                variant="outlined"
                onClick={handleExitMultiplayer}
                sx={{ 
                  borderColor: '#f44336',
                  color: '#f44336',
                  '&:hover': { 
                    borderColor: '#d32f2f',
                    backgroundColor: 'rgba(244, 67, 54, 0.04)'
                  }
                }}
              >
                Exit Multiplayer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Multiplayer Options Popup */}
      <MultiplayerOptionsPopup
        isOpen={showMultiplayerOptions}
        onClose={() => setShowMultiplayerOptions(false)}
        onCreateRoom={handleCreateRoom}
        onContinueGame={handleContinuePreviousGame}
        onMainPage={handleExitMultiplayer}
        hasActiveGame={hasActiveSession}
        isLoading={isLoading}
        canClose={false} // Force user to make a choice
      />
    </>
  );
};

export default MultiplayerGame;