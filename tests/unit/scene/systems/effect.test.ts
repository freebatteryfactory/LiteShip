import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { World } from '@czap/core';
import { EffectSystem } from '@czap/scene';

describe('EffectSystem', () => {
  it('produces intensity for effect entities in range', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({
        EffectKind: 'pulse', TargetEntity: 'hero', FrameRange: { from: 0, to: 60 },
      });
      yield* world.addSystem(EffectSystem(30));
      yield* world.tick();
      const fx = yield* world.query('EffectKind');
      const ent = fx[0] as unknown as { _intensity: number };
      expect(ent._intensity).toBeGreaterThan(0);
      expect(ent._intensity).toBeLessThanOrEqual(1);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('multiplies the linear ramp by a pulse Envelope component (overdrive at period start)', async () => {
    const intensityAt = async (frameIndex: number): Promise<number> => {
      const program = Effect.gen(function* () {
        const world = yield* World.make();
        yield* world.spawn({
          EffectKind: 'pulse',
          TargetEntity: 'hero',
          FrameRange: { from: 0, to: 60 },
          Envelope: { curve: 'pulse', periodFrames: 15, amplitude: 0.3 },
        });
        yield* world.addSystem(EffectSystem(frameIndex));
        yield* world.tick();
        const fx = yield* world.query('EffectKind');
        return (fx[0] as unknown as { _intensity: number })._intensity;
      });
      return Effect.runPromise(Effect.scoped(program));
    };
    // ramp(30/60) = 0.5; pulse factor at a period boundary = 1.3
    expect(await intensityAt(30)).toBeCloseTo(0.5 * 1.3, 6);
    // mid-period (frame 37.5 is fractional, use 36: local phase 6/15 = 0.4)
    expect(await intensityAt(36)).toBeCloseTo((36 / 60) * (1 + 0.3 * (1 - 0.4)), 6);
  });

  it('emits zero intensity for out-of-range effects', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({ EffectKind: 'pulse', TargetEntity: 'hero', FrameRange: { from: 60, to: 120 } });
      yield* world.addSystem(EffectSystem(0));
      yield* world.tick();
      const fx = yield* world.query('EffectKind');
      const ent = fx[0] as unknown as { _intensity: number };
      expect(ent._intensity).toBe(0);
    });
    await Effect.runPromise(Effect.scoped(program));
  });
});
