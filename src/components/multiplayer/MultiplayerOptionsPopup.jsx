import React, { useState, useEffect } from 'react';

const MultiplayerOptionsPopup = ({ 
  isOpen, 
  onClose, 
  onCreateRoom, 
  onContinueGame, 
  canClose = true, 
  onMainPage, 
  hasActiveGame = false,
  isLoading = false
}) => {
  const [isClosing, setIsClosing] = useState(false);

  // Reset closing state when popup opens
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

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

  const handleCreateRoom = () => {
    onCreateRoom();
    handleClose();
  };

  const handleContinueGame = () => {
    onContinueGame();
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
          <h2>Multiplayer Challenge</h2>
          {onMainPage && (
            <button className="popup-close" onClick={handleMainPageClose}>×</button>
          )}
          {!onMainPage && canClose && (
            <button className="popup-close" onClick={handleCloseClick}>×</button>
          )}
        </div>
        
        <div className="difficulty-options">
          {/* Continue Game Section */}
          {hasActiveGame && onContinueGame && (
            <div className="continue-game-section">
              <button
                className="difficulty-option continue-game-option"
                onClick={handleContinueGame}
                disabled={isLoading}
              >
                <div className="difficulty-label">▶ Continue Game</div>
                <div className="difficulty-description">
                  Rejoin your previous multiplayer session
                </div>
              </button>
            </div>
          )}

          {/* Create Challenge Room */}
          <button
            className="difficulty-option"
            onClick={handleCreateRoom}
            disabled={isLoading}
          >
            <div className="difficulty-label">🎯 Create Challenge Room</div>
            <div className="difficulty-description">
              Start a new multiplayer game and invite a friend
            </div>
          </button>
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

export default MultiplayerOptionsPopup;
