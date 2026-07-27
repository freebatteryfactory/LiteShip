import { defineConfig } from 'vitest/config';
import { alias, coverageExclude, coverageInclude, nodeTestInclude, scaledTimeout } from './vitest.shared.js';

// Timeout policy lives in vitest.shared.ts (scaledTimeout): coverage runs
// clamp every budget to the 240s floor, and LITESHIP_TEST_TIMEOUT_SCALE lets a
// loaded machine buy headroom without touching gate semantics. The configs
// evaluate in the vitest main process where `--coverage` is visible on argv;
// test workers don't see that argv, so `test.env` forwards the flag as
// LITESHIP_COVERAGE for per-test scaledTimeout(...) calls.
//
// Non-coverage defaults are modestly above 5s so parallel `pnpm test` and
// subprocess-heavy meta suites (feedback-integrity, codebase-audit) are less
// likely to hit the default wall without an explicit per-suite timeout; heavy
// suites still set per-test timeouts where needed.
const coverageEnabled = process.argv.includes('--coverage');
const coverageReportsDirectory =
  process.env.LITESHIP_COVERAGE_SHARD_DIR !== undefined && process.env.LITESHIP_COVERAGE_SHARD_DIR.length > 0
    ? process.env.LITESHIP_COVERAGE_SHARD_DIR
    : './coverage/node';

export default defineConfig({
  resolve: {
    alias,
  },
  test: {
    include: nodeTestInclude,
    exclude: ['tests/e2e/**', 'tests/browser/**'],
    setupFiles: ['tests/setup/jsdom-canvas.ts'],
    env: { LITESHIP_COVERAGE: coverageEnabled ? '1' : '0' },
    testTimeout: scaledTimeout(10_000),
    hookTimeout: scaledTimeout(20_000),
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reportsDirectory: coverageReportsDirectory,
      reporter: ['text', 'html', 'lcov', 'json'],
      include: coverageInclude,
      exclude: coverageExclude,
    },
  },
});
