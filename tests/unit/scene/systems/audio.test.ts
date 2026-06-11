import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { World } from '@czap/core';
import { AudioSystem } from '@czap/scene';

describe('AudioSystem', () => {
  it('produces frame-sample mapping for audio entities in range', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({
        AudioSource: 'bed', FrameRange: { from: 0, to: 120 }, Volume: -6, Pan: 0,
      });
      yield* world.addSystem(AudioSystem(30, 60, 48000));
      yield* world.tick();
      const entities = yield* world.query('AudioSource');
      const ent = entities[0] as unknown as { _phase: number };
      expect(ent._phase).toBeCloseTo(30 * (48000 / 60), 0);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('emits zero phase for out-of-range entities', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({ AudioSource: 'bed', FrameRange: { from: 60, to: 120 }, Volume: 0, Pan: 0 });
      yield* world.addSystem(AudioSystem(0, 60, 48000));
      yield* world.tick();
      const entities = yield* world.query('AudioSource');
      const ent = entities[0] as unknown as { _phase: number };
      expect(ent._phase).toBe(0);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('writes _gain = 1 for in-range entities without an Envelope', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({ AudioSource: 'bed', FrameRange: { from: 0, to: 120 }, Volume: -6, Pan: 0 });
      yield* world.addSystem(AudioSystem(30, 60, 48000));
      yield* world.tick();
      const entities = yield* world.query('AudioSource');
      expect((entities[0] as unknown as { _gain: number })._gain).toBe(1);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('modulates _gain by a linear-out Envelope component (fade ramps 1 -> 0 at range end)', async () => {
    const gainAt = async (frameIndex: number): Promise<number> => {
      const program = Effect.gen(function* () {
        const world = yield* World.make();
        yield* world.spawn({
          AudioSource: 'bed',
          FrameRange: { from: 0, to: 120 },
          Volume: -6,
          Pan: 0,
          Envelope: { curve: 'linear-out', spanFrames: 60 },
        });
        yield* world.addSystem(AudioSystem(frameIndex, 60, 48000));
        yield* world.tick();
        const entities = yield* world.query('AudioSource');
        return (entities[0] as unknown as { _gain: number })._gain;
      });
      return Effect.runPromise(Effect.scoped(program));
    };
    expect(await gainAt(0)).toBe(1);
    expect(await gainAt(60)).toBe(1);
    expect(await gainAt(90)).toBeCloseTo(0.5, 6);
    expect(await gainAt(119)).toBeCloseTo(1 / 60, 6);
  });

  it('writes _gain = 0 for out-of-range entities', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({
        AudioSource: 'bed',
        FrameRange: { from: 60, to: 120 },
        Volume: 0,
        Pan: 0,
        Envelope: { curve: 'linear-out', spanFrames: 30 },
      });
      yield* world.addSystem(AudioSystem(0, 60, 48000));
      yield* world.tick();
      const entities = yield* world.query('AudioSource');
      expect((entities[0] as unknown as { _gain: number })._gain).toBe(0);
    });
    await Effect.runPromise(Effect.scoped(program));
  });
});
