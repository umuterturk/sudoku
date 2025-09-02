// Service Worker for Sudoku Game with Persistent Cache Support
const CACHE_NAME = 'sudoku-game-v2'; // Updated version for persistent cache support
const urlsToCache = [
  '/sudoku/',
  '/sudoku/index.html',
  '/sudoku/manifest.webmanifest',
  '/sudoku/favicon.svg',
  '/sudoku/og-image.svg',
  '/sudoku/robots.txt',
  '/sudoku/sitemap.xml',
  // Dynamic assets will be cached on-demand
];

// Special handling for IndexedDB persistent cache
const PERSISTENT_CACHE_ORIGINS = [
  self.location.origin
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache with IndexedDB awareness
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('📱 Serving from cache:', event.request.url);
          return response;
        }
        
        console.log('🌐 Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();

          // Cache the response for future use
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch((error) => {
          console.log('❌ Network fetch failed:', event.request.url, error);
          
          // For offline scenarios, try to serve a basic offline page for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/sudoku/index.html');
          }
          
          // For other resources, just fail gracefully
          return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✨ Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
