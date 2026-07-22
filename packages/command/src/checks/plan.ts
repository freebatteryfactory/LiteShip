/**
 * Check planning (pure projection) — turn a `(profile, platform)` pair into the
 * ordered, cache-annotated list of checks a projection will run. {@link planChecks}
 * is TOTAL and PURE: it filters {@link CHECK_REGISTRY} by profile membership and
 * platform support, preserves the registry's declared order (cheapest → heaviest),
 * and records the platform-skipped checks with a reason. It runs NOTHING — the
 * `--plan` surface is exactly this projection, printed.
 *
 * The plan carries every field a host needs to schedule + cache a check without
 * re-reading the registry: the `command` to spawn, the `authority` that decides
 * whether a finding blocks, and `cacheable` (a content-addressed check whose
 * verdict a warm run may skip, reusing `@liteship/gauntlet`'s verdict-cache pattern).
 *
 * {@link CheckReport} is the DUAL — the shape an executed sweep emits (per-check
 * `verdict` / `durationMs` / `cacheHit` / `findings`). Planning produces it empty of
 * results; the execution host (the CLI spawn layer) fills it in. It is defined
 * here as the report contract the `--json` surface conforms to.
 *
 * @module
 */

import type { CheckAuthority, CheckCache, CheckContext, CheckPlatform, CheckProfile } from './definition.js';
import { CHECK_REGISTRY } from './registry.js';

/** One check as scheduled into a plan — the registry entry projected to what a run needs. */
export interface PlannedCheck {
  /** The check identity, `check/<slug>`. */
  readonly id: string;
  /** Human title for the plan line. */
  readonly title: string;
  /** The single sentence this check proves. */
  readonly claim: string;
  /** The context in which this check's claim is being scheduled. */
  readonly context: CheckContext;
  /** The full shell line the host spawns. */
  readonly command: string;
  /** The package or script path that owns the assertion. */
  readonly owner: string;
  /** Whether a finding (or non-zero exit) blocks the aggregate verdict. */
  readonly authority: CheckAuthority;
  /** The verdict cache discipline (see {@link CheckCache}). */
  readonly cache: CheckCache;
  /** True iff `cache === 'content-addressed'` — a warm run may skip this check when no input changed. */
  readonly cacheable: boolean;
  /** The wall-clock ceiling (ms) after which the host aborts the check. */
  readonly timeoutMs: number;
  /** Globs whose change invalidates this check's content-addressed verdict. */
  readonly inputs: readonly string[];
}

/** A registry check dropped from a plan, with the exact applicability reason. */
export interface SkippedCheck {
  /** The skipped check's identity, `check/<slug>`. */
  readonly id: string;
  /** Why it was skipped (for example, a context or platform mismatch). */
  readonly reason: string;
}

/** The ordered, cache-annotated projection of the registry for one `(profile, platform)`. */
export interface CheckPlan {
  /** The profile this plan projects. */
  readonly profile: CheckProfile;
  /** The platform this plan targets. */
  readonly platform: CheckPlatform;
  /** The repository/application fact domain this plan is authoritative over. */
  readonly context: CheckContext;
  /** The checks to run, in declared plan order. */
  readonly checks: readonly PlannedCheck[];
  /**
   * The UPPER-BOUND estimated wall-clock (ms) — the sum of the planned checks'
   * `timeoutMs` ceilings. It is a ceiling, not a measured mean: no timing corpus
   * exists yet, so the plan reports the worst case a host must budget for.
   */
  readonly estimatedMs: number;
  /** The registry checks in this profile that were skipped, with reasons. */
  readonly skipped: readonly SkippedCheck[];
}

/** The verdict a single executed check produced. */
export type CheckVerdict = 'pass' | 'fail' | 'skipped';

/** One executed check's result — the per-check row of a {@link CheckReport}. */
export interface CheckRunResult {
  /** The check identity, `check/<slug>`. */
  readonly id: string;
  /** The verdict this run produced. */
  readonly verdict: CheckVerdict;
  /** The measured wall-clock (ms) the run took (0 for a cache hit / skip). */
  readonly durationMs: number;
  /** True iff a content-addressed cache hit served this verdict without re-running. */
  readonly cacheHit: boolean;
  /** The human-readable findings this check surfaced (empty on a clean pass). */
  readonly findings: readonly string[];
}

/**
 * The report an executed sweep emits — the `--json` output contract. Planning
 * produces the plan; the execution host (the CLI spawn layer / the existing
 * `runGauntlet` context) runs the plan and fills `results`. `blocked` is true iff
 * any BLOCKING check failed; `ok` additionally requires at least one check to
 * have executed, so an all-skipped plan is explicitly unverified rather than green.
 */
export interface CheckReport {
  /** The profile the sweep ran. */
  readonly profile: CheckProfile;
  /** The platform the sweep ran on. */
  readonly platform: CheckPlatform;
  /** The repository/application fact domain this report actually evaluated. */
  readonly context: CheckContext;
  /** True iff at least one check executed and no blocking check failed. */
  readonly ok: boolean;
  /** True iff ≥1 blocking check failed. */
  readonly blocked: boolean;
  /** The per-check results, in plan order. */
  readonly results: readonly CheckRunResult[];
}

/** The profiles a caller may plan, in escalation order — the closed set {@link planChecks} accepts. */
export const CHECK_PROFILES: readonly CheckProfile[] = ['quick', 'full', 'release', 'consumer', 'environment'];

/** The platforms a plan may target — the closed set of `process.platform` values checks declare. */
export const CHECK_PLATFORMS: readonly CheckPlatform[] = ['linux', 'darwin', 'win32'];

/** The execution contexts a plan may target. */
export const CHECK_CONTEXTS: readonly CheckContext[] = ['repository', 'application'];

/**
 * Project {@link CHECK_REGISTRY} into the ordered, cache-annotated plan for
 * `profile` on `platform`. PURE + TOTAL: filter by profile membership, preserve
 * registry order, keep the platform-supported checks in `checks` and the rest in
 * `skipped`. Runs nothing.
 */
export function planChecks(
  profile: CheckProfile,
  platform: CheckPlatform,
  context: CheckContext = 'repository',
): CheckPlan {
  const inProfile = CHECK_REGISTRY.filter((check) => check.profiles.includes(profile));
  const checks: PlannedCheck[] = [];
  const skipped: SkippedCheck[] = [];
  for (const check of inProfile) {
    if (!check.contexts.includes(context)) {
      skipped.push({ id: check.id, reason: `not applicable in ${context} context` });
    } else if (check.platforms.includes(platform)) {
      checks.push({
        id: check.id,
        title: check.title,
        claim: check.claim,
        context,
        command: check.command,
        owner: check.owner,
        authority: check.authority,
        cache: check.cache,
        cacheable: check.cache === 'content-addressed',
        timeoutMs: check.timeoutMs,
        inputs: check.inputs,
      });
    } else {
      skipped.push({ id: check.id, reason: `not supported on ${platform}` });
    }
  }
  const estimatedMs = checks.reduce((sum, check) => sum + check.timeoutMs, 0);
  return { profile, platform, context, checks, estimatedMs, skipped };
}

/**
 * Render a {@link CheckPlan} as human text — the default `--plan` output (one line
 * per check, plus a summary footer). PURE: a total function of the plan, no I/O.
 */
export function formatCheckPlan(plan: CheckPlan): string {
  const lines: string[] = [];
  lines.push(`check plan — profile "${plan.profile}" in ${plan.context} context on ${plan.platform}`);
  lines.push(`${plan.checks.length} check(s), est. up to ${formatMs(plan.estimatedMs)} (upper bound)`);
  lines.push('');
  const idWidth = plan.checks.reduce((max, check) => Math.max(max, check.id.length), 0);
  plan.checks.forEach((check, index) => {
    const num = String(index + 1).padStart(2, ' ');
    const id = check.id.padEnd(idWidth, ' ');
    const auth = check.authority === 'blocking' ? 'blocking' : 'advisory';
    const cache = check.cacheable ? 'cache:content-addressed' : 'cache:none';
    lines.push(`  ${num}. ${id}  [${auth}] [${cache}]  ${check.command}`);
  });
  if (plan.skipped.length > 0) {
    lines.push('');
    lines.push(`skipped (${plan.skipped.length}):`);
    for (const skip of plan.skipped) {
      lines.push(`  - ${skip.id}: ${skip.reason}`);
    }
  }
  return lines.join('\n');
}

/** Format a millisecond count as a compact `Xs` / `Xm` string for the plan footer. */
function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(0)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}
