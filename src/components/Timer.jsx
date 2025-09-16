import React from 'react';
import { Pause, PlayArrow } from '@mui/icons-material';

const Timer = ({ 
  timer, 
  isTimerRunning, 
  isPaused, 
  gameStatus, 
  isAnimating, 
  onPauseToggle 
}) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timer-container">
      <div className="timer">{formatTime(timer)}</div>
      <button 
        className="pause-button"
        onClick={onPauseToggle}
        disabled={gameStatus !== 'playing' || isAnimating}
        title={isPaused ? 'Resume' : 'Pause'}
      >
        {isPaused ? <PlayArrow /> : <Pause />}
      </button>
    </div>
  );
};

export default Timer;
