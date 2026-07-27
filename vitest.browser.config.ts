import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { alias, coverageExclude, coverageInclude, scaledTimeout } from './vitest.shared.js';
import { startSceneDev, stopSceneDev } from './tests/browser/commands/scene-dev-spawn.js';

const coverageEnabled = process.argv.includes('--coverage');
const isCI = process.env.CI !== undefined && process.env.CI !== '';

const browserInstances = (coverageEnabled ? 'chromium' : process.env.LITESHIP_VITEST_BROWSERS ?? 'chromium,firefox,webkit')
  .split(',')
  .map((browser) => browser.trim())
  .filter((browser): browser is 'chromium' | 'firefox' | 'webkit' =>
    browser === 'chromium' || browser === 'firefox' || browser === 'webkit',
  )
  .map((browser) => ({ browser }));

// Coverage reporters: the merge step consumes `json` (coverage-final.json).
// We use `text-summary` (totals only) instead of `text` here because the
// browser run only loads a fraction of the source tree — most files report
// 0% during this phase, which prints a 200+ line table that looks
// catastrophic to readers but is meaningless until the merge step folds in
// the in-process Node coverage. The merge step (coverage:merge) prints the
// real per-file table once. `html` + `lcov` produce large on-disk trees
// that local feedback loops don't use -- only CI keeps them so downstream
// tooling (PR artifact uploads, drill-down browsing) still has them. Local
// runs drop to `text-summary` + `json` to avoid the disk write overhead
// without losing any merge-critical data.
const coverageReporters = isCI
  ? (['text-summary', 'html', 'lcov', 'json'] as const)
  : (['text-summary', 'json'] as const);

export default defineConfig({
  resolve: {
    alias,
  },
  optimizeDeps: {
    // Persist dep optimization cache in a stable location so Vite doesn't
    // re-optimize on every browser coverage run. The node config uses the
    // default cache dir; this gives the browser config its own stable cache.
    holdUntilCrawlEnd: true,
  },
  cacheDir: 'node_modules/.vite-browser',
  test: {
    include: ['tests/browser/**/*.test.ts'],
    // Browser test files can't import vitest.shared.ts (node:path), so this
    // lane sets lane-wide budgets here instead of per-test literals: 30s
    // covers the slowest case (scene-dev-player's spawned dev server) and
    // coverage runs clamp to the shared 240s floor via scaledTimeout.
    testTimeout: scaledTimeout(30_000),
    hookTimeout: scaledTimeout(30_000),
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: browserInstances,
      commands: {
        startSceneDev,
        stopSceneDev,
      },
    },
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reportsDirectory: './coverage/browser',
      reporter: [...coverageReporters],
      include: coverageInclude,
      // The browser v8 provider statically re-parses every *included* source
      // for its uncovered-file report (even untouched ones). @liteship/cloudflare
      // is Workers/workerd-only — never loaded in a browser test — and its
      // edge middleware tripped Rolldown's parser (`import type {…}` →
      // "Expected `from`"), printing a warning and silently dropping the file.
      // Exclude the package from the BROWSER pass only; the node pass
      // (vitest.config.ts) still measures it and is the merge's completeness
      // source. Spread keeps the shared coverageExclude intact (its length is
      // pinned by tests/unit/meta/coverage-config.test.ts).
      exclude: [...coverageExclude, 'packages/cloudflare/src/**'],
    },
  },
});
