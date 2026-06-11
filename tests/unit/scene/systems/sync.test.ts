import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { World } from '@czap/core';
import { SyncSystem } from '@czap/scene';

/**
 * SyncSystem post-Task-9: reads beat markers from `Beat`-tagged
 * entities in the world (populated by the `scene.beat-binding`
 * capsule) instead of the legacy closure-private `_beats` sidecar.
 *
 * These tests construct beat entities directly via `world.spawn`
 * to exercise SyncSystem in isolation without the runtime layer.
 */
describe('SyncSystem (world-query path)', () => {
  it('pulses intensity to ~1 on the frame of a beat', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      // SyncAnchor entity that the system writes _intensity onto.
      yield* world.spawn({
        SyncAnchor: { anchor: 'bed', mode: 'beat' },
        TargetEntity: 'hero',
      });
      // Beat entities the system queries for. Frame 30 at 60fps = 500 ms.
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 0, strength: 1 } });
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 500, strength: 1 } });
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 1000, strength: 1 } });
      // frameIndex=30 at 60fps → currentTimeMs = 500 → lastBeat = 500 → exp(0) = 1.
      yield* world.addSystem(SyncSystem(30, 60));
      yield* world.tick();
      const fx = yield* world.query('SyncAnchor');
      const intensity = fx[0]?.components.get('_intensity');
      expect(typeof intensity).toBe('number');
      expect(intensity as number).toBeCloseTo(1, 2);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('emits lower intensity mid-beat with exponential decay', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({
        SyncAnchor: { anchor: 'bed', mode: 'beat' },
        TargetEntity: 'hero',
      });
      // Beats at t=0 and t=1000 ms. At frameIndex=30, fps=60 we are at
      // 500 ms — half-way between beats — so intensity should be
      // exp(-500/250) = exp(-2) ≈ 0.135, well under 0.5.
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 0, strength: 1 } });
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 1000, strength: 1 } });
      yield* world.addSystem(SyncSystem(30, 60));
      yield* world.tick();
      const fx = yield* world.query('SyncAnchor');
      const intensity = fx[0]?.components.get('_intensity');
      expect(typeof intensity).toBe('number');
      expect(intensity as number).toBeLessThan(0.5);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('writes intensity = 0 when no beats have occurred yet (lastBeat = -Infinity → exp(-Inf) = 0)', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({ SyncAnchor: { anchor: 'bed', mode: 'beat' } });
      // Future beat only — current frame is before it.
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 5000, strength: 1 } });
      yield* world.addSystem(SyncSystem(30, 60)); // currentTimeMs = 500
      yield* world.tick();
      const fx = yield* world.query('SyncAnchor');
      const intensity = fx[0]?.components.get('_intensity');
      expect(intensity).toBe(0);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  // Codex P2 regression: an effect declaring BOTH syncTo and envelope
  // compiles to an entity carrying SyncAnchor + Envelope + FrameRange.
  // SyncSystem must COMPOSE (decay × envelopeFactor) instead of
  // clobbering the envelope with the bare decay — sync sets the base,
  // the envelope multiplies it (Spec 1 §5.4).
  it('multiplies beat decay by a pulse envelope when the SyncAnchor entity also carries Envelope + FrameRange', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({
        SyncAnchor: { anchor: 'bed', mode: 'beat' },
        // periodFrames 30 → at frame 30 the pulse is at its peak (local
        // phase 0) → factor = 1 + amplitude = 1.5.
        Envelope: { curve: 'pulse', periodFrames: 30, amplitude: 0.5 },
        FrameRange: { from: 0, to: 60 },
      });
      // Beat exactly at frame 30 (500 ms @ 60fps) → decay = exp(0) = 1.
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 500, strength: 1 } });
      yield* world.addSystem(SyncSystem(30, 60));
      yield* world.tick();
      const fx = yield* world.query('SyncAnchor');
      const intensity = fx[0]?.components.get('_intensity');
      // decay(1) × pulse factor(1.5) = 1.5 — impossible from decay alone
      // (decay ≤ 1), so this asserts the envelope contribution survived.
      expect(intensity as number).toBeCloseTo(1.5, 5);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('gates beat decay through a fade envelope (decay < 1 composes too)', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({
        SyncAnchor: { anchor: 'bed', mode: 'beat' },
        // linear-in over 60 frames → at frame 30 the factor is 0.5.
        Envelope: { curve: 'linear-in', spanFrames: 60 },
        FrameRange: { from: 0, to: 60 },
      });
      // Beats at 0 and 1000 ms; frame 30 (500 ms) → decay = exp(-2).
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 0, strength: 1 } });
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 1000, strength: 1 } });
      yield* world.addSystem(SyncSystem(30, 60));
      yield* world.tick();
      const fx = yield* world.query('SyncAnchor');
      const intensity = fx[0]?.components.get('_intensity');
      expect(intensity as number).toBeCloseTo(Math.exp(-2) * 0.5, 5);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('falls back to plain decay when an Envelope is present but FrameRange is missing', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({
        SyncAnchor: { anchor: 'bed', mode: 'beat' },
        Envelope: { curve: 'pulse', periodFrames: 30, amplitude: 0.5 },
        // no FrameRange — nothing to evaluate the envelope against.
      });
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 500, strength: 1 } });
      yield* world.addSystem(SyncSystem(30, 60));
      yield* world.tick();
      const fx = yield* world.query('SyncAnchor');
      const intensity = fx[0]?.components.get('_intensity');
      expect(intensity as number).toBeCloseTo(1, 5);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  // Codex P2 follow-up: the envelope contribution must be GATED on the
  // effect's FrameRange — outside the window the write must be the
  // plain decay (exactly what pre-envelope sync did), not
  // decay × envelopeFactor. The gate uses the same half-open idiom as
  // EffectSystem: `range.from <= frameIndex < range.to`.
  describe('FrameRange gating of the envelope contribution', () => {
    /** Spawn one SyncAnchor+Envelope+FrameRange entity and one beat at
     * 500 ms (= frame 30 @ 60fps → decay = exp(0) = 1), tick SyncSystem
     * at frame 30, and return the written intensity. */
    const intensityAtFrame30 = (range: { from: number; to: number }) =>
      Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const world = yield* World.make();
            yield* world.spawn({
              SyncAnchor: { anchor: 'bed', mode: 'beat' },
              // periodFrames 30 → at any multiple-of-30 offset from
              // range.from the pulse factor is 1.5; at other phases it
              // is still ≠ 1, so any envelope leak is observable.
              Envelope: { curve: 'pulse', periodFrames: 30, amplitude: 0.5 },
              FrameRange: range,
            });
            yield* world.spawn({ Beat: { kind: 'beat', timeMs: 500, strength: 1 } });
            yield* world.addSystem(SyncSystem(30, 60));
            yield* world.tick();
            const fx = yield* world.query('SyncAnchor');
            return fx[0]?.components.get('_intensity') as number;
          }),
        ),
      );

    it('writes plain decay (no envelope factor) when frameIndex is before the FrameRange', async () => {
      // Frame 30 < from(40): dormant effect. Pre-fix the pulse leaked a
      // factor of 1 + 0.5·(1 − 20/30) ≈ 1.1667; the gate restores 1.
      expect(await intensityAtFrame30({ from: 40, to: 60 })).toBeCloseTo(1, 5);
    });

    it('writes plain decay (no envelope factor) when frameIndex is after the FrameRange', async () => {
      // Frame 30 ≥ to(20): effect window already over.
      expect(await intensityAtFrame30({ from: 0, to: 20 })).toBeCloseTo(1, 5);
    });

    it('composes decay × envelope exactly at range.from (inclusive lower bound, EffectSystem idiom)', async () => {
      // Frame 30 === from: in range, pulse phase 0 → factor 1.5.
      expect(await intensityAtFrame30({ from: 30, to: 60 })).toBeCloseTo(1.5, 5);
    });

    it('writes plain decay exactly at range.to (exclusive upper bound, EffectSystem idiom)', async () => {
      // Frame 30 === to: out of range per the half-open window. Pre-fix
      // the pulse peaked here (phase 0 → 1.5); the gate restores 1.
      expect(await intensityAtFrame30({ from: 0, to: 30 })).toBeCloseTo(1, 5);
    });
  });

  it('skips Beat entities whose Beat component is missing or has a non-numeric timeMs', async () => {
    // Forces the L48-49 / L51 guard branches: a Beat-tagged entity with
    // an unrelated component shape, plus another with a non-numeric
    // timeMs, must not contaminate the time-line. The system should
    // still produce the correct decay against the one valid beat.
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({ SyncAnchor: { anchor: 'bed', mode: 'beat' } });
      // Entity spawned via the queryable id 'Beat' but with no Beat field.
      yield* world.spawn({ Beat: undefined as unknown as Record<string, unknown> });
      // Entity with a Beat object whose timeMs is the wrong type.
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 'oops', strength: 1 } });
      // One real beat at t=500ms.
      yield* world.spawn({ Beat: { kind: 'beat', timeMs: 500, strength: 1 } });
      yield* world.addSystem(SyncSystem(30, 60));
      yield* world.tick();
      const fx = yield* world.query('SyncAnchor');
      const intensity = fx[0]?.components.get('_intensity');
      expect(intensity as number).toBeCloseTo(1, 2);
    });
    await Effect.runPromise(Effect.scoped(program));
  });
});
