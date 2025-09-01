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
