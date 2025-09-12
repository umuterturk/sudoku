// Service Worker for Sudoku Game with Persistent Cache Support
const CACHE_NAME = 'sudoku-game-v4'; // Updated version to fix cache invalidation
const APP_VERSION = '1.0.0'; // App version for cache busting
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
  console.log('🔧 Service Worker installing...', APP_VERSION);
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

// Improved fetch handler with better error handling and cache invalidation
async function handleFetchWithFallback(request) {
  try {
    // For asset files (JS, CSS), always try network first to get latest version
    const isAssetFile = request.url.includes('/assets/') && 
                       (request.url.endsWith('.js') || request.url.endsWith('.css'));
    
    if (isAssetFile) {
      console.log('🔄 Asset file detected, checking network first:', request.url);
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          // Cache the fresh asset
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone()).catch((cacheError) => {
            console.warn('⚠️ Asset cache put failed:', request.url, cacheError);
          });
          console.log('✅ Fresh asset loaded from network:', request.url);
          return networkResponse;
        }
      } catch (networkError) {
        console.warn('⚠️ Network fetch failed for asset, trying cache:', request.url, networkError);
      }
    }

    // Try to get from cache first (for non-asset files or when network fails)
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
