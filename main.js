/**
 * Rival.io API Log Analyzer - Serverless Function
 * Core + Option A (Cost) + Option D (Caching)
 */
const CONFIG = require('./config.js');
const {
  validateLogEntry,
  calculateLogCost,
  getResponseTimeSeverity,
  getErrorRateSeverity,
  isCachingOpportunity,
  getHourBucket,
  getMostCommonStatus
} = require('./utils.js');

/**
 * Main analytics function
 * @param {Array} logs - Array of raw log objects
 * @returns {Object} Analytics report
 */
function analyze_api_logs(logs, customConfig = {}) {
  if (!Array.isArray(logs)) {
    throw new Error('Input must be an array of log objects');
  }

  const config = { ...CONFIG, ...customConfig };
  const validLogs = [];
  let invalidLogCount = 0;

  // Pass 1: Validate logs
  for (const log of logs) {
    const validLog = validateLogEntry(log);
    if (validLog) {
      validLogs.push(validLog);
    } else {
      invalidLogCount++;
    }
  }

  if (validLogs.length === 0) {
    return getEmptyResult(invalidLogCount);
  }

  // Pass 2: Aggregate statistics (O(N))
  const aggregates = initializeAggregates(validLogs[0]);
  
  for (const log of validLogs) {
    updateGlobalStats(aggregates, log, config);
    updateEndpointStats(aggregates, log, config);
    updateUserStats(aggregates, log);
  }

  return buildFinalResult(aggregates, validLogs.length, invalidLogCount, config);
}

function getEmptyResult(invalidLogCount) {
  return {
    summary: {
      total_requests: 0,
      invalid_log_count: invalidLogCount,
      time_range: null,
      avg_response_time_ms: 0,
      error_rate_percentage: 0
    },
    endpoint_stats: [],
    performance_issues: [],
    recommendations: [`All ${invalidLogCount} logs were invalid`],
    hourly_distribution: {},
    top_users_by_requests: [],
    cost_analysis: { 
      total_cost_usd: 0, 
      cost_breakdown: { request_costs: 0, execution_costs: 0, memory_costs: 0 }, 
      cost_by_endpoint: [], 
      optimization_potential_usd: 0 
    },
    caching_opportunities: [],
    total_potential_savings: { requests_eliminated: 0, cost_savings_usd: 0, performance_improvement_ms: 0 }
  };
}

function initializeAggregates(firstLog) {
  return {
    total_response_time: 0,
    total_error_count: 0,
    min_timestamp: firstLog.timestamp,
    max_timestamp: firstLog.timestamp,
    hourly_distribution: {},
    endpoint_stats: {},
    user_stats: {},
    method_counts_by_endpoint: {},
    status_counts_by_endpoint: {},
    total_costs: { request: 0, execution: 0, memory: 0, total: 0 },
    endpoint_costs: {}
  };
}

function updateGlobalStats(aggregates, log, config) {
  aggregates.total_response_time += log.response_time_ms;
  if (log.status_code >= config.ERROR_STATUS_MIN) {
    aggregates.total_error_count++;
  }
  aggregates.min_timestamp = new Date(Math.min(aggregates.min_timestamp.getTime(), log.timestamp.getTime()));
  aggregates.max_timestamp = new Date(Math.max(aggregates.max_timestamp.getTime(), log.timestamp.getTime()));

  const hour = getHourBucket(log.timestamp);
  aggregates.hourly_distribution[hour] = (aggregates.hourly_distribution[hour] || 0) + 1;
}

function updateEndpointStats(aggregates, log, config) {
  const endpoint = log.endpoint;
  initEndpoint(aggregates, endpoint);

  const stats = aggregates.endpoint_stats[endpoint];
  stats.request_count++;
  stats.response_time_sum += log.response_time_ms;
  stats.min_response_time = Math.min(stats.min_response_time, log.response_time_ms);
  stats.max_response_time = Math.max(stats.max_response_time, log.response_time_ms);
  
  if (log.status_code >= config.ERROR_STATUS_MIN) {
    stats.error_count++;
  }

  aggregates.method_counts_by_endpoint[endpoint][log.method] = 
    (aggregates.method_counts_by_endpoint[endpoint][log.method] || 0) + 1;

  aggregates.status_counts_by_endpoint[endpoint][String(log.status_code)] = 
    (aggregates.status_counts_by_endpoint[endpoint][String(log.status_code)] || 0) + 1;

  const logCost = calculateLogCost(log);
  updateCosts(stats.costs, logCost);
  updateEndpointCosts(aggregates.endpoint_costs[endpoint], logCost);
  updateTotalCosts(aggregates.total_costs, logCost);
}

function initEndpoint(aggregates, endpoint) {
  if (!aggregates.endpoint_stats[endpoint]) {
    aggregates.endpoint_stats[endpoint] = {
      request_count: 0,
      response_time_sum: 0,
      min_response_time: Infinity,
      max_response_time: 0,
      error_count: 0,
      costs: { request: 0, execution: 0, memory: 0, total: 0 }
    };
    aggregates.method_counts_by_endpoint[endpoint] = {};
    aggregates.status_counts_by_endpoint[endpoint] = {};
    aggregates.endpoint_costs[endpoint] = { total: 0, count: 0 };
  }
}

function updateCosts(costs, logCost) {
  costs.request += logCost.request_cost;
  costs.execution += logCost.execution_cost;
  costs.memory += logCost.memory_cost;
  costs.total += logCost.total_cost;
}

function updateEndpointCosts(endpointCosts, logCost) {
  endpointCosts.total += logCost.total_cost;
  endpointCosts.count++;
}

function updateTotalCosts(totalCosts, logCost) {
  totalCosts.request += logCost.request_cost;
  totalCosts.execution += logCost.execution_cost;
  totalCosts.memory += logCost.memory_cost;
  totalCosts.total += logCost.total_cost;
}

function updateUserStats(aggregates, log) {
  aggregates.user_stats[log.user_id] = (aggregates.user_stats[log.user_id] || 0) + 1;
}

function buildFinalResult(aggregates, validCount, invalidCount, config) {
  const summary = buildSummary(aggregates, validCount);
  const endpoint_stats = buildEndpointStats(aggregates);
  const performance_issues = buildPerformanceIssues(aggregates, config);
  const top_users = buildTopUsers(aggregates, config.TOP_USERS_COUNT);
  const cost_analysis = buildCostAnalysis(aggregates);
  const { caching_opportunities, total_potential_savings } = buildCachingAnalysis(aggregates, cost_analysis);
  const recommendations = buildRecommendations(performance_issues, caching_opportunities);

  return {
    summary: { ...summary, invalid_log_count: invalidCount },
    endpoint_stats,
    performance_issues,
    recommendations,
    hourly_distribution: aggregates.hourly_distribution,
    top_users_by_requests: top_users,
    cost_analysis,
    caching_opportunities,
    total_potential_savings  // ✅ NOW INCLUDED IN OUTPUT
  };
}

function buildSummary(aggregates, validCount) {
  return {
    total_requests: validCount,
    time_range: {
      start: aggregates.min_timestamp.toISOString(),
      end: aggregates.max_timestamp.toISOString()
    },
    avg_response_time_ms: Math.round((aggregates.total_response_time / validCount) * 10) / 10,
    error_rate_percentage: Math.round((aggregates.total_error_count / validCount) * 100 * 10) / 10
  };
}

function buildEndpointStats(aggregates) {
  return Object.entries(aggregates.endpoint_stats).map(([endpoint, stats]) => ({
    endpoint,
    request_count: stats.request_count,
    avg_response_time_ms: Math.round((stats.response_time_sum / stats.request_count) * 10) / 10,
    slowest_request_ms: stats.max_response_time,
    fastest_request_ms: stats.min_response_time,
    error_count: stats.error_count,
    most_common_status: Number(getMostCommonStatus(aggregates.status_counts_by_endpoint[endpoint]))
  }));
}

function buildPerformanceIssues(aggregates, config) {
  const issues = [];
  for (const [endpoint, stats] of Object.entries(aggregates.endpoint_stats)) {
    const avgResponseTime = stats.response_time_sum / stats.request_count;
    const severity = getResponseTimeSeverity(avgResponseTime);
    if (severity !== 'none') {
      issues.push({
        type: 'slow_endpoint',
        endpoint,
        avg_response_time_ms: Math.round(avgResponseTime * 10) / 10,
        threshold_ms: config.RESPONSE_TIME_THRESHOLDS.MEDIUM,
        severity
      });
    }

    const errorRate = (stats.error_count / stats.request_count) * 100;
    const errorSeverity = getErrorRateSeverity(errorRate);
    if (errorSeverity !== 'none') {
      issues.push({
        type: 'high_error_rate',
        endpoint,
        error_rate_percentage: Math.round(errorRate * 10) / 10,
        severity: errorSeverity
      });
    }
  }
  return issues;
}

function buildTopUsers(aggregates, topCount) {
  return Object.entries(aggregates.user_stats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, topCount)
    .map(([user_id, request_count]) => ({ user_id, request_count }));
}

function buildCostAnalysis(aggregates) {
  return {
    total_cost_usd: Math.round(aggregates.total_costs.total * 10000) / 10000,
    cost_breakdown: {
      request_costs: Math.round(aggregates.total_costs.request * 10000) / 10000,
      execution_costs: Math.round(aggregates.total_costs.execution * 10000) / 10000,
      memory_costs: Math.round(aggregates.total_costs.memory * 10000) / 10000
    },
    cost_by_endpoint: Object.entries(aggregates.endpoint_costs).map(([endpoint, data]) => ({
      endpoint,
      total_cost: Math.round(data.total * 10000) / 10000,
      cost_per_request: Math.round((data.total / data.count) * 1000000) / 1000000
    })),
    optimization_potential_usd: 0 // Updated by caching analysis
  };
}

function buildCachingAnalysis(aggregates, cost_analysis) {
  const caching_opportunities = [];
  let totalPotentialSavings = { 
    requests_eliminated: 0, 
    cost_savings_usd: 0, 
    performance_improvement_ms: 0 
  };

  for (const [endpoint, stats] of Object.entries(aggregates.endpoint_stats)) {
    if (isCachingOpportunity(stats, aggregates.method_counts_by_endpoint[endpoint])) {
      const getRatio = aggregates.method_counts_by_endpoint[endpoint].GET / stats.request_count;
      const potentialHitRate = Math.round(getRatio * 100);
      const potentialRequestsSaved = Math.round(stats.request_count * 0.8);
      const costPerRequest = aggregates.endpoint_costs[endpoint].total / stats.request_count;
      const costSavings = Math.round(potentialRequestsSaved * costPerRequest * 10000) / 10000;
      const avgResponseTime = stats.response_time_sum / stats.request_count;

      const opportunity = {
        endpoint,
        potential_cache_hit_rate: potentialHitRate,
        current_requests: stats.request_count,
        potential_requests_saved: potentialRequestsSaved,
        estimated_cost_savings_usd: costSavings,
        recommended_ttl_minutes: CONFIG.CACHING_CRITERIA.DEFAULT_TTL_MINUTES,
        recommendation_confidence: 'high'
      };

      caching_opportunities.push(opportunity);
      
      // ✅ ACCUMULATE TOTAL SAVINGS
      totalPotentialSavings.requests_eliminated += potentialRequestsSaved;
      totalPotentialSavings.cost_savings_usd += costSavings;
      totalPotentialSavings.performance_improvement_ms += Math.round(avgResponseTime * potentialRequestsSaved);
    }
  }

  // ✅ UPDATE COST ANALYSIS OPTIMIZATION POTENTIAL
  cost_analysis.optimization_potential_usd = totalPotentialSavings.cost_savings_usd;
  
  return { caching_opportunities, total_potential_savings: totalPotentialSavings };
}

function buildRecommendations(performance_issues, caching_opportunities) {
  const recommendations = [];

  caching_opportunities.forEach(op => {
    recommendations.push(
      `Consider caching for ${op.endpoint} (${op.current_requests} requests, ${op.potential_cache_hit_rate}% cache-hit potential)`
    );
  });

  performance_issues.slice(0, 3).forEach(issue => {
    if (issue.type === 'slow_endpoint') {
      recommendations.push(
        `Investigate ${issue.endpoint} performance (avg ${issue.avg_response_time_ms}ms exceeds ${issue.threshold_ms}ms threshold)`
      );
    } else {
      recommendations.push(
        `Alert: ${issue.endpoint} has ${issue.error_rate_percentage}% error rate`
      );
    }
  });

  if (performance_issues.length > 0) {
    recommendations.push(`Alert: Found ${performance_issues.length} performance issues`);
  }

  return recommendations.slice(0, 5);
}

module.exports = { analyze_api_logs };

// DEMO: Run when called directly (remove before submission)
if (require.main === module) {
  console.log('=== RIVAL.IO API LOG ANALYZER ===');
  
  const sampleData = require('./tests/test_data/sample_small.json');
  const result = analyze_api_logs(sampleData);
  
  console.log('\n📊 SUMMARY:');
  console.log(JSON.stringify(result.summary, null, 2));
  
  console.log('\n📈 ENDPOINT STATS:');
  console.log(JSON.stringify(result.endpoint_stats, null, 2));
  
  console.log('\n⚠️  PERFORMANCE ISSUES:');
  console.log(JSON.stringify(result.performance_issues, null, 2));
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log(result.recommendations.map((r, i) => `  ${i+1}. ${r}`).join('\n'));
  
  console.log('\n💰 COST ANALYSIS (Option A):');
  console.log(JSON.stringify(result.cost_analysis, null, 2));
  
  console.log('\n🗄️  CACHING OPPORTUNITIES (Option D):');
  console.log(JSON.stringify(result.caching_opportunities, null, 2));
  
  console.log('\n🎯 TOTAL POTENTIAL SAVINGS (Option D):');  // ✅ NEW!
  console.log(JSON.stringify(result.total_potential_savings, null, 2));
}
