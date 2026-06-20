/**
 * CUT A5 — `resolveBeatProjectionToSceneBeats`: the official bridge from a
 * raw asset-space {@link BeatMarkerSet} (bpm + sample indices) to scene-space
 * {@link BeatComponent}[] (millisecond markers). This is the pipe that was
 * missing — assets produced projections, scene consumed components, and the
 * sample-index → millisecond conversion was hand-rolled at every call site
 * (see the former ghost bridge in examples/scenes/intro.ts).
 *
 * The resolver is a pure scene-domain transform: it imports the shared spine
 * types only (never `@czap/assets`), so it adds no scene → assets edge.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { hasTag } from '@czap/error';
import { resolveBeatProjectionToSceneBeats } from '@czap/scene';
import type { BeatMarkerSet } from '@czap/_spine';

describe('resolveBeatProjectionToSceneBeats', () => {
  it('converts sample indices to milliseconds: timeMs = sampleIndex / sampleRate * 1000', () => {
    const projection: BeatMarkerSet = { bpm: 120, beats: [0, 24_000, 48_000, 72_000] };
    const beats = resolveBeatProjectionToSceneBeats({ projection, sampleRate: 48_000 });
    expect(beats.map((b) => b.timeMs)).toEqual([0, 500, 1000, 1500]);
  });

  it('preserves order and count — one BeatComponent per input beat', () => {
    const projection: BeatMarkerSet = { bpm: 100, beats: [10, 20, 30, 40, 50] };
    const beats = resolveBeatProjectionToSceneBeats({ projection, sampleRate: 1000 });
    expect(beats.length).toBe(5);
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i]!.timeMs).toBeGreaterThan(beats[i - 1]!.timeMs);
    }
  });

  it("tags every marker with kind: 'beat'", () => {
    const projection: BeatMarkerSet = { bpm: 120, beats: [0, 100] };
    const beats = resolveBeatProjectionToSceneBeats({ projection, sampleRate: 1000 });
    expect(beats.every((b) => b.kind === 'beat')).toBe(true);
  });

  it('defaults strength deterministically to 1 when no default given', () => {
    const projection: BeatMarkerSet = { bpm: 120, beats: [0, 100, 200] };
    const beats = resolveBeatProjectionToSceneBeats({ projection, sampleRate: 1000 });
    expect(beats.every((b) => b.strength === 1)).toBe(true);
  });

  it('honors an explicit defaultStrength applied to every marker', () => {
    const projection: BeatMarkerSet = { bpm: 120, beats: [0, 100] };
    const beats = resolveBeatProjectionToSceneBeats({ projection, sampleRate: 1000, defaultStrength: 0.6 });
    expect(beats.every((b) => b.strength === 0.6)).toBe(true);
  });

  it('carries anchorTrackId onto every marker when provided', () => {
    const projection: BeatMarkerSet = { bpm: 120, beats: [0, 100] };
    const beats = resolveBeatProjectionToSceneBeats({ projection, sampleRate: 1000, anchorTrackId: 'bed' });
    expect(beats.every((b) => b.anchorTrackId === 'bed')).toBe(true);
  });

  it('omits anchorTrackId when not provided (no undefined-keyed field)', () => {
    const projection: BeatMarkerSet = { bpm: 120, beats: [0] };
    const beats = resolveBeatProjectionToSceneBeats({ projection, sampleRate: 1000 });
    expect('anchorTrackId' in beats[0]!).toBe(false);
  });

  it('rejects a non-positive or non-finite sampleRate explicitly', () => {
    const projection: BeatMarkerSet = { bpm: 120, beats: [0, 100] };
    const rejects = (sampleRate: number): void => {
      let caught: unknown;
      try {
        resolveBeatProjectionToSceneBeats({ projection, sampleRate });
      } catch (e) {
        caught = e;
      }
      expect(hasTag(caught, 'ValidationError')).toBe(true);
      expect((caught as { module: string }).module).toBe('resolveBeatProjectionToSceneBeats');
    };
    rejects(0);
    rejects(-48_000);
    rejects(Number.NaN);
    rejects(Number.POSITIVE_INFINITY);
  });

  it('returns an empty array for an empty projection (no beats detected)', () => {
    const beats = resolveBeatProjectionToSceneBeats({ projection: { bpm: 0, beats: [] }, sampleRate: 48_000 });
    expect(beats).toEqual([]);
  });

  it('does not mutate the input projection', () => {
    const projection: BeatMarkerSet = { bpm: 120, beats: [0, 24_000] };
    const snapshot = { bpm: projection.bpm, beats: [...projection.beats] };
    resolveBeatProjectionToSceneBeats({ projection, sampleRate: 48_000, anchorTrackId: 'bed' });
    expect(projection.bpm).toBe(snapshot.bpm);
    expect(projection.beats).toEqual(snapshot.beats);
  });
});
