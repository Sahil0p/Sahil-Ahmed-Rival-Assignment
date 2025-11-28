const { analyze_api_logs } = require('../main.js');

describe('analyze_api_logs - Edge Cases', () => {
  test('empty array', () => {
    const result = analyze_api_logs([]);
    expect(result.summary.total_requests).toBe(0);
  });

  test('single valid log', () => {
    const log = [{
      timestamp: "2025-01-15T10:00:00Z", endpoint: "/api/users", method: "GET",
      response_time_ms: 100, status_code: 200, user_id: "user_001",
      request_size_bytes: 256, response_size_bytes: 1024
    }];
    const result = analyze_api_logs(log);
    expect(result.summary.total_requests).toBe(1);
  });

  test('invalid timestamp', () => {
    const logs = [{ timestamp: "invalid", endpoint: "/api/users", method: "GET",
      response_time_ms: 100, status_code: 200, user_id: "user_001",
      request_size_bytes: 256, response_size_bytes: 1024 }];
    const result = analyze_api_logs(logs);
    expect(result.summary.total_requests).toBe(0);
  });

  test('negative values', () => {
    const logs = [{ timestamp: "2025-01-15T10:00:00Z", endpoint: "/api/users", method: "GET",
      response_time_ms: -100, status_code: 200, user_id: "user_001",
      request_size_bytes: -256, response_size_bytes: 1024 }];
    const result = analyze_api_logs(logs);
    expect(result.summary.total_requests).toBe(0);
  });

  test('non-array input throws', () => {
    expect(() => analyze_api_logs({})).toThrow();
    expect(() => analyze_api_logs(null)).toThrow();
  });
});
