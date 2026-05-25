/**
 * CUT A5 — beat contract family lives in `@czap/_spine`.
 *
 * The beat-projection pipeline spans two packages in two unit spaces:
 *   - `@czap/assets` PRODUCES the raw `BeatMarkerSet` (sample-index space);
 *   - `@czap/scene` CONSUMES `BeatComponent`/`BeatSpawn` (millisecond space).
 *
 * Those are two pipeline STAGES, not duplicate names for one shape — so the
 * spine homes a *family*, and each package aliases its public name to the
 * spine type rather than re-declaring it. This suite pins that:
 *   1. the spine exports the whole family (runtime-constructible shapes);
 *   2. assets' `BeatMarkerSet` IS the spine type (mutual assignability);
 *   3. scene's `BeatComponent`/`BeatSpawn`/`SceneBeat` ARE the spine types.
 *
 * Compile-time assertions below are enforced via tsconfig.tests.json (this
 * file is in its `include`), so a future divergence fails `pnpm run typecheck`.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import type {
  BeatMarkerSet as SpineBeatMarkerSet,
  BeatComponent as SpineBeatComponent,
  BeatSpawn as SpineBeatSpawn,
  BeatProjectionResolutionInput,
} from '@czap/_spine';
import type { BeatMarkerSet as AssetsBeatMarkerSet } from '@czap/assets';
import type { BeatComponent as SceneBeatComponent, BeatSpawn as SceneBeatSpawn, SceneBeat } from '@czap/scene';

describe('A5 — beat contract family is homed in @czap/_spine', () => {
  it('the spine declares the raw asset-space projection (BeatMarkerSet)', () => {
    const projection: SpineBeatMarkerSet = { bpm: 120, beats: [0, 24_000, 48_000] };
    expect(projection.bpm).toBe(120);
    expect(projection.beats).toEqual([0, 24_000, 48_000]);
  });

  it('the spine declares the scene/world-space marker (BeatComponent)', () => {
    const marker: SpineBeatComponent = { kind: 'beat', timeMs: 500, strength: 1, anchorTrackId: 'bed' };
    expect(marker.kind).toBe('beat');
    expect(marker.timeMs).toBe(500);
  });

  it('the spine declares the ECS spawn descriptor (BeatSpawn)', () => {
    const spawn: SpineBeatSpawn = { components: { kind: 'beat', timeMs: 0, strength: 1 } };
    expect(spawn.components.kind).toBe('beat');
  });

  it('the spine declares the resolver input contract (BeatProjectionResolutionInput)', () => {
    const input: BeatProjectionResolutionInput = {
      projection: { bpm: 120, beats: [0, 24_000] },
      sampleRate: 48_000,
      anchorTrackId: 'bed',
      defaultStrength: 1,
    };
    expect(input.sampleRate).toBe(48_000);
  });

  it("assets' BeatMarkerSet IS the spine BeatMarkerSet (mutual assignability)", () => {
    const fromSpine: SpineBeatMarkerSet = { bpm: 90, beats: [1, 2, 3] };
    // Compile-time: if assets re-declared its own shape these aliases would
    // still pass structurally — the real single-source guarantee is the
    // `export type` alias in assets src, typechecked at package build. This
    // pins that the public names remain interchangeable at the seam.
    const asAssets: AssetsBeatMarkerSet = fromSpine;
    const backToSpine: SpineBeatMarkerSet = asAssets;
    expect(backToSpine.beats.length).toBe(3);
  });

  it("scene's BeatComponent / BeatSpawn / SceneBeat ARE the spine types", () => {
    const fromSpine: SpineBeatComponent = { kind: 'beat', timeMs: 250, strength: 0.5 };
    const asScene: SceneBeatComponent = fromSpine;
    const asSceneBeat: SceneBeat = fromSpine;
    const backToSpine: SpineBeatComponent = asScene;
    const spawnFromSpine: SpineBeatSpawn = { components: fromSpine };
    const asSceneSpawn: SceneBeatSpawn = spawnFromSpine;
    const backSpawn: SpineBeatSpawn = asSceneSpawn;
    expect(asSceneBeat.timeMs).toBe(250);
    expect(backToSpine.strength).toBe(0.5);
    expect(backSpawn.components.kind).toBe('beat');
  });
});
