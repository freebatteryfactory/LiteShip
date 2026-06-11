import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { World } from '@czap/core';
import { VideoSystem } from '@czap/scene';

describe('VideoSystem', () => {
  it('updates opacity for entities within FrameRange', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({
        VideoSource: {}, FrameRange: { from: 0, to: 60 }, TrackLayer: 0,
      });
      yield* world.addSystem(VideoSystem(30));
      yield* world.tick();
      const entities = yield* world.query('VideoSource');
      const ent = entities[0] as unknown as { _opacity: number };
      expect(ent._opacity).toBe(1);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('clamps opacity to 0 for out-of-range frames', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({ VideoSource: {}, FrameRange: { from: 0, to: 60 }, TrackLayer: 0 });
      yield* world.addSystem(VideoSystem(120));
      yield* world.tick();
      const entities = yield* world.query('VideoSource');
      const ent = entities[0] as unknown as { _opacity: number };
      expect(ent._opacity).toBe(0);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('modulates opacity by a linear-in Envelope component (fade ramps 0 -> 1)', async () => {
    const opacityAt = async (frameIndex: number): Promise<number> => {
      const program = Effect.gen(function* () {
        const world = yield* World.make();
        yield* world.spawn({
          VideoSource: {},
          FrameRange: { from: 0, to: 120 },
          TrackLayer: 0,
          Envelope: { curve: 'linear-in', spanFrames: 60 },
        });
        yield* world.addSystem(VideoSystem(frameIndex));
        yield* world.tick();
        const entities = yield* world.query('VideoSource');
        return (entities[0] as unknown as { _opacity: number })._opacity;
      });
      return Effect.runPromise(Effect.scoped(program));
    };
    expect(await opacityAt(0)).toBe(0);
    expect(await opacityAt(30)).toBeCloseTo(0.5, 6);
    expect(await opacityAt(60)).toBe(1);
    expect(await opacityAt(90)).toBe(1);
  });

  it('keeps out-of-range opacity at 0 even with an Envelope present', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({
        VideoSource: {},
        FrameRange: { from: 0, to: 60 },
        TrackLayer: 0,
        Envelope: { curve: 'linear-in', spanFrames: 30 },
      });
      yield* world.addSystem(VideoSystem(90));
      yield* world.tick();
      const entities = yield* world.query('VideoSource');
      expect((entities[0] as unknown as { _opacity: number })._opacity).toBe(0);
    });
    await Effect.runPromise(Effect.scoped(program));
  });
});
