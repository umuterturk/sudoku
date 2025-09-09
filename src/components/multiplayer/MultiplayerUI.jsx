// Multiplayer UI components for Sudoku challenge mode
import React from 'react';
import { 
  Box, 
  Typography, 
  LinearProgress, 
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  People, 
  Timer, 
  CheckCircle, 
  HourglassEmpty,
  WifiOff
} from '@mui/icons-material';
import './MultiplayerUI.css';

// Compact progress bars for header display
export const PlayerProgressBars = ({ players, currentPlayerId, roomData }) => {
  if (!players || players.length === 0 || !roomData) return null;

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const opponent = players.find(p => p.id !== currentPlayerId);
  
  if (!currentPlayer || !opponent) return null;

  return (
    <Box className="player-progress-container-header">
      {/* Progress bars side by side with minimal labels */}
      <Box className="player-progress-bars-container">
        {/* Your progress on top */}
        <Box className="player-progress-compact">
          <LinearProgress
            variant="determinate"
            value={currentPlayer.progress}
            className={`progress-bar-header your-progress ${currentPlayer.completed ? 'completed' : ''}`}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: currentPlayer.completed ? '#4caf50' : '#2196f3',
                borderRadius: 4,
                transition: 'transform 0.2s ease-out',
                transform: `scaleX(${currentPlayer.progress / 100})`
              }
            }}
          />
        </Box>

        {/* Opponent progress below */}
        <Box className="player-progress-compact">
          <LinearProgress
            variant="determinate"
            value={opponent.progress}
            className={`progress-bar-header opponent-progress ${opponent.completed ? 'completed' : ''} ${opponent.heartLost ? 'heart-lost-flash' : ''}`}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: opponent.completed ? '#4caf50' : '#ef4444',
                borderRadius: 4,
                transition: 'transform 0.2s ease-out',
                transform: `scaleX(${opponent.progress / 100})`
              }
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

// Countdown component
export const CountdownDisplay = ({ countdown, onComplete }) => {
  const [timeLeft, setTimeLeft] = React.useState(5);

  React.useEffect(() => {
    if (!countdown) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Call onComplete in the next tick to avoid setState during render
          setTimeout(() => {
            onComplete && onComplete();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown, onComplete]);

  if (!countdown) return null;

  return (
    <Box className="countdown-overlay">
      <Box className="countdown-content">
        <Typography variant="h2" className="countdown-number">
          {timeLeft}
        </Typography>
        <Typography variant="h6" className="countdown-text">
          Game starting in...
        </Typography>
      </Box>
    </Box>
  );
};

// Game state indicator
export const GameStateIndicator = ({ gameState, connectionState, timer }) => {
  const getStateInfo = () => {
    switch (gameState) {
      case 'waiting':
        return {
          icon: <People />,
          text: 'Waiting for players...',
          color: '#ff9800'
        };
      case 'countdown':
        return {
          icon: <HourglassEmpty />,
          text: 'Get ready!',
          color: '#2196f3'
        };
      case 'playing':
        return {
          icon: <Timer />,
          text: `Time: ${formatTime(timer)}`,
          color: '#4caf50'
        };
      case 'completed':
        return {
          icon: <CheckCircle />,
          text: 'Game completed!',
          color: '#4caf50'
        };
      default:
        return {
          icon: <WifiOff />,
          text: 'Disconnected',
          color: '#f44336'
        };
    }
  };

  const stateInfo = getStateInfo();
  const isConnected = connectionState === 'connected';

  return (
    <Box className="game-state-indicator">
      <Chip
        icon={stateInfo.icon}
        label={stateInfo.text}
        color={isConnected ? 'primary' : 'error'}
        variant={isConnected ? 'filled' : 'outlined'}
        className="state-chip"
      />
      {connectionState === 'connecting' && (
        <CircularProgress size={16} className="connecting-spinner" />
      )}
    </Box>
  );
};

// Waiting room component
export const WaitingRoom = ({ roomId, players, onStartGame, isHost }) => {
  const [inviteLink, setInviteLink] = React.useState('');

  React.useEffect(() => {
    if (roomId) {
      const link = `${window.location.origin}${import.meta.env.BASE_URL}m?r=${roomId}`;
      setInviteLink(link);
    }
  }, [roomId]);

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy invite link:', error);
    }
  };

  return (
    <Box className="waiting-room">
      <Typography variant="h5" className="waiting-title">
        Challenge Room
      </Typography>
      
      <Box className="room-info">
        <Typography variant="body1" className="room-id">
          Room ID: <strong>{roomId}</strong>
        </Typography>
      </Box>

      <Box className="players-list">
        <Typography variant="h6" className="players-title">
          Players ({players.length}/2)
        </Typography>
        {players.map((player, index) => (
          <Box key={player.id} className="player-item">
            <Typography variant="body1">
              {index + 1}. {player.name}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box className="invite-section">
        <Typography variant="body2" className="invite-label">
          Share this link with a friend:
        </Typography>
        <Box className="invite-link-container">
          <Typography variant="body2" className="invite-link">
            {inviteLink}
          </Typography>
          <button
            onClick={copyInviteLink}
            className="copy-button"
          >
            Copy
          </button>
        </Box>
      </Box>

      {players.length === 2 && (
        <Alert severity="success" className="waiting-alert">
          Both players joined! Game will start automatically in a moment...
        </Alert>
      )}

      {players.length < 2 && (
        <Alert severity="info" className="waiting-alert">
          Waiting for another player to join...
        </Alert>
      )}
    </Box>
  );
};

// Multiplayer game result component
export const MultiplayerGameResult = ({ gameState, players, currentPlayerId, winner, gameEndReason, onNewGame, onExit, onRematch, nextRoomId, rematchRequestedBy, onAcceptRematch }) => {
  const [rematching, setRematching] = React.useState(false);
  if (!['player_won', 'draw', 'time_up'].includes(gameState)) {
    return null;
  }

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isWinner = currentPlayer && currentPlayer.winner;
  const isDraw = gameState === 'draw' || !winner;

  const getResultInfo = () => {
    if (isDraw) {
      return {
        title: "It's a Draw! 🤝",
        message: getDrawMessage(gameEndReason),
        color: '#ff9800'
      };
    } else if (isWinner) {
      return {
        title: "You Won! 🎉",
        message: getWinMessage(gameEndReason),
        color: '#4caf50'
      };
    } else {
      return {
        title: "You Lost 😔",
        message: getLoseMessage(gameEndReason),
        color: '#f44336'
      };
    }
  };

  const getWinMessage = (reason) => {
    switch (reason) {
      case 'completion':
        return 'Congratulations! You completed the puzzle first!';
      case 'opponent_eliminated':
        return 'You won! Your opponent ran out of hearts.';
      case 'time_up_progress':
        return 'Time\'s up! You won with the most progress.';
      default:
        return 'Congratulations on your victory!';
    }
  };

  const getLoseMessage = (reason) => {
    switch (reason) {
      case 'completion':
        return 'Your opponent completed the puzzle first. Better luck next time!';
      case 'opponent_eliminated':
        return 'You ran out of hearts. Keep practicing!';
      case 'time_up_progress':
        return 'Time\'s up! Your opponent had more progress.';
      default:
        return 'Better luck next time!';
    }
  };

  const getDrawMessage = (reason) => {
    switch (reason) {
      case 'time_up_draw':
        return 'Time\'s up! Both players had equal progress.';
      case 'all_eliminated':
        return 'Both players ran out of hearts.';
      default:
        return 'The game ended in a draw.';
    }
  };

  const resultInfo = getResultInfo();

  return (
    <div className="multiplayer-result-overlay">
      <Box className="multiplayer-result-content">
        <Typography variant="h4" className="result-title" sx={{ color: resultInfo.color, mb: 2 }}>
          {resultInfo.title}
        </Typography>
        
        <Typography variant="body1" className="result-message" sx={{ mb: 3, textAlign: 'center' }}>
          {resultInfo.message}
        </Typography>

        <Box className="final-scores" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Final Scores:</Typography>
          {players.map((player) => (
            <Box key={player.id} className="player-final-score" sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              mb: 1,
              p: 1,
              backgroundColor: player.winner ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: 1
            }}>
              <Typography variant="body1" sx={{ fontWeight: player.winner ? 600 : 400 }}>
                {player.name} {player.id === currentPlayerId && '(You)'}
                {player.winner && ' 👑'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                {player.progress}% • ❤️ {player.hearts || 0}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box className="result-buttons" sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onExit}
            className="btn btn-secondary"
            style={{ minWidth: '120px' }}
          >
            Exit Game
          </button>
          <button
            onClick={onNewGame}
            className="btn btn-primary"
            style={{ 
              minWidth: '120px',
              backgroundColor: resultInfo.color,
              borderColor: resultInfo.color
            }}
          >
            New Random
          </button>
          {onRematch && !nextRoomId && (
            <button
              onClick={async () => {
                if (rematching) return;
                setRematching(true);
                try { await onRematch(); } finally { /* keep overlay hidden after state clears */ }
              }}
              className="btn btn-primary"
              style={{ minWidth: '140px', opacity: rematching ? 0.7 : 1 }}
              disabled={rematching}
            >
              {rematching ? 'Starting...' : 'Rematch'}
            </button>
          )}
          {nextRoomId && (
            rematchRequestedBy === currentPlayerId ? (
              <button
                className="btn btn-primary"
                style={{ minWidth: '160px', backgroundColor: '#2196f3', borderColor: '#2196f3' }}
                disabled
              >
                Waiting Opponent…
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ minWidth: '160px', backgroundColor: '#2196f3', borderColor: '#2196f3' }}
                onClick={onAcceptRematch}
              >
                Join Next Round
              </button>
            )
          )}
        </Box>
      </Box>
    </div>
  );
};

// Helper function to format time
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

