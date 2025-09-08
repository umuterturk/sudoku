import React, { useState, useRef } from 'react';
import { Undo, Lightbulb, Edit, EditOutlined } from '@mui/icons-material';
import BuyMeCoffee from '../shared/BuyMeCoffe';

/**
 * Singleplayer Controls Component
 * Contains controls specific to singleplayer mode (undo, hints, notes)
 */
const SingleplayerControls = ({
  onUndo,
  onHintLevelChange,
  onNotesToggle,
  canUndo = false,
  undosUsed = 0,
  hintLevel = 'medium',
  isNotesMode = false,
  isAnimating = false,
  onHintLongPress = null
}) => {
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressTriggered, setIsLongPressTriggered] = useState(false);
  
  // Handle hint button click
  const handleHintClick = (event) => {
    console.log('🔄 Hint click event triggered, isLongPressTriggered:', isLongPressTriggered);
    
    // Don't change hint level if this was a long press
    if (isLongPressTriggered) {
      console.log('🚫 Preventing hint level change due to long press');
      setIsLongPressTriggered(false);
      event.target.blur();
      return;
    }
    
    onHintLevelChange();
    
    console.log('🔄 Hint level changed');
    event.target.blur();
  };
  
  // Handle hint long press
  const handleHintLongPress = () => {
    console.log('🔍 Hint long press triggered!');
    setIsLongPressTriggered(true);
    
    if (onHintLongPress) {
      onHintLongPress();
    }
  };
  
  // Handle hint mouse/touch events
  const handleHintMouseDown = (event) => {
    console.log('👇 Hint button mouse/touch down event triggered');
    event.preventDefault();
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    
    const timer = setTimeout(() => {
      console.log('⏰ Long press timer triggered after 800ms');
      handleHintLongPress();
    }, 800);
    setLongPressTimer(timer);
  };
  
  const handleHintMouseUp = (event) => {
    console.log('👆 Hint button mouse/touch up event triggered');
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      setTimeout(() => {
        if (isLongPressTriggered) {
          setIsLongPressTriggered(false);
        }
      }, 10);
    }
  };
  
  const handleHintMouseLeave = (event) => {
    console.log('🚪 Hint button mouse leave event triggered');
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      setTimeout(() => {
        if (isLongPressTriggered) {
          setIsLongPressTriggered(false);
        }
      }, 10);
    }
  };
  
  // Get hint button class based on level
  const getHintButtonClass = () => {
    return `control-button hint-${hintLevel}`;
  };
  
  return (
    <div className="control-buttons">
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
      
      {/* Hint button */}
      <div className="control-button-group">
        <button 
          className={getHintButtonClass()}
          onClick={handleHintClick}
          onMouseDown={handleHintMouseDown}
          onMouseUp={handleHintMouseUp}
          onMouseLeave={handleHintMouseLeave}
          onTouchStart={handleHintMouseDown}
          onTouchEnd={handleHintMouseUp}
          onTouchCancel={handleHintMouseUp}
          disabled={isAnimating}
          title={`Hint Level: ${hintLevel.charAt(0).toUpperCase() + hintLevel.slice(1)} (Long press to show cells with one possibility)`}
        >
          <Lightbulb />
        </button>
        <span className="control-label">
          {hintLevel.charAt(0).toUpperCase() + hintLevel.slice(1)}
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
    </div>
  );
};

export default SingleplayerControls;
