/**
 * CI plan projection — turn the check registry into the JSON matrix the CI
 * parallel merge gate fans out over. This is the DEVOPS DUAL of the serial
 * gauntlet projection (`packages/cli/src/gauntlet-phases.ts`): where that file
 * projects {@link CHECK_REGISTRY} into the ORDERED serial phase list, this file
 * partitions the SAME registry into the NAMED PARALLEL LANES the GitHub Actions
 * workflow (`.github/workflows/ci.yml`) runs concurrently.
 *
 * The `plan` job runs `pnpm exec tsx scripts/ci-plan.ts` and publishes the
 * emitted (compact) JSON as its `matrix` output; each gauntlet lane then consumes
 * `fromJSON(needs.plan.outputs.matrix).lanes.<lane>.command` to prove — at CI
 * runtime — that its hand-written lane command is byte-identical to the command
 * this projection derives. The offline meta test
 * (`tests/unit/meta/ci-registry-parity.test.ts`) proves the same equality at
 * merge time and binds each lane's `checkIds` back to the gauntlet phase profiles.
 *
 * SOURCE PROFILE — `release`, not `full`. The parallel merge gate is the RELEASE
 * gauntlet fanned out: `gauntletPhases` (the sequence the lanes run) is the
 * `release`-filtered projection of the registry, and the bench / integration /
 * e2e / coverage lanes run RELEASE-only checks that the `full` profile does not
 * contain. Projecting `full` therefore could not reproduce those lanes; the
 * lane partition here is validated against `planChecks('release', 'linux')`.
 *
 * PURE: this script reads only the (self-contained, dependency-free) check
 * registry source — it never builds, spawns, or touches the filesystem. It is
 * safe to run in the `plan` job before any workspace `dist` exists.
 *
 * @module
 */

import { pathToFileURL } from 'node:url';
import { CHECK_REGISTRY } from '../packages/command/src/checks/registry.js';
import { planChecks } from '../packages/command/src/checks/plan.js';
import type { CheckPlatform, CheckProfile } from '../packages/command/src/checks/definition.js';

/** The platform the parallel merge gate runs on (ubuntu-latest). */
const PLATFORM: CheckPlatform = 'linux';

/**
 * The source profile the lane partition projects. The parallel merge gate is the
 * release gauntlet fanned out (see the module header), so the lanes partition the
 * `release` check set, not `full`.
 */
const SOURCE_PROFILE: CheckProfile = 'release';

/** The vitest shard fan-out width — mirrors `CI_PARALLEL_TEST_SHARD_COUNT`; asserted equal by the meta test. */
const SHARD_COUNT = 4;

/**
 * The gauntlet:full command a `ci-parallel-<name>` lane runs. BYTE-IDENTICAL to
 * the hand-written lane command in ci.yml — the whole point of the projection is
 * that this equals what the lane already runs.
 */
function gauntletLaneCommand(profile: string): string {
  return `pnpm run gauntlet:full -- --profile ${profile} --skip-build`;
}

/** One lane of the CI parallel merge gate — the projection SPEC (checks + how the lane is invoked). */
export interface LaneSpec {
  /** The ci.yml job that owns this lane. */
  readonly job: string;
  /**
   * How the lane is invoked:
   * - `gauntlet`  — runs a `ci-parallel-<name>` gauntlet profile.
   * - `sharded`   — the vitest shard fan-out of the aggregate test suite.
   * - `coverage`  — the browser-coverage + shard-merge coverage-floor lane.
   */
  readonly kind: 'gauntlet' | 'sharded' | 'coverage';
  /** For a `gauntlet` lane, the gauntlet phase profile it runs. */
  readonly profile?: string;
  /** The registry check ids this lane asserts (its slice of the release partition). */
  readonly checkIds: readonly string[];
  /** Executor-only phase labels the lane runs that carry no registry check (e.g. `invariants`). */
  readonly executorOnly?: readonly string[];
  /** For a `coverage` lane, the ordered commands the lane's jobs run. */
  readonly commands?: readonly string[];
}

/** A release check executed by a named CI job outside the gauntlet lane profiles. */
export interface SpecializedCheckSpec {
  /** The registry check this job executes. */
  readonly checkId: string;
  /** The ci.yml job that owns the check. */
  readonly job: string;
}

/**
 * The lane projection spec — every CI parallel lane, keyed by a GHA-property-safe
 * name (no hyphens, so `fromJSON(...).lanes.<key>` dot-access works). The `checkIds`
 * are the lane's slice of the release check partition; the meta test binds them to
 * the gauntlet phase profiles (`gauntletPhaseProfiles`) so a lane/profile drift reds.
 */
export const CI_LANE_SPECS: Readonly<Record<string, LaneSpec>> = {
  preflight: {
    job: 'truth-linux-parallel-preflight',
    kind: 'gauntlet',
    profile: 'ci-parallel-preflight',
    checkIds: [
      'check/typecheck',
      'check/lint',
      'check/lint-structural',
      'check/docs-fast',
      'check/docs',
      'check/assurance-density',
      'check/test-constitution',
      'check/gates',
      'check/audit-floor',
    ],
    executorOnly: ['invariants'],
  },
  shardedTest: {
    job: 'truth-linux-parallel-test',
    kind: 'sharded',
    checkIds: ['check/test'],
  },
  bench: {
    job: 'truth-linux-parallel-bench',
    kind: 'gauntlet',
    profile: 'ci-parallel-bench',
    checkIds: ['check/bench', 'check/bench-gate', 'check/bench-contracts', 'check/bench-trend', 'check/bench-reality'],
  },
  mutating: {
    job: 'truth-linux-parallel-mutating',
    kind: 'gauntlet',
    profile: 'ci-parallel-mutating',
    checkIds: ['check/capsule-verify'],
  },
  integration: {
    job: 'truth-linux-parallel-integration',
    kind: 'gauntlet',
    profile: 'ci-parallel-integration',
    checkIds: [
      'check/test-vite',
      'check/test-astro',
      'check/test-cloudflare',
      'check/test-cloudflare-dev',
      'check/test-tailwind',
      'check/test-e2e',
      'check/test-e2e-stress',
      'check/test-e2e-stream-stress',
      'check/test-flake',
      'check/test-redteam',
    ],
  },
  mid: {
    job: 'truth-linux-parallel-mid',
    kind: 'gauntlet',
    profile: 'ci-parallel-mid',
    checkIds: ['check/package-smoke'],
  },
  coverage: {
    job: 'truth-linux-parallel-coverage-browser',
    kind: 'coverage',
    checkIds: ['check/coverage'],
    commands: ['pnpm run coverage:browser', 'pnpm run coverage:merge-shards'],
  },
  final: {
    job: 'truth-linux-parallel-final',
    kind: 'gauntlet',
    profile: 'ci-parallel-final',
    checkIds: [
      'check/report-runtime-seams',
      'check/audit',
      'check/report-adaptive-scan',
      'check/feedback-verify',
      'check/runtime-gate',
      'check/standards-gate',
      'check/capability-gate',
      'check/spine-relation-gate',
      'check/transition-gate',
      'check/plumb-gate',
      'check/flex-verify',
    ],
  },
};

/**
 * Blocking release checks whose execution has a real, named CI owner outside
 * the gauntlet profile lanes. Commands are deliberately absent here: they are
 * projected from CHECK_REGISTRY in {@link buildCiPlan}, so this table can assign
 * ownership but cannot invent a second command truth.
 */
export const CI_SPECIALIZED_CHECK_SPECS: Readonly<Record<string, SpecializedCheckSpec>> = {
  format: {
    checkId: 'check/format',
    job: 'format',
  },
  doctor: {
    checkId: 'check/doctor',
    job: 'truth-linux-parallel-setup',
  },
  benchAlloc: {
    checkId: 'check/bench-alloc',
    job: 'truth-linux-parallel-bench',
  },
  journey: {
    checkId: 'check/journey',
    job: 'truth-linux-parallel-consumer',
  },
  hermetic: {
    checkId: 'check/hermetic',
    job: 'truth-linux-parallel-consumer',
  },
  devx: {
    checkId: 'check/devx',
    job: 'truth-linux-parallel-final',
  },
};

/** One projected lane in the emitted matrix — the lane spec resolved to its run command(s). */
export interface CiPlanLane {
  /** The ci.yml job that owns this lane. */
  readonly job: string;
  /** The lane invocation kind (`gauntlet` / `sharded` / `coverage`). */
  readonly kind: 'gauntlet' | 'sharded' | 'coverage';
  /** For a gauntlet lane, the `ci-parallel-<name>` profile it runs. */
  readonly profile?: string;
  /** The primary command the lane runs (the one a consuming guard compares against). */
  readonly command: string;
  /** All commands the lane's jobs run (length > 1 only for the coverage lane). */
  readonly commands: readonly string[];
  /** The registry check ids this lane asserts, in spec order. */
  readonly checkIds: readonly string[];
  /** Executor-only phase labels with no registry check (e.g. `invariants`). */
  readonly executorOnly: readonly string[];
  /** The shard fan-out width (present only on the sharded-test lane). */
  readonly shardCount?: number;
}

/** One registry-derived check executed by a named specialized CI job. */
export interface CiPlanSpecializedCheck {
  /** The registry check id. */
  readonly checkId: string;
  /** The ci.yml job that owns the check. */
  readonly job: string;
  /** The exact command projected from CHECK_REGISTRY. */
  readonly command: string;
}

/** One ownership claim used by the release-partition validator. */
export interface CiCheckAssignment {
  /** The registry check id being claimed. */
  readonly checkId: string;
  /** The projection key that claims it (lane or specialized-check key). */
  readonly owner: string;
}

/** Injectable ownership specs used by the red fixtures for plan construction. */
export interface CiPlanBuildOptions {
  /** Named gauntlet/shard/coverage lane ownership. */
  readonly laneSpecs?: Readonly<Record<string, LaneSpec>>;
  /** Named specialized-job ownership. */
  readonly specializedCheckSpecs?: Readonly<Record<string, SpecializedCheckSpec>>;
}

/** The full CI plan matrix — the projection the `plan` job publishes as its `matrix` output. */
export interface CiPlan {
  /** Schema tag for the emitted artifact. */
  readonly schema: 'liteship/ci-plan@1';
  /** The check profile the lane partition projects (`release`). */
  readonly sourceProfile: CheckProfile;
  /** The platform the merge gate runs on (`linux`). */
  readonly platform: CheckPlatform;
  /** The vitest shard fan-out width. */
  readonly shardCount: number;
  /** Every CI parallel lane, keyed by a GHA-property-safe name. */
  readonly lanes: Readonly<Record<string, CiPlanLane>>;
  /** Named checks executed by specialized jobs outside the gauntlet profile lanes. */
  readonly specializedChecks: Readonly<Record<string, CiPlanSpecializedCheck>>;
  /** Release checks with no projected lane or specialized owner (must be empty for blocking checks). */
  readonly unfannedReleaseChecks: readonly string[];
  /** A summary of the source `planChecks(sourceProfile, platform)` projection. */
  readonly plan: {
    readonly profile: CheckProfile;
    readonly platform: CheckPlatform;
    readonly checkCount: number;
    readonly estimatedMs: number;
  };
}

/**
 * Assert that every blocking release check has exactly one CI owner. Kept as a
 * small pure function so red fixtures can prove both missing and duplicate
 * ownership fail without mutating the production registry.
 */
export function assertBlockingReleasePartition(
  blockingReleaseCheckIds: readonly string[],
  assignments: readonly CiCheckAssignment[],
): void {
  const claims = new Map<string, string[]>();
  for (const assignment of assignments) {
    const owners = claims.get(assignment.checkId) ?? [];
    owners.push(assignment.owner);
    claims.set(assignment.checkId, owners);
  }

  const duplicate = [...claims.entries()].find(([, owners]) => owners.length > 1);
  if (duplicate !== undefined) {
    const [checkId, owners] = duplicate;
    throw new Error(`ci-plan check id "${checkId}" is claimed more than once (${owners.join(', ')})`);
  }

  const missing = blockingReleaseCheckIds.filter((id) => !claims.has(id));
  if (missing.length > 0) {
    throw new Error(`ci-plan has unassigned blocking release checks: ${missing.join(', ')}`);
  }
}

/** Resolve a lane spec to its emitted lane (command derivation + shard/coverage details). */
function resolveLane(spec: LaneSpec): CiPlanLane {
  let commands: readonly string[];
  if (spec.kind === 'gauntlet') {
    if (spec.profile === undefined) {
      throw new Error('gauntlet lane spec is missing its profile');
    }
    commands = [gauntletLaneCommand(spec.profile)];
  } else if (spec.kind === 'sharded') {
    commands = ['pnpm run test:shard'];
  } else {
    if (spec.commands === undefined || spec.commands.length === 0) {
      throw new Error('coverage lane spec is missing its commands');
    }
    commands = spec.commands;
  }
  return {
    job: spec.job,
    kind: spec.kind,
    ...(spec.profile !== undefined ? { profile: spec.profile } : {}),
    command: commands[0]!,
    commands,
    checkIds: spec.checkIds,
    executorOnly: spec.executorOnly ?? [],
    ...(spec.kind === 'sharded' ? { shardCount: SHARD_COUNT } : {}),
  };
}

/**
 * Build the CI plan matrix from the check registry. PURE + TOTAL. Validates that
 * every lane `checkId` is a real `release`-profile check and that the lanes
 * partition the release set DISJOINTLY — a drift (a renamed/removed check, a
 * lane double-claiming a check) throws here rather than emitting a silent matrix.
 */
export function buildCiPlan(options: CiPlanBuildOptions = {}): CiPlan {
  const releasePlan = planChecks(SOURCE_PROFILE, PLATFORM);
  const releaseIds = new Set(releasePlan.checks.map((check) => check.id));
  const registryById = new Map(CHECK_REGISTRY.map((check) => [check.id, check] as const));
  const registryIds = new Set(registryById.keys());
  const laneSpecs = options.laneSpecs ?? CI_LANE_SPECS;
  const specializedCheckSpecs = options.specializedCheckSpecs ?? CI_SPECIALIZED_CHECK_SPECS;

  const lanes: Record<string, CiPlanLane> = {};
  const assignments: CiCheckAssignment[] = [];
  for (const [key, spec] of Object.entries(laneSpecs)) {
    for (const id of spec.checkIds) {
      if (!registryIds.has(id)) {
        throw new Error(`ci-plan lane "${key}" references unknown check id "${id}"`);
      }
      if (!releaseIds.has(id)) {
        throw new Error(
          `ci-plan lane "${key}" references non-release check id "${id}" (lanes fan out the release gauntlet)`,
        );
      }
      assignments.push({ checkId: id, owner: `lane:${key}` });
    }
    lanes[key] = resolveLane(spec);
  }

  const specializedChecks: Record<string, CiPlanSpecializedCheck> = {};
  for (const [key, spec] of Object.entries(specializedCheckSpecs)) {
    const check = registryById.get(spec.checkId);
    if (check === undefined) {
      throw new Error(`ci-plan specialized check "${key}" references unknown check id "${spec.checkId}"`);
    }
    if (!releaseIds.has(spec.checkId)) {
      throw new Error(
        `ci-plan specialized check "${key}" references non-release check id "${spec.checkId}" (the merge gate projects release)`,
      );
    }
    assignments.push({ checkId: spec.checkId, owner: `specialized:${key}` });
    specializedChecks[key] = {
      checkId: spec.checkId,
      job: spec.job,
      command: check.command,
    };
  }

  const blockingReleaseIds = releasePlan.checks
    .filter((check) => check.authority === 'blocking')
    .map((check) => check.id);
  assertBlockingReleasePartition(blockingReleaseIds, assignments);

  const assignedIds = new Set(assignments.map((assignment) => assignment.checkId));
  const unfannedReleaseChecks = releasePlan.checks.map((check) => check.id).filter((id) => !assignedIds.has(id));

  return {
    schema: 'liteship/ci-plan@1',
    sourceProfile: SOURCE_PROFILE,
    platform: PLATFORM,
    shardCount: SHARD_COUNT,
    lanes,
    specializedChecks,
    unfannedReleaseChecks,
    plan: {
      profile: releasePlan.profile,
      platform: releasePlan.platform,
      checkCount: releasePlan.checks.length,
      estimatedMs: releasePlan.estimatedMs,
    },
  };
}

/** CLI entry: emit the compact matrix JSON on stdout (default) or a pretty tree (`--pretty`). */
function main(argv: readonly string[]): void {
  const plan = buildCiPlan();
  if (argv.includes('--pretty')) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }
  // Compact single line so the `plan` job can `echo "matrix=$(...)" >> "$GITHUB_OUTPUT"`.
  process.stdout.write(`${JSON.stringify(plan)}\n`);
}

/** True iff this module is the process entry point (run directly, not imported). */
function isDirectExecution(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  return moduleUrl === pathToFileURL(entry).href;
}

if (isDirectExecution(import.meta.url)) {
  main(process.argv.slice(2));
}
