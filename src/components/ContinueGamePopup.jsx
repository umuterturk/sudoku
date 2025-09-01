import React from 'react';
import { PlayArrow, Add } from '@mui/icons-material';

const ContinueGamePopup = ({ isOpen, onContinue, onNewGame, onClose, difficulty, timer }) => {
  if (!isOpen) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="popup-overlay continue-game-overlay" onClick={handleOverlayClick}>
      <div className="continue-game-popup">
        <div className="popup-header">
          <h2>Game in Progress</h2>
          <button className="popup-close" onClick={onClose}>×</button>
        </div>
        
        <div className="continue-game-content">
          <div className="game-info">
            <div className="game-info-item">
              <span className="info-label">Difficulty:</span>
              <span className="difficulty-value">
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </span>
            </div>
            <div className="game-info-item">
              <span className="info-label">Time:</span>
              <span className="time-value">{formatTime(timer)}</span>
            </div>
          </div>
          
          <p className="continue-description">
            You have a game in progress. Would you like to continue or start a new game?
          </p>
        </div>
        
        <div className="popup-footer continue-game-buttons">
          <button className="btn btn-secondary" onClick={onNewGame}>
            <Add />
            New Game
          </button>
          <button className="btn btn-primary" onClick={onContinue}>
            <PlayArrow />
            Continue Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContinueGamePopup;
