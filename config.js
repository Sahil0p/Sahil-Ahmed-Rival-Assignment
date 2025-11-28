const CONFIG = {
    // Performance thresholds (ms)
    RESPONSE_TIME_THRESHOLDS: {
      MEDIUM: 500,
      HIGH: 1000,
      CRITICAL: 2000
    },
  
    // Error rate thresholds (%)
    ERROR_RATE_THRESHOLDS: {
      MEDIUM: 5,
      HIGH: 10,
      CRITICAL: 15
    },
  
    // Cost constants (Option A)
    COST_CONSTANTS: {
      PER_REQUEST: 0.0001,
      PER_MS_EXECUTION: 0.000002,
      MEMORY_TIERS: [
        { maxKB: 1, cost: 0.00001 },
        { maxKB: 10, cost: 0.00005 },
        { maxKB: Infinity, cost: 0.0001 }
      ]
    },
  
    // Caching criteria (Option D) - DEMO FRIENDLY
    CACHING_CRITERIA: {
      MIN_REQUESTS: 2,           // ← CHANGED: Works with your 15-log sample
      MIN_GET_RATIO: 0.5,        // ← CHANGED: 50% GET requests (vs 80%)
      MAX_ERROR_RATE: 0.25,      // ← CHANGED: 25% error tolerance (vs 2%)
      DEFAULT_TTL_MINUTES: 15
    },
  
    // Error status codes (>= 400)
    ERROR_STATUS_MIN: 400,
  
    // Top users count
    TOP_USERS_COUNT: 5
  };
  
  module.exports = CONFIG;
  