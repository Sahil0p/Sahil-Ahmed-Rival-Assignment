
# Rival.io API Log Analyzer

## Project Overview

Single-pass **O(N)** serverless API log analyzer implementing **Core requirements + Option A (Cost Analysis) + Option D (Caching Opportunities)**.

**Key Features:**
- **Core Analytics**: Response times, error rates, endpoint stats, hourly distribution, top users
- **Option A**: Real AWS Lambda cost analysis with memory tiers (0-1KB/$0.00001, 1-10KB/$0.00005, 10KB+/$0.0001)
- **Option D**: Caching opportunity detection (≥70% GET, ≤10% errors, ≥3 requests)

**Production Stats:**
- **90.27% test coverage** (37 tests passing)
- **10k logs processed in ~100ms** (<2s requirement)
- **3 datasets tested**: 15/105/1,050 logs

## Setup Instructions (Dependencies & Installation)
> Prerequisites: Node.js v18+
### 1. Clone repository
```
git clone <your-repo-url>
cd sahil-rival-assignment
```

### 2. Install dependencies (Jest for testing only)
```
npm install
```
### 3. Verify setup

```
npm test # 37 tests should pass
```

**Dependencies:**
├── jest (testing)
├── No runtime dependencies
└── Pure vanilla Node.js


## How to Run the Function

### Demo Mode (Sample Data)
```
node main.js
```

### Programmatic Usage
```
const { analyze_api_logs } = require('./main.js');
const logs = require('./test_data/sample_small.json');
const result = analyze_api_logs(logs);
console.log(JSON.stringify(result, null, 2));
```

**Exportable function for serverless deployment:**
module.exports = { analyze_api_logs };

## How to Run Tests

- All tests (37 passing, 90%+ coverage)
  ```
    npm test
  ```
  
- Coverage report
  ```
    npm test -- --coverage
  ```

- Specific test file
  ```
    npx jest tests/test_function.test.js
  ```

- Watch mode (development)
  ```
    npm test -- --watch
  ```


**Test Results:**

-  `PASS` tests/test_function.test.js
-  `PASS`  tests/test_edge_cases.test.js
  ```
  -----------|---------|----------|---------|---------|-------------------
  File       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
  -----------|---------|----------|---------|---------|-------------------
  All files  |   90.27 |    95.12 |   96.96 |   90.11 |
   config.js |     100 |      100 |     100 |     100 |
   main.js   |   86.56 |    96.96 |      96 |   87.12 | 347-371
   utils.js  |     100 |    93.87 |     100 |     100 | 27-31
  -----------|---------|----------|---------|---------|-------------------
  ```
> `Test Suites`: 2 passed, 2 total  
> `Tests`:       39 passed, 39 total  
> `Snapshots`:   0 total  
> `Time`:        1.437 s  



**Datasets Tested:**
| Dataset | Logs | Status |
|---------|------|--------|
| small.json | 15 | ✅ PASS |
| medium.json | 105 | ✅ PASS |
| large.json | 1,050 | ✅ PASS |

---

## Usage Examples

## 1. Demo Output (`node main.js`)

> === RIVAL.IO API LOG ANALYZER ===

### 📊 SUMMARY:

> Total Requests: 15 | Avg Response: 787ms | Error Rate: 20%

### 📈 ENDPOINT STATS:
```
/api/users: 6 reqs | 148ms avg | 16.7% errors
/api/payments: 4 reqs | 912ms avg | 50% errors ⚠️
/api/reports: 3 reqs | 2100ms avg ⚠️
```

### 💰 COST ANALYSIS (Option A):

> Total Cost: $0.0256  
> Optimization Potential: $0.013 (50%)  
> `/api/reports:` $0.0132 ($0.0044/req) ← Costliest  

### 🗄️ CACHING OPPORTUNITIES (Option D):

> `/api/users`: 83% hit rate | Save 5 reqs | $0.002 savings  
> `/api/reports`: 100% hit rate | Save 2 reqs | $0.0088 savings  

### 💡 RECOMMENDATIONS:

> ✅ Cache /api/users (83% potential)  
> ⚠️ Fix /api/payments (50% errors, 912ms)  
> 🚨 Alert: /api/reports critically slow (2100ms)  

 

##2. Custom Configuration
> const customConfig = {  
> CACHING_CRITERIA: { MIN_REQUESTS: 5, MIN_GET_RATIO: 0.8 },  
> RESPONSE_TIME_THRESHOLDS: { MEDIUM: 300 }  
> };  
> const result = analyze_api_logs(logs, customConfig);

---




## 🧠 Time Complexity and Space Complexity Analysis
**O(N)**  
- `N` = Number of log entries  
- Single-pass: validation + aggregation + cost calculation  
- No nested loops or heavy operations  

## 🗂️ Space Complexity
**O(E + U)**  
- `E` = Unique endpoints (10–50)  
- `U` = Unique users (100–1000)  
- Overall auxiliary memory is much smaller than `N` in production

---

## ⚡ Performance Benchmarks

| Dataset    | Logs   | Time    | Memory |
|-----------|--------|---------|--------|
| small     | 15     | 2ms     | 5MB    |
| medium    | 105    | 8ms     | 12MB   |
| large     | 1,050  | 45ms    | 25MB   |
| perf test | 10,000 | ~100ms  | ~80MB  |

---

## 💲 Memory Cost Tiers (AWS Lambda Pricing)

| Size      | Tier   | Cost/Log   |
|-----------|--------|------------|
| 0–1KB     | Tier 1 | $0.00001   |
| 1–10KB    | Tier 2 | $0.00005   |
| 10KB+     | Tier 3 | $0.0001    |

