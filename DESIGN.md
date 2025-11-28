# Design Decisions

## Advanced Features Chosen
**Option A (Cost Estimation) + Option D (Caching Opportunities)**

**Why these two?**
1. Both leverage core aggregates (counts, times, sizes) already computed
2. Straightforward math-based logic (no complex time-window analysis)
3. Provide immediate business value (cost savings, performance)
4. Easy to explain and extend

## Key Implementation Choices

1. **Single-pass aggregation**: All stats computed in one loop for O(N) performance
2. **Validation-first**: Invalid logs skipped but counted for transparency
3. **Config-driven**: All thresholds/costs centralized and overridable
4. **Modular utils**: Clean separation of concerns for testability

## Trade-offs Made

| Choice | Pro | Con |
|--------|-----|-----|
| Single pass | Fastest performance | Slightly complex aggregation object |
| Skip invalid logs | Robustness | Lose some data (but count them) |
| Plain objects | No deps, fast | No built-in order for Maps |

## Scaling to 1M+ Logs

1. **Streaming**: Process logs via Node streams/readable
2. **Chunking**: Split into time-based chunks, aggregate incrementally
3. **External storage**: Redis for counters, ClickHouse/TimescaleDB for logs
4. **Parallelization**: Split by endpoint/hour, aggregate results

## Improvements with More Time

1. Add anomaly detection (Option B) using statistical methods
2. Response size fingerprinting for cache consistency
3. Historical baseline comparisons
4. Export to CSV/PDF for reports

## Time Spent
~10 hours (including tests, docs, edge cases, performance optimization)
