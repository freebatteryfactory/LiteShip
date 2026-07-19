import { describe, it, expect } from 'vitest';
import { Track, compileScene, SceneRuntime, Beat, fade, pulse, Scene } from '@liteship/scene';
import type { SceneContract } from '@liteship/scene';

describe('compileScene', () => {
  const hero = Track.videoId('hero');

  const scene: SceneContract = {
    name: 'demo',
    duration: 60,
    fps: 60,
    bpm: 120,
    tracks: [
      Track.video('hero', { from: 0, to: 60, source: {} }),
      Track.audio('bed', { from: 0, to: 60, source: 'bed' }),
      Track.transition('fade', { from: 0, to: 1, kind: 'crossfade', between: [hero, hero] }),
      Track.effect('pulse', { from: 0, to: 60, kind: 'pulse', target: hero }),
    ],
    invariants: [],
    budgets: { p95FrameMs: 16 },
    site: ['node'],
  };

  it('produces a CompiledScene descriptor with one trackSpawn per track', () => {
    const compiled = compileScene(scene);
    expect(compiled.trackSpawns.length).toBe(4);
    expect(compiled.name).toBe('demo');
    expect(compiled.fps).toBe(60);
    expect(compiled.bpm).toBe(120);
    // beats are filled by Task 9; vanilla compile leaves the array empty
    expect(compiled.beats).toEqual([]);
  });

  it('preserves trackId on each spawn', () => {
    const compiled = compileScene(scene);
    const ids = compiled.trackSpawns.map((s) => s.trackId);
    expect(ids).toContain('hero');
    expect(ids).toContain('bed');
    expect(ids).toContain('fade');
    expect(ids).toContain('pulse');
  });

  it('runtime registers the 7 canonical systems and spawns one entity per track', async () => {
    const compiled = compileScene(scene);
    const handle = await SceneRuntime.build(compiled);
    expect(handle.systemsRegistered).toBe(7);
    expect(handle.entitySpawnCount).toBe(4);
    await handle.release();
  });
});

describe('compileScene Beat() resolution (Spec 1 §5.1/§5.4)', () => {
  const frameRangeOf = (scene: SceneContract, id: string): { from: number; to: number } => {
    const spawn = compileScene(scene).trackSpawns.find((s) => s.trackId === id);
    return spawn!.components['FrameRange'] as { from: number; to: number };
  };

  const beatScene = (tracks: SceneContract['tracks'], invariants: SceneContract['invariants'] = []): SceneContract => ({
    name: 'beat-demo',
    duration: 4000,
    fps: 60,
    bpm: 128,
    tracks,
    invariants,
    budgets: { p95FrameMs: 16 },
    site: ['node'],
  });

  it('resolves Beat(0)..Beat(8) to FrameRange { from: 0, to: 225 } at 128bpm/60fps', () => {
    const scene = beatScene([Track.video('x', { from: Beat(0), to: Beat(8), source: {} })]);
    expect(frameRangeOf(scene, 'x')).toEqual({ from: 0, to: 225 });
  });

  it('resolves beat marks on all four track kinds', () => {
    const hero = Track.videoId('hero');
    const scene = beatScene([
      Track.video('hero', { from: Beat(0), to: Beat(4), source: {} }),
      Track.audio('bed', { from: Beat(0), to: Beat(8), source: 'bed' }),
      Track.transition('xfade', { from: Beat(0), to: Beat(1), kind: 'crossfade', between: [hero, hero] }),
      Track.effect('fx', { from: Beat(2), to: Beat(6), kind: 'glow', target: hero }),
    ]);
    expect(frameRangeOf(scene, 'hero')).toEqual({ from: 0, to: 112.5 });
    expect(frameRangeOf(scene, 'bed')).toEqual({ from: 0, to: 225 });
    expect(frameRangeOf(scene, 'xfade')).toEqual({ from: 0, to: 28.125 });
    expect(frameRangeOf(scene, 'fx')).toEqual({ from: 56.25, to: 168.75 });
  });

  it('invariants see the RESOLVED contract — track arithmetic operates on numbers', () => {
    const seen: unknown[] = [];
    const scene = beatScene(
      [Track.video('x', { from: Beat(0), to: Beat(8), source: {} })],
      [
        {
          name: 'records-resolved-to',
          check: (s) => {
            seen.push(s.tracks[0]!.to);
            return s.tracks.every((t) => t.to <= (s.duration / 1000) * s.fps);
          },
          message: 'tracks must fit the scene duration',
        },
      ],
    );
    compileScene(scene);
    expect(seen).toEqual([225]);
  });

  it('compiles Scene.include output with a Beat() offset against the parent BPM/fps', () => {
    const sub: SceneContract = {
      name: 'sub',
      duration: 1000,
      fps: 60,
      bpm: 128,
      tracks: [Track.video('a', { from: Beat(0), to: Beat(2), source: {} })],
      invariants: [],
      budgets: { p95FrameMs: 16 },
      site: ['node'],
    };
    const parent = beatScene([...Scene.include(sub, { offset: Beat(8) })]);
    expect(frameRangeOf(parent, 'sub/a')).toEqual({ from: 225, to: 281.25 });
  });
});

describe('compileScene envelope + ease components (Spec 1 §5.4)', () => {
  const hero = Track.videoId('hero');

  const scene: SceneContract = {
    name: 'sugar-demo',
    duration: 8000,
    fps: 60,
    bpm: 128,
    tracks: [
      Track.video('hero', { from: Beat(0), to: Beat(8), source: {}, envelope: fade.in(Beat(2)) }),
      Track.audio('bed', { from: Beat(0), to: Beat(8), source: 'bed', envelope: fade.out(Beat(1)) }),
      Track.transition('xfade', { from: Beat(0), to: Beat(1), kind: 'crossfade', between: [hero, hero], ease: 'cubic' }),
      Track.effect('fx', { from: Beat(0), to: Beat(8), kind: 'pulse', target: hero, envelope: pulse.every(Beat(0.5), { amplitude: 0.3 }) }),
    ],
    invariants: [],
    budgets: { p95FrameMs: 16 },
    site: ['node'],
  };

  const componentsOf = (id: string): Readonly<Record<string, unknown>> =>
    compileScene(scene).trackSpawns.find((s) => s.trackId === id)!.components;

  it('emits a resolved Envelope component for an enveloped video track', () => {
    expect(componentsOf('hero')['Envelope']).toEqual({ curve: 'linear-in', spanFrames: 56.25 });
  });

  it('emits a resolved Envelope component for an enveloped audio track', () => {
    expect(componentsOf('bed')['Envelope']).toEqual({ curve: 'linear-out', spanFrames: 28.125 });
  });

  it('emits a resolved Envelope component for an enveloped effect track', () => {
    expect(componentsOf('fx')['Envelope']).toEqual({ curve: 'pulse', periodFrames: 14.0625, amplitude: 0.3 });
  });

  it('emits an Ease component carrying the serializable tag for an eased transition', () => {
    expect(componentsOf('xfade')['Ease']).toBe('cubic');
  });

  it('omits Envelope/Ease components when tracks declare none', () => {
    const plain = compileScene({
      ...scene,
      tracks: [
        Track.video('hero', { from: 0, to: 60, source: {} }),
        Track.transition('xfade', { from: 0, to: 30, kind: 'crossfade', between: [hero, hero] }),
      ],
    });
    for (const spawn of plain.trackSpawns) {
      expect(spawn.components).not.toHaveProperty('Envelope');
      expect(spawn.components).not.toHaveProperty('Ease');
    }
  });
});
