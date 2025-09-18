# Sudoku Multiplayer Implementation Guide

## Overview
This guide provides step-by-step implementation for adding multiplayer functionality to the Sudoku game. The implementation will support two modes:
- **Single Player**: Difficulty Levels (existing)
- **Multi Player**: Challenge mode (coop is out of scope)

## Architecture Overview
- **Firestore**: Game state management, minimal data storage
- **Local Storage**: Game board state, player progress
- **Real-time Updates**: Firestore listeners for game state changes
- **Game Logic**: Client-side validation and progress tracking

## Database Schema (Firestore)
```javascript
// Collection: multiplayerGames
{
  gameId: string,           // Unique game identifier
  boardId: string,          // Reference to easy database puzzle
  difficulty: "easy",       // Always "easy" for multiplayer
  revealedCells: number[],  // Array of cell indices (0-80)
  gameCreateTime: timestamp,
  gameStartTime: timestamp, // Set when both players join
  gameEndTime: timestamp,   // gameStartTime + 10 minutes
  gameState: "WAITING" | "STARTED" | "ENDED",
  creator: {
    heartsLeft: number,
    lostHeart: boolean,     // Indicates if user lost heart in last action
    progress: number        // 0-100, percentage of correctly filled cells
  },
  challenger: {
    heartsLeft: number,
    lostHeart: boolean,
    progress: number
  }
}
```

---

## Section 1: Firebase Configuration and Multiplayer Context

### 1.1 Update Firebase Configuration
**File**: `src/config/firebase.prod.js`
- Add Firestore initialization
- Add multiplayer collections configuration

### 1.2 Create Multiplayer Context
**File**: `src/contexts/MultiplayerContext.jsx`
- Create context for multiplayer game state
- Add real-time Firestore listeners
- Manage game room creation/joining logic

### 1.3 Update Game Context
**File**: `src/contexts/GameContext.jsx`
- Add multiplayer mode state
- Add game room ID state
- Add opponent progress state

---

## Section 2: Multiplayer Game Logic Hook

### 2.1 Create Multiplayer Hook
**File**: `src/hooks/useMultiplayerGame.js`
- Game room creation logic
- Game room joining logic
- Real-time progress updates
- Game state synchronization
- Exit game functionality

### 2.2 Update Game State Hook
**File**: `src/hooks/useGameState.js`
- Add multiplayer game state persistence
- Separate single-player and multiplayer localStorage keys
- Handle multiplayer game initialization

---

## Section 3: Multiplayer UI Components

### 3.1 Create Game Mode Selector
**File**: `src/components/GameModeSelector.jsx`
- Single Player vs Multi Player selection
- Integration with existing difficulty popup

### 3.2 Create Room Creation Component
**File**: `src/components/RoomCreationPopup.jsx`
- Create new game room
- Generate room code
- Share room code functionality

### 3.3 Create Room Joining Component
**File**: `src/components/RoomJoiningPopup.jsx`
- Enter room code
- Join existing game room
- Validation and error handling

### 3.4 Create Multiplayer Progress Component
**File**: `src/components/MultiplayerProgress.jsx`
- Progress bars for both players
- Blue for client, orange for opponent
- No names or numbers, just progress bars

---

## Section 4: Update Existing Components

### 4.1 Update GameContainer
**File**: `src/components/GameContainer.jsx`
- Remove difficulty display in multiplayer mode
- Add multiplayer progress component
- Stack progress bars vertically under timer

### 4.2 Update Timer Component
**File**: `src/components/Timer.jsx`
- Add multiplayer timer logic
- Use game start/end times from Firestore
- Handle 10-minute timeout

### 4.3 Update Drawer
**File**: `src/App.jsx` (drawer section)
- Add exit game button for multiplayer
- Handle game exit logic

---

## Section 5: Game Logic Updates

### 5.1 Update Game Logic Hook
**File**: `src/hooks/useGameLogic.js`
- Add multiplayer progress calculation
- Add heart loss tracking
- Add multiplayer game completion logic
- Handle opponent disconnection

### 5.2 Update Game Initialization
**File**: `src/hooks/useGameInitialization.js`
- Add multiplayer game initialization
- Handle revealed cells from Firestore
- Load easy database puzzles for multiplayer

---

## Section 6: Multiplayer Game Flow

### 6.1 Game Creation Flow
- Player selects "Multi Player" mode
- System generates room code
- Creates Firestore document with game state
- Player shares room code
- System waits for second player

### 6.2 Game Joining Flow
- Player enters room code
- System validates room exists and has space
- Adds player to game document
- Starts 5-second countdown
- Sets game start/end times

### 6.3 Game Play Flow
- Both players see same puzzle with revealed cells
- Each player's progress tracked individually
- Real-time updates via Firestore listeners
- Game ends on timeout, completion, or heart loss

---

## Section 7: Data Management

### 7.1 Progress Calculation
- Track correctly filled cells vs initial empty cells
- Update progress percentage (0-100)
- Sync with Firestore on each move

### 7.2 Heart Loss Tracking
- Track when player loses a heart
- Update `lostHeart` flag in Firestore
- Handle game over conditions

### 7.3 Game State Management
- WAITING: Room created, waiting for second player
- STARTED: Both players joined, game in progress
- ENDED: Game completed, timed out, or player exited

---

## Section 8: Error Handling and Edge Cases

### 8.1 Connection Issues
- Handle Firestore connection failures
- Graceful degradation to offline mode
- Reconnection logic

### 8.2 Player Disconnection
- Detect when player leaves
- End game for remaining player
- Clean up Firestore documents

### 8.3 Game State Conflicts
- Handle simultaneous game state updates
- Implement conflict resolution
- Prevent race conditions

---

## Section 9: Testing and Validation

### 9.1 Unit Tests
- Test multiplayer game logic
- Test progress calculation
- Test Firestore operations

### 9.2 Integration Tests
- Test complete multiplayer flow
- Test real-time updates
- Test error scenarios

### 9.3 User Testing
- Test with multiple devices
- Test network conditions
- Test edge cases

---

## Section 10: Performance Optimization

### 10.1 Firestore Optimization
- Minimize read/write operations
- Use efficient queries
- Implement proper indexing

### 10.2 Real-time Updates
- Optimize listener efficiency
- Handle update batching
- Prevent unnecessary re-renders

### 10.3 Local Storage
- Efficient multiplayer state storage
- Separate single/multiplayer data
- Cleanup old game data

---

## Implementation Order

1. **Section 1**: Firebase and Context setup
2. **Section 2**: Core multiplayer logic
3. **Section 3**: UI components
4. **Section 4**: Component updates
5. **Section 5**: Game logic integration
6. **Section 6**: Game flow implementation
7. **Section 7**: Data management
8. **Section 8**: Error handling
9. **Section 9**: Testing
10. **Section 10**: Optimization

Each section should result in a functional, testable feature that can be progressively built upon.
