/**
 * Escalation chooser (P5c) -- the READER of {@link PolicyNode}.
 *
 * P2 landed `PolicyNode` as written-data; this module is its reader: given a
 * policy and the runtime site a node will be admitted on, it chooses the
 * MINIMAL capability rung ({@link CapLevel}, lowest `Cap.ordinal`) that
 * satisfies the policy's `requires`, fits its `budgets`, lies inside its
 * `grants`, and still admits the projection targets the rung gates.
 *
 * Determinism: minimal-rung by `Cap.ordinal` ascending; ties (which the total
 * `CapLevel` order makes impossible, but we keep the rule explicit so the
 * contract survives future lattice changes) break by the Astro directive
 * escalation order `satellite < stream < llm < worker < gpu < wasm`. `@czap/core`
 * cannot import `@czap/astro`, so that order is encoded locally below.
 *
 * Cycle discipline: the CapLevel-to-target admissibility table is encoded HERE,
 * inline. We deliberately do NOT import `TIER_TARGETS` from `@czap/quantizer`:
 * the quantizer depends on core, so core importing the quantizer would close a
 * dependency cycle. The table mirrors the quantizer's `TIER_TARGETS`
 * escalation (more capability admits strictly more targets).
 *
 * @module
 */

import type { PolicyNode, RuntimeSite } from './document-graph.js';
import type { CapLevel } from './caps.js';
import { Cap } from './caps.js';

/** A projection target the escalation gate may admit (subset of `ProjectionNode.target`). */
type ProjectionTarget = 'css' | 'glsl' | 'wgsl' | 'aria' | 'ai';

/**
 * CapLevel to admissible projection targets. Encoded locally to avoid a
 * core-to-quantizer dependency cycle (see module note). Each rung is a strict
 * superset of the one below, mirroring `@czap/quantizer`'s `TIER_TARGETS`
 * escalation (`none` within `transitions` within `physics` within `compute`).
 */
const RUNG_TARGETS: Record<CapLevel, ReadonlySet<ProjectionTarget>> = {
  static: new Set<ProjectionTarget>(['aria']),
  styled: new Set<ProjectionTarget>(['css', 'aria']),
  reactive: new Set<ProjectionTarget>(['css', 'aria']),
  animated: new Set<ProjectionTarget>(['css', 'glsl', 'aria']),
  gpu: new Set<ProjectionTarget>(['css', 'glsl', 'wgsl', 'aria', 'ai']),
};

/**
 * The Astro directive escalation order, encoded locally (core cannot import
 * `@czap/astro`). Used ONLY as the deterministic tiebreak after `Cap.ordinal`.
 * Each `CapLevel` is mapped to the directive whose capability ceiling it
 * matches, so the tiebreak stays a single total order.
 */
const DIRECTIVE_ORDER: readonly string[] = ['satellite', 'stream', 'llm', 'worker', 'gpu', 'wasm'];
const RUNG_DIRECTIVE: Record<CapLevel, string> = {
  static: 'satellite',
  styled: 'stream',
  reactive: 'llm',
  animated: 'worker',
  gpu: 'gpu',
};
const directiveRank = (rung: CapLevel): number => DIRECTIVE_ORDER.indexOf(RUNG_DIRECTIVE[rung]);

/**
 * Minimal p95 latency budget (ms) each rung needs to run. A policy `budgets.p95Ms`
 * below a rung's floor forces a downgrade to a cheaper rung. Higher rungs cost
 * strictly more, so the floors are monotone in `Cap.ordinal`.
 */
const RUNG_P95_FLOOR_MS: Record<CapLevel, number> = {
  static: 0,
  styled: 1,
  reactive: 4,
  animated: 8,
  gpu: 16,
};

/**
 * Minimal working-set budget (MB) each rung needs. A policy `budgets.memoryMb`
 * below a rung's floor forces a downgrade. Monotone in `Cap.ordinal`.
 */
const RUNG_MEMORY_FLOOR_MB: Record<CapLevel, number> = {
  static: 0,
  styled: 1,
  reactive: 2,
  animated: 8,
  gpu: 64,
};

/** All rungs, ascending by `Cap.ordinal` then directive order -- the canonical search axis. */
const RUNGS_ASCENDING: readonly CapLevel[] = (['static', 'styled', 'reactive', 'animated', 'gpu'] as const)
  .slice()
  .sort((a, b) => Cap.ordinal(a) - Cap.ordinal(b) || directiveRank(a) - directiveRank(b));

/** A budget candidate rung fits if it clears every declared budget floor. */
function budgetAdmits(rung: CapLevel, budgets: PolicyNode['budgets']): boolean {
  if (budgets === undefined) return true;
  if (budgets.p95Ms !== undefined && budgets.p95Ms < RUNG_P95_FLOOR_MS[rung]) return false;
  if (budgets.memoryMb !== undefined && budgets.memoryMb < RUNG_MEMORY_FLOOR_MB[rung]) return false;
  // `allocClass: 'zero'` forbids the heap-hungry GPU rung; 'bounded'/'unbounded' admit all.
  if (budgets.allocClass === 'zero' && rung === 'gpu') return false;
  return true;
}

/** The successful chooser verdict. */
export interface RungChoice {
  /** The minimal {@link CapLevel} satisfying site, budget, grants, and admissibility. */
  readonly rung: CapLevel;
  /** The projection targets that rung admits, intersected with the rung's table. */
  readonly admittedTargets: ReadonlySet<string>;
}

/** The chooser result: a verdict or an unsatisfiability reason. */
export type EscalationResult = RungChoice | { readonly error: string };

const memo = new Map<string, EscalationResult>();

/**
 * Choose the minimal capability rung a {@link PolicyNode} admits on a runtime site.
 *
 * Returns `{ rung, admittedTargets }` on success, or `{ error }` if the site is
 * not in `policy.sites` or no rung at or below `policy.requires` clears the
 * budgets/grants. Memoized by `policy.id + runtimeSite` (a policy id is its
 * `fnv1a` content address, so equal inputs return a stable reference).
 *
 * @param policy - The capability/constraint gate to read.
 * @param runtimeSite - The site the gated node will be admitted on.
 */
export function chooseRung(policy: PolicyNode, runtimeSite: RuntimeSite): EscalationResult {
  // `|` cannot appear in a `fnv1a:`-prefixed ContentAddress, so it is an
  // unambiguous separator between the policy id and the runtime site.
  const key = `${policy.id}|${runtimeSite}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const result = compute(policy, runtimeSite);
  memo.set(key, result);
  return result;
}

function compute(policy: PolicyNode, runtimeSite: RuntimeSite): EscalationResult {
  // (1) Site gate -- a policy that does not list this site is unsatisfiable here.
  if (!policy.sites.includes(runtimeSite)) {
    return {
      error: `policy ${policy.id} does not admit runtime site '${runtimeSite}' (admits: ${policy.sites.join(', ') || 'none'})`,
    };
  }

  // (2) Start AT `policy.requires` -- the required rung is the candidate, not a
  // ceiling to search far below. The chooser only DOWNGRADES from here, and only
  // as far as the budgets/grants force; it never escalates above `requires`.
  // "Minimal CapLevel satisfying all" is therefore the highest rung at or below
  // `requires` that every gate admits -- equivalently, `requires` downgraded the
  // least. We walk rungs DESCENDING from `requires` and take the FIRST that
  // clears budgets, grants, and admissibility.
  const ceiling = Cap.ordinal(policy.requires);

  // Candidates: at or below `requires`, descending (closest-to-requires first),
  // tiebroken by the directive order (a no-op under the total CapLevel order,
  // kept explicit so the contract survives future lattice changes).
  const candidates = RUNGS_ASCENDING.filter((rung) => Cap.ordinal(rung) <= ceiling)
    .slice()
    .reverse();

  for (const rung of candidates) {
    // (3) Budget gate -- skip (downgrade past) rungs the budget cannot afford.
    if (!budgetAdmits(rung, policy.budgets)) continue;

    // (4) Grants gate -- the policy must have granted the rung.
    if (!Cap.has(policy.grants, rung)) continue;

    // (5) Admissibility -- confirm the rung admits at least one projection target
    // (an empty admissible set gates nothing, so it is not a real verdict).
    // `RUNG_TARGETS` is the locally-encoded CapLevel<->target map (no quantizer
    // import -- see module note).
    const admittedTargets = RUNG_TARGETS[rung];
    if (admittedTargets.size === 0) continue;

    // (6) Minimal downgrade wins: first satisfying rung walking down from requires.
    return { rung, admittedTargets };
  }

  return {
    error: `policy ${policy.id} admits no rung at or below '${policy.requires}' on '${runtimeSite}' under its grants/budgets`,
  };
}

/** Test-only: clear the chooser memo. Not part of the public `@czap/core` surface. */
export function _resetEscalationMemo(): void {
  memo.clear();
}
