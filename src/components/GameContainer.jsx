import React from 'react';
import { Menu, PlayArrow } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import SudokuBoard from './SudokuBoard';
import Timer from './Timer';
import ControlPanel from './ControlPanel';
import Hearts from './Hearts';
import { useGameContext } from '../contexts/GameContext';

const GameContainer = ({ 
  // Injected components (dependency injection)
  TimerComponent = Timer,
  ControlPanelComponent = ControlPanel,
  
  // Event handlers
  onCellClick,
  onDigitSelect,
  onHintClick,
  onHintMouseDown,
  onHintMouseUp,
  onHintMouseLeave,
  onNotesToggle,
  onPauseToggle,
  onDrawerOpen,
  
  // Helper functions
  getHintIcon,
  getHintButtonClass,
  formatDifficulty
}) => {
  const {
    grid,
    originalGrid,
    selectedCell,
    selectedNumber,
    hintLevel,
    isAnimating,
    glowingCompletions,
    notes,
    isNotesMode,
    highlightedCells,
    errorCells,
    correctCells,
    solution,
    lives,
    isShaking,
    timer,
    isTimerRunning,
    isPaused,
    gameStatus,
    shareMessage,
    difficulty
  } = useGameContext();

  return (
    <div className="game-container">
      <header className="app-header">
        <div className="header-left">
          <IconButton
            onClick={onDrawerOpen}
            sx={{ 
              color: '#2d3748',
              marginRight: '8px',
              '&:hover': { backgroundColor: 'rgba(45, 55, 72, 0.1)' }
            }}
          >
            <Menu />
          </IconButton>
          <div className="difficulty-display">
            <span className="difficulty-value">
              {formatDifficulty(difficulty)}
            </span>
          </div>
        </div>
        
        <TimerComponent
          timer={timer}
          isTimerRunning={isTimerRunning}
          isPaused={isPaused}
          gameStatus={gameStatus}
          isAnimating={isAnimating}
          onPauseToggle={onPauseToggle}
        />
        <Hearts lives={lives} isShaking={isShaking} />
      </header>

      <main className="game-content">
        <div className={`game-content ${isPaused ? 'game-blurred' : ''}`}>
          <SudokuBoard
            grid={isAnimating && grid ? grid : grid}
            originalGrid={originalGrid}
            selectedCell={selectedCell}
            selectedNumber={selectedNumber}
            onCellClick={onCellClick}
            hintLevel={hintLevel}
            isAnimating={isAnimating}
            shakingCompletions={glowingCompletions}
            notes={notes}
            isNotesMode={isNotesMode}
            highlightedCells={highlightedCells}
            errorCells={errorCells}
            correctCells={correctCells}
            solution={solution}
          />

          <ControlPanelComponent
            selectedCell={selectedCell}
            grid={grid}
            originalGrid={originalGrid}
            hintLevel={hintLevel}
            isAnimating={isAnimating}
            isNotesMode={isNotesMode}
            notes={notes}
            correctCells={correctCells}
            onDigitSelect={onDigitSelect}
            onHintClick={onHintClick}
            onHintMouseDown={onHintMouseDown}
            onHintMouseUp={onHintMouseUp}
            onHintMouseLeave={onHintMouseLeave}
            onNotesToggle={onNotesToggle}
            getHintIcon={getHintIcon}
            getHintButtonClass={getHintButtonClass}
            shareMessage={shareMessage}
          />
        </div>

        {/* Pause Overlay */}
        {isPaused && (
          <div className="pause-overlay">
            <div className="pause-content">
              <h2>Game Paused</h2>
              <p>Click resume to continue playing</p>
              <button 
                className="btn btn-primary resume-button"
                onClick={onPauseToggle}
              >
                <PlayArrow />
                Resume Game
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GameContainer;
