// Rate limiter utility for Firebase/GCP services
class RateLimiter {
  constructor(maxRequests = 100, timeWindow = 60000) { // Default: 100 requests per minute
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
    this.isTestEnvironment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  }

  async throttle() {
    // Always throttle to prevent abuse (removed environment check)

    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
    return true;
  }
}

// Create instances for different services
// Increased Firestore limit to handle multiplayer real-time updates
export const firestoreRateLimiter = new RateLimiter(60, 60000); // 60 requests per minute for Firestore
export const analyticsRateLimiter = new RateLimiter(5, 60000); // 5 requests per minute for Analytics

// Helper function to wrap Firebase operations with rate limiting
export const withRateLimit = async (operation, limiter) => {
  await limiter.throttle();
  return operation();
};
