// Sudoku utility functions
import { puzzles as easyPuzzles } from '../game_database/easy.js';
import { puzzles as mediumPuzzles } from '../game_database/medium.js';
import { puzzles as hardPuzzles } from '../game_database/hard.js';
import { puzzles as expertPuzzles } from '../game_database/expert.js';

// Direct access to puzzle databases (no lazy loading)
const puzzleDatabase = {
  easy: easyPuzzles,
  children: easyPuzzles, // Children mode uses easy puzzles as base
  medium: mediumPuzzles,
  hard: hardPuzzles,
  expert: expertPuzzles
};

// Simple puzzle database loader (synchronous, no caching needed)
export const loadPuzzleDatabase = (difficulty) => {
  const puzzles = puzzleDatabase[difficulty] || puzzleDatabase.medium;
  console.log(`✅ ${difficulty} puzzle database loaded (${puzzles.length} puzzles)`);
  return puzzles;
};

// Get random puzzle grids for animation
export const getRandomAnimationPuzzles = (difficulty, count = 20) => {
  try {
    const puzzles = loadPuzzleDatabase(difficulty);
    
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
        return getRandomAnimationPuzzles('medium', count);
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
export const generatePuzzle = (difficulty = 'medium', isMultiplayer = false) => {
  try {
    // Load the puzzle database for the selected difficulty
    const puzzles = loadPuzzleDatabase(difficulty);
    
    if (!puzzles || puzzles.length === 0) {
      throw new Error(`No puzzles available for difficulty: ${difficulty}`);
    }
    
    // Select a random puzzle from the database
    const randomIndex = Math.floor(Math.random() * puzzles.length);
    const puzzleEntry = puzzles[randomIndex];
    
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
    
    // For easy mode, reveal additional cells to make it more accessible
    if (difficulty === 'easy') {
      const cellCount = isMultiplayer ? 7 : 5;
      puzzle = revealAdditionalCells(puzzle, solution, cellCount, isMultiplayer);
      console.log(`🌟 Easy mode: revealed ${cellCount} additional cells for better accessibility${isMultiplayer ? ' (multiplayer with strategic selection)' : ''}`);
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

// Find cells with the least information (fewest valid possibilities)
const findCellsWithLeastInformation = (puzzle, solution) => {
  console.log('🧠 Finding cells with least information...');
  
  const emptyCells = [];
  
  // First, find all empty cells and calculate their possibilities
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (puzzle[row][col] === 0) {
        const possibilities = [];
        
        // Check each number 1-9 to see if it's valid in this position
        for (let num = 1; num <= 9; num++) {
          if (isValidMove(puzzle, row, col, num)) {
            possibilities.push(num);
          }
        }
        
        emptyCells.push({ 
          row, 
          col, 
          possibilityCount: possibilities.length,
          possibilities 
        });
      }
    }
  }
  
  // Sort cells by number of possibilities (ascending - least information first)
  emptyCells.sort((a, b) => a.possibilityCount - b.possibilityCount);
  
  console.log(`🧠 Found ${emptyCells.length} empty cells, sorted by information content`);
  console.log(`🧠 Cells with least information have ${emptyCells[0]?.possibilityCount || 'N/A'} possibilities`);
  
  return emptyCells;
};

// Reveal additional cells for easy mode
const revealAdditionalCells = (puzzle, solution, count, isMultiplayer = false) => {
  console.log(`🌟 Revealing ${count} additional cells for easy mode${isMultiplayer ? ' (multiplayer)' : ''}...`);
  
  const modifiedPuzzle = puzzle.map(row => [...row]);
  let cellsToSelect;
  
  if (isMultiplayer) {
    // For multiplayer, prioritize cells with least information to make game easier
    console.log('🎮 Multiplayer mode: selecting cells with least information');
    const sortedCells = findCellsWithLeastInformation(puzzle, solution);
    cellsToSelect = sortedCells.slice(0, count);
    
    console.log(`🧠 Selected ${cellsToSelect.length} cells with least information:`);
    cellsToSelect.forEach((cell, index) => {
      console.log(`  ${index + 1}. Cell [${cell.row},${cell.col}] - ${cell.possibilityCount} possibilities: ${cell.possibilities.join(',')}`);
    });
  } else {
    // For single player, use random selection as before
    console.log('👤 Single player mode: selecting random cells');
    const emptyCells = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (puzzle[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }
    
    // Randomly select cells to reveal
    const shuffledEmptyCells = emptyCells.sort(() => Math.random() - 0.5);
    cellsToSelect = shuffledEmptyCells.slice(0, count);
  }
  
  // If we don't have enough empty cells, reveal what we can
  const cellsToReveal = Math.min(count, cellsToSelect.length);
  console.log(`🎯 Found ${cellsToSelect.length} available cells, revealing ${cellsToReveal} of them`);
  
  for (let i = 0; i < cellsToReveal; i++) {
    const { row, col } = cellsToSelect[i];
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
      isPaused: false
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

