import { useState, useEffect, useCallback, useRef } from 'react';
import { useMultiplayerContext } from '../contexts/MultiplayerContext';
import { useGameContext } from '../contexts/GameContext';
import { MULTIPLAYER_CONFIG } from '../config/firebase.prod';
import { loadPuzzleDatabase } from '../utils/sudokuUtils';

/**
 * Custom hook for managing multiplayer game logic
 */
export const useMultiplayerGame = () => {
  const {
    isMultiplayerMode,
    gameRoomId,
    gameRoomData,
    isGameCreator,
    isGameJoined,
    opponentProgress,
    opponentHearts,
    gameState,
    gameStartTime,
    gameEndTime,
    setIsMultiplayerMode,
    createGameRoom,
    joinGameRoom,
    updatePlayerProgress,
    endGame,
    exitGame,
    generateRoomCode
  } = useMultiplayerContext();

  // Get game context for initialization
  const { gameModeManager, setShowGameModeSelector, setShowRoomCreationPopup } = useGameContext();

  // Local state for multiplayer game
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [gameTimeRemaining, setGameTimeRemaining] = useState(null);
  
  // Refs for cleanup
  const countdownRef = useRef(null);
  const gameTimerRef = useRef(null);

  // Generate a random board ID for easy difficulty
  const generateBoardId = useCallback(async () => {
    // This will be used to select a random easy puzzle
    // Get the actual size of the easy puzzle database
    const puzzleDatabase = await loadPuzzleDatabase('easy');
    return Math.floor(Math.random() * puzzleDatabase.length).toString();
  }, []);

  // Create a new game room
  const handleCreateRoom = useCallback(async () => {
    setIsCreatingRoom(true);
    setCreateError(null);
    
    try {
      const boardId = await generateBoardId();
      const newRoomCode = await createGameRoom(boardId, 'easy');
      setRoomCode(newRoomCode);
      setIsMultiplayerMode(true);
      
      console.log('🎮 Game room created successfully:', newRoomCode);
    } catch (error) {
      console.error('Failed to create room:', error);
      setCreateError(error.message || 'Failed to create game room');
    } finally {
      setIsCreatingRoom(false);
    }
  }, [createGameRoom, generateBoardId, setIsMultiplayerMode]);

  // Start 5-second countdown before game begins
  const startGameCountdown = useCallback(() => {
    let timeLeft = 5;
    setCountdown(timeLeft);
    
    console.log('⏰ Starting 5-second countdown...');
    
    countdownRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      
      if (timeLeft > 0) {
        console.log(`⏰ Game starting in ${timeLeft}...`);
      } else {
        console.log('🚀 Game starting now!');
        clearInterval(countdownRef.current);
        setCountdown(null);
        // Close the game mode selector and room creation popup when countdown ends
        setShowGameModeSelector(false);
        setShowRoomCreationPopup(false);
      }
    }, 1000);
  }, [setShowGameModeSelector, setShowRoomCreationPopup]);

  // Join an existing game room
  const handleJoinRoom = useCallback(async (code) => {
    setIsJoiningRoom(true);
    setJoinError(null);
    
    try {
      const gameData = await joinGameRoom(code);
      setRoomCode(code);
      setIsMultiplayerMode(true);
      
      console.log('🎮 Successfully joined game room:', code);
      
      // Start countdown if game is about to start
      if (gameData.gameState === MULTIPLAYER_CONFIG.GAME_STATES.STARTED) {
        console.log('⏰ Game starting, beginning countdown...');
        startGameCountdown();
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      setJoinError(error.message || 'Failed to join game room');
    } finally {
      setIsJoiningRoom(false);
    }
  }, [joinGameRoom, setIsMultiplayerMode, startGameCountdown]);

  // Start game timer
  const startGameTimer = useCallback(() => {
    if (!gameStartTime || !gameEndTime) return;
    
    console.log('⏱️ Starting multiplayer game timer (10 minutes)');
    
    const updateTimer = () => {
      // Use server time for consistent timer across clients
      const now = new Date();
      const endTime = gameEndTime instanceof Date ? gameEndTime : gameEndTime.toDate();
      const remaining = Math.max(0, endTime.getTime() - now.getTime());
      setGameTimeRemaining(remaining);
      
      if (remaining <= 0) {
        console.log('⏰ Game time expired!');
        clearInterval(gameTimerRef.current);
        endGame('timeout');
      }
    };
    
    updateTimer(); // Initial update
    gameTimerRef.current = setInterval(updateTimer, 1000);
  }, [gameStartTime, gameEndTime, endGame]);

  // Stop game timer
  const stopGameTimer = useCallback(() => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    setGameTimeRemaining(null);
  }, []);

  // Update player progress
  const handleUpdateProgress = useCallback(async (progress, heartsLeft, lostHeart = false) => {
    if (!isGameJoined || gameState !== MULTIPLAYER_CONFIG.GAME_STATES.STARTED) {
      return;
    }
    
    try {
      await updatePlayerProgress(progress, heartsLeft, lostHeart);
      console.log(`📊 Progress updated: ${progress}%, Hearts: ${heartsLeft}, Lost Heart: ${lostHeart}`);
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }, [isGameJoined, gameState, updatePlayerProgress]);

  // Handle game completion
  const handleGameCompletion = useCallback(async (finalProgress) => {
    if (!isGameJoined) return;
    
    try {
      console.log('🏆 Game completed! Final progress:', finalProgress);
      await updatePlayerProgress(finalProgress, 0, false);
      await endGame('completed');
    } catch (error) {
      console.error('Failed to complete game:', error);
    }
  }, [isGameJoined, updatePlayerProgress, endGame]);

  // Handle heart loss
  const handleHeartLoss = useCallback(async (progress, heartsLeft) => {
    if (!isGameJoined || gameState !== MULTIPLAYER_CONFIG.GAME_STATES.STARTED) {
      return;
    }
    
    try {
      console.log(`💔 Heart lost! Progress: ${progress}%, Hearts remaining: ${heartsLeft}`);
      await updatePlayerProgress(progress, heartsLeft, true);
      
      // End game if no hearts left
      if (heartsLeft <= 0) {
        console.log('💀 All hearts lost! Game over.');
        await endGame('hearts_lost');
      }
    } catch (error) {
      console.error('Failed to handle heart loss:', error);
    }
  }, [isGameJoined, gameState, updatePlayerProgress, endGame]);

  // Exit the current game
  const handleExitGame = useCallback(async () => {
    try {
      console.log('🚪 Exiting multiplayer game...');
      await exitGame();
      setRoomCode('');
      setCountdown(null);
      stopGameTimer();
      setJoinError(null);
      setCreateError(null);
      console.log('✅ Successfully exited multiplayer game');
    } catch (error) {
      console.error('Failed to exit game:', error);
    }
  }, [exitGame, stopGameTimer]);

  // Format time remaining for display
  const formatTimeRemaining = useCallback((milliseconds) => {
    if (!milliseconds) return '00:00';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Get current player's progress data
  const getCurrentPlayerData = useCallback(() => {
    if (!gameRoomData) return null;
    
    const playerData = isGameCreator ? gameRoomData.creator : gameRoomData.challenger;
    return playerData || null;
  }, [gameRoomData, isGameCreator]);

  // Get opponent's progress data
  const getOpponentData = useCallback(() => {
    if (!gameRoomData) return null;
    
    const opponentData = isGameCreator ? gameRoomData.challenger : gameRoomData.creator;
    return opponentData || null;
  }, [gameRoomData, isGameCreator]);

  // Check if game is ready to start
  const isGameReady = useCallback(() => {
    return gameState === MULTIPLAYER_CONFIG.GAME_STATES.STARTED && 
           gameStartTime && 
           gameEndTime;
  }, [gameState, gameStartTime, gameEndTime]);

  // Check if game is waiting for players
  const isWaitingForPlayers = useCallback(() => {
    return gameState === MULTIPLAYER_CONFIG.GAME_STATES.WAITING;
  }, [gameState]);

  // Check if game has ended
  const isGameEnded = useCallback(() => {
    return gameState === MULTIPLAYER_CONFIG.GAME_STATES.ENDED;
  }, [gameState]);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, []);

  // Start game timer when game starts
  useEffect(() => {
    if (isGameReady()) {
      startGameTimer();
    } else {
      stopGameTimer();
    }
  }, [isGameReady, startGameTimer, stopGameTimer]);

  // Start countdown when game state changes to STARTED
  useEffect(() => {
    if (gameState === MULTIPLAYER_CONFIG.GAME_STATES.STARTED && !countdown) {
      startGameCountdown();
    }
  }, [gameState, countdown, startGameCountdown]);


  return {
    // State
    isMultiplayerMode,
    gameRoomId,
    gameRoomData,
    isGameCreator,
    isGameJoined,
    opponentProgress,
    opponentHearts,
    gameState,
    gameStartTime,
    gameEndTime,
    isCreatingRoom,
    isJoiningRoom,
    joinError,
    createError,
    roomCode,
    countdown,
    gameTimeRemaining,
    
    // Computed values
    isGameReady: isGameReady(),
    isWaitingForPlayers: isWaitingForPlayers(),
    isGameEnded: isGameEnded(),
    currentPlayerData: getCurrentPlayerData(),
    opponentData: getOpponentData(),
    formattedTimeRemaining: formatTimeRemaining(gameTimeRemaining),
    
    // Actions
    handleCreateRoom,
    handleJoinRoom,
    handleUpdateProgress,
    handleGameCompletion,
    handleHeartLoss,
    handleExitGame,
    startGameCountdown,
    stopGameTimer,
    formatTimeRemaining
  };
};
