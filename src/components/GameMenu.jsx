import React from 'react';
import { People, Person, Settings } from '@mui/icons-material';
import { Button, Typography, Card, CardContent } from '@mui/material';
import './GameMenu.css';

/**
 * Game Menu Component
 * Main menu for selecting game mode
 */
const GameMenu = ({ onModeSelect, onShowSettings }) => {
  return (
    <div className="game-menu-container">
      <div className="menu-container">
        <div className="menu-header">
          <h1>Sudoku</h1>
          <p>Choose your game mode</p>
        </div>
        
        <div className="menu-options">
          <Card className="menu-card singleplayer" onClick={() => onModeSelect('singleplayer')}>
            <CardContent>
              <Person sx={{ fontSize: 48, color: '#4299e1' }} />
              <Typography variant="h5" component="h2" sx={{ mt: 2, mb: 1 }}>
                Singleplayer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Play at your own pace with hints, pause, and save features
              </Typography>
            </CardContent>
          </Card>
          
          <Card className="menu-card multiplayer" onClick={() => onModeSelect('multiplayer')}>
            <CardContent>
              <People sx={{ fontSize: 48, color: '#e53e3e' }} />
              <Typography variant="h5" component="h2" sx={{ mt: 2, mb: 1 }}>
                Multiplayer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Challenge a friend in real-time competitive play
              </Typography>
            </CardContent>
          </Card>
        </div>
        
        <div className="menu-footer">
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={onShowSettings}
            sx={{ mt: 2 }}
          >
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameMenu;