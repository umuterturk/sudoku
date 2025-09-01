# Sudoku Game

A simple and elegant Sudoku game built with vanilla React.

## Features

- **Three difficulty levels**: Easy, Medium, and Hard
- **Interactive grid**: Click to select cells, type numbers to fill them
- **Real-time validation**: Invalid entries are highlighted in red
- **Visual feedback**: Selected cells and related rows/columns/boxes are highlighted
- **Timer**: Track your solving time
- **Game controls**: New game and reset functionality
- **Responsive design**: Works on desktop and mobile devices

## How to Play

1. Fill each row, column, and 3×3 box with digits 1-9
2. Each digit can appear only once in each row, column, and box
3. Click on a cell to select it, then type a number
4. Invalid entries will be highlighted in red
5. Complete the puzzle to win!

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── SudokuCell.jsx    # Individual cell component
│   └── SudokuGrid.jsx    # Grid layout component
├── utils/
│   └── sudokuUtils.js    # Game logic and puzzle generation
├── App.jsx               # Main application component
├── App.css              # Application styles
├── index.css            # Global styles
└── main.jsx             # Application entry point
```

## Technologies Used

- React 18
- Vite (build tool)
- Vanilla CSS (no external UI libraries)

## Game Logic

The game includes:
- Sudoku puzzle generation with randomization
- Backtracking solver algorithm
- Real-time move validation
- Difficulty-based puzzle creation (by removing different numbers of cells)

Enjoy playing Sudoku! 🎮
