import React, { useState, useEffect } from 'react';

const RoomJoiningPopup = ({ isOpen, onClose, onJoinRoom, isJoining, error, canClose = true, initialRoomCode = '' }) => {
  const [roomCode, setRoomCode] = useState('');
  const [inputError, setInputError] = useState('');

  // Handle initial room code from URL
  useEffect(() => {
    if (isOpen && initialRoomCode && !roomCode) {
      setRoomCode(initialRoomCode);
      // Automatically attempt to join the room
      setTimeout(() => {
        onJoinRoom(initialRoomCode);
      }, 100); // Small delay to ensure state is updated
    }
  }, [isOpen, initialRoomCode, roomCode, onJoinRoom]);

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

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomCode(value);
    setInputError('');
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      setInputError('Please enter a room code');
      return;
    }
    
    if (roomCode.length < 4) {
      setInputError('Room code must be at least 4 characters');
      return;
    }

    onJoinRoom(roomCode);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className="difficulty-popup">
        <div className="popup-header">
          <h2>Join Game Room</h2>
          {canClose && (
            <button className="popup-close" onClick={handleCloseClick}>×</button>
          )}
        </div>
        
        <div className="difficulty-options">
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
            <p style={{ color: '#666', marginBottom: '2rem', lineHeight: '1.5' }}>
              Enter the room code shared by your friend to join their Sudoku game!
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <input
                type="text"
                value={roomCode}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter room code"
                maxLength={8}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.2rem',
                  fontFamily: 'Courier New, monospace',
                  textAlign: 'center',
                  letterSpacing: '2px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                }}
              />
              
              {(inputError || error) && (
                <div style={{
                  color: '#e53e3e',
                  fontSize: '0.9rem',
                  marginTop: '0.5rem',
                  textAlign: 'center'
                }}>
                  {inputError || error}
                </div>
              )}
            </div>

            <button 
              className="btn btn-primary" 
              onClick={handleJoinRoom}
              disabled={isJoining || !roomCode.trim()}
              style={{ 
                width: '100%', 
                padding: '1rem',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>

            <div style={{ 
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#666',
              lineHeight: '1.4'
            }}>
              <strong>How to join:</strong><br />
              1. Ask your friend for the room code<br />
              2. Enter it above and click "Join Room"<br />
              3. Wait for the 5-second countdown to start!
            </div>
            
            {isJoining && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(102, 126, 234, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(102, 126, 234, 0.2)',
                fontSize: '0.85rem',
                color: '#667eea',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #667eea',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Joining game room...
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="popup-footer">
          {canClose && (
            <button className="btn btn-secondary" onClick={handleCloseClick}>
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomJoiningPopup;
