import { ValidationError } from '@czap/error';

/**
 * Canonical gauntlet phase profile (CUT D8) — the ONE source of truth for the
 * release-grade gauntlet sequence. Every projection derives from this list:
 *   - the executor `scripts/gauntlet.ts` (imports + loops these serially);
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

/** The canonical 39-phase gauntlet sequence, in execution order. */
export const gauntletPhases: readonly GauntletPhase[] = [
  // ── Phase 0: Rig-check (env preflight) ─────────────────────────────
  { label: 'rig-check', command: 'pnpm run doctor -- --preflight --ci' },

  // ── Phase 1: Build + validate ──────────────────────────────────────
  { label: 'build', command: 'pnpm run build' },
  { label: 'capsule:compile', command: 'pnpm run capsule:compile' },
  { label: 'typecheck', command: 'pnpm run typecheck' },
  { label: 'lint', command: 'pnpm run lint' },
  { label: 'lint:structural', command: 'pnpm run lint:structural' },
  { label: 'docs:check', command: 'pnpm run docs:check' },
  { label: 'invariants', command: 'pnpm exec tsx packages/cli/src/bin.ts check-invariants' },
  { label: 'audit:floor', command: 'pnpm run audit:floor' },

  // ── Phase 2: Unit tests ────────────────────────────────────────────
  { label: 'test (unit + component + property + integration)', command: 'pnpm test' },

  // ── Phase 4: Integration, e2e, stress, bench ───────────────────────
  { label: 'test:vite', command: 'pnpm run test:vite' },
  { label: 'test:astro', command: 'pnpm run test:astro' },
  { label: 'test:cloudflare', command: 'pnpm run test:cloudflare' },
  { label: 'test:cloudflare-dev', command: 'pnpm run test:cloudflare-dev' },
  { label: 'test:tailwind', command: 'pnpm run test:tailwind' },
  { label: 'test:e2e', command: 'pnpm run test:e2e' },
  { label: 'test:e2e:stress', command: 'pnpm run test:e2e:stress' },
  { label: 'test:e2e:stream-stress', command: 'pnpm run test:e2e:stream-stress' },
  { label: 'test:flake', command: 'pnpm run test:flake' },
  { label: 'test:redteam', command: 'pnpm run test:redteam' },
  { label: 'bench', command: 'pnpm run bench' },
  { label: 'bench:gate', command: 'pnpm run bench:gate' },
  { label: 'bench:trend', command: 'BENCH_TREND_STRICT=1 pnpm run bench:trend' },
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
  // The raccoon-rule backstop run OVER THE REAL REPO (the agent-safety meta-gauntlet):
  // diffs the LIVE standards surface against the snapshot AS COMMITTED ON THE BASE REF
  // (via a REAL `git show`, not an injected hermetic reader) and reds on any UNSIGNED
  // weakening of the gauntlet's own rigor. FAIL-CLOSED — an unresolvable base ref / an
  // absent baseline snapshot THROWS (the gate refuses, never silently passes). CI sets
  // `CZAP_STANDARDS_BASE_REF` to a ref that has the snapshot + fetches its history
  // (see .github/workflows/ci.yml); a local run defaults to `main`.
  { label: 'standards:gate', command: 'pnpm run standards:gate' },
  // The capability-link proof (codex round-8 #1b) — the sanctioned-skip INTEGRITY family, beside
  // standards:gate/plumb:gate: every sanctioned capability-gated skip's guard must DERIVE FROM its
  // declared capability's probe (a ts.Program over the sanctioned files + the canonical capability
  // modules), or the cut reds. Opt-in `czap check --ir --capability-gate` runs the same proof.
  { label: 'capability:gate', command: 'pnpm run capability:gate' },
  { label: 'plumb:gate', command: 'pnpm run plumb:gate' },
  { label: 'capsule:verify', command: 'pnpm run capsule:verify' },
  { label: 'flex:verify', command: 'pnpm run flex:verify' },
];

/** The phase labels, in order — the projection the CLI dry-run emits. */
export function gauntletPhaseLabels(): readonly string[] {
  return gauntletPhases.map((phase) => phase.label);
}

// ── Tier 6 CI parallel profiles ─────────────────────────────────────────────
// Bench is NEVER sharded; source-mutating phases are quarantined from vitest shards.

export const CI_PARALLEL_SETUP_LABELS: readonly string[] = ['build', 'capsule:compile'];

export const CI_PARALLEL_SHARDED_TEST_LABEL = 'test (unit + component + property + integration)' as const;

export const CI_PARALLEL_BENCH_LABELS: readonly string[] = ['bench', 'bench:gate', 'bench:trend', 'bench:reality'];

export const CI_PARALLEL_MUTATING_LABELS: readonly string[] = ['capsule:verify'];

export const CI_PARALLEL_COVERAGE_LABELS: readonly string[] = [
  'coverage:browser',
  'merge-subprocess-v8',
  'coverage:merge',
];

export const CI_PARALLEL_FINAL_LABELS: readonly string[] = [
  'report:runtime-seams',
  'audit',
  'report:satellite-scan',
  'feedback:verify',
  'runtime:gate',
  'standards:gate',
  'capability:gate',
  'plumb:gate',
  'flex:verify',
];

export const CI_PARALLEL_TEST_SHARD_COUNT = 4;

export const CI_PARALLEL_PREFLIGHT_LABELS: readonly string[] = [
  'rig-check',
  'typecheck',
  'lint',
  'lint:structural',
  'docs:check',
  'invariants',
  'audit:floor',
];

export const CI_PARALLEL_INTEGRATION_LABELS: readonly string[] = [
  'test:vite',
  'test:astro',
  'test:cloudflare',
  'test:cloudflare-dev',
  'test:tailwind',
  'test:e2e',
  'test:e2e:stress',
  'test:e2e:stream-stress',
  'test:flake',
  'test:redteam',
];

const CI_PARALLEL_EXCLUDED_FROM_MID = new Set<string>([
  ...CI_PARALLEL_SETUP_LABELS,
  ...CI_PARALLEL_PREFLIGHT_LABELS,
  CI_PARALLEL_SHARDED_TEST_LABEL,
  ...CI_PARALLEL_INTEGRATION_LABELS,
  ...CI_PARALLEL_BENCH_LABELS,
  ...CI_PARALLEL_MUTATING_LABELS,
  'coverage:wipe-subprocess',
  'coverage:node:tracked',
  ...CI_PARALLEL_COVERAGE_LABELS,
  ...CI_PARALLEL_FINAL_LABELS,
]);

export const gauntletPhaseProfiles: Readonly<Record<string, readonly string[]>> = {
  'ci-parallel-preflight': CI_PARALLEL_PREFLIGHT_LABELS,
  'ci-parallel-integration': CI_PARALLEL_INTEGRATION_LABELS,
  'ci-parallel-bench': CI_PARALLEL_BENCH_LABELS,
  'ci-parallel-mutating': CI_PARALLEL_MUTATING_LABELS,
  'ci-parallel-coverage': CI_PARALLEL_COVERAGE_LABELS,
  'ci-parallel-final': CI_PARALLEL_FINAL_LABELS,
  'ci-parallel-mid': gauntletPhases
    .map((phase) => phase.label)
    .filter((label) => !CI_PARALLEL_EXCLUDED_FROM_MID.has(label)),
};

export interface GauntletPhaseSelection {
  readonly only?: readonly string[];
  readonly skip?: readonly string[];
  readonly profile?: string;
  readonly skipBuild?: boolean;
}

function labelsForSelection(selection: GauntletPhaseSelection): readonly string[] {
  if (selection.profile !== undefined) {
    const profile = gauntletPhaseProfiles[selection.profile];
    if (profile === undefined) {
      throw ValidationError(
        'gauntlet-phases',
        `Unknown gauntlet profile "${selection.profile}". Known: ${Object.keys(gauntletPhaseProfiles).join(', ')}`,
      );
    }
    return profile;
  }
  if (selection.only !== undefined && selection.only.length > 0) {
    return selection.only;
  }
  return gauntletPhaseLabels();
}

export function selectGauntletPhases(selection: GauntletPhaseSelection = {}): readonly GauntletPhase[] {
  const selectedLabels = labelsForSelection(selection);
  if (selection.only !== undefined && selection.only.length > 0) {
    const known = new Set(gauntletPhaseLabels());
    const unknown = selection.only.filter((label) => !known.has(label));
    if (unknown.length > 0) {
      throw ValidationError('gauntlet-phases', `Unknown gauntlet phase label(s): ${unknown.join(', ')}`);
    }
  }
  const selected = new Set(selectedLabels);
  const skip = new Set(selection.skip ?? []);
  if (selection.skipBuild) {
    for (const label of CI_PARALLEL_SETUP_LABELS) {
      skip.add(label);
    }
  }
  return gauntletPhases.filter((phase) => selected.has(phase.label) && !skip.has(phase.label));
}
