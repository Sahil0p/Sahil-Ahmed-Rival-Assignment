const { analyze_api_logs } = require('../main.js');
const smallData = require('./test_data/sample_small.json');

describe('analyze_api_logs - Core Functionality', () => {
  test('should process small dataset correctly', () => {
    const result = analyze_api_logs(smallData);
    expect(result.summary.total_requests).toBe(smallData.length);  // Use data length dynamically
    expect(result.summary.invalid_log_count).toBe(0);
    expect(result.endpoint_stats.length).toBeGreaterThanOrEqual(1);
    expect(result.top_users_by_requests.length).toBeGreaterThanOrEqual(1);
    expect(result.cost_analysis.total_cost_usd).toBeGreaterThan(0);
  });

  test('should generate cost analysis (Option A)', () => {
    const result = analyze_api_logs(smallData);
    expect(result.cost_analysis).toHaveProperty('total_cost_usd');
    expect(result.cost_analysis.cost_by_endpoint.length).toBeGreaterThanOrEqual(1);
  });

  test('should have correct output structure', () => {
    const result = analyze_api_logs(smallData);
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('endpoint_stats');
    expect(result).toHaveProperty('performance_issues');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('hourly_distribution');
    expect(result).toHaveProperty('top_users_by_requests');
    expect(result).toHaveProperty('cost_analysis');
    expect(result).toHaveProperty('caching_opportunities');
  });
});


describe('Performance Tests - 10k+ logs', () => {
  test('processes 10,000 logs in under 2 seconds', () => {
    // Generate 10k realistic logs
    const largeLogs = Array.from({ length: 10000 }, (_, i) => ({
      timestamp: `2025-01-15T10:${String(Math.floor(i / 100) % 60).padStart(2, '0')}:00Z`,
      endpoint: `/api/users`,
      method: 'GET',
      response_time_ms: 150 + Math.random() * 50,
      status_code: 200,
      user_id: `user_${i % 100}`,
      request_size_bytes: 512,
      response_size_bytes: 2048
    }));

    const start = Date.now();
    const result = analyze_api_logs(largeLogs);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(result.summary.total_requests).toBe(10000);
    expect(result.endpoint_stats.length).toBe(1);
  });
});


describe('Integration Tests - Dataset Sizes', () => {
  test('processes MEDIUM dataset (sample_medium.json)', () => {
    const mediumData = require('./test_data/sample_medium.json');
    // console.log(`🟢 MEDIUM: ${mediumData.length} logs tested`);  // PROOF! Use this to check if your data are tested or not
    const result = analyze_api_logs(mediumData);
    
    expect(result.summary.total_requests).toBe(mediumData.length);
    expect(result.endpoint_stats.length).toBeGreaterThan(0);
    expect(result.cost_analysis.total_cost_usd).toBeGreaterThan(0);
    expect(result.total_potential_savings.requests_eliminated).toBeGreaterThan(0);
  });

  test('processes LARGE dataset (sample_large.json)', () => {
    const largeData = require('./test_data/sample_large.json');
    // console.log(`🟢 LARGE: ${largeData.length} logs tested`);   // PROOF! Use this to check if your data are tested or not
    const result = analyze_api_logs(largeData);
    
    expect(result.summary.total_requests).toBe(largeData.length);
    expect(result.top_users_by_requests.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(result.hourly_distribution).length).toBeGreaterThanOrEqual(1);
    expect(result.cost_analysis.cost_by_endpoint.length).toBeGreaterThan(1);
  });
});


// Utils Test Cases
const {
  validateLogEntry,
  calculateLogCost,
  getResponseTimeSeverity,
  getErrorRateSeverity,
  isCachingOpportunity,
  getHourBucket,
  getMostCommonStatus
} = require('../utils.js');

const CONFIG = require('../config.js');

describe('Utils - 100% Branch Coverage', () => {
  
  describe('validateLogEntry - ALL branches (lines 8-14, 22-31)', () => {
    test('null/undefined/non-object inputs', () => {
      expect(validateLogEntry(null)).toBeNull();          
      expect(validateLogEntry(undefined)).toBeNull();        
      expect(validateLogEntry('string')).toBeNull();       
      expect(validateLogEntry(123)).toBeNull();            
    });

    test('invalid timestamp', () => {
      expect(validateLogEntry({ timestamp: 'invalid' })).toBeNull();  
      expect(validateLogEntry({ timestamp: '' })).toBeNull();        
    });

    test('invalid numeric values', () => {
      expect(validateLogEntry({
        timestamp: '2025-01-15T10:00:00Z',
        response_time_ms: -100
      })).toBeNull(); 

      expect(validateLogEntry({
        timestamp: '2025-01-15T10:00:00Z',
        response_time_ms: 'abc',
        status_code: 200
      })).toBeNull();  

      expect(validateLogEntry({
        timestamp: '2025-01-15T10:00:00Z',
        response_time_ms: 100,
        status_code: 'invalid'
      })).toBeNull();  

      expect(validateLogEntry({
        timestamp: '2025-01-15T10:00:00Z',
        response_time_ms: 100,
        status_code: 200,
        request_size_bytes: -1
      })).toBeNull(); 
    });

    test('valid log sanitization', () => {
      const validLog = validateLogEntry({
        timestamp: '2025-01-15T10:00:00Z',
        endpoint: '/api/users',
        method: 'GET',
        response_time_ms: 100,
        status_code: 200,
        user_id: 'user_123',
        request_size_bytes: 512,
        response_size_bytes: 1024
      });
      expect(validLog).toBeDefined();
      expect(validLog.endpoint).toBe('/api/users');
      expect(validLog.response_time_ms).toBe(100);
    });
  });

  describe('calculateLogCost - ALL memory tiers (lines 22-31)', () => {
    test('0-1KB tier (512 bytes)', () => {
      const log = { response_time_ms: 100, response_size_bytes: 512 };  
      const cost = calculateLogCost(log);
      expect(cost.memory_cost).toBe(0.00001); 
    });

    test('1-10KB tier (8KB)', () => {
      const log = { response_time_ms: 100, response_size_bytes: 8192 };  
      const cost = calculateLogCost(log);
      expect(cost.memory_cost).toBe(0.00005);  
    });

    test('10KB+ tier (20KB)', () => {
      const log = { response_time_ms: 100, response_size_bytes: 20480 };  
      const cost = calculateLogCost(log);
      expect(cost.memory_cost).toBe(0.0001);   
    });

    test('boundary values - FIXED', () => {
      // Tier 1: 0-1KB (≤1024 bytes)
      expect(calculateLogCost({ response_time_ms: 100, response_size_bytes: 1023 }).memory_cost).toBe(0.00001);
      expect(calculateLogCost({ response_time_ms: 100, response_size_bytes: 1024 }).memory_cost).toBe(0.00001);
      
      // Tier 2: 1-10KB (>1024, ≤10240 bytes)
      expect(calculateLogCost({ response_time_ms: 100, response_size_bytes: 1025 }).memory_cost).toBe(0.00005);
      expect(calculateLogCost({ response_time_ms: 100, response_size_bytes: 10239 }).memory_cost).toBe(0.00005);
      expect(calculateLogCost({ response_time_ms: 100, response_size_bytes: 10240 }).memory_cost).toBe(0.00005);
      
      // Tier 3: 10KB+ (>10240 bytes) ✅ FIXED!
      expect(calculateLogCost({ response_time_ms: 100, response_size_bytes: 10241 }).memory_cost).toBe(0.0001);
    });
  });

  describe('getResponseTimeSeverity - ALL 4 branches (line 67)', () => {
    test('none severity (<500ms)', () => {
      expect(getResponseTimeSeverity(400)).toBe('none');                    // < MEDIUM
    });

    test('medium severity (500-999ms)', () => {
      expect(getResponseTimeSeverity(600)).toBe('medium');                  // > MEDIUM, < HIGH
    });

    test('high severity (1000-1999ms)', () => {
      expect(getResponseTimeSeverity(1500)).toBe('high');                   // > HIGH, < CRITICAL
    });

    test('critical severity (2000ms+)', () => {
      expect(getResponseTimeSeverity(2500)).toBe('critical');               // > CRITICAL
    });

    test('exact boundaries', () => {
      expect(getResponseTimeSeverity(CONFIG.RESPONSE_TIME_THRESHOLDS.MEDIUM)).toBe('none');
      expect(getResponseTimeSeverity(CONFIG.RESPONSE_TIME_THRESHOLDS.MEDIUM + 1)).toBe('medium');
      expect(getResponseTimeSeverity(CONFIG.RESPONSE_TIME_THRESHOLDS.HIGH + 1)).toBe('high');
    });
  });

  describe('getErrorRateSeverity - ALL 4 branches (lines 77-78)', () => {
    test('none severity (<5%)', () => {
      expect(getErrorRateSeverity(3)).toBe('none');
    });

    test('medium severity (5-9.9%)', () => {
      expect(getErrorRateSeverity(7)).toBe('medium');
    });

    test('high severity (10-14.9%)', () => {
      expect(getErrorRateSeverity(12)).toBe('high');
    });

    test('critical severity (15%+)', () => {
      expect(getErrorRateSeverity(20)).toBe('critical');
    });
  });

  describe('isCachingOpportunity - ALL 3 conditions (line 89)', () => {
    const statsPass = { request_count: 10, error_count: 0 };
    const statsFailRequests = { request_count: 1, error_count: 0 };
    const statsFailError = { request_count: 10, error_count: 3 };

    test('passes all criteria', () => {
      const methodsPass = { GET: 9 };
      expect(isCachingOpportunity(statsPass, methodsPass)).toBe(true);
    });

    test('fails: low request count', () => {
      const methodsPass = { GET: 1 };
      expect(isCachingOpportunity(statsFailRequests, methodsPass)).toBe(false);  // MIN_REQUESTS
    });

    test('fails: low GET ratio', () => {
      const methodsFailGET = { GET: 4, POST: 6 };  // 40% GET
      expect(isCachingOpportunity(statsPass, methodsFailGET)).toBe(false);     // MIN_GET_RATIO
    });

    test('fails: high error rate', () => {
      const methodsPass = { GET: 9 };
      expect(isCachingOpportunity(statsFailError, methodsPass)).toBe(false);   
    });
  });

  describe('getHourBucket - format validation', () => {
    test('converts date to hour bucket', () => {
      const date = new Date('2025-01-15T10:23:45.123Z');
      expect(getHourBucket(date)).toBe('10:00');
    });

    test('handles different timezones/minutes', () => {
      expect(getHourBucket(new Date('2025-01-15T09:59:59Z'))).toBe('09:00');
      expect(getHourBucket(new Date('2025-01-15T14:05:30Z'))).toBe('14:00');
    });
  });

  describe('getMostCommonStatus - reduce logic', () => {
    test('returns most frequent status', () => {
      expect(getMostCommonStatus({ '200': 5, '404': 2, '500': 1 })).toBe('200');
    });

    test('handles tie - returns last one', () => {
      expect(getMostCommonStatus({ '200': 3, '500': 3 })).toBe('500');
    });

    test('single status', () => {
      expect(getMostCommonStatus({ '200': 1 })).toBe('200');
    });
  });
});

 
