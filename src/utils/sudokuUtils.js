// Sudoku utility functions
import persistentCache from './persistentCache.js';

// Cache for loaded puzzle databases to avoid re-importing
const puzzleCache = new Map();

// Track loading states to prevent race conditions
const loadingPromises = new Map();

// Cache management constants
const MAX_CACHE_SIZE = 6; // Maximum number of difficulty levels to cache
const CACHE_CLEANUP_THRESHOLD = 5; // Start cleanup when cache reaches this size

// Enhanced puzzle database loader with persistent cache support
export const loadPuzzleDatabase = async (difficulty) => {
  // Check if already cached in memory
  if (puzzleCache.has(difficulty)) {
    console.log(`✅ ${difficulty} puzzle database loaded from memory cache`);
    return puzzleCache.get(difficulty);
  }

  // Check if currently loading (prevent race conditions)
  if (loadingPromises.has(difficulty)) {
    console.log(`⏳ ${difficulty} puzzle database already loading, waiting...`);
    return await loadingPromises.get(difficulty);
  }

  console.log(`🔄 Loading ${difficulty} puzzle database...`);

  // Try to load from persistent cache first (for flight mode)
  try {
    const cachedPuzzles = await persistentCache.getPuzzles(difficulty);
    if (cachedPuzzles && cachedPuzzles.length > 0) {
      console.log(`📱 ${difficulty} puzzles loaded from persistent cache (${cachedPuzzles.length} puzzles)`);
      puzzleCache.set(difficulty, cachedPuzzles);
      return cachedPuzzles;
    }
  } catch (error) {
    console.warn(`Failed to load from persistent cache for ${difficulty}:`, error);
  }

  // Create loading promise
  const loadingPromise = (async () => {
    try {
      let module;
      switch (difficulty) {
        case 'easy':
          module = await import('../game_database/easy.js');
          break;
        case 'children':
          // Children mode uses easy puzzles as base
          module = await import('../game_database/easy.js');
          break;
        case 'medium':
          module = await import('../game_database/medium.js');
          break;
        case 'hard':
          module = await import('../game_database/hard.js');
          break;
        case 'expert':
          module = await import('../game_database/expert.js');
          break;
        default:
          module = await import('../game_database/medium.js');
      }

      const puzzles = module.puzzles;
      
      // Manage cache size to prevent unbounded growth
      if (puzzleCache.size >= CACHE_CLEANUP_THRESHOLD) {
        // Remove least recently used items (simple FIFO for now)
        const keysToDelete = Array.from(puzzleCache.keys()).slice(0, puzzleCache.size - MAX_CACHE_SIZE + 1);
        keysToDelete.forEach(key => puzzleCache.delete(key));
        console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} entries`);
      }
      
      puzzleCache.set(difficulty, puzzles);
      console.log(`✅ ${difficulty} puzzle database loaded successfully (${puzzles.length} puzzles)`);
      
      // Store in persistent cache if flight mode is enabled
      try {
        const isFlightMode = await persistentCache.isFlightModeCacheValid();
        if (isFlightMode) {
          await persistentCache.storePuzzles(difficulty, puzzles);
          console.log(`💾 ${difficulty} puzzles stored in persistent cache for offline use`);
        }
      } catch (error) {
        console.warn(`Failed to store ${difficulty} puzzles in persistent cache:`, error);
      }
      
      return puzzles;
    } catch (error) {
      console.error(`Failed to load ${difficulty} puzzles:`, error);
      // Standardized fallback: try medium, then empty array
      if (difficulty !== 'medium' && puzzleCache.has('medium')) {
        return puzzleCache.get('medium');
      } else if (difficulty !== 'medium') {
        // Try to load medium as fallback
        try {
          return await loadPuzzleDatabase('medium');
        } catch (fallbackError) {
          console.error('Fallback to medium also failed:', fallbackError);
        }
      }
      return [];
    } finally {
      // Clean up loading promise
      loadingPromises.delete(difficulty);
    }
  })();

  // Store the loading promise
  loadingPromises.set(difficulty, loadingPromise);
  
  return await loadingPromise;
};

// Preload puzzle databases for better performance (optional)
export const preloadPuzzleDatabase = async (difficulty, onProgress = null) => {
  try {
    await loadPuzzleDatabase(difficulty);
    console.log(`Preloaded ${difficulty} puzzle database`);
    if (onProgress) onProgress(difficulty, true);
  } catch (error) {
    console.warn(`Failed to preload ${difficulty} puzzles:`, error);
    if (onProgress) onProgress(difficulty, false, error);
  }
};

// Preload multiple difficulties with progress tracking
export const preloadPuzzleDatabases = async (difficulties = ['medium'], onProgress = null) => {
  let completed = 0;
  const total = difficulties.length;
  
  const promises = difficulties.map(async (diff) => {
    try {
      await loadPuzzleDatabase(diff);
      completed++;
      if (onProgress) {
        onProgress({
          difficulty: diff,
          completed,
          total,
          progress: (completed / total) * 100,
          success: true
        });
      }
      console.log(`Preloaded ${diff} puzzle database (${completed}/${total})`);
    } catch (error) {
      completed++;
      if (onProgress) {
        onProgress({
          difficulty: diff,
          completed,
          total,
          progress: (completed / total) * 100,
          success: false,
          error
        });
      }
      console.warn(`Failed to preload ${diff} puzzles:`, error);
    }
  });
  
  await Promise.all(promises);
};

// Flight mode: preload all difficulties for offline play with persistent storage
export const enableFlightMode = async (onProgress = null) => {
  const allDifficulties = ['easy', 'children', 'medium', 'hard', 'expert'];
  console.log('🛩️ Enabling flight mode - preloading all puzzle databases...');
  
  try {
    // Enable persistent cache first
    await persistentCache.enableFlightMode();
    
    // Preload all puzzle databases
    await preloadPuzzleDatabases(allDifficulties, onProgress);
    console.log('✈️ Flight mode enabled! All puzzles cached persistently for offline play.');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to enable flight mode:', error);
    return false;
  }
};

// Check if flight mode is enabled (async to check persistent cache)
export const isFlightModeEnabled = async () => {
  try {
    // Check persistent cache first
    const persistentValid = await persistentCache.isFlightModeCacheValid();
    if (persistentValid) {
      return true;
    }
    
    // Fallback to localStorage for backward compatibility
    const flightMode = localStorage.getItem('sudoku-flight-mode');
    const timestamp = localStorage.getItem('sudoku-flight-mode-timestamp');
    
    if (flightMode === 'enabled' && timestamp) {
      const enabledTime = parseInt(timestamp);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      return (Date.now() - enabledTime) < twentyFourHours;
    }
    
    return false;
  } catch (error) {
    console.warn('Error checking flight mode status:', error);
    return false;
  }
};

// Synchronous version for backward compatibility
export const isFlightModeEnabledSync = () => {
  const flightMode = localStorage.getItem('sudoku-flight-mode');
  const timestamp = localStorage.getItem('sudoku-flight-mode-timestamp');
  
  if (flightMode === 'enabled' && timestamp) {
    const enabledTime = parseInt(timestamp);
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return (Date.now() - enabledTime) < twentyFourHours;
  }
  
  return false;
};

// Disable flight mode and clear persistent cache
export const disableFlightMode = async () => {
  try {
    await persistentCache.disableFlightMode();
    console.log('🛬 Flight mode disabled and persistent cache cleared');
  } catch (error) {
    console.error('Error disabling flight mode:', error);
    // Fallback to localStorage cleanup
    localStorage.removeItem('sudoku-flight-mode');
    localStorage.removeItem('sudoku-flight-mode-timestamp');
    console.log('🛬 Flight mode disabled (localStorage only)');
  }
};

// Auto-refresh flight mode cache if online and cache is stale
export const refreshFlightModeCacheIfNeeded = async (onProgress = null) => {
  try {
    // Check if we need to refresh
    const needsRefresh = await persistentCache.refreshCacheIfNeeded();
    if (!needsRefresh) {
      console.log('✅ Flight mode cache is fresh - no refresh needed');
      return false;
    }

    console.log('🔄 Refreshing flight mode cache...');
    const allDifficulties = ['easy', 'children', 'medium', 'hard', 'expert'];
    
    // Re-enable flight mode (this will update timestamp)
    await persistentCache.enableFlightMode();
    
    // Preload all databases with fresh data
    await preloadPuzzleDatabases(allDifficulties, onProgress);
    
    console.log('✅ Flight mode cache refreshed successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to refresh flight mode cache:', error);
    return false;
  }
};

// Get flight mode cache statistics
export const getFlightModeCacheStats = async () => {
  try {
    return await persistentCache.getCacheStats();
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
};

// Get random puzzle grids for animation using the unified cache system
export const getRandomAnimationPuzzles = async (difficulty, count = 20) => {
  try {
    // Use the main cache system instead of direct imports
    const puzzles = await loadPuzzleDatabase(difficulty);
    
    if (!puzzles || puzzles.length === 0) {
      throw new Error(`No puzzles available for difficulty: ${difficulty}`);
    }
    
    const animationPuzzles = [];
    
    // Get random puzzles for animation
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * puzzles.length);
      const puzzleEntry = puzzles[randomIndex];
      // Extract just the puzzle string from the format [puzzleString, solutionString, rating]
      const puzzleString = puzzleEntry[0];
      const puzzleGrid = stringToGrid(puzzleString);
      animationPuzzles.push(puzzleGrid);
    }
    
    return animationPuzzles;
  } catch (error) {
    console.error('Failed to load animation puzzles:', error);
    // Standardized fallback: try medium difficulty first
    if (difficulty !== 'medium') {
      try {
        return await getRandomAnimationPuzzles('medium', count);
      } catch (fallbackError) {
        console.error('Animation fallback to medium failed:', fallbackError);
      }
    }
    
    // Final fallback to random grids
    return Array(count).fill().map(() => 
      Array(9).fill().map(() => 
        Array(9).fill().map(() => {
          return Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 9) + 1;
        })
      )
    );
  }
};

// Get difficulty rating based on clue count
const getDifficultyRating = (clueCount) => {
  if (clueCount >= 36) return 'Very Easy';
  if (clueCount >= 32) return 'Easy';
  if (clueCount >= 28) return 'Medium';
  if (clueCount >= 24) return 'Hard';
  if (clueCount >= 20) return 'Very Hard';
  return 'Expert';
};

// Check if a number is valid in a specific position
export const isValidMove = (grid, row, col, num) => {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (grid[row][x] === num) {
      return false;
    }
  }

  // Check column
  for (let x = 0; x < 9; x++) {
    if (grid[x][col] === num) {
      return false;
    }
  }

  // Check 3x3 box
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[i + startRow][j + startCol] === num) {
        return false;
      }
    }
  }

  return true;
};

// Solve the Sudoku using backtracking
export const solveSudoku = (grid) => {
  let iterationCount = 0;
  let maxDepth = 0;
  
  const solve = (grid, depth = 0) => {
    iterationCount++;
    maxDepth = Math.max(maxDepth, depth);
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValidMove(grid, row, col, num)) {
              grid[row][col] = num;
              
              if (solve(grid, depth + 1)) {
                return true;
              }
              
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };
  
  const result = solve(grid);
  console.log(`Sudoku solved in ${iterationCount} iterations (max depth: ${maxDepth})`);
  return result;
};

// Convert 81-character puzzle string to 9x9 grid
export const stringToGrid = (puzzleString) => {
  const grid = [];
  for (let i = 0; i < 9; i++) {
    const row = [];
    for (let j = 0; j < 9; j++) {
      const char = puzzleString[i * 9 + j];
      row.push(parseInt(char, 10));
    }
    grid.push(row);
  }
  return grid;
};

// Generate a complete Sudoku grid
export const generateCompleteGrid = () => {
  const grid = Array(9).fill().map(() => Array(9).fill(0));
  let iterationCount = 0;
  let maxDepth = 0;
  
  // Fill the grid using backtracking with randomization
  const fillGrid = (grid, depth = 0) => {
    iterationCount++;
    maxDepth = Math.max(maxDepth, depth);
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
          // Shuffle numbers for randomization
          for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
          }
          
          for (const num of numbers) {
            if (isValidMove(grid, row, col, num)) {
              grid[row][col] = num;
              
              if (fillGrid(grid, depth + 1)) {
                return true;
              }
              
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };
  
  fillGrid(grid);
  console.log(`Complete Sudoku grid generated in ${iterationCount} iterations (max depth: ${maxDepth})`);
  return grid;
};

// Generate a Sudoku puzzle from the database
export const generatePuzzle = async (difficulty = 'medium') => {
  try {
    // Dynamically load the puzzle database for the selected difficulty
    const puzzleDatabase = await loadPuzzleDatabase(difficulty);
    
    if (!puzzleDatabase || puzzleDatabase.length === 0) {
      throw new Error(`No puzzles available for difficulty: ${difficulty}`);
    }
    
    // Select a random puzzle from the database
    const randomIndex = Math.floor(Math.random() * puzzleDatabase.length);
    const puzzleEntry = puzzleDatabase[randomIndex];
    
    // Extract puzzle string, solution string, and rating from the new format
    const [puzzleString, solutionString, rating] = puzzleEntry;
    
    // Convert the puzzle and solution strings to 9x9 grids
    let puzzle = stringToGrid(puzzleString);
    const solution = stringToGrid(solutionString);
    
    // For children mode, invert the puzzle (swap revealed and unrevealed cells)
    if (difficulty === 'children') {
      puzzle = invertPuzzle(puzzle, solution);
      console.log('🎮 Children mode: inverted puzzle to create unique solving experience');
    }
    
    // For easy mode, reveal 5 additional random cells to make it more accessible
    if (difficulty === 'easy') {
      puzzle = revealAdditionalCells(puzzle, solution, 5);
      console.log('🌟 Easy mode: revealed 5 additional cells for better accessibility');
    }
    
    return {
      puzzle,
      solution
    };
  } catch (error) {
    console.error('Error generating puzzle:', error);
    // Fallback: generate a simple puzzle algorithmically
    return generateFallbackPuzzle(difficulty);
  }
};

// Fallback puzzle generation using the original algorithm
const generateFallbackPuzzle = (difficulty = 'medium') => {
  const completeGrid = generateCompleteGrid();
  const puzzle = completeGrid.map(row => [...row]);
  
  // Define difficulty levels (number of cells to remove)
  const difficultyLevels = {
    easy: 40,
    medium: 50,
    hard: 60,
    expert: 65
  };
  
  const cellsToRemove = difficultyLevels[difficulty] || 50;
  
  // Randomly remove numbers
  let removed = 0;
  while (removed < cellsToRemove) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    
    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
      removed++;
    }
  }
  
  return {
    puzzle,
    solution: completeGrid
  };
};

// Check if the current grid is complete and valid
export const isGridComplete = (grid) => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        return false;
      }
    }
  }
  return true;
};

// Check if the current grid state is valid (no conflicts)
export const isGridValid = (grid) => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] !== 0) {
        const num = grid[row][col];
        grid[row][col] = 0; // Temporarily remove to check validity
        const valid = isValidMove(grid, row, col, num);
        grid[row][col] = num; // Restore
        if (!valid) {
          return false;
        }
      }
    }
  }
  return true;
};

// Check if a specific row is complete (all cells filled with valid numbers 1-9)
export const isRowComplete = (grid, rowIndex) => {
  const row = grid[rowIndex];
  const numbers = new Set();
  
  for (let col = 0; col < 9; col++) {
    const num = row[col];
    if (num === 0 || numbers.has(num)) {
      return false;
    }
    numbers.add(num);
  }
  
  return numbers.size === 9;
};

// Check if a specific column is complete (all cells filled with valid numbers 1-9)
export const isColumnComplete = (grid, colIndex) => {
  const numbers = new Set();
  
  for (let row = 0; row < 9; row++) {
    const num = grid[row][colIndex];
    if (num === 0 || numbers.has(num)) {
      return false;
    }
    numbers.add(num);
  }
  
  return numbers.size === 9;
};

// Check if a specific 3x3 box is complete (all cells filled with valid numbers 1-9)
export const isBoxComplete = (grid, boxIndex) => {
  const boxRow = Math.floor(boxIndex / 3) * 3;
  const boxCol = (boxIndex % 3) * 3;
  const numbers = new Set();
  
  for (let row = boxRow; row < boxRow + 3; row++) {
    for (let col = boxCol; col < boxCol + 3; col++) {
      const num = grid[row][col];
      if (num === 0 || numbers.has(num)) {
        return false;
      }
      numbers.add(num);
    }
  }
  
  return numbers.size === 9;
};

// Get the box index for a given row and column
export const getBoxIndex = (row, col) => {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
};

// Fill random 3x3 boxes completely with solution values
export const fillRandomBoxes = (puzzle, solution, numBoxes = 1) => {
  // Create a copy of the puzzle to modify
  const modifiedPuzzle = puzzle.map(row => [...row]);
  
  // Get all possible box indices (0-8)
  const allBoxes = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  
  // Shuffle the array and take the first numBoxes
  for (let i = allBoxes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allBoxes[i], allBoxes[j]] = [allBoxes[j], allBoxes[i]];
  }
  
  const selectedBoxes = allBoxes.slice(0, numBoxes);
  
  console.log(`🎮 Filling ${numBoxes} random boxes: ${selectedBoxes.join(', ')} for children mode`);
  
  // Fill each selected box
  selectedBoxes.forEach(boxIndex => {
    const boxRow = Math.floor(boxIndex / 3) * 3;
    const boxCol = (boxIndex % 3) * 3;
    
    console.log(`📦 Filling box ${boxIndex} (rows ${boxRow}-${boxRow+2}, cols ${boxCol}-${boxCol+2})`);
    
    // Fill the entire 3x3 box with solution values
    for (let row = boxRow; row < boxRow + 3; row++) {
      for (let col = boxCol; col < boxCol + 3; col++) {
        modifiedPuzzle[row][col] = solution[row][col];
      }
    }
  });
  
  return modifiedPuzzle;
};

// Backward compatibility: Fill a single random 3x3 box
export const fillRandomBox = (puzzle, solution) => {
  return fillRandomBoxes(puzzle, solution, 1);
};

// Invert puzzle: swap revealed and unrevealed cells (for children mode)
export const invertPuzzle = (puzzle, solution) => {
  console.log('🔄 Inverting puzzle: swapping revealed and unrevealed cells...');
  
  // Create a copy to modify
  const invertedPuzzle = puzzle.map(row => [...row]);
  
  let originalRevealed = 0;
  let newRevealed = 0;
  
  // Swap revealed and unrevealed cells
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (puzzle[row][col] !== 0) {
        // This cell was originally revealed - make it empty
        invertedPuzzle[row][col] = 0;
        originalRevealed++;
      } else {
        // This cell was originally empty - fill it with solution
        invertedPuzzle[row][col] = solution[row][col];
        newRevealed++;
      }
    }
  }
  
  console.log(`🎮 Puzzle inverted! Original revealed: ${originalRevealed}, New revealed: ${newRevealed}`);
  console.log(`📊 Children mode now has ${newRevealed} clues instead of ${originalRevealed}`);
  
  return invertedPuzzle;
};

// Reveal additional random cells for easy mode
const revealAdditionalCells = (puzzle, solution, count) => {
  console.log(`🌟 Revealing ${count} additional cells for easy mode...`);
  
  const modifiedPuzzle = puzzle.map(row => [...row]);
  
  // Find all empty cells (cells that are 0 in the puzzle)
  const emptyCells = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (puzzle[row][col] === 0) {
        emptyCells.push({ row, col });
      }
    }
  }
  
  // If we don't have enough empty cells, reveal what we can
  const cellsToReveal = Math.min(count, emptyCells.length);
  console.log(`🎯 Found ${emptyCells.length} empty cells, revealing ${cellsToReveal} of them`);
  
  // Randomly select cells to reveal
  const shuffledEmptyCells = emptyCells.sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < cellsToReveal; i++) {
    const { row, col } = shuffledEmptyCells[i];
    modifiedPuzzle[row][col] = solution[row][col];
    console.log(`✨ Revealed cell [${row},${col}] = ${solution[row][col]}`);
  }
  
  console.log(`✅ Successfully revealed ${cellsToReveal} additional cells for easy mode`);
  return modifiedPuzzle;
};

// IDCLIP cheat code: Fill a random 3x3 box (like no-clipping through walls in DOOM)
export const idclipCheat = (currentGrid, solution) => {
  if (!currentGrid || !solution) {
    console.log('❌ IDCLIP: No grid or solution available');
    return currentGrid;
  }
  
  // Find boxes that aren't completely filled yet
  const incompleteBoxes = [];
  for (let boxIndex = 0; boxIndex < 9; boxIndex++) {
    if (!isBoxComplete(currentGrid, boxIndex)) {
      incompleteBoxes.push(boxIndex);
    }
  }
  
  if (incompleteBoxes.length === 0) {
    console.log('🎮 IDCLIP: All boxes are already complete!');
    return currentGrid;
  }
  
  // Choose a random incomplete box
  const randomBoxIndex = incompleteBoxes[Math.floor(Math.random() * incompleteBoxes.length)];
  const boxRow = Math.floor(randomBoxIndex / 3) * 3;
  const boxCol = (randomBoxIndex % 3) * 3;
  
  console.log(`🎮 IDCLIP activated! No-clipping through box ${randomBoxIndex} (rows ${boxRow}-${boxRow+2}, cols ${boxCol}-${boxCol+2})`);
  
  // Create a copy and fill the box
  const modifiedGrid = currentGrid.map(row => [...row]);
  for (let row = boxRow; row < boxRow + 3; row++) {
    for (let col = boxCol; col < boxCol + 3; col++) {
      modifiedGrid[row][col] = solution[row][col];
    }
  }
  
  return modifiedGrid;
};

// Check what sections (rows, columns, boxes) were completed by a move
export const getCompletedSections = (oldGrid, newGrid, row, col) => {
  const completed = {
    rows: [],
    columns: [],
    boxes: []
  };
  
  // Check if the row was just completed
  if (!isRowComplete(oldGrid, row) && isRowComplete(newGrid, row)) {
    completed.rows.push(row);
  }
  
  // Check if the column was just completed
  if (!isColumnComplete(oldGrid, col) && isColumnComplete(newGrid, col)) {
    completed.columns.push(col);
  }
  
  // Check if the 3x3 box was just completed
  const boxIndex = getBoxIndex(row, col);
  if (!isBoxComplete(oldGrid, boxIndex) && isBoxComplete(newGrid, boxIndex)) {
    completed.boxes.push(boxIndex);
  }
  
  return completed;
};

// Convert 9x9 grid to string representation
export const gridToString = (grid) => {
  return grid.flat().join('');
};

// Encode game state to base64 URL-safe string
export const encodeGameState = (gameState) => {
  try {
    // Create a simplified game state object with only essential data
    const simplifiedState = {
      g: gridToString(gameState.grid), // current grid
      o: gridToString(gameState.originalGrid), // original puzzle
      s: gridToString(gameState.solution), // solution
      d: gameState.difficulty, // difficulty
      t: gameState.timer, // timer
      l: gameState.lives, // lives
      h: gameState.hintLevel, // hint level
      m: gameState.moveHistory || [], // move history
    };
    
    // Convert to JSON and then to base64
    const jsonString = JSON.stringify(simplifiedState);
    const base64 = btoa(jsonString);
    
    // Make URL-safe by replacing characters
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('Failed to encode game state:', error);
    return null;
  }
};

// Decode base64 string to game state
export const decodeGameState = (base64String) => {
  try {
    // Restore base64 padding and characters
    let base64 = base64String.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode from base64 to JSON
    const jsonString = atob(base64);
    const simplifiedState = JSON.parse(jsonString);
    
    // Convert back to full game state format
    const gameState = {
      grid: stringToGrid(simplifiedState.g),
      originalGrid: stringToGrid(simplifiedState.o),
      solution: stringToGrid(simplifiedState.s),
      difficulty: simplifiedState.d,
      timer: simplifiedState.t || 0,
      lives: simplifiedState.l !== undefined ? simplifiedState.l : 3,
      hintLevel: simplifiedState.h || 'medium',
      moveHistory: simplifiedState.m || [],
      gameStatus: 'playing',
      selectedCell: null,
      selectedNumber: null,
      isPaused: false,
      lastSaveTime: Date.now()
    };
    
    return gameState;
  } catch (error) {
    console.error('Failed to decode game state:', error);
    return null;
  }
};

// Generate shareable URL with game state
export const generateShareableUrl = (gameState) => {
  const encodedState = encodeGameState(gameState);
  if (!encodedState) return null;
  
  const currentUrl = window.location.origin + window.location.pathname;
  return `${currentUrl}?game=${encodedState}`;
};

// Parse URL parameters to extract game state
export const parseGameFromUrl = () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const gameParam = urlParams.get('game');
    
    if (!gameParam) return null;
    
    return decodeGameState(gameParam);
  } catch (error) {
    console.error('Failed to parse game from URL:', error);
    return null;
  }
};

// Records management functions
const RECORDS_STORAGE_KEY = 'sudoku-records';

// Get all records from localStorage
export const getRecords = () => {
  const defaultRecords = {
    easy: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null },
    children: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null },
    medium: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null },
    hard: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null },
    expert: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null }
  };

  try {
    const records = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (records) {
      const existingRecords = JSON.parse(records);
      // Merge existing records with default structure to ensure all difficulty levels exist
      return {
        ...defaultRecords,
        ...existingRecords
      };
    }
    return defaultRecords;
  } catch (error) {
    console.error('Failed to load records:', error);
    return defaultRecords;
  }
};

// Save records to localStorage
export const saveRecords = (records) => {
  try {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to save records:', error);
  }
};

// Add a completed game to records
export const addGameRecord = (difficulty, completionTime) => {
  const records = getRecords();
  const difficultyRecord = records[difficulty];
  
  // Check if difficulty record exists
  if (!difficultyRecord) {
    console.error(`Invalid difficulty level: ${difficulty}. Available levels: ${Object.keys(records).join(', ')}`);
    return null;
  }
  
  // Update total games and time
  difficultyRecord.totalGames += 1;
  difficultyRecord.totalTime += completionTime;
  
  // Calculate average time
  difficultyRecord.averageTime = Math.round(difficultyRecord.totalTime / difficultyRecord.totalGames);
  
  // Check if it's a new best time
  const isNewRecord = !difficultyRecord.bestTime || completionTime < difficultyRecord.bestTime;
  if (isNewRecord) {
    difficultyRecord.bestTime = completionTime;
  }
  
  // Save updated records
  saveRecords(records);
  
  return {
    isNewRecord,
    bestTime: difficultyRecord.bestTime,
    totalGames: difficultyRecord.totalGames,
    averageTime: difficultyRecord.averageTime
  };
};

// Get records for a specific difficulty
export const getDifficultyRecord = (difficulty) => {
  const records = getRecords();
  const difficultyRecord = records[difficulty];
  
  if (!difficultyRecord) {
    console.error(`Invalid difficulty level: ${difficulty}. Available levels: ${Object.keys(records).join(', ')}`);
    return { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null };
  }
  
  return difficultyRecord;
};

// Find all empty cells that have only one valid possibility
export const findCellsWithOnePossibility = (grid) => {
  console.log('🔍 findCellsWithOnePossibility called with grid:', grid ? 'Grid available' : 'No grid');
  const cellsWithOnePossibility = [];
  let emptyCellsCount = 0;
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      // Skip cells that are already filled
      if (grid[row][col] !== 0) continue;
      
      emptyCellsCount++;
      const possibilities = [];
      
      // Check each number 1-9 to see if it's valid in this position
      for (let num = 1; num <= 9; num++) {
        if (isValidMove(grid, row, col, num)) {
          possibilities.push(num);
        }
      }
      
      console.log(`🔍 Cell (${row}, ${col}) has ${possibilities.length} possibilities:`, possibilities);
      
      // If there's exactly one possibility, add this cell to our list
      if (possibilities.length === 1) {
        cellsWithOnePossibility.push({
          row,
          col,
          number: possibilities[0]
        });
        console.log(`✅ Cell (${row}, ${col}) added with single possibility: ${possibilities[0]}`);
      }
    }
  }
  
  console.log(`🔍 Analyzed ${emptyCellsCount} empty cells, found ${cellsWithOnePossibility.length} with single possibility`);
  return cellsWithOnePossibility;
};

// Cache management functions
export const getCacheStatus = () => {
  return {
    size: puzzleCache.size,
    keys: Array.from(puzzleCache.keys()),
    loadingCount: loadingPromises.size,
    maxSize: MAX_CACHE_SIZE
  };
};

export const clearCache = () => {
  puzzleCache.clear();
  loadingPromises.clear();
  console.log('Puzzle cache cleared');
};

export const clearCacheForDifficulty = (difficulty) => {
  puzzleCache.delete(difficulty);
  loadingPromises.delete(difficulty);
  console.log(`Cache cleared for ${difficulty}`);
};
