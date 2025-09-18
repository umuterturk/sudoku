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
        challenger: {
          heartsLeft: MULTIPLAYER_CONFIG.HEARTS_COUNT,
          lostHeart: false,
          progress: 0
        }
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
      throw error;
    }
  }, [generateRoomCode, generateRevealedCells]);

  // Join an existing game room
  const joinGameRoom = useCallback(async (roomCode) => {
    try {
      const gameRef = doc(db, MULTIPLAYER_CONFIG.COLLECTIONS.MULTIPLAYER_GAMES, roomCode);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        throw new Error('Game room not found');
      }

      const gameData = gameSnap.data();
      
      if (gameData.gameState !== MULTIPLAYER_CONFIG.GAME_STATES.WAITING) {
        throw new Error('Game room is not available');
      }

      // Check if challenger slot is available
      if (gameData.challenger && gameData.challenger.heartsLeft > 0) {
        throw new Error('Game room is full');
      }

      // Update the game with challenger data
      const gameStartTime = new Date();
      const gameEndTime = new Date(gameStartTime.getTime() + MULTIPLAYER_CONFIG.GAME_TIMEOUT_MINUTES * 60 * 1000);

      await updateDoc(gameRef, {
        gameState: MULTIPLAYER_CONFIG.GAME_STATES.STARTED,
        gameStartTime: serverTimestamp(),
        gameEndTime: serverTimestamp(),
        challenger: {
          heartsLeft: MULTIPLAYER_CONFIG.HEARTS_COUNT,
          lostHeart: false,
          progress: 0
        }
      });

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

      return gameData;
    } catch (error) {
      console.error('Error joining game room:', error);
      throw error;
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
    }
  }, [gameRoomId, isGameJoined, isGameCreator]);

  // End the game
  const endGame = useCallback(async (reason = 'completed') => {
    if (!gameRoomId || !isGameJoined) return;

    try {
      const gameRef = doc(db, MULTIPLAYER_CONFIG.COLLECTIONS.MULTIPLAYER_GAMES, gameRoomId);
      await updateDoc(gameRef, {
        gameState: MULTIPLAYER_CONFIG.GAME_STATES.ENDED,
        gameEndReason: reason
      });

      setGameState(MULTIPLAYER_CONFIG.GAME_STATES.ENDED);
    } catch (error) {
      console.error('Error ending game:', error);
    }
  }, [gameRoomId, isGameJoined]);

  // Exit the game (leave the room)
  const exitGame = useCallback(async () => {
    if (!gameRoomId) return;

    try {
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
    } catch (error) {
      console.error('Error exiting game:', error);
    }
  }, [gameRoomId, endGame]);

  // Listen to game state changes
  useEffect(() => {
    if (!gameRoomId || !isGameJoined) return;

    const gameRef = doc(db, MULTIPLAYER_CONFIG.COLLECTIONS.MULTIPLAYER_GAMES, gameRoomId);
    
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGameRoomData(data);
        setGameState(data.gameState);
        
        if (data.gameStartTime) {
          setGameStartTime(data.gameStartTime.toDate());
        }
        if (data.gameEndTime) {
          setGameEndTime(data.gameEndTime.toDate());
        }

        // Update opponent data
        const opponentField = isGameCreator ? 'challenger' : 'creator';
        if (data[opponentField]) {
          setOpponentProgress(data[opponentField].progress || 0);
          setOpponentHearts(data[opponentField].heartsLeft || MULTIPLAYER_CONFIG.HEARTS_COUNT);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [gameRoomId, isGameJoined, isGameCreator]);

  // Check if game has ended due to timeout
  useEffect(() => {
    if (!gameEndTime || gameState !== MULTIPLAYER_CONFIG.GAME_STATES.STARTED) return;

    const checkTimeout = () => {
      const now = new Date();
      if (now >= gameEndTime) {
        endGame('timeout');
      }
    };

    const interval = setInterval(checkTimeout, 1000);
    return () => clearInterval(interval);
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
