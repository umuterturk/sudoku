import React from 'react';

const DifficultyPopup = ({ isOpen, onClose, onSelectDifficulty, currentDifficulty, canClose = true }) => {
  if (!isOpen) return null;

  const difficulties = [
    { value: 'easy', label: 'Easy', description: '36-46 clues' },
    { value: 'medium', label: 'Medium', description: '27-35 clues' },
    { value: 'hard', label: 'Hard', description: '17-26 clues' },
    { value: 'expert', label: 'Expert', description: '17 clues minimum' }
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
