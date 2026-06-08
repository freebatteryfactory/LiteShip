/**
 * Canonical gauntlet phase profile (CUT D8) — the ONE source of truth for the
 * release-grade gauntlet sequence. Every projection derives from this list:
 *   - the executor `scripts/gauntlet.ts` (imports + loops these);
 *   - the CLI dry-run (`czap gauntlet --dry-run` projects `label`s);
 *   - the meta tests.
 *
 * It lives in the CLI package because the CLI is a composite project (`rootDir:
 * ./src`) that cannot import out to `scripts/`; the proven direction is the
 * reverse — `scripts/gauntlet.ts` imports DOWN into the CLI (the same pattern as
 * `scripts/lib/spawn.ts → @czap/cli`). It is the published command surface owning
 * the phase vocabulary it exposes, not "the CLI owning devops".
 *
 * Order + commands are transcribed verbatim from the executor's real run-order.
 * The type is intentionally minimal — only what the executor consumes per phase
 * (everything else: env, cwd, watchdog defaults, timings, exit handling, is global
 * in the executor).
 *
 * @module
 */

/** One gauntlet phase. `command` is a full shell line (spawned `shell:true`) — NOT derivable from `label`. */
export interface GauntletPhase {
  /** Display + bookkeeping identity (banner, timings artifact, CLI receipt). */
  readonly label: string;
  /** The full shell command to spawn. */
  readonly command: string;
  /** Optional stdout marker signalling "work done, safe to reap" (only `coverage:browser`). */
  readonly doneMarker?: RegExp;
  /** Optional grace window (ms) after `doneMarker` before tree-kill (default 60_000; only with a marker). */
  readonly gracePeriodMs?: number;
}

/** The canonical 32-phase gauntlet sequence, in execution order. */
export const gauntletPhases: readonly GauntletPhase[] = [
  // ── Phase 1: Build + validate ──────────────────────────────────────
  { label: 'build', command: 'pnpm run build' },
  { label: 'capsule:compile', command: 'pnpm run capsule:compile' },
  { label: 'typecheck', command: 'pnpm run typecheck' },
  { label: 'lint', command: 'pnpm run lint' },
  { label: 'docs:check', command: 'pnpm run docs:check' },
  { label: 'invariants', command: 'pnpm exec tsx scripts/check-invariants.ts' },

  // ── Phase 2: Unit tests ────────────────────────────────────────────
  { label: 'test (unit + component + property + integration)', command: 'pnpm test' },

  // ── Phase 4: Integration, e2e, stress, bench ───────────────────────
  { label: 'test:vite', command: 'pnpm run test:vite' },
  { label: 'test:astro', command: 'pnpm run test:astro' },
  { label: 'test:tailwind', command: 'pnpm run test:tailwind' },
  { label: 'test:e2e', command: 'pnpm run test:e2e' },
  { label: 'test:e2e:stress', command: 'pnpm run test:e2e:stress' },
  { label: 'test:e2e:stream-stress', command: 'pnpm run test:e2e:stream-stress' },
  { label: 'test:flake', command: 'pnpm run test:flake' },
  { label: 'test:redteam', command: 'pnpm run test:redteam' },
  { label: 'bench', command: 'pnpm run bench' },
  { label: 'bench:gate', command: 'pnpm run bench:gate' },
  { label: 'bench:trend', command: 'pnpm run bench:trend' },
  { label: 'bench:reality', command: 'pnpm run bench:reality' },
  { label: 'package:smoke', command: 'pnpm run package:smoke' },

  // ── Phase 5: Coverage (sequential) + merge ─────────────────────────
  { label: 'coverage:wipe-subprocess', command: 'rimraf coverage/subprocess-raw' },
  { label: 'coverage:node:tracked', command: 'pnpm run coverage:node:tracked' },
  // Browser coverage on Windows can hang during Chromium teardown after the v8
  // report is already emitted; the doneMarker + 90s grace lets the table finish,
  // then the executor tree-kills any orphan Chromium so the gauntlet advances.
  {
    label: 'coverage:browser',
    command: 'pnpm run coverage:browser',
    doneMarker: /Coverage report from v8/,
    gracePeriodMs: 90_000,
  },
  { label: 'merge-subprocess-v8', command: 'tsx scripts/merge-subprocess-v8.ts' },
  { label: 'coverage:merge', command: 'tsx scripts/merge-coverage.ts' },

  // ── Phase 6: Reports + gates ───────────────────────────────────────
  { label: 'report:runtime-seams', command: 'pnpm run report:runtime-seams' },
  { label: 'audit', command: 'pnpm run audit' },
  { label: 'report:satellite-scan', command: 'pnpm run report:satellite-scan' },
  { label: 'feedback:verify', command: 'pnpm run feedback:verify' },
  { label: 'runtime:gate', command: 'pnpm run runtime:gate' },
  { label: 'capsule:verify', command: 'pnpm run capsule:verify' },
  { label: 'flex:verify', command: 'pnpm run flex:verify' },
];

/** The phase labels, in order — the projection the CLI dry-run emits. */
export function gauntletPhaseLabels(): readonly string[] {
  return gauntletPhases.map((phase) => phase.label);
}
