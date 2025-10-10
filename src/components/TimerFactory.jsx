import React from 'react';
import SinglePlayerTimer from './SinglePlayerTimer';
import MultiplayerTimer from './MultiplayerTimer';

/**
 * TimerFactory Component
 * Implements Inversion of Control (IoC) pattern for timer components
 * Selects the appropriate timer component based on game mode
 */
const TimerFactory = ({ 
  // Common props for all timer types
  timer, 
  isTimerRunning, 
  isPaused, 
  gameStatus, 
  isAnimating, 
  onPauseToggle,
  
  // Game mode detection
  isMultiplayerMode,
  
  // Multiplayer-specific props
  gameStartTime,
  gameEndTime,
  gameState
}) => {
  // Select the appropriate timer component based on game mode
  if (isMultiplayerMode) {
    console.log('🕐 TimerFactory: Rendering MultiplayerTimer with props:', {
      gameStartTime,
      gameEndTime,
      gameState,
      isMultiplayerMode
    });
    
    return (
      <MultiplayerTimer
        gameStartTime={gameStartTime}
        gameEndTime={gameEndTime}
        gameState={gameState}
      />
    );
  }

  // Default to single player timer
  return (
    <SinglePlayerTimer
      timer={timer}
      isPaused={isPaused}
      gameStatus={gameStatus}
      isAnimating={isAnimating}
      onPauseToggle={onPauseToggle}
    />
  );
};

export default TimerFactory;
