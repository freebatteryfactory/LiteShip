/**
 * CUT A5 — integration: the beat-projection bridge, end to end.
 *
 * Proves the previously-missing pipe is installed and load-bearing:
 *
 *   assets:  decoded audio --detectBeats--> BeatMarkerSet (sample indices)
 *   bridge:  BeatMarkerSet + sampleRate --resolveBeatProjectionToSceneBeats--> BeatComponent[] (ms)
 *   scene:   BeatComponent[] --scene.beats--> compileScene --> SceneRuntime --> ECS Beat entities
 *
 * No same-shape mocks: the scene beats are *derived* from a raw sample-index
 * projection through the official resolver, never hand-authored in ms space.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { Track, compileScene, SceneRuntime, resolveBeatProjectionToSceneBeats } from '@czap/scene';
import type { SceneContract, BeatComponent } from '@czap/scene';
import type { BeatMarkerSet } from '@czap/_spine';
import { detectBeats } from '@czap/assets';

function sceneWith(beats: readonly BeatComponent[]): SceneContract {
  const heroId = Track.videoId('hero');
  const bedId = Track.audioId('bed');
  return {
    name: 'beat-bridge-fixture',
    duration: 4000,
    fps: 60,
    bpm: 120,
    tracks: [
      Track.video('hero', { from: 0, to: 240, source: { _t: 'quantizer' } }),
      Track.audio('bed', { from: 0, to: 240, source: 'bed', mix: { volume: 0 } }),
      Track.effect('beat-glow', {
        from: 0,
        to: 240,
        kind: 'glow',
        target: heroId,
        syncTo: { anchor: bedId, mode: 'beat' },
      }),
    ],
    invariants: [],
    budgets: { p95FrameMs: 16 },
    site: ['node'],
    beats,
  };
}

describe('beat-projection bridge — raw projection to scene-ready markers', () => {
  it('resolves a sample-index projection and feeds it through compileScene', () => {
    const projection: BeatMarkerSet = { bpm: 120, beats: [0, 24_000, 48_000, 72_000] };
    const beats = resolveBeatProjectionToSceneBeats({ projection, sampleRate: 48_000, anchorTrackId: 'bed' });
    const compiled = compileScene(sceneWith(beats));
    expect(compiled.beats.length).toBe(4);
    expect(compiled.beats.map((b) => b.timeMs)).toEqual([0, 500, 1000, 1500]);
    expect(compiled.beats.every((b) => b.anchorTrackId === 'bed')).toBe(true);
  });

  it('spawns one ECS Beat entity per resolved marker at the converted time', async () => {
    const projection: BeatMarkerSet = { bpm: 120, beats: [0, 24_000, 48_000] };
    const beats = resolveBeatProjectionToSceneBeats({ projection, sampleRate: 48_000 });
    const compiled = compileScene(sceneWith(beats));
    const handle = await SceneRuntime.build(compiled);
    try {
      const beatEntities = await Effect.runPromise(handle.world.query('Beat'));
      expect(beatEntities.length).toBe(3);
      const times = beatEntities
        .map((e) => (e.components.get('Beat') as { timeMs: number }).timeMs)
        .sort((a, b) => a - b);
      expect(times).toEqual([0, 500, 1000]);
    } finally {
      await handle.release();
    }
  });

  it('carries a detectBeats-derived projection all the way to ECS beats', async () => {
    // Synthetic 120bpm-ish pulse (mirrors the assets beat-markers fixture):
    // a loud burst every 24_000 samples at 48kHz.
    const sampleRate = 48_000;
    const samples = new Float32Array(sampleRate * 4);
    for (let i = 0; i < samples.length; i++) samples[i] = i % 24_000 < 2000 ? 0.9 : 0.01;

    const projection = detectBeats({ sampleRate, samples });
    expect(projection.beats.length).toBeGreaterThan(0);

    const beats = resolveBeatProjectionToSceneBeats({ projection, sampleRate });
    // Conversion fidelity: each ms equals its source sample index / rate * 1000.
    for (let i = 0; i < beats.length; i++) {
      expect(beats[i]!.timeMs).toBeCloseTo((projection.beats[i]! / sampleRate) * 1000, 6);
    }

    const compiled = compileScene(sceneWith(beats));
    const handle = await SceneRuntime.build(compiled);
    try {
      const beatEntities = await Effect.runPromise(handle.world.query('Beat'));
      expect(beatEntities.length).toBe(beats.length);
    } finally {
      await handle.release();
    }
  });
});
