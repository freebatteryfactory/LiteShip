/**
 * End-to-end wiring for the scene authoring sugar (Spec 1 §5.1/§5.4):
 * Beat() track ranges, envelope automation, and named easings flow
 * from a declared SceneContract through compileScene into a live
 * SceneRuntime world, where the canonical systems read the compiled
 * Envelope / Ease components every tick.
 */
import { describe, it, expect } from 'vitest';
import { Track, Beat, fade, compileScene, SceneRuntime, ease } from '@liteship/scene';
import type { SceneContract } from '@liteship/scene';

describe('scene sugar wiring (Beat + envelope + ease, end to end)', () => {
  const heroId = Track.videoId('hero');
  const outroId = Track.videoId('outro');

  // 128 bpm at 60 fps: one beat = 28.125 frames; Beat(2) = 56.25 frames.
  const contract: SceneContract = {
    name: 'sugar-e2e',
    duration: 4000,
    fps: 60,
    bpm: 128,
    tracks: [
      Track.video('hero', {
        from: Beat(0), to: Beat(8), source: {}, envelope: fade.in(Beat(2)),
      }),
      Track.video('outro', { from: Beat(4), to: Beat(8), source: {} }),
      Track.audio('bed', {
        from: Beat(0), to: Beat(8), source: 'bed', mix: { volume: -6 }, envelope: fade.out(Beat(2)),
      }),
      Track.transition('xfade', {
        from: Beat(0), to: Beat(4), kind: 'crossfade', between: [heroId, outroId], ease: 'cubic',
      }),
    ],
    invariants: [
      {
        name: 'tracks-within-duration',
        check: (s) => s.tracks.every((t) => t.to <= Math.ceil((s.duration / 1000) * s.fps)),
        message: 'no track may extend past scene duration',
      },
    ],
    budgets: { p95FrameMs: 16 },
    site: ['node'],
  };

  it('Beat() ranges resolve through compile and gate systems at tick time', async () => {
    const handle = await SceneRuntime.build(compileScene(contract));
    try {
      // Frame 0: hero in range but fade.in starts at 0 — opacity 0.
      await handle.tick(0);
      let entities = handle.world.query('VideoSource');
      const opacityOf = (id: string): number => {
        const e = entities.find((x) => (x.components.get('trackId') as string) === id)!;
        return (e as unknown as { _opacity: number })._opacity;
      };

      expect(opacityOf('hero')).toBe(0);
      // outro starts at Beat(4) = frame 112.5 — not yet visible.
      expect(opacityOf('outro')).toBe(0);

      // Advance to 500ms → frame 30 → fade.in(Beat(2)) factor = 30 / 56.25.
      await handle.tick(500);
      entities = handle.world.query('VideoSource');
      expect(opacityOf('hero')).toBeCloseTo(30 / 56.25, 6);

      // Advance to 1500ms → frame 90 → past the 56.25-frame span → fully faded in.
      await handle.tick(1000);
      entities = handle.world.query('VideoSource');
      expect(opacityOf('hero')).toBe(1);

      // Advance to 2500ms → frame 150 → outro (from frame 112.5) now visible.
      await handle.tick(1000);
      entities = handle.world.query('VideoSource');
      expect(opacityOf('outro')).toBe(1);
    } finally {
      await handle.release();
    }
  });

  it('audio fade.out writes a ramping _gain; eased transition writes a shaped _blend', async () => {
    const handle = await SceneRuntime.build(compileScene(contract));
    try {
      // 1000ms → frame 60. Transition spans frames [0, 112.5): local = 60/112.5.
      await handle.tick(1000);

      const audio = handle.world.query('AudioSource');
      const bed = audio[0] as unknown as { _gain: number };
      // bed range [0, 225), fade.out span 56.25 → still in the hold-at-1 region.
      expect(bed._gain).toBe(1);

      const transitions = handle.world.query('TransitionKind');
      const xfade = transitions[0] as unknown as { _blend: number };
      expect(xfade._blend).toBeCloseTo(ease.cubic(60 / 112.5), 6);

      // 3500ms → frame 210. Last 56.25 frames of [0,225): gain = (225 - 210) / 56.25.
      await handle.tick(2500);
      const audioLate = handle.world.query('AudioSource');
      const bedLate = audioLate[0] as unknown as { _gain: number };
      expect(bedLate._gain).toBeCloseTo((225 - 210) / 56.25, 6);
    } finally {
      await handle.release();
    }
  });
});
