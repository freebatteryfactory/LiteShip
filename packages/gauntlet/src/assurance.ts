/**
 * Assurance levels — the hazard model that aims the cannon.
 *
 * Not everything is equally nuclear; undifferentiated red is itself a failure.
 * Every file/symbol carries an {@link AssuranceLevel}, and a gate declares the
 * level it operates at, so rigor SCALES with criticality (DO-178B DAL, in
 * miniature). The levels are data — gates read them, the repo-IR carries them,
 * the report groups by them.
 *
 * Composition, not inheritance: a level is a string tag; its meaning lives in
 * the {@link ASSURANCE} lookup record and in pure functions over it.
 *
 * @module
 */

/**
 * The criticality ladder. Higher = more rigor required, more blast radius if it
 * lies. `L4` is the "if this lies, downstream trusts bad reality" tier — the
 * cast pipeline, evaluator, validator, content-address, HLC, graph-patch.
 */
export type AssuranceLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

/** The levels in ascending order — the canonical ordering for comparison + display. */
export const ASSURANCE_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4'] as const;

/** Static description of what each level IS and the rigor it demands. */
export interface AssuranceSpec {
  readonly level: AssuranceLevel;
  /** Ordinal for comparison (0 = L0 … 4 = L4). */
  readonly rank: number;
  /** What kind of code lives here. */
  readonly what: string;
  /** The rigor a gate at this level is expected to bring (cumulative over lower levels). */
  readonly requires: readonly string[];
}

/** The level lookup — the single source of truth for what each level means. */
export const ASSURANCE: Readonly<Record<AssuranceLevel, AssuranceSpec>> = {
  L0: {
    level: 'L0',
    rank: 0,
    what: 'Formatting, hygiene, comments.',
    requires: ['format', 'lint', 'hygiene gates'],
  },
  L1: {
    level: 'L1',
    rank: 1,
    what: 'Normal library code.',
    requires: ['types', 'unit + property tests', 'coverage ratchet', 'complexity'],
  },
  L2: {
    level: 'L2',
    rank: 2,
    what: 'Public API + serialized contracts.',
    requires: ['API-surface snapshot', 'semver gate', 'artifact round-trip / migration tests'],
  },
  L3: {
    level: 'L3',
    rank: 3,
    what: 'Deterministic runtime / projection / cache paths.',
    requires: ['determinism proof', 'fault injection', 'perf contracts', 'mutation'],
  },
  L4: {
    level: 'L4',
    rank: 4,
    what: 'If this lies, downstream trusts bad reality (cast pipeline, evaluator, validator, content-address, HLC, graph-patch).',
    requires: [
      'MC/DC',
      'deterministic simulation',
      'semantic model checks',
      'linearizability / CRDT laws',
      'no waiver without expiry',
    ],
  },
};

/** Numeric rank of a level (0–4), for ordering + "at least" comparisons. */
export function rankOf(level: AssuranceLevel): number {
  return ASSURANCE[level].rank;
}

/** True iff `level` is at least as critical as `floor` (e.g. `atLeast('L4','L3')`). */
export function atLeast(level: AssuranceLevel, floor: AssuranceLevel): boolean {
  return rankOf(level) >= rankOf(floor);
}

/** The more-critical of two levels — the level an edge between them inherits. */
export function maxLevel(a: AssuranceLevel, b: AssuranceLevel): AssuranceLevel {
  return rankOf(a) >= rankOf(b) ? a : b;
}
