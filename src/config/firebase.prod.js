import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Development Firebase configuration
// This file should only be used in development environment
// DO NOT COMMIT this file - it contains sensitive configuration
export const devFirebaseConfig = {
  apiKey: "AIzaSyB8TxrYh0alzV8uoiaYTQnWFTqypC4SahY",
  authDomain: "sudoku-f2615.firebaseapp.com",
  projectId: "sudoku-f2615",
  storageBucket: "sudoku-f2615.firebasestorage.app",
  messagingSenderId: "1046582433040",
  appId: "1:1046582433040:web:866655fea53a7a49548195",
  measurementId: "G-8X5QDMKREM"
};

// Initialize Firebase
const app = initializeApp(devFirebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Multiplayer configuration constants
export const MULTIPLAYER_CONFIG = {
  GAME_TIMEOUT_MINUTES: 10,
  REVEALED_CELLS_COUNT: 7,
  HEARTS_COUNT: 3,
  ROOM_CODE_LENGTH: 6,
  ROOM_CODE_CHARS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  COLLECTIONS: {
    MULTIPLAYER_GAMES: 'gameRooms'
  },
  GAME_STATES: {
    WAITING: 'WAITING',
    STARTED: 'STARTED',
    ENDED: 'ENDED'
  }
};
