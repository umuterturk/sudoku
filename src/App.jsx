import React, { useState, useEffect, useRef, Component } from 'react';
import { GameModeManager } from './managers/GameModeManager.js';

// Components
import GameMenu from './components/GameMenu.jsx';
import SingleplayerGame from './components/singleplayer/SingleplayerGame.jsx';
import MultiplayerGame from './components/multiplayer/MultiplayerGame.jsx';
import LoadingScreen from './components/shared/LoadingScreen.jsx';

// Utilities
import { initGA, trackPageView } from './utils/shared/analytics.js';

import './App.css';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Clear corrupted localStorage
    try {
      localStorage.removeItem('sudoku-game-state');
    } catch (e) {
      console.error('Failed to clear localStorage in error boundary:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ color: '#e53e3e', marginBottom: '20px' }}>
            Oops! Something went wrong
          </h2>
          <p style={{ color: '#4a5568', marginBottom: '30px', maxWidth: '500px' }}>
            The game encountered an unexpected error. Don't worry, your progress has been saved and the game will restart fresh.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              backgroundColor: '#4299e1',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Restart Game
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Main App Component - Simplified with new architecture
 * Handles mode switching and provides a unified interface
 */
function App() {
  const [gameMode, setGameMode] = useState('menu'); // menu, singleplayer, multiplayer
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Game mode manager - persists across mode changes
  const gameModeManager = useRef(new GameModeManager());
  
  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Sudoku app initializing...');
        
        // Initialize Google Analytics
        initGA();
        trackPageView('Sudoku Game - Home');
        
        // Check URL for room parameter (multiplayer)
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        
        if (roomId) {
          console.log('🎮 Found room parameter, switching to multiplayer mode');
          gameModeManager.current.switchToMultiplayer();
          setGameMode('multiplayer');
        } else {
          // Check for saved singleplayer game
          const singleplayerManager = gameModeManager.current.singleplayerManager;
          if (singleplayerManager.hasSavedGame()) {
            console.log('🎯 Found saved game, switching to singleplayer mode');
            gameModeManager.current.switchToSingleplayer();
            setGameMode('singleplayer');
          } else {
            console.log('🏠 No saved game or room, showing menu');
            gameModeManager.current.switchToMenu();
            setGameMode('menu');
          }
        }
        
        setIsInitializing(false);
        console.log('📱 App ready');
        
      } catch (error) {
        console.error('App initialization failed:', error);
        gameModeManager.current.switchToMenu();
        setGameMode('menu');
        setIsInitializing(false);
      }
    };
    
    initializeApp();
  }, []);
  
  // Handle mode changes
  const handleModeChange = (newMode) => {
    console.log(`🔄 Switching from ${gameMode} to ${newMode}`);
    
    // Switch game mode manager before updating state
    switch (newMode) {
      case 'singleplayer':
        gameModeManager.current.switchToSingleplayer();
        break;
      case 'multiplayer':
        gameModeManager.current.switchToMultiplayer();
        break;
      case 'menu':
        gameModeManager.current.switchToMenu();
        break;
    }
    
    setGameMode(newMode);
    
    // Update URL if needed
    if (newMode === 'menu') {
      // Clear any URL parameters when going to menu
      const url = new URL(window.location);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    }
  };
  
  // Handle settings
  const handleShowSettings = () => {
    setShowSettings(true);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameModeManager.current) {
        gameModeManager.current.cleanup();
      }
    };
  }, []);
  
  // Render appropriate component based on current mode
  const renderGameMode = () => {
    if (isInitializing) {
      return <LoadingScreen message="Loading Sudoku..." showProgress={false} />;
    }
    
    switch (gameMode) {
      case 'singleplayer':
        return (
          <SingleplayerGame 
            manager={gameModeManager.current.singleplayerManager}
            onModeChange={handleModeChange}
            onShowMenu={() => handleModeChange('menu')}
          />
        );
        
      case 'multiplayer':
        return (
          <MultiplayerGame 
            manager={gameModeManager.current.multiplayerManager}
            onModeChange={handleModeChange}
            onShowMenu={() => handleModeChange('menu')}
          />
        );
        
      case 'menu':
      default:
        return (
          <GameMenu 
            onModeSelect={handleModeChange}
            onShowSettings={handleShowSettings}
          />
        );
    }
  };
  
  return (
    <ErrorBoundary>
      <div className="app-container">
        {renderGameMode()}
        
        {/* Settings modal placeholder */}
        {showSettings && (
          <div className="settings-modal">
            <div className="settings-content">
              <h2>Settings</h2>
              <p>Settings panel coming soon...</p>
              <button onClick={() => setShowSettings(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

// Wrap App with ErrorBoundary for robust error handling
const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;