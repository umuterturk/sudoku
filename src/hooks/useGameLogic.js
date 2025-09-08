import { useCallback, useMemo, useRef } from 'react';
import { SharedGameLogic } from '../managers/SharedGameLogic.js';

/**
 * Game logic hook that wraps SharedGameLogic for React components
 * This ensures both singleplayer and multiplayer use the exact same game logic
 */
export const useGameLogic = (gameState, options = {}) => {
  const {
    isSoundEnabled = true,
    onGameComplete,
    onGameOver,
    onWrongMove,
    onCorrectMove,
    isMultiplayer = false
  } = options;
  
  // Create a single instance of SharedGameLogic per hook
  const sharedGameLogicRef = useRef(null);
  
  if (!sharedGameLogicRef.current) {
    sharedGameLogicRef.current = new SharedGameLogic({
      isSoundEnabled,
      onGameComplete,
      onGameOver,
      onWrongMove,
      onCorrectMove,
      isMultiplayer
    });
  }
  
  // Update options if they change
  sharedGameLogicRef.current.updateOptions({
    isSoundEnabled,
    onGameComplete,
    onGameOver,
    onWrongMove,
    onCorrectMove,
    isMultiplayer
  });
  
  // Handle digit placement in a cell
  const handleDigitPlacement = useCallback(async (digit, customRow = null, customCol = null) => {
    return await sharedGameLogicRef.current.handleDigitPlacement(gameState, digit, customRow, customCol);
  }, [gameState]);
  
  // Handle cell click
  const handleCellClick = useCallback((row, col) => {
    return sharedGameLogicRef.current.handleCellClick(gameState, row, col);
  }, [gameState]);
  
  // Handle undo
  const handleUndo = useCallback(() => {
    return sharedGameLogicRef.current.handleUndo(gameState);
  }, [gameState]);
  
  // Check if a digit has been completed (all 9 instances placed)
  const checkDigitCompletion = useCallback((grid, digit) => {
    return sharedGameLogicRef.current.checkDigitCompletion(grid, digit);
  }, []);
  
  return useMemo(() => ({
    handleDigitPlacement,
    handleCellClick,
    handleUndo,
    checkDigitCompletion
  }), [handleDigitPlacement, handleCellClick, handleUndo, checkDigitCompletion]);
};
