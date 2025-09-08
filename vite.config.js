import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to handle manifest file properly
    {
      name: 'manifest-handler',
      configureServer(server) {
        server.middlewares.use('/sudoku/manifest.webmanifest', (req, res, next) => {
          res.setHeader('Content-Type', 'application/manifest+json');
          next();
        });
        
        // Handle trailing slash redirect for /sudoku -> /sudoku/
        server.middlewares.use('/sudoku', (req, res, next) => {
          if (req.url === '/sudoku' || req.url === '/sudoku?') {
            // Redirect to /sudoku/ with any query parameters preserved
            const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
            const redirectUrl = queryString ? `/sudoku/?${queryString}` : '/sudoku/';
            
            res.writeHead(301, { Location: redirectUrl });
            res.end();
            return;
          }
          next();
        });
      }
    }
  ],
  base: '/sudoku/',
  server: {
    port: 3000,
    open: true,
    // Ensure proper MIME types and CORS headers for development
    headers: {
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    // Handle CORS properly for Firebase connections
    cors: {
      origin: ['http://localhost:3000', 'https://umuterturk.github.io'],
      credentials: true
    },
    // Handle client-side routing
    historyApiFallback: true
  },
  // GitHub Pages compatibility
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Production optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      }
    },
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: {
          // Vendor chunk for React and related libraries
          vendor: ['react', 'react-dom'],
          // Material-UI chunk
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          // Game data chunk (puzzle databases)
          gamedata: [
            './src/game_database/easy.js',
            './src/game_database/medium.js', 
            './src/game_database/hard.js',
            './src/game_database/expert.js'
          ]
        },
        // Optimize chunk file names for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Increase chunk size warning limit (puzzle databases are large)
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    // Optimize assets
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react', 
      'react-dom',
      '@mui/material',
      '@mui/icons-material'
    ]
  }
})
