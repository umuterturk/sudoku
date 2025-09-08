
import React, { useState, useEffect } from 'react';

const DifficultyPopup = ({ isOpen, onClose, onSelectDifficulty, currentDifficulty, canClose = true, onMainPage, savedGame, onContinueGame }) => {
  const [isClosing, setIsClosing] = useState(false);

  // Reset closing state when popup opens
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const difficulties = [
    { value: 'children', label: 'Children', description: 'Perfect for new learners too' },
    { value: 'easy', label: 'Easy', description: 'Relaxed solving with extra hints' },
    { value: 'medium', label: 'Medium', description: 'Balanced challenge for most players' },
    { value: 'hard', label: 'Hard', description: 'Requires advanced techniques' },
    { value: 'expert', label: 'Expert', description: 'Ultimate puzzle mastery test' }
  ];

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200); // Match animation duration
  };

  const handleMainPageClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      if (onMainPage) onMainPage();
    }, 200);
  };

  const handleDifficultySelect = (difficulty) => {
    onSelectDifficulty(difficulty);
    handleClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && canClose) {
      handleClose();
    }
  };

  const handleCloseClick = () => {
    if (canClose) {
      handleClose();
    }
  };

  return (
    <div className={`popup-overlay ${isClosing ? 'closing' : ''}`} onClick={handleOverlayClick}>
      <div className={`difficulty-popup ${isClosing ? 'closing' : ''}`}>
        <div className="popup-header">
          <h2>Select Difficulty</h2>
          {onMainPage && (
            <button className="popup-close" onClick={handleMainPageClose}>×</button>
          )}
          {!onMainPage && canClose && (
            <button className="popup-close" onClick={handleCloseClick}>×</button>
          )}
        </div>
        
        
        <div className="difficulty-options">
        {/* Continue Game Section */}
        {savedGame && onContinueGame && (
          <div className="continue-game-section">
            <button
              className="difficulty-option continue-game-option"
              onClick={() => {
                handleClose();
                setTimeout(() => onContinueGame(), 200);
              }}
            >
              <div className="difficulty-label">▶ Continue Game</div>
              <div className="difficulty-description">
                {savedGame.difficulty?.charAt(0).toUpperCase() + savedGame.difficulty?.slice(1)} • {formatTime(savedGame.timer || 0)} • {savedGame.lives || 3} ❤️ left
              </div>
            </button>
          </div>
        )}

          {difficulties.map((diff) => (
            <button
              key={diff.value}
              className={`difficulty-option ${currentDifficulty === diff.value ? 'selected' : ''}`}
              onClick={() => handleDifficultySelect(diff.value)}
            >
              <div className="difficulty-label">{diff.label}</div>
              <div className="difficulty-description">{diff.description}</div>
            </button>
          ))}
        </div>
        
        <div className="popup-footer">
          {!onMainPage && canClose && (
            <button className="btn btn-secondary" onClick={handleCloseClick}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DifficultyPopup;
