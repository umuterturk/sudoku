import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import { useGameLogic } from '../../hooks/useGameLogic.js';
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

// Icons
import { Menu } from '@mui/icons-material';
import { IconButton, Button } from '@mui/material';

/**
 * Multiplayer Game Component
 * Handles the complete multiplayer game experience
 */
const MultiplayerGame = ({ manager, onModeChange, onShowMenu }) => {
  // Game state and logic hooks
  const gameState = useGameState();
  const gameLogic = useGameLogic(gameState, {
    isSoundEnabled: true,
    isMultiplayer: true
  });
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
  
  // Multiplayer state
  const [multiplayerState, setMultiplayerState] = useState(null);
  const lastStateRef = useRef(null);
  
  // Initialize manager when component mounts
  useEffect(() => {
    if (manager && !manager.isInitialized) {
      manager.initialize(gameState, gameLogic, timer, {
        isSoundEnabled: true
      });
      
      // Check for room parameter in URL
      const roomId = manager.parseRoomFromUrl();
      if (roomId) {
        handleJoinRoom(roomId);
      }
    }
  }, [manager, gameState, gameLogic, timer]);
  
  // Update multiplayer state when manager state changes
  useEffect(() => {
    if (!manager || !manager.isInitialized) return;

    const state = manager.getMultiplayerState();
    // Only update if state has actually changed
    if (JSON.stringify(state) !== JSON.stringify(lastStateRef.current)) {
      lastStateRef.current = state;
      setMultiplayerState(state);
      
      // Update timer with game start time if available
      if (state.multiplayerGameStartTime && timer) {
        // Calculate elapsed time and set remaining time
        const now = new Date();
        const elapsed = Math.floor((now - state.multiplayerGameStartTime) / 1000);
        const remaining = Math.max(0, 600 - elapsed);
        timer.resetTimer(remaining);
        if (state.multiplayerGameState === 'playing') {
          timer.startTimer();
        }
      }
    }
  }, [manager, timer]);

  // Handle auto-start check only when game state changes
  useEffect(() => {
    if (manager?.isInitialized && multiplayerState?.multiplayerGameState === 'waiting') {
      manager.checkAutoStart();
    }
  }, [manager, multiplayerState?.multiplayerGameState]);
  
  // Handle create room
  const handleCreateRoom = async () => {
    setIsLoading(true);
    setLoadingMessage('Creating challenge room...');
    
    try {
      await manager.createRoom('Player 1');
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to create room:', error);
      setIsLoading(false);
      // Could show error message here
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
      // Could show error message and redirect to menu
      if (onModeChange) {
        onModeChange('menu');
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
    handleCreateRoom();
  };
  
  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Show loading screen when needed
  if (isLoading || (!gameState.grid && !multiplayerState)) {
    return (
      <LoadingScreen 
        message={loadingMessage || 'Loading Multiplayer...'}
        showProgress={false}
      />
    );
  }
  
  // Show create room screen if no room exists
  if (!multiplayerState || !multiplayerState.multiplayerRoom) {
    return (
      <div className="multiplayer-setup">
        <div className="multiplayer-setup-content">
          <h2>Multiplayer Challenge</h2>
          <p>Create a room to challenge a friend!</p>
          <button 
            className="btn btn-primary"
            onClick={handleCreateRoom}
            disabled={isLoading}
          >
            Create Challenge Room
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleExitMultiplayer}
          >
            Back to Menu
          </button>
        </div>
      </div>
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
              <span className="room-id">Room: {multiplayerRoom.roomId}</span>
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
            {multiplayerGameState === 'playing' && (
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
              onCellClick={manager ? (row, col) => manager.handleCellClick(row, col) : () => {}}
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
              onDigitSelect={manager ? (digit) => manager.handleDigitPlacement(digit) : () => {}}
              selectedCell={gameState.selectedCell}
              grid={gameState.grid}
              originalGrid={gameState.originalGrid}
              hintLevel="medium" // Fixed for multiplayer
              disabled={gameState.isAnimating}
              isNotesMode={gameState.isNotesMode}
              notes={gameState.notes}
            />

            <MultiplayerControls
              onUndo={manager ? () => manager.handleUndo() : () => {}}
              onNotesToggle={manager ? () => manager.toggleNotesMode() : () => {}}
              canUndo={gameState.moveHistory.length > 0 && gameState.undosUsed < 3}
              undosUsed={gameState.undosUsed}
              isNotesMode={gameState.isNotesMode}
              isAnimating={gameState.isAnimating}
            />
          </div>
        </main>
      </div>

      {/* Multiplayer Waiting Room */}
      {multiplayerGameState === 'waiting' && (
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
    </>
  );
};

export default MultiplayerGame;