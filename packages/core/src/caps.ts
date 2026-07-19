/**
 * CapSet -- capability lattice.
 *
 * Re-parameterized from `@kit`: `pure < read < ... < system` becomes `static < styled < reactive < animated < gpu`.
 *
 * @module
 */

/**
 * Rung on the rendering-capability ladder. Higher levels imply lower ones:
 * `gpu > animated > reactive > styled > static`.
 */
export type CapTier = 'static' | 'styled' | 'reactive' | 'animated' | 'gpu';

const LEVEL_ORD: Record<CapTier, number> = {
  static: 0,
  styled: 1,
  reactive: 2,
  animated: 3,
  gpu: 4,
};

/**
 * Immutable set of {@link CapTier}s — the tagged value returned by {@link Cap} combinators.
 *
 * `levels` is a canonical **sorted, deduped array** (ladder order via `LEVEL_ORD`), NOT a
 * `Set`. A `CapSet` rides inside a content-addressed graph node and travels over JSON
 * transports (the client→server mutation channel), and a `Set` is neither: `JSON.stringify`
 * turns it into `{}` (silent loss), and its insertion order made the content address
 * nondeterministic for the same logical set. The sorted array is JSON-faithful and gives one
 * canonical form. `Cap`'s combinators keep it deduped + sorted; treat it as a set.
 */
export interface CapSet {
  readonly _tag: 'CapSet';
  readonly levels: readonly CapTier[];
}

/** Deduped + ladder-sorted — the ONE canonical form of a level collection (address/wire stable). */
const _canonicalLevels = (levels: Iterable<CapTier>): readonly CapTier[] =>
  [...new Set(levels)].sort((a, b) => LEVEL_ORD[a] - LEVEL_ORD[b]);

/**
 * Whether a CapSet's `levels` are already canonical — STRICTLY ascending by ladder order,
 * which is deduped + sorted in a single predicate. `Cap`'s combinators always produce this,
 * but an UNTRUSTED wire payload (a policy patch over the mutation channel) can carry any array
 * of valid tiers. The graph-node schema demands canonical levels so a non-canonical array
 * (`['gpu','static']`, or a dup) cannot seal and content-address DIFFERENTLY from the same
 * logical set built via {@link Cap.from} — the identity law holds at the untrusted boundary too.
 * Not re-exported from `@liteship/core`: it is the schema's internal gate, not public surface.
 */
export const isCanonicalCapSet = (caps: { readonly levels: readonly CapTier[] }): boolean => {
  for (let i = 1; i < caps.levels.length; i++) {
    if (LEVEL_ORD[caps.levels[i]!] <= LEVEL_ORD[caps.levels[i - 1]!]) return false;
  }
  return true;
};

const _empty = (): CapSet => ({ _tag: 'CapSet', levels: [] });

const _from = (levels: ReadonlyArray<CapTier>): CapSet => ({ _tag: 'CapSet', levels: _canonicalLevels(levels) });

const _grant = (caps: CapSet, level: CapTier): CapSet => ({
  _tag: 'CapSet',
  levels: _canonicalLevels([...caps.levels, level]),
});

// filter preserves the already-canonical order, so the result stays sorted + deduped.
const _revoke = (caps: CapSet, level: CapTier): CapSet => ({
  _tag: 'CapSet',
  levels: caps.levels.filter((l) => l !== level),
});

const _has = (caps: CapSet, level: CapTier): boolean => caps.levels.includes(level);

const _superset = (a: CapSet, b: CapSet): boolean => b.levels.every((level) => a.levels.includes(level));

const _union = (a: CapSet, b: CapSet): CapSet => ({
  _tag: 'CapSet',
  levels: _canonicalLevels([...a.levels, ...b.levels]),
});

const _intersection = (a: CapSet, b: CapSet): CapSet => ({
  _tag: 'CapSet',
  levels: a.levels.filter((l) => b.levels.includes(l)),
});

const _atLeast = (a: CapTier, b: CapTier): boolean => LEVEL_ORD[a] >= LEVEL_ORD[b];

const _ordinal = (level: CapTier): number => LEVEL_ORD[level];

/**
 * Cap — algebra over {@link CapSet}.
 * Pure, immutable helpers for building, combining, and comparing capability
 * sets; the underlying `CapTier` lattice is totally ordered via {@link Cap.ordinal}.
 */
export const Cap = {
  /** The empty {@link CapSet}. */
  empty: _empty,
  /** Build a {@link CapSet} from an array of {@link CapTier}s. */
  from: _from,
  /** Return a new {@link CapSet} with the given level added. */
  grant: _grant,
  /** Return a new {@link CapSet} with the given level removed. */
  revoke: _revoke,
  /** Whether a {@link CapSet} contains the given level. */
  has: _has,
  /** Whether `a` contains every level of `b` (i.e. `a ⊇ b`). */
  superset: _superset,
  /** Set union of two {@link CapSet}s. */
  union: _union,
  /** Set intersection of two {@link CapSet}s. */
  intersection: _intersection,
  /** Whether `a` ranks `>=` `b` on the underlying ordered ladder. */
  atLeast: _atLeast,
  /** Integer ordinal for a {@link CapTier} — useful for sorting / comparison. */
  ordinal: _ordinal,
};

export declare namespace Cap {
  /** Alias for {@link CapSet}. */
  export type Shape = CapSet;
}
