import React, { useState, useEffect, useRef, Component } from 'react';
import { Routes, Route, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
 * Main Menu Component - Route: /
 */
function MainMenu() {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  
  // Game mode manager - persists across mode changes
  const gameModeManager = useRef(new GameModeManager());
  
  useEffect(() => {
    console.log('🏠 Main menu loaded');
    // Initialize Google Analytics
    initGA();
    trackPageView('Sudoku Game - Main Menu');
    
    // Switch to menu mode
    gameModeManager.current.switchToMenu();
  }, []);
  
  const handleModeSelect = (mode) => {
    console.log(`🔄 Navigating to ${mode} mode`);
    
    if (mode === 'singleplayer') {
      navigate('/s');
    } else if (mode === 'multiplayer') {
      navigate('/m');
    }
  };
  
  return (
    <div className="app-container">
      <GameMenu 
        onModeSelect={handleModeSelect}
        onShowSettings={() => setShowSettings(true)}
      />
      
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
  );
}

/**
 * Singleplayer Game Component - Route: /s
 */
function SingleplayerGameRoute() {
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);
  const [showContinueOptions, setShowContinueOptions] = useState(false);
  const gameModeManager = useRef(new GameModeManager());
  
  useEffect(() => {
    const initializeSingleplayer = async () => {
      try {
        console.log('🎯 Singleplayer route loaded');
        trackPageView('Sudoku Game - Singleplayer');
        
        // Switch to singleplayer mode
        gameModeManager.current.switchToSingleplayer();
        const singleplayerManager = gameModeManager.current.singleplayerManager;
        
        // Check for saved game
        if (singleplayerManager.hasSavedGame()) {
          console.log('💾 Found saved singleplayer game');
          setShowContinueOptions(true);
        }
        
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize singleplayer route:', error);
        setIsInitializing(false);
      }
    };
    
    initializeSingleplayer();
  }, []);
  
  const handleModeChange = (newMode) => {
    console.log(`🔄 Mode change requested: ${newMode}`);
    
    if (newMode === 'menu') {
      navigate('/');
    } else if (newMode === 'multiplayer') {
      navigate('/m');
    }
  };
  
  const handleContinueDecision = (shouldContinue) => {
    setShowContinueOptions(false);
    // The SingleplayerGame component will handle the actual continue/new game logic
  };
  
  if (isInitializing) {
    return (
      <div className="app-container">
        <LoadingScreen message="Loading singleplayer..." showProgress={false} />
      </div>
    );
  }
  
  return (
    <div className="app-container">
      <SingleplayerGame 
        manager={gameModeManager.current.singleplayerManager}
        onModeChange={handleModeChange}
        onShowMenu={() => navigate('/')}
        initialShowContinue={showContinueOptions}
      />
    </div>
  );
}

/**
 * Multiplayer Game Component - Route: /m and /m?r=ROOM_ID
 */
function MultiplayerGameRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isInitializing, setIsInitializing] = useState(true);
  const gameModeManager = useRef(new GameModeManager());
  
  useEffect(() => {
    const initializeMultiplayer = async () => {
      try {
        console.log('🎮 Multiplayer route loaded');
        trackPageView('Sudoku Game - Multiplayer');
        
        // Switch to multiplayer mode
        gameModeManager.current.switchToMultiplayer();
        const multiplayerManager = gameModeManager.current.multiplayerManager;
        
        // Check for room parameter in URL
        const roomId = searchParams.get('r');
        
        if (roomId) {
          console.log('🔗 Found room ID in URL:', roomId);
          // Redirect to clean URL with room parameter for better UX
          if (location.search !== `?r=${roomId}`) {
            navigate(`/m?r=${roomId}`, { replace: true });
            return;
          }
        } else {
          // Check for active multiplayer session, but don't auto-redirect
          // Let the MultiplayerGame component handle session validation
          console.log('🎮 No room ID in URL, will show multiplayer options');
        }
        
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize multiplayer route:', error);
        setIsInitializing(false);
      }
    };
    
    initializeMultiplayer();
  }, [location.search, navigate, searchParams]);
  
  const handleModeChange = (newMode) => {
    console.log(`🔄 Mode change requested: ${newMode}`);
    
    if (newMode === 'menu') {
      navigate('/');
    } else if (newMode === 'singleplayer') {
      navigate('/s');
    }
  };
  
  if (isInitializing) {
    return (
      <div className="app-container">
        <LoadingScreen message="Loading multiplayer..." showProgress={false} />
      </div>
    );
  }
  
  return (
    <div className="app-container">
      <MultiplayerGame 
        manager={gameModeManager.current.multiplayerManager}
        onModeChange={handleModeChange}
        onShowMenu={() => navigate('/')}
      />
    </div>
  );
}

/**
 * Main App Component with Routing
 */
function App() {
  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 App cleanup');
    };
  }, []);
  
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/s" element={<SingleplayerGameRoute />} />
        <Route path="/m" element={<MultiplayerGameRoute />} />
        {/* Catch all route - redirect to main menu */}
        <Route path="*" element={<MainMenu />} />
      </Routes>
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