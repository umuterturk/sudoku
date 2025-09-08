import React from 'react';
import { Undo, Edit, EditOutlined } from '@mui/icons-material';
import BuyMeCoffee from '../shared/BuyMeCoffe';

/**
 * Multiplayer Controls Component
 * Contains controls available in multiplayer mode (limited compared to singleplayer)
 */
const MultiplayerControls = ({
  onUndo,
  onNotesToggle,
  canUndo = false,
  undosUsed = 0,
  isNotesMode = false,
  isAnimating = false
}) => {
  return (
    <div className="control-buttons multiplayer-controls">
      {/* Support button */}
      <div className="control-button-group">
        <a
          href="https://buymeacoffee.com/codeonbrew"
          target="_blank"
          rel="noopener noreferrer"
          className="control-button buymeacoffee-button"
          title="Support Umut - Buy me a coffee!"
        >
          <div id="logo">
          <BuyMeCoffee />
          </div>
        </a>
        <span className="control-label">Support</span>
      </div>
      
      {/* Undo button */}
      <div className="control-button-group">
        <button 
          className="control-button"
          onClick={onUndo}
          disabled={!canUndo || isAnimating}
          title={undosUsed >= 3 ? `Undo (${undosUsed}/3 used)` : "Undo"}
        >
          <Undo />
        </button>
        <span className="control-label">
          Undo {undosUsed >= 3 ? `(${undosUsed}/3)` : ''}
        </span>
      </div>
      
      {/* Notes button */}
      <div className="control-button-group">
        <button 
          className={`control-button ${isNotesMode ? 'notes-active' : ''}`}
          onClick={onNotesToggle}
          disabled={isAnimating}
          title={isNotesMode ? 'Exit Notes Mode' : 'Enter Notes Mode'}
        >
          {isNotesMode ? <Edit /> : <EditOutlined />}
        </button>
        <span className="control-label">
          Notes
        </span>
      </div>
      
      {/* Spacer for where hint button would be in singleplayer */}
      <div className="control-button-group disabled">
        <div className="control-button disabled-hint">
          <span className="hint-disabled-text">No Hints</span>
        </div>
        <span className="control-label">Multiplayer</span>
      </div>
    </div>
  );
};

export default MultiplayerControls;
