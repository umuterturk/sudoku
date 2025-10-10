// Firebase configuration for multiplayer Sudoku
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration using environment variables with dev fallback
// Note: GitHub Actions should have these set via secrets
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.DEV,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.DEV,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.DEV,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.DEV,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.DEV,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.DEV,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || import.meta.env.DEV
};

// Validate configuration
if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  console.error('Firebase configuration is incomplete:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasProjectId: !!firebaseConfig.projectId,
    hasAuthDomain: !!firebaseConfig.authDomain
  });
  throw new Error('Firebase configuration is missing required fields');
}

console.log('🔥 Firebase config loaded:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  isProduction: !import.meta.env.DEV,
  currentUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
  origin: typeof window !== 'undefined' ? window.location.origin : 'unknown'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with proper settings
export const db = getFirestore(app);

// Connect to emulator in development if available
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('🔧 Connected to Firestore emulator');
  } catch (error) {
    console.warn('⚠️ Could not connect to Firestore emulator:', error.message);
  }
}

export default app;

