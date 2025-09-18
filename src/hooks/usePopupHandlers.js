import { generateShareableUrl } from '../utils/sudokuUtils';

/**
 * Custom hook for managing popup handlers and state
 */
export const usePopupHandlers = (
  grid,
  originalGrid,
  solution,
  difficulty,
  timer,
  lives,
  hintLevel,
  isNotesMode,
  notes,
  gameStatus,
  selectedCell,
  selectedNumber,
  isPaused,
  errorCells,
  setShowDifficultyPopup,
  setShowResetPopup,
  setShowContinuePopup,
  setShowCompletionPopup,
  setIsPaused,
  setIsTimerRunning,
  setShareMessage,
  setCompletionData,
  startNewGame,
  setShowGameModeSelector
) => {

  const handleNewGameClick = () => {
    setShowGameModeSelector(true);
  };

  const handleGameOverNewGame = () => {
    // Clear game over state first, then show game mode selector
    setGameStatus('playing');
    setShowGameModeSelector(true);
  };

  const handleDifficultySelect = (selectedDifficulty) => {
    setShowDifficultyPopup(false);
    startNewGame(selectedDifficulty);
  };

  const handleResetClick = () => {
    setShowResetPopup(true);
  };

  const handleContinueGame = () => {
    setShowContinuePopup(false);
    setIsPaused(false);
    setIsTimerRunning(true);
  };

  const handleContinueNewGame = () => {
    setShowContinuePopup(false);
    setShowGameModeSelector(true);
    // Keep game paused until new game is actually started
    setIsPaused(true);
    setIsTimerRunning(false);
  };

  const handleShareGame = async () => {
    if (!grid || !originalGrid || !solution) {
      console.error('Cannot share: game not properly initialized');
      setShareMessage('❌ Cannot share: game not ready');
      setTimeout(() => setShareMessage(''), 3000);
      return;
    }

    const gameState = {
      grid,
      originalGrid,
      solution,
      difficulty,
      timer,
      lives,
      hintLevel,
      isNotesMode,
      notes,
      gameStatus,
      selectedCell,
      selectedNumber,
      isPaused,
      errorCells,
    };

    const shareableUrl = generateShareableUrl(gameState);
    if (!shareableUrl) {
      console.error('Failed to generate shareable URL');
      setShareMessage('❌ Failed to generate share link');
      setTimeout(() => setShareMessage(''), 3000);
      return;
    }

    try {
      // Always copy to clipboard
      await navigator.clipboard.writeText(shareableUrl);
      setShareMessage('✅ Game link copied to clipboard!');
      setTimeout(() => setShareMessage(''), 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: show the URL in the message
      setShareMessage('⚠️ Copy failed. Share this URL: ' + shareableUrl.substring(0, 50) + '...');
      setTimeout(() => setShareMessage(''), 5000);
    }
  };

  const handleCompletionNewGame = (selectedDifficulty) => {
    setShowCompletionPopup(false);
    if (selectedDifficulty) {
      // Start new game with specific difficulty
      startNewGame(selectedDifficulty);
    } else {
      // Show difficulty popup
      setShowDifficultyPopup(true);
    }
  };

  const handleCompletionShare = () => {
    handleShareGame();
  };

  return {
    handleNewGameClick,
    handleGameOverNewGame,
    handleDifficultySelect,
    handleResetClick,
    handleContinueGame,
    handleContinueNewGame,
    handleShareGame,
    handleCompletionNewGame,
    handleCompletionShare
  };
};
