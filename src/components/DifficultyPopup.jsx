
import React from 'react';

const DifficultyPopup = ({ isOpen, onClose, onSelectDifficulty, currentDifficulty, canClose = true, onChallengeFriend }) => {
  if (!isOpen) return null;

  const difficulties = [
    { value: 'children', label: 'Children', description: 'Perfect for new learners too' },
    { value: 'easy', label: 'Easy', description: 'Relaxed solving with extra hints' },
    { value: 'medium', label: 'Medium', description: 'Balanced challenge for most players' },
    { value: 'hard', label: 'Hard', description: 'Requires advanced techniques' },
    { value: 'expert', label: 'Expert', description: 'Ultimate puzzle mastery test' }
  ];

  const handleDifficultySelect = (difficulty) => {
    onSelectDifficulty(difficulty);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && canClose) {
      onClose();
    }
  };

  const handleCloseClick = () => {
    if (canClose) {
      onClose();
    }
  };

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className="difficulty-popup">
        <div className="popup-header">
          <h2>Select Difficulty</h2>
          {canClose && (
            <button className="popup-close" onClick={handleCloseClick}>×</button>
          )}
        </div>
        
        {/* Challenge Friend Button */}
        {onChallengeFriend && (
          <div className="challenge-friend-section">
            <button
              className="challenge-friend-button"
              onClick={onChallengeFriend}
            >
              <div className="challenge-friend-label">🎮 Challenge Friend</div>
              <div className="challenge-friend-description">Play against a friend in real-time</div>
            </button>
          </div>
        )}
        
        <div className="difficulty-options">
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
          {canClose && (
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
