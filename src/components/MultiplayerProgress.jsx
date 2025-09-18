import React from 'react';

const MultiplayerProgress = ({ 
  creatorProgress = 0, 
  challengerProgress = 0, 
  isCreator = true,
  creatorHearts = 3,
  challengerHearts = 3,
  creatorLostHeart = false,
  challengerLostHeart = false
}) => {
  // Determine which progress bar represents the current player
  const currentPlayerProgress = isCreator ? creatorProgress : challengerProgress;
  const opponentProgress = isCreator ? challengerProgress : creatorProgress;
  const currentPlayerHearts = isCreator ? creatorHearts : challengerHearts;
  const opponentHearts = isCreator ? challengerHearts : creatorHearts;
  const currentPlayerLostHeart = isCreator ? creatorLostHeart : challengerLostHeart;
  const opponentLostHeart = isCreator ? challengerLostHeart : creatorLostHeart;

  const renderHearts = (hearts, lostHeart) => {
    return (
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {[1, 2, 3].map((heart) => (
          <div
            key={heart}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: heart <= hearts ? '#e53e3e' : '#e2e8f0',
              transition: 'all 0.3s ease',
              transform: lostHeart && heart === hearts ? 'scale(1.2)' : 'scale(1)',
              boxShadow: lostHeart && heart === hearts ? '0 0 8px rgba(229, 62, 62, 0.5)' : 'none'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '12px'
    }}>
      {/* Current Player Progress */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#4299e1'
        }} />
        <div style={{
          flex: 1,
          height: '8px',
          backgroundColor: '#e2e8f0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(currentPlayerProgress, 100)}%`,
              backgroundColor: '#4299e1',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
              position: 'relative'
            }}
          >
            {currentPlayerProgress > 0 && (
              <div style={{
                position: 'absolute',
                right: '2px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '6px',
                color: 'white',
                fontWeight: 'bold',
                textShadow: '0 0 2px rgba(0,0,0,0.5)'
              }}>
                {Math.round(currentPlayerProgress)}%
              </div>
            )}
          </div>
        </div>
        {renderHearts(currentPlayerHearts, currentPlayerLostHeart)}
      </div>

      {/* Opponent Progress */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#ed8936'
        }} />
        <div style={{
          flex: 1,
          height: '8px',
          backgroundColor: '#e2e8f0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(opponentProgress, 100)}%`,
              backgroundColor: '#ed8936',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
              position: 'relative'
            }}
          >
            {opponentProgress > 0 && (
              <div style={{
                position: 'absolute',
                right: '2px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '6px',
                color: 'white',
                fontWeight: 'bold',
                textShadow: '0 0 2px rgba(0,0,0,0.5)'
              }}>
                {Math.round(opponentProgress)}%
              </div>
            )}
          </div>
        </div>
        {renderHearts(opponentHearts, opponentLostHeart)}
      </div>
    </div>
  );
};

export default MultiplayerProgress;
