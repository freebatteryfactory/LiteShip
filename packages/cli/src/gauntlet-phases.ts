import { ValidationError } from '@liteship/error';
import { CHECK_REGISTRY, type CheckDefinition } from '@liteship/command';

/**
 * Canonical gauntlet phase profile (CUT D8) — the release-grade gauntlet sequence.
 * It is no longer a hand-transcribed literal: `gauntletPhases` is a PROJECTION of
 * `@liteship/command`'s {@link CHECK_REGISTRY} (the single source of truth for what a
 * root-script check ASSERTS and the exact command that asserts it), filtered to the
 * checks whose `profiles` include `"release"` and ordered by the companion
 * {@link RELEASE_GAUNTLET_PROJECTION} spec. Every projection still derives from ONE
 * place:
 *   - the executor `scripts/gauntlet.ts` (imports + loops these serially);
 *   - the CLI dry-run (`liteship gauntlet --dry-run` projects `label`s);
 *   - the meta tests.
 *
 * The COMMAND of every check-backed phase is pulled from the registry entry
 * (`CheckDefinition.command`) — never restated here — so a command change in the
 * registry flows through to the gauntlet automatically. The projection spec supplies
 * only the gauntlet `label` (the executor's banner/timings identity, which differs
 * from the registry `id`) plus the executor-only phases the registry does NOT model:
 * `build` / `capsule:compile` / `invariants` and the `coverage:*` plumbing (the
 * coverage FLOOR is `check/coverage`, but the gauntlet runs the split node/browser/
 * merge sub-phases). `check/format`, `check/devx`, `check/bench-alloc`, and
 * `check/coverage` are release checks that are NOT gauntlet phases (the gauntlet runs
 * the coverage plumbing sub-phases instead, and format/devx/bench-alloc ride the
 * profile lanes but not the serial executor), so the projection omits them.
 *
 * It lives in the CLI package because the CLI is a composite project (`rootDir:
 * ./src`) that cannot import out to `scripts/`; the proven direction is the
 * reverse — `scripts/gauntlet.ts` imports DOWN into the CLI (the same pattern as
 * `scripts/lib/spawn.ts → @liteship/cli`). It is the published command surface owning
 * the phase vocabulary it exposes, not "the CLI owning devops".
 *
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

/**
 * One entry of the ordered release-gauntlet projection spec. EITHER a reference to a
 * {@link CHECK_REGISTRY} entry (surfaced under a gauntlet `label`, its `command`
 * pulled from the registry) OR a LITERAL executor-only phase the registry does not
 * model (`build` / `capsule:compile` / `invariants` / the `coverage:*` plumbing).
 */
type PhaseProjection =
  | {
      /** The registry check whose `command` this phase runs. */
      readonly checkId: string;
      /** The gauntlet banner/timings label (differs from the registry `id`). */
      readonly label: string;
    }
  | {
      /** A literal executor-only phase the registry does not model. */
      readonly phase: GauntletPhase;
    };

/**
 * The ORDERED projection spec — the companion id-list that preserves the executor's
 * exact serial run-order. Check references resolve their `command` from
 * {@link CHECK_REGISTRY} (a release-profile assertion); literals are the executor-only
 * phases (`build` / `capsule:compile` / `invariants` / `coverage:*` plumbing) that
 * carry no registry check. Editing the order or a label here — or a `command` in the
 * registry — is the ONLY way to change the sequence; the meta test pins it byte-for-byte.
 */
const RELEASE_GAUNTLET_PROJECTION: readonly PhaseProjection[] = [
  // ── Phase 0: Rig-check (env preflight) ─────────────────────────────
  { checkId: 'check/doctor', label: 'rig-check' },

  // ── Phase 1: Build + validate ──────────────────────────────────────
  { phase: { label: 'build', command: 'pnpm run build' } },
  { phase: { label: 'capsule:compile', command: 'pnpm run capsule:compile' } },
  { checkId: 'check/typecheck', label: 'typecheck' },
  { checkId: 'check/lint', label: 'lint' },
  { checkId: 'check/lint-structural', label: 'lint:structural' },
  { checkId: 'check/docs', label: 'docs:check' },
  { phase: { label: 'invariants', command: 'pnpm exec tsx packages/cli/src/bin.ts check-invariants' } },
  { checkId: 'check/gates', label: 'check:gates' },
  { checkId: 'check/audit-floor', label: 'audit:floor' },

  // ── Phase 2: Unit tests ────────────────────────────────────────────
  { checkId: 'check/test', label: 'test (unit + component + property + integration)' },

  // ── Phase 4: Integration, e2e, stress, bench ───────────────────────
  { checkId: 'check/test-vite', label: 'test:vite' },
  { checkId: 'check/test-astro', label: 'test:astro' },
  { checkId: 'check/test-cloudflare', label: 'test:cloudflare' },
  { checkId: 'check/test-cloudflare-dev', label: 'test:cloudflare-dev' },
  { checkId: 'check/test-tailwind', label: 'test:tailwind' },
  { checkId: 'check/test-e2e', label: 'test:e2e' },
  { checkId: 'check/test-e2e-stress', label: 'test:e2e:stress' },
  { checkId: 'check/test-e2e-stream-stress', label: 'test:e2e:stream-stress' },
  { checkId: 'check/test-flake', label: 'test:flake' },
  { checkId: 'check/test-redteam', label: 'test:redteam' },
  { checkId: 'check/bench', label: 'bench' },
  { checkId: 'check/bench-gate', label: 'bench:gate' },
  { checkId: 'check/bench-trend', label: 'bench:trend' },
  { checkId: 'check/bench-reality', label: 'bench:reality' },
  { checkId: 'check/package-smoke', label: 'package:smoke' },

  // ── Phase 5: Coverage (sequential) + merge ─────────────────────────
  { phase: { label: 'coverage:wipe-subprocess', command: 'rimraf coverage/subprocess-raw' } },
  { phase: { label: 'coverage:node:tracked', command: 'pnpm run coverage:node:tracked' } },
  // Browser coverage on Windows can hang during Chromium teardown after the v8
  // report is already emitted; the doneMarker + 90s grace lets the table finish,
  // then the executor tree-kills any orphan Chromium so the gauntlet advances.
  {
    phase: {
      label: 'coverage:browser',
      command: 'pnpm run coverage:browser',
      doneMarker: /Coverage report from v8/,
      gracePeriodMs: 90_000,
    },
  },
  { phase: { label: 'merge-subprocess-v8', command: 'tsx scripts/merge-subprocess-v8.ts' } },
  { phase: { label: 'coverage:merge', command: 'tsx scripts/merge-coverage.ts' } },

  // ── Phase 6: Reports + gates ───────────────────────────────────────
  { checkId: 'check/report-runtime-seams', label: 'report:runtime-seams' },
  { checkId: 'check/audit', label: 'audit' },
  { checkId: 'check/report-adaptive-scan', label: 'report:adaptive-scan' },
  { checkId: 'check/feedback-verify', label: 'feedback:verify' },
  { checkId: 'check/runtime-gate', label: 'runtime:gate' },
  // The raccoon-rule backstop run OVER THE REAL REPO (the agent-safety meta-gauntlet):
  // diffs the LIVE standards surface against the snapshot AS COMMITTED ON THE BASE REF
  // (via a REAL `git show`, not an injected hermetic reader) and reds on any UNSIGNED
  // weakening of the gauntlet's own rigor. FAIL-CLOSED — an unresolvable base ref / an
  // absent baseline snapshot THROWS (the gate refuses, never silently passes). CI sets
  // `LITESHIP_STANDARDS_BASE_REF` to a ref that has the snapshot + fetches its history
  // (see .github/workflows/ci.yml); a local run defaults to `main`.
  { checkId: 'check/standards-gate', label: 'standards:gate' },
  // The capability-link proof (codex round-8 #1b) — the sanctioned-skip INTEGRITY family, beside
  // standards:gate/plumb:gate: every sanctioned capability-gated skip's guard must DERIVE FROM its
  // declared capability's probe (a ts.Program over the sanctioned files + the canonical capability
  // modules), or the cut reds. Opt-in `liteship check --ir --capability-gate` runs the same proof.
  { checkId: 'check/capability-gate', label: 'capability:gate' },
  // The two-axis spine-relation proof (Wave 8.5, #156) — the CONSTITUTION / public-surface
  // INTEGRITY family, beside standards:gate/capability:gate: every admitted @liteship/_spine mirror
  // type's OBSERVED bidirectional-assignability relation must still satisfy its ADMITTED (frozen)
  // relation (a ts.Program probe over the spine + runtime surface), or the cut reds. A SECOND
  // ts.Program build (~3.25s) too heavy for the default `liteship check --ir`, so it runs HERE as its
  // own phase; the equivalent opt-in path is `liteship check --ir --spine-relation`.
  { checkId: 'check/spine-relation-gate', label: 'spine-relation:gate' },
  // The reactive BISIMULATION proof (Wave 5.5, the transition cage) — the CONSTITUTION /
  // conformance INTEGRITY family, beside spine-relation:gate/capability:gate: every pinned
  // op history that bisimulates the CURRENT declared reactive model must still bisimulate on
  // the native transport (each family under its declared EmissionPolicy), or the cut reds. The
  // reference model + native-transport oracle are LiteShip-local (tests/support), so — per
  // ADR-0012/0023 — the gate is HOSTED here as a repo-local phase rather than the shipped CLI,
  // guaranteeing the L4 conformance proof runs on every PR (reachable, never fixture-only).
  { checkId: 'check/transition-gate', label: 'transition:gate' },
  { checkId: 'check/plumb-gate', label: 'plumb:gate' },
  { checkId: 'check/capsule-verify', label: 'capsule:verify' },
  { checkId: 'check/flex-verify', label: 'flex:verify' },
];

/**
 * Project {@link CHECK_REGISTRY} into the ordered gauntlet phase list. For every
 * check reference in {@link RELEASE_GAUNTLET_PROJECTION}, resolve the registry entry
 * by id, ASSERT it is a release-profile check (the "filtered to profiles.includes
 * ('release')" contract — a projection reference to a non-release or unknown check is
 * a wiring bug that throws at module load, never a silent drift), and surface it as a
 * {@link GauntletPhase} whose `command` is the registry entry's command under the
 * gauntlet `label`. Literal executor-only phases pass through verbatim. PURE + total.
 */
export function projectGauntletPhases(registry: readonly CheckDefinition[]): readonly GauntletPhase[] {
  const byId = new Map(registry.map((check) => [check.id, check] as const));
  return RELEASE_GAUNTLET_PROJECTION.map((entry): GauntletPhase => {
    if ('phase' in entry) return entry.phase;
    const check = byId.get(entry.checkId);
    if (check === undefined) {
      throw ValidationError('gauntlet-phases', `projection references unknown check id "${entry.checkId}"`);
    }
    if (!check.profiles.includes('release')) {
      throw ValidationError(
        'gauntlet-phases',
        `projection references check "${entry.checkId}", which is not a release-profile check (profiles: ${check.profiles.join(', ')})`,
      );
    }
    return { label: entry.label, command: check.command };
  });
}

/** The canonical gauntlet sequence, in execution order — the release-filtered projection of CHECK_REGISTRY. */
export const gauntletPhases: readonly GauntletPhase[] = projectGauntletPhases(CHECK_REGISTRY);

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
  'report:adaptive-scan',
  'feedback:verify',
  'runtime:gate',
  'standards:gate',
  'capability:gate',
  'spine-relation:gate',
  'transition:gate',
  'plumb:gate',
  'flex:verify',
];

export const CI_PARALLEL_TEST_SHARD_COUNT = 4;

export const CI_PARALLEL_PREFLIGHT_LABELS: readonly string[] = [
  'typecheck',
  'lint',
  'lint:structural',
  'docs:check',
  'invariants',
  'check:gates',
  'audit:floor',
];

/** Local-safe sweep — build through capability:gate without e2e/coverage/bench (0.9 tier accept bar). */
export const LOCAL_SAFE_LABELS: readonly string[] = [
  'build',
  'capsule:compile',
  'typecheck',
  'lint',
  'lint:structural',
  'invariants',
  'check:gates',
  'audit:floor',
  CI_PARALLEL_SHARDED_TEST_LABEL,
  'standards:gate',
  'capability:gate',
  'spine-relation:gate',
  'transition:gate',
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
  'rig-check',
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
  'local-safe': LOCAL_SAFE_LABELS,
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
