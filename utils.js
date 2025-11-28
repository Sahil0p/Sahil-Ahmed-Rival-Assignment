const CONFIG = require('./config.js');

/**
 * Validate and sanitize a single log entry
 * Returns null if invalid, sanitized log otherwise
 */
function validateLogEntry(log) {
  if (!log || typeof log !== 'object') return null;

  const timestamp = log.timestamp;
  const responseTime = Number(log.response_time_ms);
  const statusCode = Number(log.status_code);
  const requestSize = Number(log.request_size_bytes) || 0;
  const responseSize = Number(log.response_size_bytes) || 0;

  // Validate timestamp
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return null;

  // Sanitize numeric values (non-negative)
  if (isNaN(responseTime) || responseTime < 0) return null;
  if (isNaN(statusCode)) return null;
  if (requestSize < 0 || responseSize < 0) return null;

  return {
    timestamp: date,
    endpoint: String(log.endpoint || 'unknown'),
    method: String(log.method || 'UNKNOWN'),
    response_time_ms: responseTime,
    status_code: statusCode,
    user_id: String(log.user_id || 'anonymous'),
    request_size_bytes: requestSize,
    response_size_bytes: responseSize
  };
}

/**
 * Calculate cost for a single log entry (Option A)
 */
function calculateLogCost(log) {
  const requestCost = CONFIG.COST_CONSTANTS.PER_REQUEST;
  const executionCost = log.response_time_ms * CONFIG.COST_CONSTANTS.PER_MS_EXECUTION;

  // Memory cost based on response_size_bytes
  const kb = log.response_size_bytes / 1024;
  let memoryCost = 0;
  for (const tier of CONFIG.COST_CONSTANTS.MEMORY_TIERS) {
    if (kb <= tier.maxKB) {
      memoryCost = tier.cost;
      break;
    }
  }

  return {
    request_cost: requestCost,
    execution_cost: executionCost,
    memory_cost: memoryCost,
    total_cost: requestCost + executionCost + memoryCost
  };
}

/**
 * Get severity for response time
 */
function getResponseTimeSeverity(avgResponseTime) {
  if (avgResponseTime > CONFIG.RESPONSE_TIME_THRESHOLDS.CRITICAL) return 'critical';
  if (avgResponseTime > CONFIG.RESPONSE_TIME_THRESHOLDS.HIGH) return 'high';
  if (avgResponseTime > CONFIG.RESPONSE_TIME_THRESHOLDS.MEDIUM) return 'medium';
  return 'none';
}

/**
 * Get severity for error rate
 */
function getErrorRateSeverity(errorRate) {
  if (errorRate > CONFIG.ERROR_RATE_THRESHOLDS.CRITICAL) return 'critical';
  if (errorRate > CONFIG.ERROR_RATE_THRESHOLDS.HIGH) return 'high';
  if (errorRate > CONFIG.ERROR_RATE_THRESHOLDS.MEDIUM) return 'medium';
  return 'none';
}

/**
 * Check if endpoint qualifies for caching (Option D)
 */
function isCachingOpportunity(endpointStats, methodCounts) {
  const totalRequests = endpointStats.request_count;
  const getRatio = methodCounts.GET / totalRequests || 0;
  const errorRate = endpointStats.error_count / totalRequests || 0;

  return (
    totalRequests >= CONFIG.CACHING_CRITERIA.MIN_REQUESTS &&
    getRatio >= CONFIG.CACHING_CRITERIA.MIN_GET_RATIO &&
    errorRate <= CONFIG.CACHING_CRITERIA.MAX_ERROR_RATE
  );
}

/**
 * Get hour string from date (e.g., "10:00")
 */
function getHourBucket(date) {
  return date.toISOString().slice(11, 16).replace(/:\d{2}$/, ':00');
}

/**
 * Get most common status code from counts
 */
function getMostCommonStatus(statusCounts) {
  return Object.keys(statusCounts).reduce((a, b) => 
    statusCounts[a] > statusCounts[b] ? a : b
  );
}

module.exports = {
  validateLogEntry,
  calculateLogCost,
  getResponseTimeSeverity,
  getErrorRateSeverity,
  isCachingOpportunity,
  getHourBucket,
  getMostCommonStatus
};
