// Google Analytics utility functions
// This will work in both online and offline modes, but data will only be sent when online
const GA_TRACKING_ID = 'G-NC4FEX4VK5';

// Initialize Google Analytics
export const initGA = () => {
  // Only initialize if we're in the browser
  if (typeof window === 'undefined') return;
  
  try {
    // Add the Google Analytics script tag
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
    document.head.appendChild(script1);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    // Configure Google Analytics with cross-browser compatible settings
    gtag('js', new Date());
    
    // Detect if we're on GitHub Pages and configure accordingly
    const isGitHubPages = window.location.hostname.includes('github.io');
    const domain = isGitHubPages ? window.location.hostname : 'auto';
    
    gtag('config', GA_TRACKING_ID, {
      page_title: 'Sudoku Game',
      page_location: window.location.href,
      send_page_view: true,
      // Firefox-compatible cookie domain configuration
      cookie_domain: domain,
      cookie_expires: 63072000, // 2 years in seconds
      // Use Lax for better Firefox compatibility (fallback to None if needed)
      cookie_flags: window.location.protocol === 'https:' ? 'SameSite=Lax;Secure' : 'SameSite=Lax',
      // Additional security and privacy settings
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    console.log('📊 Google Analytics initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Google Analytics:', error);
  }
};

// Track page views
export const trackPageView = (page_title = 'Sudoku Game') => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  try {
    // Use same domain detection logic as initialization
    const isGitHubPages = window.location.hostname.includes('github.io');
    const domain = isGitHubPages ? window.location.hostname : 'auto';
    
    window.gtag('config', GA_TRACKING_ID, {
      page_title,
      page_location: window.location.href,
      send_page_view: true,
      // Consistent Firefox-compatible cookie domain configuration
      cookie_domain: domain
    });
    console.log('📊 Page view tracked:', page_title);
  } catch (error) {
    console.error('❌ Failed to track page view:', error);
  }
};

// Track custom events
export const trackEvent = (action, parameters = {}) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.log('📊 GA not available, would track:', action, parameters);
    return;
  }
  
  try {
    window.gtag('event', action, {
      event_category: 'sudoku_game',
      ...parameters
    });
    console.log('📊 Event tracked:', action, parameters);
  } catch (error) {
    console.error('❌ Failed to track event:', error);
  }
};

// Track game started event
export const trackGameStarted = (difficulty) => {
  trackEvent('game_started', {
    difficulty: difficulty,
    event_label: `Started ${difficulty} game`,
    value: 1
  });
};

// Track game completed event
export const trackGameCompleted = (difficulty, timeInSeconds, lives) => {
  trackEvent('game_completed', {
    difficulty: difficulty,
    time_seconds: timeInSeconds,
    lives_remaining: lives,
    event_label: `Completed ${difficulty} game in ${timeInSeconds}s`,
    value: 1
  });
};

// Track game over event
export const trackGameOver = (difficulty, timeInSeconds) => {
  trackEvent('game_over', {
    difficulty: difficulty,
    time_seconds: timeInSeconds,
    event_label: `Game over in ${difficulty} after ${timeInSeconds}s`,
    value: 1
  });
};

// Track hint usage
export const trackHintUsed = (hintLevel, difficulty) => {
  trackEvent('hint_used', {
    hint_level: hintLevel,
    difficulty: difficulty,
    event_label: `Used ${hintLevel} hint in ${difficulty} game`,
    value: 1
  });
};

// Track flight mode toggle
export const trackFlightModeToggle = (enabled) => {
  trackEvent('flight_mode_toggle', {
    enabled: enabled,
    event_label: `Flight mode ${enabled ? 'enabled' : 'disabled'}`,
    value: 1
  });
};

export default {
  initGA,
  trackPageView,
  trackEvent,
  trackGameStarted,
  trackGameCompleted,
  trackGameOver,
  trackHintUsed,
  trackFlightModeToggle
};
