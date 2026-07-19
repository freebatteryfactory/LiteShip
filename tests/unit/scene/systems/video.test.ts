import { describe, it, expect } from 'vitest';
import { World } from '@liteship/core';
import { VideoSystem } from '@liteship/scene';

describe('VideoSystem', () => {
  it('updates opacity for entities within FrameRange', () => {
    const { world } = World.make();
    world.spawn({
      VideoSource: {}, FrameRange: { from: 0, to: 60 }, TrackLayer: 0,
    });
    world.addSystem(VideoSystem(30));
    world.tick();
    const entities = world.query('VideoSource');
    const ent = entities[0] as unknown as { _opacity: number };
    expect(ent._opacity).toBe(1);
  });

  it('clamps opacity to 0 for out-of-range frames', () => {
    const { world } = World.make();
    world.spawn({ VideoSource: {}, FrameRange: { from: 0, to: 60 }, TrackLayer: 0 });
    world.addSystem(VideoSystem(120));
    world.tick();
    const entities = world.query('VideoSource');
    const ent = entities[0] as unknown as { _opacity: number };
    expect(ent._opacity).toBe(0);
  });

  it('modulates opacity by a linear-in Envelope component (fade ramps 0 -> 1)', () => {
    const opacityAt = (frameIndex: number): number => {
      const { world } = World.make();
      world.spawn({
        VideoSource: {},
        FrameRange: { from: 0, to: 120 },
        TrackLayer: 0,
        Envelope: { curve: 'linear-in', spanFrames: 60 },
      });
      world.addSystem(VideoSystem(frameIndex));
      world.tick();
      const entities = world.query('VideoSource');
      return (entities[0] as unknown as { _opacity: number })._opacity;
    };
    expect(opacityAt(0)).toBe(0);
    expect(opacityAt(30)).toBeCloseTo(0.5, 6);
    expect(opacityAt(60)).toBe(1);
    expect(opacityAt(90)).toBe(1);
  });

  it('keeps out-of-range opacity at 0 even with an Envelope present', () => {
    const { world } = World.make();
    world.spawn({
      VideoSource: {},
      FrameRange: { from: 0, to: 60 },
      TrackLayer: 0,
      Envelope: { curve: 'linear-in', spanFrames: 30 },
    });
    world.addSystem(VideoSystem(90));
    world.tick();
    const entities = world.query('VideoSource');
    expect((entities[0] as unknown as { _opacity: number })._opacity).toBe(0);
  });
});
