// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sceneRuntimeCapsule } from '../../packages/scene/src/runtime.js';
import { compileIntro } from '../../examples/scenes/intro.js';
import { SceneRuntime } from '../../packages/scene/src/runtime.js';
import { scaledTimeout } from '../../vitest.shared.js';

describe('scene.runtime', () => {
  const cap = sceneRuntimeCapsule as {
    _kind?: unknown;
    step?: unknown;
    initialState?: unknown;
    invariants: ReadonlyArray<{ name: string; check: (input: unknown, output: unknown) => boolean }>;
  };
  // This stateMachine realizes its transition in a builder + tick handle, not
  // in declared step/initialState fields. The OUTPUT fields the declared
  // invariants read off the built handle.
  const OUTPUT_FIELDS = ['systemsRegistered', 'entitySpawnCount'] as const;

  // The compiled descriptor is PURE data — identical every call — so building a
  // fresh handle from it twice is the canonical "same seed".
  const buildHandle = async () => SceneRuntime.build(compileIntro());
  const handleOutput = (handle: Record<string, () => unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const f of OUTPUT_FIELDS) {
      const v = (handle as Record<string, unknown>)[f];
      out[f] = typeof v === 'function' ? (v as () => unknown)() : v;
    }
    return out;
  };

  it('premise: a runtime-backed stateMachine — no step/initialState, drives via build + tick', async () => {
    // It IS a stateMachine (so a traversal nominally applies)...
    expect(cap._kind).toBe('stateMachine');
    // ...but carries NO field-driven transition — that absence is exactly what
    // routes it to this builder-driven traversal. If it ever gains these, this
    // guard fails RED and the harness must use the field-driven path instead.
    expect(cap.step).toBeUndefined();
    expect(cap.initialState).toBeUndefined();
    const handle = await buildHandle();
    try {
      expect(typeof handle.tick).toBe('function');
      expect(typeof handle.currentFrame).toBe('function');
    } finally {
      await handle.release();
    }
  });

  it('invariants hold over the built runtime output', async () => {
    const handle = await buildHandle();
    try {
      const output = handleOutput(handle as unknown as Record<string, () => unknown>);
      for (const inv of cap.invariants) {
        expect(inv.check({ scene: compileIntro() }, output), inv.name).toBe(true);
      }
    } finally {
      await handle.release();
    }
  });

  it('deterministic replay: the same dtMs sequence yields the same frame trajectory', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Positive frame-scale dt steps (ms) — a realistic forward playback path.
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 24 }),
        async (dts) => {
          const trajectory = async (): Promise<readonly number[]> => {
            const handle = await buildHandle();
            try {
              const frames: number[] = [];
              for (const dt of dts) {
                await handle.tick(dt);
                frames.push(handle.currentFrame());
              }
              return frames;
            } finally {
              await handle.release();
            }
          };
          expect(await trajectory()).toEqual(await trajectory());
        },
      ),
      { numRuns: 20 },
    );
  }, scaledTimeout(30000));
});
