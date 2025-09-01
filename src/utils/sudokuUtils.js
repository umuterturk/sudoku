// Sudoku utility functions

// Cache for loaded puzzle databases to avoid re-importing
const puzzleCache = new Map();

// Dynamically load puzzle database for a specific difficulty
const loadPuzzleDatabase = async (difficulty) => {
  // Check if already cached
  if (puzzleCache.has(difficulty)) {
    return puzzleCache.get(difficulty);
  }

  try {
    let module;
    switch (difficulty) {
      case 'easy':
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
    puzzleCache.set(difficulty, puzzles);
    return puzzles;
  } catch (error) {
    console.error(`Failed to load ${difficulty} puzzles:`, error);
    // Fallback to medium if available, otherwise return empty array
    if (difficulty !== 'medium' && puzzleCache.has('medium')) {
      return puzzleCache.get('medium');
    }
    return [];
  }
};

// Preload puzzle databases for better performance (optional)
export const preloadPuzzleDatabase = async (difficulty) => {
  try {
    await loadPuzzleDatabase(difficulty);
    console.log(`Preloaded ${difficulty} puzzle database`);
  } catch (error) {
    console.warn(`Failed to preload ${difficulty} puzzles:`, error);
  }
};

// Preload multiple difficulties
export const preloadPuzzleDatabases = async (difficulties = ['medium']) => {
  const promises = difficulties.map(diff => preloadPuzzleDatabase(diff));
  await Promise.all(promises);
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
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValidMove(grid, row, col, num)) {
            grid[row][col] = num;
            
            if (solveSudoku(grid)) {
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
  
  // Fill the grid using backtracking with randomization
  const fillGrid = (grid) => {
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
              
              if (fillGrid(grid)) {
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
    const puzzleString = puzzleDatabase[randomIndex];
    
    // Debug: Log which difficulty and puzzle we're using
    const clueCount = puzzleString.split('').filter(char => char !== '0').length;
    console.log(`Generated ${difficulty} puzzle with ${clueCount} clues from database of ${puzzleDatabase.length} puzzles`);
    
    // Convert the puzzle string to a 9x9 grid
    const puzzle = stringToGrid(puzzleString);
    
    // Generate the solution by solving the puzzle
    const solution = puzzle.map(row => [...row]); // Create a copy
    solveSudoku(solution);
    
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
  try {
    const records = localStorage.getItem(RECORDS_STORAGE_KEY);
    return records ? JSON.parse(records) : {
      easy: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null },
      medium: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null },
      hard: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null },
      expert: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null }
    };
  } catch (error) {
    console.error('Failed to load records:', error);
    return {
      easy: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null },
      medium: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null },
      hard: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null },
      expert: { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null }
    };
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
  return records[difficulty] || { bestTime: null, totalGames: 0, totalTime: 0, averageTime: null };
};
