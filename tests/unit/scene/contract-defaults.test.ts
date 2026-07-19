/**
 * SceneContract authoring defaults — a hello-world scene declares only
 * name/fps/bpm/tracks; compileScene fills the documented defaults:
 *
 * - duration: derived from the resolved track extents (max to / fps * 1000)
 * - invariants: []
 * - budgets: { p95FrameMs: 1000 / fps }
 * - site: ['node', 'browser']
 *
 * Plus track-wiring sugar: transition `between`, effect `target`, and
 * `syncTo.*` anchors accept the track object itself — the id is derived,
 * so authors stop re-minting ids at every reference site.
 */
import { describe, it, expect } from 'vitest';
import { Track, compileScene, syncTo } from '@liteship/scene';
import type { ResolvedSceneContract, SceneContract } from '@liteship/scene';

describe('compileScene contract defaults', () => {
  it('compiles a minimal contract — name, fps, bpm, tracks only', () => {
    const scene: SceneContract = {
      name: 'hello',
      fps: 60,
      bpm: 120,
      tracks: [Track.video('hero', { from: 0, to: 120, source: {} })],
    };
    const compiled = compileScene(scene);
    expect(compiled.trackSpawns.length).toBe(1);
    // duration derives from the track extents: 120 frames / 60 fps = 2000ms
    expect(compiled.duration).toBe(2000);
  });

  it('declared duration wins over the derived value', () => {
    const compiled = compileScene({
      name: 'explicit',
      duration: 5000,
      fps: 60,
      bpm: 120,
      tracks: [Track.video('hero', { from: 0, to: 60, source: {} })],
    });
    expect(compiled.duration).toBe(5000);
  });

  it('invariants see the defaulted duration, budgets, and site', () => {
    let seen: ResolvedSceneContract | undefined;
    compileScene({
      name: 'defaults-observed',
      fps: 50,
      bpm: 120,
      tracks: [Track.video('hero', { from: 0, to: 100, source: {} })],
      invariants: [
        {
          name: 'observe',
          check: (s) => {
            seen = s;
            return true;
          },
          message: 'never fails',
        },
      ],
    });
    expect(seen?.duration).toBe(2000); // 100 frames / 50 fps
    expect(seen?.budgets).toEqual({ p95FrameMs: 1000 / 50 });
    expect(seen?.site).toEqual(['node', 'browser']);
    expect(seen?.invariants.length).toBe(1);
  });

  it('audio Volume component defaults to unity linear gain', () => {
    const compiled = compileScene({
      name: 'audible',
      fps: 60,
      bpm: 120,
      tracks: [Track.audio('bed', { from: 0, to: 60, source: 'bed' })],
    });
    const spawn = compiled.trackSpawns.find((s) => s.trackId === 'bed');
    expect(spawn?.components['Volume']).toBe(1);
  });
});

describe('Track cross-references accept track objects', () => {
  const hero = Track.video('hero', { from: 0, to: 60, source: {} });
  const outro = Track.video('outro', { from: 60, to: 120, source: {} });
  const bed = Track.audio('bed', { from: 0, to: 120, source: 'bed' });

  it('transition between accepts track objects and derives their ids', () => {
    const t = Track.transition('xfade', { from: 50, to: 70, kind: 'crossfade', between: [hero, outro] });
    expect(t.between).toEqual(['hero', 'outro']);
  });

  it('effect target and syncTo anchor accept track objects', () => {
    const fx = Track.effect('pulse', {
      from: 0,
      to: 60,
      kind: 'pulse',
      target: hero,
      syncTo: { anchor: bed, mode: 'beat' },
    });
    expect(fx.target).toBe('hero');
    expect(fx.syncTo).toEqual({ anchor: 'bed', mode: 'beat' });
  });

  it('syncTo sugar accepts the audio track object', () => {
    expect(syncTo.beat(bed)).toEqual({ anchor: 'bed', mode: 'beat' });
    expect(syncTo.onset(bed)).toEqual({ anchor: 'bed', mode: 'onset' });
    expect(syncTo.peak(bed)).toEqual({ anchor: 'bed', mode: 'peak' });
  });

  it('ids still work everywhere (no regression)', () => {
    const t = Track.transition('xfade', {
      from: 50,
      to: 70,
      kind: 'crossfade',
      between: [Track.videoId('hero'), Track.videoId('outro')],
    });
    expect(t.between).toEqual(['hero', 'outro']);
    expect(syncTo.beat(Track.audioId('bed'))).toEqual({ anchor: 'bed', mode: 'beat' });
  });
});
