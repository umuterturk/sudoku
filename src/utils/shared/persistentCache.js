// Persistent cache utilities using IndexedDB for offline flight mode
// This provides persistent storage that survives browser restarts and offline periods

const DB_NAME = 'SudokuFlightModeCache';
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

  // Check if flight mode cache is valid and available
  async isFlightModeCacheValid() {
    try {
      await this.init();
      
      const transaction = this.db.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      
      return new Promise((resolve) => {
        const request = store.get('flight-mode-timestamp');
        
        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(false);
            return;
          }

          const cacheTime = result.value;
          const now = Date.now();
          const isValid = (now - cacheTime) < CACHE_VALIDITY_PERIOD;
          
          console.log(`✈️ Flight mode cache validity check: ${isValid ? 'VALID' : 'EXPIRED'}`);
          resolve(isValid);
        };

        request.onerror = () => {
          console.warn('Failed to check cache validity');
          resolve(false);
        };
      });
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
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

  // Mark flight mode as enabled with timestamp
  async enableFlightMode() {
    try {
      await this.init();
      
      const transaction = this.db.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      
      const metadata = {
        key: 'flight-mode-timestamp',
        value: Date.now()
      };

      return new Promise((resolve, reject) => {
        const request = store.put(metadata);
        
        request.onsuccess = () => {
          console.log('✈️ Flight mode enabled in persistent storage');
          // Also update localStorage for backward compatibility
          localStorage.setItem('sudoku-flight-mode', 'enabled');
          localStorage.setItem('sudoku-flight-mode-timestamp', metadata.value.toString());
          resolve();
        };

        request.onerror = () => {
          console.error('Failed to enable flight mode:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error enabling flight mode:', error);
      throw error;
    }
  }

  // Disable flight mode and clear cache
  async disableFlightMode() {
    try {
      await this.init();
      
      // Clear all data
      const transaction = this.db.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
      const puzzleStore = transaction.objectStore(STORE_NAME);
      const metadataStore = transaction.objectStore(METADATA_STORE);
      
      await Promise.all([
        new Promise((resolve) => {
          const clearPuzzles = puzzleStore.clear();
          clearPuzzles.onsuccess = resolve;
        }),
        new Promise((resolve) => {
          const clearMetadata = metadataStore.clear();
          clearMetadata.onsuccess = resolve;
        })
      ]);

      // Clear localStorage as well
      localStorage.removeItem('sudoku-flight-mode');
      localStorage.removeItem('sudoku-flight-mode-timestamp');
      
      console.log('🛬 Flight mode disabled and cache cleared');
    } catch (error) {
      console.error('Error disabling flight mode:', error);
      throw error;
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

      const timestamp = await new Promise((resolve) => {
        const request = metadataStore.get('flight-mode-timestamp');
        request.onsuccess = () => resolve(request.result?.value || null);
      });

      return {
        difficultiesCached: puzzleCount,
        cacheTimestamp: timestamp,
        isValid: timestamp ? (Date.now() - timestamp) < CACHE_VALIDITY_PERIOD : false,
        cacheAge: timestamp ? Date.now() - timestamp : null
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  // Refresh cache if online and cache is older than specified time
  async refreshCacheIfNeeded(maxAge = CACHE_VALIDITY_PERIOD) {
    if (!this.isOnline()) {
      console.log('📵 Offline - skipping cache refresh');
      return false;
    }

    const stats = await this.getCacheStats();
    if (!stats || !stats.cacheTimestamp) {
      console.log('🔄 No cache found - refresh needed');
      return true;
    }

    const shouldRefresh = stats.cacheAge > maxAge;
    console.log(`🔄 Cache refresh check: ${shouldRefresh ? 'NEEDED' : 'NOT NEEDED'} (age: ${Math.round(stats.cacheAge / (60 * 60 * 1000))}h)`);
    
    return shouldRefresh;
  }
}

// Create singleton instance
const persistentCache = new PersistentCache();

export default persistentCache;

// Export utility functions for easy use
export const {
  isFlightModeCacheValid,
  storePuzzles,
  getPuzzles,
  enableFlightMode,
  disableFlightMode,
  isOnline,
  getCacheStats,
  refreshCacheIfNeeded
} = persistentCache;
