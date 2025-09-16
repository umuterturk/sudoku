// Persistent cache utilities using IndexedDB for offline storage
// This provides persistent storage that survives browser restarts and offline periods

const DB_NAME = 'SudokuCache';
const DB_VERSION = 1;
const STORE_NAME = 'puzzles';
const METADATA_STORE = 'metadata';

// Cache validity period (24 hours in milliseconds)
const CACHE_VALIDITY_PERIOD = 24 * 60 * 60 * 1000;

class PersistentCache {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  // Initialize IndexedDB
  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized for persistent cache');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create puzzles store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const puzzleStore = db.createObjectStore(STORE_NAME, { keyPath: 'difficulty' });
          console.log('📦 Created puzzles object store');
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
          console.log('📦 Created metadata object store');
        }
      };
    });

    return this.initPromise;
  }


  // Store puzzle data persistently
  async storePuzzles(difficulty, puzzles) {
    try {
      await this.init();
      
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const puzzleData = {
        difficulty,
        puzzles,
        timestamp: Date.now(),
        count: puzzles.length
      };

      return new Promise((resolve, reject) => {
        const request = store.put(puzzleData);
        
        request.onsuccess = () => {
          console.log(`💾 Stored ${puzzles.length} ${difficulty} puzzles persistently`);
          resolve();
        };

        request.onerror = () => {
          console.error(`Failed to store ${difficulty} puzzles:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error storing puzzles:', error);
      throw error;
    }
  }

  // Retrieve puzzle data from persistent storage
  async getPuzzles(difficulty) {
    try {
      await this.init();
      
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.get(difficulty);
        
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            console.log(`📱 Retrieved ${result.count} ${difficulty} puzzles from persistent cache`);
            resolve(result.puzzles);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error(`Failed to retrieve ${difficulty} puzzles:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error retrieving puzzles:', error);
      return null;
    }
  }



  // Check if we're currently online
  isOnline() {
    return navigator.onLine;
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      await this.init();
      
      const transaction = this.db.transaction([STORE_NAME, METADATA_STORE], 'readonly');
      const puzzleStore = transaction.objectStore(STORE_NAME);
      const metadataStore = transaction.objectStore(METADATA_STORE);
      
      const puzzleCount = await new Promise((resolve) => {
        const request = puzzleStore.count();
        request.onsuccess = () => resolve(request.result);
      });

      return {
        difficultiesCached: puzzleCount
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

}

// Create singleton instance
const persistentCache = new PersistentCache();

export default persistentCache;

// Export utility functions for easy use
export const {
  storePuzzles,
  getPuzzles,
  isOnline,
  getCacheStats
} = persistentCache;
