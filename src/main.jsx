import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Hide static loading screen when React is ready
const hideStaticLoader = () => {
  console.log('⚛️ React loaded - hiding static loading screen');
  document.body.classList.add('react-loaded');
  const staticLoader = document.getElementById('static-loader');
  if (staticLoader) {
    // Add fade out animation
    staticLoader.style.transition = 'opacity 0.3s ease-out';
    staticLoader.style.opacity = '0';
    setTimeout(() => {
      staticLoader.remove();
      console.log('✨ Static loading screen removed');
    }, 300);
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/sudoku">
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// Hide static loader after React renders
setTimeout(hideStaticLoader, 100);

// Register service worker for production caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sudoku/sw.js')
      .then((registration) => {
        console.log('🎯 Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error);
      });
  });
}
