import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { World } from '@czap/core';
import { TransitionSystem, ease } from '@czap/scene';
import type { EaseTag } from '@czap/scene';

describe('TransitionSystem', () => {
  it('emits linear blend between transition.from and transition.to', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({
        TransitionKind: 'crossfade', FrameRange: { from: 0, to: 10 }, Between: ['a', 'b'],
      });
      yield* world.addSystem(TransitionSystem(5));
      yield* world.tick();
      const ts = yield* world.query('TransitionKind');
      const ent = ts[0] as unknown as { _blend: number };
      expect(ent._blend).toBeCloseTo(0.5, 2);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('shapes the blend through each catalog easing when an Ease component is present', async () => {
    const blendWith = async (easeTag: EaseTag): Promise<number> => {
      const program = Effect.gen(function* () {
        const world = yield* World.make();
        yield* world.spawn({
          TransitionKind: 'crossfade',
          FrameRange: { from: 0, to: 10 },
          Between: ['a', 'b'],
          Ease: easeTag,
        });
        yield* world.addSystem(TransitionSystem(4));
        yield* world.tick();
        const ts = yield* world.query('TransitionKind');
        return (ts[0] as unknown as { _blend: number })._blend;
      });
      return Effect.runPromise(Effect.scoped(program));
    };
    // local progress at frame 4 of [0,10) is 0.4 — each tag must apply
    // its catalog function, and every entry is distinguishable from the
    // raw linear value at this point.
    expect(await blendWith('cubic')).toBeCloseTo(ease.cubic(0.4), 6);
    expect(await blendWith('spring')).toBeCloseTo(ease.spring(0.4), 6);
    expect(await blendWith('bounce')).toBeCloseTo(ease.bounce(0.4), 6);
    expect(await blendWith({ stepped: 4 })).toBeCloseTo(ease.stepped(4)(0.4), 6);
    expect(ease.cubic(0.4)).not.toBeCloseTo(0.4, 2);
    expect(await blendWith('cubic')).not.toBeCloseTo(0.4, 2);
  });

  it('executes without a world handle (blend annotated locally, no component write)', async () => {
    const entity = {
      id: 1,
      components: new Map<string, unknown>([
        ['TransitionKind', 'crossfade'],
        ['FrameRange', { from: 0, to: 10 }],
        ['Between', ['a', 'b']],
      ]),
    };
    await Effect.runPromise(TransitionSystem(5).execute([entity as never]));
    expect((entity as unknown as { _blend: number })._blend).toBeCloseTo(0.5, 2);
  });
});
