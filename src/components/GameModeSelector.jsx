import React from 'react';

const GameModeSelector = ({ isOpen, onClose, onSelectMode, canClose = true }) => {
  if (!isOpen) return null;

  const gameModes = [
    { 
      value: 'single', 
      label: 'Single Player', 
      description: 'Play at your own pace with different difficulty levels',
      icon: '👤'
    },
    { 
      value: 'multiplayer', 
      label: 'Multi Player', 
      description: 'Challenge a friend in a race to solve the same puzzle',
      icon: '👥'
    }
  ];

  const handleModeSelect = (mode) => {
    onSelectMode(mode);
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
          <h2>Select Game Mode</h2>
          {canClose && (
            <button className="popup-close" onClick={handleCloseClick}>×</button>
          )}
        </div>
        
        <div className="difficulty-options">
          {gameModes.map((mode) => (
            <button
              key={mode.value}
              className="difficulty-option"
              onClick={() => handleModeSelect(mode.value)}
            >
              <div className="difficulty-label">
                <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>
                  {mode.icon}
                </span>
                {mode.label}
              </div>
              <div className="difficulty-description">{mode.description}</div>
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

export default GameModeSelector;
