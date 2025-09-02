// Service Worker for Sudoku Game with Persistent Cache Support
const CACHE_NAME = 'sudoku-game-v3'; // Updated version to fix fetch errors
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

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Cache installation failed:', error);
      })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Fetch event - serve from cache with better error handling
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and non-http(s) requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Skip requests to other origins (like APIs, CDNs, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    handleFetchWithFallback(event.request)
  );
});

// Improved fetch handler with better error handling
async function handleFetchWithFallback(request) {
  try {
    // Try to get from cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📱 Serving from cache:', request.url);
      return cachedResponse;
    }

    // If not in cache, fetch from network
    console.log('🌐 Fetching from network:', request.url);
    const networkResponse = await fetch(request);

    // Check if we received a valid response
    if (!networkResponse || networkResponse.status !== 200) {
      console.warn('⚠️ Invalid network response:', request.url, networkResponse?.status);
      return networkResponse;
    }

    // Only cache successful responses from same origin
    if (networkResponse.type === 'basic' || networkResponse.type === 'cors') {
      try {
        const cache = await caches.open(CACHE_NAME);
        // Clone the response before caching (don't await to avoid blocking)
        cache.put(request, networkResponse.clone()).catch((cacheError) => {
          console.warn('⚠️ Cache put failed:', request.url, cacheError);
        });
      } catch (cacheError) {
        console.warn('⚠️ Cache open failed:', cacheError);
      }
    }

    return networkResponse;

  } catch (error) {
    console.error('❌ Fetch failed:', request.url, error);
    
    // For navigation requests, try to serve the cached index.html as fallback
    if (request.destination === 'document' || request.mode === 'navigate') {
      try {
        const fallback = await caches.match('/sudoku/index.html');
        if (fallback) {
          console.log('🏠 Serving fallback index.html for:', request.url);
          return fallback;
        }
      } catch (fallbackError) {
        console.error('❌ Fallback failed:', fallbackError);
      }
    }
    
    // For other resources, return a basic error response
    return new Response('Service Worker Error: Resource unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

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
