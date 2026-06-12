/**
 * Boundary manifest contract -- the build-to-edge handoff for precompiled
 * boundary outputs (ADR-0003 content addressing).
 *
 * The build pipeline (`@czap/vite` `collectBoundaryManifest`) derives every
 * boundary's `ContentAddress` and per-tier {@link CompiledOutputs} at build
 * time; edge hosts consume the manifest so they never hand-type a boundary
 * id or re-implement the CSS compiler inside a worker bundle.
 *
 * @module
 */

import type { ContentAddress, MotionTier } from '@czap/core';
import type { DesignTier } from '@czap/detect';
import type { EdgeTierResult } from './edge-tier.js';
import type { CompiledOutputs } from './kv-cache.js';

// ---------------------------------------------------------------------------
// Tier space
// ---------------------------------------------------------------------------

/**
 * Every {@link MotionTier}, in escalation order. Kept in lockstep with the
 * `MotionTier` union in `@czap/core` -- the `satisfies` clause plus the
 * exhaustiveness check below fail compilation if the vocabulary drifts.
 */
export const MOTION_TIERS = [
  'none',
  'transitions',
  'animations',
  'physics',
  'compute',
] as const satisfies readonly MotionTier[];

/**
 * Every `DesignTier`, in escalation order. Kept in lockstep with the
 * `DesignTier` union in `@czap/detect` -- the `satisfies` clause plus the
 * exhaustiveness check below fail compilation if the vocabulary drifts.
 */
export const DESIGN_TIERS = ['minimal', 'standard', 'enhanced', 'rich'] as const satisfies readonly DesignTier[];

// Compile-time exhaustiveness: if a tier is added to either union without
// being added to the array above, these aliases degrade to `never` and the
// `true` assignments stop compiling.
type _AssertMotionExhaustive = [MotionTier] extends [(typeof MOTION_TIERS)[number]] ? true : never;
type _AssertDesignExhaustive = [DesignTier] extends [(typeof DESIGN_TIERS)[number]] ? true : never;
const _motionExhaustive: _AssertMotionExhaustive = true;
const _designExhaustive: _AssertDesignExhaustive = true;
void _motionExhaustive;
void _designExhaustive;

/**
 * Key of one cell in the (motion x design) tier grid --
 * `"<motionTier>:<designTier>"`. The same encoding the KV boundary cache
 * uses in its keys, so manifest lookups and cache keys can never disagree.
 */
export type TierKey = `${MotionTier}:${DesignTier}`;

/**
 * Encode a tier result (or any motion/design pair) as a {@link TierKey}.
 */
export function tierKey(tier: Pick<EdgeTierResult, 'motionTier' | 'designTier'>): TierKey {
  return `${tier.motionTier}:${tier.designTier}`;
}

/**
 * Enumerate the full finite tier grid (every motion x design combination).
 * Build pipelines iterate this to precompile outputs for every tier a
 * request could resolve to.
 */
export function enumerateTierKeys(): readonly TierKey[] {
  const keys: TierKey[] = [];
  for (const motion of MOTION_TIERS) {
    for (const design of DESIGN_TIERS) {
      keys.push(`${motion}:${design}`);
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Manifest types
// ---------------------------------------------------------------------------

/**
 * One boundary's manifest entry: its minted `ContentAddress` (always
 * `Boundary.make`'s id -- never hand-typed) plus precompiled
 * {@link CompiledOutputs} for the tier grid, deduplicated.
 *
 * Most of a boundary's compiled CSS is tier-invariant (the container
 * queries adapt via `@container`, not per tier), so storing the strings
 * once per grid cell would ship ~20 copies of the same bytes to the edge
 * host. Instead `outputs` is a pool of the DISTINCT compiled outputs and
 * `outputsByTier` maps each {@link TierKey} to a pool index. Hosts call
 * {@link resolveOutputsByTier} to inflate the per-tier map back to the
 * exact same bytes the build compiled.
 *
 * Both fields are empty when the boundary has no `@quantize` CSS block
 * (nothing to compile) -- the entry still carries the id so hosts can
 * derive cache configuration from it.
 */
export interface BoundaryManifestEntry {
  /** Content address minted by `Boundary.make` (`fnv1a:xxxxxxxx`). */
  readonly id: ContentAddress;
  /** Deduplicated pool of distinct compiled outputs; `outputsByTier` cells index into it. */
  readonly outputs: readonly CompiledOutputs[];
  /** Pool index per {@link TierKey}; missing keys mean that tier was never compiled. */
  readonly outputsByTier: Readonly<Partial<Record<TierKey, number>>>;
}

/**
 * Deduplicate a fully-materialized per-tier outputs map into the pooled
 * {@link BoundaryManifestEntry} shape (`outputs` + index refs).
 *
 * Identity is the full `(css, propertyRegistrations, containerQueries)`
 * triple, and cells are visited in {@link enumerateTierKeys} order so the
 * pool order -- and the serialized manifest bytes -- are stable regardless
 * of the producer's insertion order.
 */
export function dedupeOutputsByTier(
  outputsByTier: Readonly<Partial<Record<TierKey, CompiledOutputs>>>,
): Pick<BoundaryManifestEntry, 'outputs' | 'outputsByTier'> {
  const pool: CompiledOutputs[] = [];
  const indexByContent = new Map<string, number>();
  const refs: Partial<Record<TierKey, number>> = {};
  for (const key of enumerateTierKeys()) {
    const outputs = outputsByTier[key];
    if (!outputs) continue;
    const content = JSON.stringify([outputs.css, outputs.propertyRegistrations, outputs.containerQueries]);
    let index = indexByContent.get(content);
    if (index === undefined) {
      index = pool.length;
      pool.push(outputs);
      indexByContent.set(content, index);
    }
    refs[key] = index;
  }
  return { outputs: pool, outputsByTier: refs };
}

/**
 * Inflate a pooled {@link BoundaryManifestEntry} back into the per-tier
 * {@link CompiledOutputs} map that `EdgeHostCacheConfig.precompiled`
 * consumes. Resolved cells share pool object references, so per-tier
 * lookups return byte-identical strings to what the build compiled.
 */
export function resolveOutputsByTier(
  entry: Pick<BoundaryManifestEntry, 'outputs' | 'outputsByTier'>,
): Readonly<Partial<Record<TierKey, CompiledOutputs>>> {
  // A v1 entry (cells hold CompiledOutputs objects, no pool) reaches this
  // function through JS/JSON callers the Pick type can't stop — guard the
  // pool FIRST or the error template below dereferences undefined and the
  // caller gets a bare TypeError instead of the rebuild guidance.
  const pool = entry.outputs;
  if (!Array.isArray(pool)) {
    throw new Error(
      'Boundary manifest entry has no `outputs` pool — the manifest predates the deduplicated v2 format ' +
        '(cells held CompiledOutputs objects, not pool indices) or was edited by hand. ' +
        'Fix: rebuild the project so collectBoundaryManifest emits the v2 shape (czap-boundary-manifest.json with `_version: 2`).',
    );
  }
  const resolved: Partial<Record<TierKey, CompiledOutputs>> = {};
  for (const [key, index] of Object.entries(entry.outputsByTier) as readonly (readonly [TierKey, number])[]) {
    const outputs = typeof index === 'number' ? pool[index] : undefined;
    if (!outputs) {
      throw new Error(
        `Boundary manifest cell "${key}" references outputs[${String(index)}], but the entry's outputs pool has ` +
          `${pool.length} item(s), so the tier cannot be resolved. ` +
          'Why: the manifest predates the deduplicated v2 format (cells held CompiledOutputs objects, not pool indices) or was edited by hand. ' +
          'Fix: rebuild the project so collectBoundaryManifest emits the v2 shape (czap-boundary-manifest.json with `_version: 2`).',
      );
    }
    resolved[key] = outputs;
  }
  return resolved;
}

/**
 * Build-derived boundary manifest: boundary export name to
 * {@link BoundaryManifestEntry}. This is the value of the
 * `virtual:czap/boundaries` virtual module and the `boundaries` field of
 * the emitted `czap-boundary-manifest.json`.
 */
export type BoundaryManifest = Readonly<Record<string, BoundaryManifestEntry>>;

/**
 * Versioned envelope written to `czap-boundary-manifest.json` by the
 * `@czap/astro` integration at `astro:build:done` -- for hosts that read
 * the manifest from disk instead of importing `virtual:czap/boundaries`.
 */
export interface BoundaryManifestFile {
  readonly _tag: 'CzapBoundaryManifest';
  /** v2: entries carry a deduplicated `outputs` pool; `outputsByTier` cells are pool indices. */
  readonly _version: 2;
  readonly boundaries: BoundaryManifest;
}
