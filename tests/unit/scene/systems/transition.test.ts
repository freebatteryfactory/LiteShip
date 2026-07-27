import { describe, it, expect } from 'vitest';
import { createWorld } from '@liteship/core/ecs';
import { BlendPart, TransitionKindPart, TransitionSystem, ease } from '@liteship/scene';
import type { EaseTag } from '@liteship/scene';
import { spawnSceneEntity } from '../../../support/scene-world.js';

describe('TransitionSystem', () => {
  it('emits linear blend between transition.from and transition.to', () => {
    const world = createWorld();
    spawnSceneEntity(world, {
      TransitionKind: 'crossfade',
      FrameRange: { from: 0, to: 10 },
      Between: ['a', 'b'],
    });
    world.addSystem(TransitionSystem(5));
    world.tick();
    const ts = world.query(TransitionKindPart, BlendPart);
    expect(ts[0]!.get(BlendPart)).toBeCloseTo(0.5, 2);
  });

  it('shapes the blend through each catalog easing when an Ease component is present', () => {
    const blendWith = (easeTag: EaseTag): number => {
      const world = createWorld();
      spawnSceneEntity(world, {
        TransitionKind: 'crossfade',
        FrameRange: { from: 0, to: 10 },
        Between: ['a', 'b'],
        Ease: easeTag,
      });
      world.addSystem(TransitionSystem(4));
      world.tick();
      const ts = world.query(TransitionKindPart, BlendPart);
      return ts[0]!.get(BlendPart);
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

  it('requires a world-owned system context instead of a worldless annotation path', () => {
    expect(() => TransitionSystem(5).execute([{ id: 'entity' }] as never, undefined as never)).toThrow();
  });
});
