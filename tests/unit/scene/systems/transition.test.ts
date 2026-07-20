import { describe, it, expect } from 'vitest';
import { World } from '@liteship/core';
import { TransitionSystem, ease } from '@liteship/scene';
import type { EaseTag } from '@liteship/scene';

describe('TransitionSystem', () => {
  it('emits linear blend between transition.from and transition.to', () => {
    const world = World.make();
    world.spawn({
      TransitionKind: 'crossfade', FrameRange: { from: 0, to: 10 }, Between: ['a', 'b'],
    });
    world.addSystem(TransitionSystem(5));
    world.tick();
    const ts = world.query('TransitionKind');
    const ent = ts[0] as unknown as { _blend: number };
    expect(ent._blend).toBeCloseTo(0.5, 2);
  });

  it('shapes the blend through each catalog easing when an Ease component is present', () => {
    const blendWith = (easeTag: EaseTag): number => {
      const world = World.make();
      world.spawn({
        TransitionKind: 'crossfade',
        FrameRange: { from: 0, to: 10 },
        Between: ['a', 'b'],
        Ease: easeTag,
      });
      world.addSystem(TransitionSystem(4));
      world.tick();
      const ts = world.query('TransitionKind');
      return (ts[0] as unknown as { _blend: number })._blend;
    };
    // local progress at frame 4 of [0,10) is 0.4 — each tag must apply
    // its catalog function, and every entry is distinguishable from the
    // raw linear value at this point.
    expect(blendWith('cubic')).toBeCloseTo(ease.cubic(0.4), 6);
    expect(blendWith('spring')).toBeCloseTo(ease.spring(0.4), 6);
    expect(blendWith('bounce')).toBeCloseTo(ease.bounce(0.4), 6);
    expect(blendWith({ stepped: 4 })).toBeCloseTo(ease.stepped(4)(0.4), 6);
    expect(ease.cubic(0.4)).not.toBeCloseTo(0.4, 2);
    expect(blendWith('cubic')).not.toBeCloseTo(0.4, 2);
  });

  it('executes without a world handle (blend annotated locally, no component write)', () => {
    const entity = {
      id: 1,
      components: new Map<string, unknown>([
        ['TransitionKind', 'crossfade'],
        ['FrameRange', { from: 0, to: 10 }],
        ['Between', ['a', 'b']],
      ]),
    };
    TransitionSystem(5).execute([entity as never]);
    expect((entity as unknown as { _blend: number })._blend).toBeCloseTo(0.5, 2);
  });
});
