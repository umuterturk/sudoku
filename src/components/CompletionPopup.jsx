import React from 'react';
import { EmojiEvents, Share, Add, Refresh } from '@mui/icons-material';

const CompletionPopup = ({ 
  isOpen, 
  onClose, 
  onNewGame, 
  onShare,
  difficulty, 
  timer, 
  lives,
  isNewRecord,
  bestTime,
  totalGamesPlayed,
  averageTime
}) => {
  if (!isOpen) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getEncouragingMessage = () => {
    const messages = {
      easy: [
        "Great start! 🌟",
        "Nice work! 👏",
        "Well done! ✨",
        "Excellent! 🎉",
        "Fantastic! 🌈"
      ],
      medium: [
        "Impressive! 🔥",
        "Outstanding! 💪",
        "Brilliant work! ⭐",
        "Superb! 🎯",
        "Amazing! 🚀"
      ],
      hard: [
        "Incredible! 🏆",
        "Masterful! 👑",
        "Phenomenal! 💎",
        "Legendary! ⚡",
        "Mind-blowing! 🧠"
      ],
      expert: [
        "Absolutely legendary! 🌟👑",
        "Pure genius! 🧠✨",
        "Godlike! ⚡🔥",
        "Unstoppable! 🚀💎",
        "World-class! 🏆⭐"
      ]
    };

    const difficultyMessages = messages[difficulty] || messages.medium;
    const randomIndex = Math.floor(Math.random() * difficultyMessages.length);
    return difficultyMessages[randomIndex];
  };

  const getPerformanceMessage = () => {
    if (lives === 3) {
      return "Perfect game - no mistakes! 🎯";
    } else if (lives === 2) {
      return "Great job - only one mistake! 👍";
    } else if (lives === 1) {
      return "Close call - but you made it! 😅";
    } else {
      return "You survived with no lives left! 💀";
    }
  };

  return (
    <div className="completion-popup-overlay">
      <div className="completion-popup">
        <div className="completion-header">
          <div className="completion-trophy">
            <EmojiEvents className="trophy-icon" />
          </div>
          <h2 className="completion-title">Puzzle Solved!</h2>
          <p className="completion-message">{getEncouragingMessage()}</p>
        </div>

        <div className="completion-stats">
          <div className="stat-row main-stats">
            <div className="stat-item">
              <span className="stat-label">Difficulty</span>
              <span className="stat-value difficulty-value">
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Time</span>
              <span className={`stat-value ${isNewRecord ? 'new-record' : ''}`}>
                {formatTime(timer)}
                {isNewRecord && <span className="record-badge">NEW RECORD! 🏆</span>}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Lives Left</span>
              <span className="stat-value lives-value">
                {'❤️'.repeat(lives)}
                {lives === 0 && '💀'}
              </span>
            </div>
          </div>

          <div className="performance-message">
            {getPerformanceMessage()}
          </div>

          {(bestTime || totalGamesPlayed) && (
            <div className="stat-row records">
              <div className="records-title">Your {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Records</div>
              <div className="record-stats">
                {bestTime && (
                  <div className="record-item">
                    <span className="record-label">Best Time</span>
                    <span className="record-value">{formatTime(bestTime)}</span>
                  </div>
                )}
                {totalGamesPlayed && (
                  <div className="record-item">
                    <span className="record-label">Games Played</span>
                    <span className="record-value">{totalGamesPlayed}</span>
                  </div>
                )}
                {averageTime && (
                  <div className="record-item">
                    <span className="record-label">Average Time</span>
                    <span className="record-value">{formatTime(averageTime)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="completion-actions">
          <button 
            className="btn btn-secondary"
            onClick={onShare}
            title="Share your achievement"
          >
            <Share />
            Share
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => onNewGame(difficulty)}
            title="Play another puzzle of the same difficulty"
          >
            <Refresh />
            Same Level
          </button>
          <button 
            className="btn btn-primary"
            onClick={onNewGame}
            title="Choose a new difficulty"
          >
            <Add />
            New Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionPopup;
