import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Config } from './packages/core/src/config.js';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export const repoRoot = resolve(rootDir);

export const alias: Record<string, string> = {
  ...Config.toTestAliases(Config.make({}), repoRoot),
  '@czap/_spine': resolve(repoRoot, 'packages/_spine/index.d.ts'),
  // @czap/error is the zero-dep root error algebra — outside the design-layer
  // alias set, so map it to source explicitly (every package imports it).
  '@czap/error': resolve(repoRoot, 'packages/error/src/index.ts'),
  // @czap/gauntlet is the rigor engine — outside the design-layer alias set.
  '@czap/gauntlet': resolve(repoRoot, 'packages/gauntlet/src/index.ts'),
  // CUT A1: @czap/command is outside the design-layer alias set, so map it to
  // source explicitly (the CLI and MCP adapter tests import it by name). The
  // /host subpath (Node host execution) is aliased separately; the longer key
  // is listed first so it takes precedence.
  '@czap/command/host': resolve(repoRoot, 'packages/command/src/host/index.ts'),
  '@czap/command/host-browser': resolve(repoRoot, 'packages/command/src/host-browser/index.ts'),
  // Slice B (B1, step 3): the PURE invariants subpath (check-invariants-registry,
  // zero imports) — @czap/audit's repo-IR invariant-regex oracle references the
  // CANONICAL NO_DEFAULT_EXPORT rule through it without pulling the command runtime.
  '@czap/command/invariants': resolve(repoRoot, 'packages/command/src/commands/check-invariants-registry.ts'),
  '@czap/command': resolve(repoRoot, 'packages/command/src/index.ts'),
};

export const coverageInclude = ['packages/*/src/**/*.ts'];

export const coverageExclude = [
  '**/dist/**',
  '**/node_modules/**',
  '**/*.d.ts',
  '**/index.ts',
  // bin.ts is the tsx CLI entrypoint — only invoked via subprocess spawn,
  // never imported in-process. The two-statement body (`await run(); process.exit()`)
  // is exhaustively covered by every CLI integration test that spawns it.
  'packages/cli/src/bin.ts',
  // http-server.ts and stdio-server.ts hold the Node server bootstraps
  // (createServer + listen + SIGINT-await; tsx direct-invoke guard). The
  // pure handler logic lives in `http.ts` / `stdio.ts` (handleRequest /
  // respond / processLine) and is exercised by tests/unit/mcp-server/.
  // Bootstrap is exercised by the integration spawn — c8 ignore can't be
  // applied through tsx's source map during subprocess coverage merge, so
  // the bootstrap modules are excluded outright.
  'packages/mcp-server/src/http-server.ts',
  'packages/mcp-server/src/stdio-server.ts',
  // processor.ts is types + a re-export shim around processor-bootstrap.ts.
  // Both are excluded because AudioWorkletProcessor + AudioWorkletNode only
  // exist inside an AudioWorklet realm; jsdom can't load them, so this
  // surface has no in-process test path. Exercised live by the browser
  // stream-stress E2E (tests/e2e/stream.e2e.ts).
  'packages/web/src/audio/processor.ts',
  'packages/web/src/audio/processor-bootstrap.ts',
  // dev/player.ts is the browser-side scene player UI script. Top-level
  // code mutates the DOM directly (document.getElementById + addEventListener
  // calls); it can only run inside the live Vite dev server bound by
  // `startDevServer`. No in-process unit-test path.
  'packages/scene/src/dev/player.ts',
  'packages/core/src/capture.ts',
  'packages/core/src/protocol.ts',
  'packages/core/src/quantizer-types.ts',
  'packages/core/src/type-utils.ts',
  'packages/web/src/lite.ts',
  'packages/web/src/types.ts',
  'packages/worker/src/compositor-types.ts',
  // contract.ts is a pure type-declaration module (10 export type/interface,
  // 0 runtime statements). TS erases it at build time so v8 has nothing to
  // instrument; it shows 0/0/0/0 in the merged report and pollutes blind-spot
  // signals with a non-issue. Excluded so the coverage report only counts
  // files that *can* actually be measured.
  'packages/scene/src/contract.ts',
  // ship.ts is a subprocess-orchestration command — its body is a sequence
  // of `git rev-parse`, `pnpm pack`, `pnpm publish --dry-run`, and the
  // final `pnpm publish` handoff. Vitest cannot meaningfully cover the
  // subprocess paths in-process; the end-to-end correctness is integration-
  // tested by the `czap ship --dry-run` flow that runs in every gauntlet
  // (package:smoke phase). The pure helpers it composes — ship-manifest.ts,
  // ship-capsule.ts, addressed-digest.ts — are unit-tested directly.
  // Unit coverage of the subprocess wrapper itself is a post-v0.1.1
  // task: ROADMAP Epic #4 (closed 2026-05-17) covered the helpers
  // composed by ship.ts (ship-emit, ship-manifest, ship-verify) but
  // ship.ts itself stays excluded as long as it's pure orchestration
  // of git + pnpm + npm subprocesses.
  'packages/cli/src/commands/ship.ts',
  // ffmpeg.ts (render backend) spawns the system `ffmpeg` binary to encode
  // VideoFrameOutput streams to mp4. Coverage requires ffmpeg on PATH —
  // tests/smoke/intro-render.test.ts skips when it isn't, so this surface
  // is structurally 0% on machines without ffmpeg installed. Matches the
  // audio/processor-bootstrap.ts pattern (host-realm-dependent). Moved to
  // @czap/command/host in CUT A1 capstone-1 (the cli path is now a re-export).
  'packages/command/src/host/ffmpeg.ts',
  // ffmpeg-encoder.ts is the STAGE-side twin of the above: the headless
  // FrameEncoder backend that spawns the system `ffmpeg` binary to encode the
  // video cast's frames to a real mp4. Its happy path IS exercised in-process
  // by tests/unit/stage/ffmpeg-encoder.test.ts (which env-gates on a real
  // ffmpeg+libx264), but its branch surface is dominated by host-realm error
  // paths only reachable when ffmpeg is ABSENT or the encode FAILS — the exact
  // opposite of the CI condition (where ffmpeg is installed and the encode
  // succeeds), so they are structurally uncoverable on a working runner. Same
  // host-dependent-backend rationale as command/host/ffmpeg.ts above.
  'packages/stage/src/ffmpeg-encoder.ts',
  // spawn-helpers.ts is a re-export shim — its only body is `export {...}
  // from './lib/spawn.js'`. The actual implementation in cli/src/lib/spawn.ts
  // is measured normally; v8 reports 0% on the shim because there are no
  // executable statements to track (re-export declarations aren't tracked
  // even when the re-export targets are exercised). Real consumers (vitest
  // -runner, spawn-quoting-drift drift test) keep the shim load-bearing.
  'packages/cli/src/spawn-helpers.ts',
];

/**
 * Timeout floor applied to every per-test timeout when coverage
 * instrumentation is on. V8 instrumentation multiplies wall-clock for
 * subprocess-heavy suites far beyond its nominal ~2x (tsx startup,
 * ts.Program builds, ffmpeg piping all re-instrument), so explicit
 * per-test timeouts must never undercut this floor — a literal
 * `}, 60_000)` under coverage silently LOWERS the config default and
 * turns an honest slow run into a flake.
 */
export const COVERAGE_TIMEOUT_FLOOR_MS = 240_000;

const timeoutScale = (): number => {
  const parsed = Number(process.env['CZAP_TEST_TIMEOUT_SCALE'] ?? '1');
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
};

// CZAP_COVERAGE is authoritative when present: test workers always receive it
// from the configs' `test.env` injection ('1' or '0'), while their argv never
// carries --coverage. The argv probe only decides for the config process
// itself, where the env var hasn't been injected yet.
const coverageActive = (): boolean => {
  const env = process.env['CZAP_COVERAGE'];
  if (env !== undefined) return env === '1';
  return process.argv.includes('--coverage');
};

/**
 * The ONLY sanctioned way to set an explicit vitest timeout (per-test
 * third argument, config default, or hook timeout).
 *
 * - Coverage runs (`--coverage` in the config process, `CZAP_COVERAGE=1`
 *   inside test workers — injected by the configs via `test.env`) clamp
 *   to {@link COVERAGE_TIMEOUT_FLOOR_MS} so explicit timeouts only ever
 *   raise the budget, never lower it.
 * - `CZAP_TEST_TIMEOUT_SCALE=<n>` multiplies every budget for machines
 *   running sibling workloads (slow hardware is not a test failure).
 *   CI does not set it, so gate semantics there are unchanged.
 *
 * Raw numeric timeout literals in test files are rejected by
 * tests/unit/meta/test-timeout-policy.test.ts.
 */
export function scaledTimeout(baseMs: number): number {
  const scaled = baseMs * timeoutScale();
  return coverageActive() ? Math.max(scaled, COVERAGE_TIMEOUT_FLOOR_MS) : scaled;
}

export const nodeTestInclude = [
  'tests/unit/**/*.test.ts',
  'tests/integration/**/*.test.ts',
  'tests/bench/**/*.test.ts',
  'tests/smoke/**/*.test.ts',
  'tests/property/**/*.test.ts',
  'tests/component/**/*.test.ts',
  'tests/regression/**/*.test.ts',
  'tests/generated/**/*.test.ts',
];
