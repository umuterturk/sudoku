import React, { useState, useEffect } from 'react';
import { Pause, PlayArrow } from '@mui/icons-material';
import { useGameContext } from '../contexts/GameContext';

const Timer = ({ 
  timer, 
  isTimerRunning, 
  isPaused, 
  gameStatus, 
  isAnimating, 
  onPauseToggle
}) => {
  const { gameModeManager } = useGameContext();
  const [multiplayerTimeLeft, setMultiplayerTimeLeft] = useState(null);

  // Get timer props from strategy pattern
  const timerProps = gameModeManager.getTimerProps();
  const { isMultiplayerMode, gameStartTime, gameEndTime, gameState } = timerProps;

  // Multiplayer timer logic
  useEffect(() => {
    if (!isMultiplayerMode || !gameStartTime || !gameEndTime || gameState !== 'STARTED') {
      setMultiplayerTimeLeft(null);
      return;
    }

    const updateMultiplayerTimer = () => {
      const now = new Date();
      const timeLeft = Math.max(0, Math.floor((gameEndTime - now) / 1000));
      setMultiplayerTimeLeft(timeLeft);
    };

    // Update immediately
    updateMultiplayerTimer();

    // Update every second
    const interval = setInterval(updateMultiplayerTimer, 1000);

    return () => clearInterval(interval);
  }, [isMultiplayerMode, gameStartTime, gameEndTime, gameState]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine which timer to display
  const displayTime = isMultiplayerMode && multiplayerTimeLeft !== null ? multiplayerTimeLeft : timer;
  const isMultiplayerTimer = isMultiplayerMode && multiplayerTimeLeft !== null;

  return (
    <div className="timer-container">
      <div className={`timer ${isMultiplayerTimer ? 'multiplayer-timer' : ''}`}>
        {formatTime(displayTime)}
        {isMultiplayerTimer && (
          <div className="timer-label">Time Left</div>
        )}
      </div>
      {!isMultiplayerMode && (
        <button 
          className="pause-button"
          onClick={onPauseToggle}
          disabled={gameStatus !== 'playing' || isAnimating}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <PlayArrow /> : <Pause />}
        </button>
      )}
    </div>
  );
};

export default Timer;
