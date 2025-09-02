
const ResetConfirmationPopup = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className="reset-popup">
        <div className="popup-header">
          <h2>Reset Game</h2>
          <button className="popup-close" onClick={onClose}>×</button>
        </div>
        
        <div className="popup-content">
          <p>Are you sure you want to reset the current game?</p>
          <p className="warning-text">This will clear all your progress and start the same puzzle over.</p>
        </div>
        
        <div className="popup-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleConfirm}>
            Reset Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetConfirmationPopup;
