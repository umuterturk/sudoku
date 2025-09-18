import React, { useState, useEffect } from 'react';
import { ContentCopy, Share } from '@mui/icons-material';

const RoomCreationPopup = ({ isOpen, onClose, onCreateRoom, roomCode, isCreating, canClose = true }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

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

  const handleCreateRoom = () => {
    onCreateRoom();
  };

  const handleCopyCode = async () => {
    if (roomCode) {
      try {
        await navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy room code:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = roomCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleShare = async () => {
    if (roomCode && navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Sudoku game!',
          text: `Join my Sudoku multiplayer game! Room code: ${roomCode}`,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
        // Fallback to copy
        handleCopyCode();
      }
    } else {
      // Fallback to copy
      handleCopyCode();
    }
  };

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className="difficulty-popup">
        <div className="popup-header">
          <h2>Create Game Room</h2>
          {canClose && (
            <button className="popup-close" onClick={handleCloseClick}>×</button>
          )}
        </div>
        
        <div className="difficulty-options">
          {!roomCode ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎮</div>
              <p style={{ color: '#666', marginBottom: '2rem', lineHeight: '1.5' }}>
                Create a new multiplayer game room and challenge a friend to solve the same Sudoku puzzle!
              </p>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateRoom}
                disabled={isCreating}
                style={{ 
                  width: '100%', 
                  padding: '1rem',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}
              >
                {isCreating ? 'Creating Room...' : 'Create Room'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <h3 style={{ margin: '0 0 1rem 0', color: '#2d3748' }}>Room Created!</h3>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                Share this room code with your friend:
              </p>
              
              <div style={{ 
                background: '#f8f9fa', 
                border: '2px solid #e2e8f0', 
                borderRadius: '8px', 
                padding: '1rem', 
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ 
                  fontFamily: 'Courier New, monospace', 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: '#2d3748',
                  letterSpacing: '2px'
                }}>
                  {roomCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    color: copied ? '#48bb78' : '#666'
                  }}
                  title="Copy room code"
                >
                  <ContentCopy />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleCopyCode}
                  style={{ flex: 1 }}
                >
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleShare}
                  style={{ flex: 1 }}
                >
                  <Share style={{ marginRight: '0.5rem' }} />
                  Share
                </button>
              </div>

              <p style={{ 
                color: '#999', 
                fontSize: '0.9rem', 
                marginTop: '1.5rem',
                lineHeight: '1.4'
              }}>
                Waiting for your friend to join...<br />
                The game will start automatically when they enter the room code.
              </p>
            </div>
          )}
        </div>
        
        <div className="popup-footer">
          {canClose && (
            <button className="btn btn-secondary" onClick={handleCloseClick}>
              {roomCode ? 'Cancel' : 'Back'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomCreationPopup;
