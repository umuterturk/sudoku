import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  where,
  getDocs,
  collection
} from 'firebase/firestore';
import { db, MULTIPLAYER_CONFIG } from '../config/firebase.prod';

const MultiplayerContext = createContext();

export const useMultiplayerContext = () => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayerContext must be used within a MultiplayerProvider');
  }
  return context;
};

export const MultiplayerProvider = ({ children }) => {
  // Multiplayer game state
  const [isMultiplayerMode, setIsMultiplayerMode] = useState(false);
  const [gameRoomId, setGameRoomId] = useState(null);
  const [gameRoomData, setGameRoomData] = useState(null);
  const [isGameCreator, setIsGameCreator] = useState(false);
  const [isGameJoined, setIsGameJoined] = useState(false);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [opponentHearts, setOpponentHearts] = useState(MULTIPLAYER_CONFIG.HEARTS_COUNT);
  const [gameState, setGameState] = useState(MULTIPLAYER_CONFIG.GAME_STATES.WAITING);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [gameEndTime, setGameEndTime] = useState(null);

  // Generate a random room code
  const generateRoomCode = useCallback(() => {
    const chars = MULTIPLAYER_CONFIG.ROOM_CODE_CHARS;
    let result = '';
    for (let i = 0; i < MULTIPLAYER_CONFIG.ROOM_CODE_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);

  // Generate random revealed cell indices (0-80)
  const generateRevealedCells = useCallback(() => {
    const cells = [];
    while (cells.length < MULTIPLAYER_CONFIG.REVEALED_CELLS_COUNT) {
      const randomIndex = Math.floor(Math.random() * 81);
      if (!cells.includes(randomIndex)) {
        cells.push(randomIndex);
      }
    }
    return cells.sort((a, b) => a - b);
  }, []);

  // Create a new multiplayer game room
  const createGameRoom = useCallback(async (boardId, difficulty = 'easy') => {
    try {
      const roomCode = generateRoomCode();
      const revealedCells = generateRevealedCells();
      const gameCreateTime = new Date();
      
      const gameData = {
        gameId: roomCode,
        boardId,
        difficulty,
        revealedCells,
        gameCreateTime: serverTimestamp(),
        gameStartTime: null,
        gameEndTime: null,
        gameState: MULTIPLAYER_CONFIG.GAME_STATES.WAITING,
        creator: {
          heartsLeft: MULTIPLAYER_CONFIG.HEARTS_COUNT,
          lostHeart: false,
          progress: 0
        },
        challenger: null
      };

      // Create the game document in Firestore
      await setDoc(doc(db, MULTIPLAYER_CONFIG.COLLECTIONS.MULTIPLAYER_GAMES, roomCode), gameData);

      // Update local state
      setGameRoomId(roomCode);
      setGameRoomData(gameData);
      setIsGameCreator(true);
      setIsGameJoined(true);
      setGameState(MULTIPLAYER_CONFIG.GAME_STATES.WAITING);

      return roomCode;
    } catch (error) {
      console.error('Error creating game room:', error);
      
      // Handle specific error types
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please check your connection and try again.');
      } else if (error.code === 'unavailable') {
        throw new Error('Service temporarily unavailable. Please try again in a moment.');
      } else if (error.code === 'network-request-failed') {
        throw new Error('Network error. Please check your internet connection.');
      } else {
        throw new Error('Failed to create game room. Please try again.');
      }
    }
  }, [generateRoomCode, generateRevealedCells]);

  // Join an existing game room
  const joinGameRoom = useCallback(async (roomCode) => {
    try {
      console.log('🔍 Looking for game room:', roomCode);
      const gameRef = doc(db, MULTIPLAYER_CONFIG.COLLECTIONS.MULTIPLAYER_GAMES, roomCode);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        throw new Error('Game room not found');
      }

      const gameData = gameSnap.data();
      console.log('📋 Found game room data:', gameData);
      
      if (gameData.gameState !== MULTIPLAYER_CONFIG.GAME_STATES.WAITING) {
        throw new Error('Game room is not available');
      }

      // Check if challenger slot is available
      if (gameData.challenger !== null) {
        throw new Error('Game room is full');
      }

      console.log('✅ Room validation passed, joining game...');

      // Update the game with challenger data
      const gameStartTime = new Date();
      
      // Calculate the end time based on the timeout duration
      const timeoutMs = MULTIPLAYER_CONFIG.GAME_TIMEOUT_MINUTES * 60 * 1000;
      const gameEndTime = new Date(Date.now() + timeoutMs);
      
      await updateDoc(gameRef, {
        gameState: MULTIPLAYER_CONFIG.GAME_STATES.STARTED,
        gameStartTime: serverTimestamp(),
        gameEndTime: gameEndTime, // Set end time to current time + timeout
        challenger: {
          heartsLeft: MULTIPLAYER_CONFIG.HEARTS_COUNT,
          lostHeart: false,
          progress: 0
        }
      });

      console.log('🕐 MultiplayerContext: Set server timestamps for game start/end');

      console.log('🎮 Game state updated to STARTED');

      // Update local state
      setGameRoomId(roomCode);
      setGameRoomData({
        ...gameData,
        gameState: MULTIPLAYER_CONFIG.GAME_STATES.STARTED,
        gameStartTime,
        gameEndTime,
        challenger: {
          heartsLeft: MULTIPLAYER_CONFIG.HEARTS_COUNT,
          lostHeart: false,
          progress: 0
        }
      });
      setIsGameCreator(false);
      setIsGameJoined(true);
      setGameState(MULTIPLAYER_CONFIG.GAME_STATES.STARTED);
      setGameStartTime(gameStartTime);
      setGameEndTime(gameEndTime);
      
      console.log('🕐 MultiplayerContext: Set local game times:', { gameStartTime, gameEndTime });

      console.log('🎉 Successfully joined game room!');
      return gameData;
    } catch (error) {
      console.error('Error joining game room:', error);
      
      // Handle specific error types
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please check your connection and try again.');
      } else if (error.code === 'unavailable') {
        throw new Error('Service temporarily unavailable. Please try again in a moment.');
      } else if (error.code === 'network-request-failed') {
        throw new Error('Network error. Please check your internet connection.');
      } else if (error.message === 'Game room not found') {
        throw new Error('Room code not found. Please check the code and try again.');
      } else if (error.message === 'Game room is not available') {
        throw new Error('This game room is no longer available.');
      } else if (error.message === 'Game room is full') {
        throw new Error('This game room is already full.');
      } else {
        throw new Error('Failed to join game room. Please try again.');
      }
    }
  }, []);

  // Update player progress in the game
  const updatePlayerProgress = useCallback(async (progress, heartsLeft, lostHeart = false) => {
    if (!gameRoomId || !isGameJoined) return;

    try {
      const gameRef = doc(db, MULTIPLAYER_CONFIG.COLLECTIONS.MULTIPLAYER_GAMES, gameRoomId);
      const playerField = isGameCreator ? 'creator' : 'challenger';
      
      await updateDoc(gameRef, {
        [`${playerField}.progress`]: progress,
        [`${playerField}.heartsLeft`]: heartsLeft,
        [`${playerField}.lostHeart`]: lostHeart
      });
    } catch (error) {
      console.error('Error updating player progress:', error);
      
      // Handle specific error types for progress updates
      if (error.code === 'permission-denied') {
        console.warn('Permission denied when updating progress - game may have ended');
      } else if (error.code === 'unavailable') {
        console.warn('Service unavailable when updating progress - will retry on next update');
      } else if (error.code === 'network-request-failed') {
        console.warn('Network error when updating progress - will retry on next update');
      } else {
        console.warn('Unknown error when updating progress:', error);
      }
    }
  }, [gameRoomId, isGameJoined, isGameCreator]);

  // End the game
  const endGame = useCallback(async (reason = 'completed') => {
    if (!gameRoomId || !isGameJoined) return;

    try {
      console.log('🏁 Ending game with reason:', reason);
      const gameRef = doc(db, MULTIPLAYER_CONFIG.COLLECTIONS.MULTIPLAYER_GAMES, gameRoomId);
      await updateDoc(gameRef, {
        gameState: MULTIPLAYER_CONFIG.GAME_STATES.ENDED,
        gameEndReason: reason
      });

      setGameState(MULTIPLAYER_CONFIG.GAME_STATES.ENDED);
      console.log('✅ Game ended successfully');
    } catch (error) {
      console.error('Error ending game:', error);
      
      // Even if we can't update the server, update local state
      setGameState(MULTIPLAYER_CONFIG.GAME_STATES.ENDED);
      
      // Handle specific error types
      if (error.code === 'permission-denied') {
        console.warn('Permission denied when ending game - game may have already ended');
      } else if (error.code === 'unavailable') {
        console.warn('Service unavailable when ending game - local state updated');
      } else if (error.code === 'network-request-failed') {
        console.warn('Network error when ending game - local state updated');
      }
    }
  }, [gameRoomId, isGameJoined]);

  // Exit the game (leave the room)
  const exitGame = useCallback(async () => {
    if (!gameRoomId) return;

    try {
      console.log('🚪 Exiting multiplayer game...');
      
      // End the game if we're leaving
      await endGame('player_exit');
      
      // Clear local state
      setGameRoomId(null);
      setGameRoomData(null);
      setIsGameCreator(false);
      setIsGameJoined(false);
      setOpponentProgress(0);
      setOpponentHearts(MULTIPLAYER_CONFIG.HEARTS_COUNT);
      setGameState(MULTIPLAYER_CONFIG.GAME_STATES.WAITING);
      setGameStartTime(null);
      setGameEndTime(null);
      setIsMultiplayerMode(false);
      
      console.log('✅ Successfully exited multiplayer game');
    } catch (error) {
      console.error('Error exiting game:', error);
      
      // Even if there's an error, clear local state
      setGameRoomId(null);
      setGameRoomData(null);
      setIsGameCreator(false);
      setIsGameJoined(false);
      setOpponentProgress(0);
      setOpponentHearts(MULTIPLAYER_CONFIG.HEARTS_COUNT);
      setGameState(MULTIPLAYER_CONFIG.GAME_STATES.WAITING);
      setGameStartTime(null);
      setGameEndTime(null);
      setIsMultiplayerMode(false);
      
      console.log('⚠️ Exited game with errors, but local state cleared');
    }
  }, [gameRoomId, endGame]);

  // Listen to game state changes
  useEffect(() => {
    if (!gameRoomId || !isGameJoined) return;

    console.log('👂 Setting up real-time listener for game room:', gameRoomId);
    const gameRef = doc(db, MULTIPLAYER_CONFIG.COLLECTIONS.MULTIPLAYER_GAMES, gameRoomId);
    
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log('📡 Real-time update received:', data);
        
        setGameRoomData(data);
        // Only update game state if it has actually changed
        setGameState(prevGameState => {
          if (prevGameState !== data.gameState) {
            console.log('🕐 MultiplayerContext: Updated game state to:', data.gameState);
            return data.gameState;
          }
          return prevGameState;
        });
        
        if (data.gameStartTime) {
          // Convert Firestore timestamp to Date object
          const startTime = data.gameStartTime.toDate ? data.gameStartTime.toDate() : data.gameStartTime;
          // Only update if the time has actually changed to avoid unnecessary timer restarts
          setGameStartTime(prevStartTime => {
            if (!prevStartTime || prevStartTime.getTime() !== startTime.getTime()) {
              console.log('🕐 MultiplayerContext: Setting gameStartTime:', startTime);
              return startTime;
            }
            return prevStartTime;
          });
        }
        if (data.gameEndTime) {
          // Convert Firestore timestamp to Date object
          const endTime = data.gameEndTime.toDate ? data.gameEndTime.toDate() : data.gameEndTime;
          // Only update if the time has actually changed to avoid unnecessary timer restarts
          setGameEndTime(prevEndTime => {
            if (!prevEndTime || prevEndTime.getTime() !== endTime.getTime()) {
              console.log('🕐 MultiplayerContext: Setting gameEndTime:', endTime);
              return endTime;
            }
            return prevEndTime;
          });
        }

        // Update opponent data
        const opponentField = isGameCreator ? 'challenger' : 'creator';
        if (data[opponentField] && data[opponentField] !== null) {
          const newProgress = data[opponentField].progress || 0;
          const newHearts = data[opponentField].heartsLeft || MULTIPLAYER_CONFIG.HEARTS_COUNT;
          
          if (newProgress !== opponentProgress) {
            console.log(`📊 Opponent progress updated: ${newProgress}%`);
            setOpponentProgress(newProgress);
          }
          
          if (newHearts !== opponentHearts) {
            console.log(`💔 Opponent hearts updated: ${newHearts}`);
            setOpponentHearts(newHearts);
          }
        }
      }
    });

    return () => {
      console.log('🔇 Unsubscribing from real-time listener');
      unsubscribe();
    };
  }, [gameRoomId, isGameJoined, isGameCreator, opponentProgress, opponentHearts]);

  // Check if game has ended due to timeout
  useEffect(() => {
    if (!gameEndTime || gameState !== MULTIPLAYER_CONFIG.GAME_STATES.STARTED) return;

    console.log('⏰ Setting up timeout checker for game end time:', gameEndTime);
    
    const checkTimeout = () => {
      const now = new Date();
      if (now >= gameEndTime) {
        console.log('⏰ Game timeout reached, ending game');
        endGame('timeout');
      }
    };

    const interval = setInterval(checkTimeout, 1000);
    return () => {
      console.log('🔇 Clearing timeout checker');
      clearInterval(interval);
    };
  }, [gameEndTime, gameState, endGame]);

  const contextValue = {
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

    // Actions
    setIsMultiplayerMode,
    createGameRoom,
    joinGameRoom,
    updatePlayerProgress,
    endGame,
    exitGame,
    generateRoomCode
  };

  return (
    <MultiplayerContext.Provider value={contextValue}>
      {children}
    </MultiplayerContext.Provider>
  );
};
