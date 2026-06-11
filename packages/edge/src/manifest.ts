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
 * {@link CompiledOutputs} keyed by {@link TierKey}.
 *
 * `outputsByTier` is empty when the boundary has no `@quantize` CSS block
 * (nothing to compile) -- the entry still carries the id so hosts can
 * derive cache configuration from it.
 */
export interface BoundaryManifestEntry {
  /** Content address minted by `Boundary.make` (`fnv1a:xxxxxxxx`). */
  readonly id: ContentAddress;
  /** Precompiled outputs per tier key (string-keyed to stay JSON-portable). */
  readonly outputsByTier: Readonly<Record<string, CompiledOutputs>>;
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
  readonly _version: 1;
  readonly boundaries: BoundaryManifest;
}
