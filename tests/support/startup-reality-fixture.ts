import type { RawStartupRealityBrowserResult } from '../../scripts/bench-reality.js';

const samples = (value: number): readonly number[] => Array.from({ length: 30 }, () => value);

/**
 * One schema-checked browser-reality fixture for every artifact consumer test.
 *
 * Keeping the complete measured shape here makes startup-evidence schema growth
 * break at one fixture owner instead of leaving stale copies in report suites.
 */
export function measuredStartupRealityFixture(): RawStartupRealityBrowserResult {
  return {
    worker: {
      iterations: 30,
      frameBudgetMs: 16,
      exceededFrameBudgetCount: 0,
      rawSamples: samples(0.6),
      topOutliers: [{ iteration: 29, valueMs: 0.6 }],
      summary: {
        totalStartupMs: { min: 0.5, median: 0.6, p75: 0.62, p95: 0.64, p99: 0.65, max: 0.65, mean: 0.6 },
        stages: {
          'claim-or-create': { min: 0.1, median: 0.2, p75: 0.22, p95: 0.24, p99: 0.25, max: 0.25, mean: 0.2 },
          'coordinator-reset-or-create': {
            min: 0.12,
            median: 0.16,
            p75: 0.17,
            p95: 0.18,
            p99: 0.19,
            max: 0.19,
            mean: 0.16,
          },
          'listener-bind': { min: 0.02, median: 0.03, p75: 0.03, p95: 0.04, p99: 0.04, max: 0.04, mean: 0.03 },
          'quantizer-bootstrap': { min: 0.03, median: 0.05, p75: 0.05, p95: 0.06, p99: 0.06, max: 0.06, mean: 0.05 },
          'request-compute': { min: 0.03, median: 0.04, p75: 0.05, p95: 0.06, p99: 0.06, max: 0.06, mean: 0.04 },
          'state-delivery': { min: 0.08, median: 0.1, p75: 0.11, p95: 0.12, p99: 0.13, max: 0.13, mean: 0.1 },
          dispose: { min: 0.04, median: 0.06, p75: 0.07, p95: 0.08, p99: 0.08, max: 0.08, mean: 0.06 },
        },
      },
    },
    llm: {
      iterations: 30,
      simple: {
        rawSamples: samples(0.08),
        topOutliers: [{ iteration: 29, valueMs: 0.08 }],
        initToFirstTokenMs: { min: 0.2, median: 0.3, p75: 0.32, p95: 0.34, p99: 0.35, max: 0.35, mean: 0.3 },
        openToFirstTokenMs: { min: 0.1, median: 0.15, p75: 0.16, p95: 0.17, p99: 0.17, max: 0.17, mean: 0.15 },
        chunkToFirstTokenMs: { min: 0.05, median: 0.08, p75: 0.09, p95: 0.1, p99: 0.1, max: 0.1, mean: 0.08 },
      },
      promoted: {
        rawSamples: samples(0.12),
        topOutliers: [{ iteration: 29, valueMs: 0.12 }],
        initToFirstTokenMs: { min: 0.5, median: 0.7, p75: 0.72, p95: 0.74, p99: 0.75, max: 0.75, mean: 0.7 },
        openToFirstTokenMs: { min: 0.2, median: 0.24, p75: 0.25, p95: 0.26, p99: 0.27, max: 0.27, mean: 0.24 },
        chunkToFirstTokenMs: { min: 0.1, median: 0.12, p75: 0.13, p95: 0.14, p99: 0.15, max: 0.15, mean: 0.12 },
      },
    },
  };
}
