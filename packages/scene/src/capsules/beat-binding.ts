/**
 * scene.beat-binding — sceneComposition arm capsule.
 *
 * Resolves BeatMarkerProjection-derived beat markers (or raw beat
 * arrays declared on a {@link CompiledScene}) into concrete beat-entity
 * spawn descriptors ready to be injected into an ECS world.
 *
 * Closes bug #8 from the Spec 1 audit: BeatMarkerProjection output
 * was never reaching SyncSystem because nothing wired the projection
 * into the world. SyncSystem now queries the world for `Beat`-tagged
 * entities (Task 9 step 2); this capsule provides the entities.
 *
 * Pure transform — given a list of beat markers, return one spawn
 * descriptor per marker. The runtime walks these descriptors before
 * registering systems so the first tick already sees real beats.
 *
 * @module
 */

import { defineCapsule, S } from '@liteship/core';
import type { BeatComponent as _BeatComponent, BeatSpawn as _BeatSpawn } from '@liteship/_spine';

/**
 * Component shape for beat entities — what SyncSystem queries via
 * `world.query('Beat')`. Aliased to the canonical spine contract (CUT A5):
 * the scene/world timeline-space stage of the beat family. The raw
 * asset/sample-space sibling is `@liteship/assets`' `BeatMarkerSet`; the official
 * bridge between them is `resolveBeatProjectionToSceneBeats` (./beat-projection).
 */
export type BeatComponent = _BeatComponent;

/** Spawn descriptor returned by the binding — the runtime spawns these into the world. */
export type BeatSpawn = _BeatSpawn;

const BeatComponentSchema = S.struct({
  _tag: S.literal('beat'),
  timeMs: S.number,
  strength: S.number,
  anchorTrackId: S.optional(S.string),
});

const BindingInputSchema = S.struct({
  // The beat array as already resolved by BeatMarkerProjection (or
  // declared directly on a CompiledScene). This capsule is a pure
  // transform from BeatComponent[] into BeatSpawn[].
  beats: S.array(BeatComponentSchema),
});

const BindingOutputSchema = S.struct({
  spawns: S.array(S.struct({ components: BeatComponentSchema })),
});

/**
 * The declared `scene.beat-binding` sceneComposition capsule. Registered
 * in the module-level catalog at import time; walked by the factory
 * compiler. Behavior is implemented by {@link bindBeats} below.
 */
export const beatBindingCapsule = defineCapsule({
  _kind: 'sceneComposition',
  name: 'scene.beat-binding',
  site: ['node', 'browser'],
  // `asset:beats` carries the raw asset-space `BeatMarkerSet` (bpm + sample
  // indices) produced by `@liteship/assets`; it is resolved to scene-space
  // BeatComponent[] via resolveBeatProjectionToSceneBeats before binding.
  capabilities: { reads: ['scene', 'asset:beats'], writes: ['ecs.world'] },
  input: BindingInputSchema,
  output: BindingOutputSchema,
  budgets: { p95Ms: 5, allocClass: 'bounded' },
  invariants: [
    {
      name: 'spawn-count-equals-beat-count',
      check: (input, output) =>
        (input as { beats: readonly unknown[] }).beats.length ===
        (output as { spawns: readonly unknown[] }).spawns.length,
      message: 'one spawn descriptor per input beat marker — no drops, no duplicates',
    },
    {
      name: 'all-spawns-are-beat-components',
      check: (_input, output) =>
        (output as { spawns: readonly { components: { _tag: string } }[] }).spawns.every(
          (s) => s.components._tag === 'beat',
        ),
      message: 'every spawn must carry a Beat-tagged component',
    },
    {
      name: 'spawns-preserve-beat-order',
      check: (input, output) => {
        const inBeats = (input as { beats: readonly { timeMs: number }[] }).beats;
        const outSpawns = (output as { spawns: readonly { components: { timeMs: number } }[] }).spawns;
        if (inBeats.length !== outSpawns.length) return false;
        for (let i = 0; i < inBeats.length; i++) {
          if (inBeats[i]!.timeMs !== outSpawns[i]!.components.timeMs) return false;
        }
        return true;
      },
      message: 'spawn order must mirror input beat order — sync semantics depend on it',
    },
  ],
});

/**
 * Pure transform: BeatComponent[] → BeatSpawn[]. Each input beat becomes
 * one spawn descriptor whose `components` field is suitable for direct
 * use as the `Beat` component bag in `world.spawn({ Beat: ... })`.
 *
 * Defensive copy of each beat — callers may freeze, mutate, or hand off
 * the input array; the output is a fresh, owned-by-runtime sequence.
 */
export function bindBeats(beats: readonly BeatComponent[]): readonly BeatSpawn[] {
  return beats.map((b) => ({ components: { ...b } }));
}

/**
 * BeatBinding namespace — pure transforms over beat markers.
 * Companion type namespace exposes Spawn and Component shapes (ADR-0001).
 */
export const BeatBinding = {
  /** Bind a list of beat markers into spawn descriptors. */
  bind: bindBeats,
} as const;

export declare namespace BeatBinding {
  /** Spawn descriptor — one per input beat marker. */
  export type Spawn = BeatSpawn;
  /** Beat component shape — what SyncSystem queries. */
  export type Component = BeatComponent;
}
