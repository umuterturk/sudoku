import { useState, useEffect, useRef } from 'react';

/**
 * Base timer hook that can be extended for different game modes
 */
export const useGameTimer = (options = {}) => {
  const {
    initialTime = 0,
    countDown = false,
    maxTime = null,
    onTimeUp = null,
    autoStart = false
  } = options;
  
  const [timer, setTimer] = useState(initialTime);
  const [isTimerRunning, setIsTimerRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);
  
  // Start timer
  const startTimer = () => {
    setIsTimerRunning(true);
    setIsPaused(false);
  };
  
  // Stop timer
  const stopTimer = () => {
    setIsTimerRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  
  // Pause timer
  const pauseTimer = () => {
    setIsPaused(true);
    setIsTimerRunning(false);
  };
  
  // Resume timer
  const resumeTimer = () => {
    setIsPaused(false);
    setIsTimerRunning(true);
  };
  
  // Reset timer
  const resetTimer = (newTime = initialTime) => {
    setTimer(newTime);
    setIsTimerRunning(autoStart);
    setIsPaused(false);
  };
  
  // Timer effect
  useEffect(() => {
    if (isTimerRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimer(prevTimer => {
          const newTime = countDown ? prevTimer - 1 : prevTimer + 1;
          
          // Check for time up condition
          if (countDown && newTime <= 0) {
            setIsTimerRunning(false);
            if (onTimeUp) {
              onTimeUp();
            }
            return 0;
          }
          
          // Check for max time condition
          if (!countDown && maxTime && newTime >= maxTime) {
            setIsTimerRunning(false);
            if (onTimeUp) {
              onTimeUp();
            }
            return maxTime;
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTimerRunning, isPaused, countDown, maxTime, onTimeUp]);
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return {
    timer,
    isTimerRunning,
    isPaused,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    formatTime,
    formattedTime: formatTime(timer)
  };
};

/**
 * Singleplayer timer hook - counts up from 0
 */
export const useSingleplayerTimer = (options = {}) => {
  return useGameTimer({
    initialTime: 0,
    countDown: false,
    ...options
  });
};

/**
 * Multiplayer timer hook - counts down from initial time
 */
export const useMultiplayerTimer = (options = {}) => {
  const { 
    initialTime = 600, // 10 minutes
    onTimeUp,
    gameStartTime = null
  } = options;
  
  const baseTimer = useGameTimer({
    initialTime,
    countDown: true,
    onTimeUp,
    ...options
  });
  
  // For multiplayer, we might need to sync with server time
  useEffect(() => {
    if (gameStartTime && baseTimer.isTimerRunning) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - gameStartTime) / 1000);
        const remaining = Math.max(0, initialTime - elapsed);
        
        if (remaining <= 0 && onTimeUp) {
          onTimeUp();
          baseTimer.stopTimer();
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [gameStartTime, baseTimer.isTimerRunning, initialTime, onTimeUp, baseTimer]);
  
  return baseTimer;
};
