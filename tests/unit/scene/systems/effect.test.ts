import { describe, it, expect } from 'vitest';
import { createWorld } from '@liteship/core/ecs';
import { EffectKindPart, EffectSystem, IntensityPart } from '@liteship/scene';
import { spawnSceneEntity } from '../../../support/scene-world.js';

describe('EffectSystem', () => {
  it('produces intensity for effect entities in range', () => {
    const world = createWorld();
    spawnSceneEntity(world, {
      EffectKind: 'pulse',
      TargetEntity: 'hero',
      FrameRange: { from: 0, to: 60 },
    });
    world.addSystem(EffectSystem(30));
    world.tick();
    const fx = world.query(EffectKindPart, IntensityPart);
    expect(fx[0]!.get(IntensityPart)).toBeGreaterThan(0);
    expect(fx[0]!.get(IntensityPart)).toBeLessThanOrEqual(1);
  });

  it('multiplies the linear ramp by a pulse Envelope component (overdrive at period start)', () => {
    const intensityAt = (frameIndex: number): number => {
      const world = createWorld();
      spawnSceneEntity(world, {
        EffectKind: 'pulse',
        TargetEntity: 'hero',
        FrameRange: { from: 0, to: 60 },
        Envelope: { curve: 'pulse', periodFrames: 15, amplitude: 0.3 },
      });
      world.addSystem(EffectSystem(frameIndex));
      world.tick();
      const fx = world.query(EffectKindPart, IntensityPart);
      return fx[0]!.get(IntensityPart);
    };
    // ramp(30/60) = 0.5; pulse factor at a period boundary = 1.3
    expect(intensityAt(30)).toBeCloseTo(0.5 * 1.3, 6);
    // mid-period (frame 37.5 is fractional, use 36: local phase 6/15 = 0.4)
    expect(intensityAt(36)).toBeCloseTo((36 / 60) * (1 + 0.3 * (1 - 0.4)), 6);
  });

  it('emits zero intensity for out-of-range effects', () => {
    const world = createWorld();
    spawnSceneEntity(world, { EffectKind: 'pulse', TargetEntity: 'hero', FrameRange: { from: 60, to: 120 } });
    world.addSystem(EffectSystem(0));
    world.tick();
    const fx = world.query(EffectKindPart, IntensityPart);
    expect(fx[0]!.get(IntensityPart)).toBe(0);
  });
});
