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
      }
    }
  ],
  base: '/sudoku/',
  server: {
    port: 3000,
    open: true,
    // Ensure proper MIME types for manifest files
    headers: {
      'Cache-Control': 'no-cache'
    }
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
