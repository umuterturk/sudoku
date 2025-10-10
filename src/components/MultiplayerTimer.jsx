import React, { useState, useEffect, useRef } from 'react';

/**
 * MultiplayerTimer Component
 * Handles timer display with server time synchronization for multiplayer games
 * Uses dependency injection to receive timer state and multiplayer context
 */
const MultiplayerTimer = ({ 
  gameStartTime, 
  gameEndTime, 
  gameState 
}) => {
  const [multiplayerTimeLeft, setMultiplayerTimeLeft] = useState(null);
  const serverTimeOffsetRef = useRef(0);
  const timerInitializedRef = useRef(false);
  const currentEndTimeRef = useRef(null);

  // Calculate server time offset for accurate time synchronization
  useEffect(() => {
    if (!gameStartTime || !gameEndTime) return;

    // Calculate the offset between client time and server time
    // This helps synchronize timers across different clients
    const clientTime = new Date();
    const serverTime = gameStartTime instanceof Date ? gameStartTime : gameStartTime.toDate();
    
    // Calculate offset: positive means server is ahead, negative means client is ahead
    serverTimeOffsetRef.current = serverTime.getTime() - clientTime.getTime();
    
    console.log('🕐 Server time offset calculated:', serverTimeOffsetRef.current, 'ms');
    console.log('🕐 Client time:', clientTime.toISOString());
    console.log('🕐 Server time:', serverTime.toISOString());
    
    // Warn if offset is too large (more than 5 seconds)
    if (Math.abs(serverTimeOffsetRef.current) > 5000) {
      console.warn('⚠️ Large time offset detected:', serverTimeOffsetRef.current, 'ms. Timer synchronization may be affected.');
    }
  }, [gameStartTime, gameEndTime]);

  // Multiplayer timer logic using server time
  useEffect(() => {
    console.log('🕐 MultiplayerTimer useEffect triggered with:', {
      gameStartTime,
      gameEndTime,
      gameState,
      hasGameStartTime: !!gameStartTime,
      hasGameEndTime: !!gameEndTime,
      isStarted: gameState === 'STARTED'
    });

    if (!gameStartTime || !gameEndTime || gameState !== 'STARTED') {
      console.log('🕐 MultiplayerTimer: Missing required data, setting timer to null');
      console.log('🕐 Detailed check:', {
        hasGameStartTime: !!gameStartTime,
        hasGameEndTime: !!gameEndTime,
        gameState,
        gameStateIsStarted: gameState === 'STARTED',
        gameStartTimeValue: gameStartTime,
        gameEndTimeValue: gameEndTime
      });
      setMultiplayerTimeLeft(null);
      return;
    }

    // Convert timestamps to Date objects once and store them
    const startTime = gameStartTime instanceof Date ? gameStartTime : gameStartTime.toDate();
    const endTime = gameEndTime instanceof Date ? gameEndTime : gameEndTime.toDate();
    
    // Validate timestamps
    if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.warn('⚠️ Invalid timestamps:', { startTime, endTime });
      setMultiplayerTimeLeft(null);
      return;
    }
    
    // Check if we already have a timer running with the same end time
    if (timerInitializedRef.current && currentEndTimeRef.current && 
        currentEndTimeRef.current.getTime() === endTime.getTime()) {
      console.log('🕐 MultiplayerTimer: Timer already initialized with same end time, skipping restart');
      return;
    }
    
    // Store the current end time and mark as initialized
    currentEndTimeRef.current = endTime;
    timerInitializedRef.current = true;
    
    console.log('🕐 MultiplayerTimer: Starting timer with end time:', endTime.toISOString());

    const updateMultiplayerTimer = () => {
      try {
        // Use server time instead of client time for accurate synchronization
        const clientTime = new Date();
        const serverTime = new Date(clientTime.getTime() + serverTimeOffsetRef.current);
        
        // Use the pre-converted end time
        const timeLeft = Math.max(0, Math.floor((endTime.getTime() - serverTime.getTime()) / 1000));
        setMultiplayerTimeLeft(timeLeft);
        
        // Log timer updates for debugging (only every 10 seconds to avoid spam)
        if (timeLeft % 10 === 0) {
          console.log(`⏰ Timer update: ${timeLeft}s remaining (server time: ${serverTime.toISOString()})`);
        }
        
        // If time is up, log it but don't restart the timer
        if (timeLeft === 0) {
          console.log('⏰ Timer reached zero - game should end');
        }
      } catch (error) {
        console.error('❌ Error updating multiplayer timer:', error);
        setMultiplayerTimeLeft(null);
      }
    };

    // Update immediately
    updateMultiplayerTimer();

    // Update every second
    const interval = setInterval(updateMultiplayerTimer, 1000);

    return () => {
      clearInterval(interval);
      // Reset initialization flag when effect is cleaned up
      timerInitializedRef.current = false;
      currentEndTimeRef.current = null;
    };
  }, [gameStartTime, gameEndTime, gameState]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if we don't have time left data
  if (multiplayerTimeLeft === null) {
    // Debug logging to help identify the issue
    console.log('🕐 MultiplayerTimer: Not rendering because multiplayerTimeLeft is null');
    console.log('🕐 Game state:', gameState);
    console.log('🕐 Game start time:', gameStartTime);
    console.log('🕐 Game end time:', gameEndTime);
    
    // Show a loading state instead of nothing
    return (
      <div className="timer-container">
        <div className="timer multiplayer-timer">
          <div className="timer-label">
            Loading Timer...
            <span className="sync-indicator" title="Waiting for game data">⏳</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="timer-container">
      <div className="timer multiplayer-timer">
        {formatTime(multiplayerTimeLeft)}
        <div className="timer-label">
          Time Left
          <span className="sync-indicator" title="Synchronized with server time">🕐</span>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerTimer;
