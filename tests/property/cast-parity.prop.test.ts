/**
 * Cross-path CAST parity — the cast analog of the 6-surface evaluator proof.
 *
 * The evaluator parity proof (`boundary-evaluator-parity.prop.test.ts`) pins
 * that every surface that *computes* a state index agrees. This file pins the
 * complementary law for the surfaces that *emit* it: for one Boundary and one
 * crossing value, the CSS / GLSL / WGSL casts must all resolve to the SAME
 * boundary state.
 *
 * The three casts speak different vocabularies for the same fact:
 *   - CSS  emits the state STRING   (`--czap-<name>` = `s3`), via `emit-css`.
 *   - GLSL emits the state INDEX    (`u_<name>` = 3),         via `emit-glsl`.
 *   - WGSL emits the state INDEX    (`state_index` = 3),      via `emit-wgsl`.
 * They are driven by the SAME boundary state through one Compositor tick, and
 * the compile-time `STATE_*` constants the GLSL/WGSL compilers emit must agree
 * with where those indices land. If the casts ever diverged, a `client:gpu`
 * fragment would shade a different state than the CSS/DOM shows — the exact
 * seam the Stage dual-export hash-equality rests on.
 *
 * WHY a property (not a snapshot): the law is "same source → same state across
 * every cast", quantified over arbitrary thresholds × crossing values, with the
 * threshold edges (±k ULP) where an off-by-one in any single cast would hide.
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { Boundary, Compositor } from '@czap/core';
import { GLSLCompiler, WGSLCompiler } from '@czap/compiler';
import { Effect } from 'effect';

// Boundary states are minted as `s0, s1, ...`, so the state literal carries its
// own index — the bridge between the string cast (CSS) and the numeric casts.
const idxOf = (state: string): number => Number(state.slice(1));

function makeBoundary(thresholds: readonly number[]) {
  const at = thresholds.map((t, i) => [t, `s${i}`] as const);
  return Boundary.make({ input: 'viewport.width', at: at as never });
}

/** A live quantizer whose `evaluate(v)` re-derives state from the same boundary. */
function liveQuantizer(boundary: Boundary.Shape) {
  let current = boundary.states[0] as string;
  return {
    _tag: 'Quantizer' as const,
    boundary,
    state: Effect.sync(() => current),
    stateSync: () => current,
    changes: null as never,
    evaluate(v: number) {
      current = Boundary.evaluate(boundary, v) as string;
      return current;
    },
  };
}

/**
 * Drive one boundary value through a Compositor tick and read back the three
 * casts as their resolved boundary-state index.
 */
async function castIndices(
  thresholds: readonly number[],
  value: number,
): Promise<{ css: number; glsl: number; wgsl: number; oracle: number }> {
  const boundary = makeBoundary(thresholds);
  const compositor = Compositor.create({ runtimeSite: 'node' }).compositor;
  const q = liveQuantizer(boundary);
  compositor.add('layout', q);
  // Drive evaluate then mark dirty — the live evaluate→markDirty contract every
  // host (worker, Stage dual-export) uses — so the tick reflects the new state.
  q.evaluate(value);
  compositor.runtime.markDirty('layout');
  const state = compositor.compute();

  return {
    css: idxOf(state.outputs.css['--czap-layout'] as string),
    glsl: state.outputs.glsl['u_layout']!,
    wgsl: state.outputs.wgsl['state_index']!,
    oracle: Boundary.evaluateResult(boundary, value).index,
  };
}

const arbThresholds = fc
  .uniqueArray(fc.integer({ min: 0, max: 10000 }), { minLength: 1, maxLength: 8 })
  .map((vals) => vals.sort((a, b) => a - b));

describe('Cast parity — CSS / GLSL / WGSL resolve the SAME boundary state', () => {
  test('LESSON (cast-parity): the three casts agree on the resolved state index for arbitrary thresholds × value', async () => {
    // WHY: the casts emit in different vocabularies (string vs index) but MUST
    // be driven by one boundary state. A divergence is a silent cross-surface
    // desync (CSS shows one state, the GPU shader shades another).
    await fc.assert(
      fc.asyncProperty(
        arbThresholds,
        fc.float({ min: Math.fround(-1000), max: Math.fround(20000) }),
        async (thresholds, value) => {
          const { css, glsl, wgsl, oracle } = await castIndices(thresholds, value);
          expect(css, `css ≠ oracle for [${thresholds.join(',')}] @ ${value}`).toBe(oracle);
          expect(glsl, `glsl ≠ oracle for [${thresholds.join(',')}] @ ${value}`).toBe(oracle);
          expect(wgsl, `wgsl ≠ oracle for [${thresholds.join(',')}] @ ${value}`).toBe(oracle);
        },
      ),
      { numRuns: 120, seed: 0x5cab1e },
    );
  });

  test('LESSON (cast-parity@edge): values clustered at threshold ± k ULP keep the three casts aligned', async () => {
    // WHY: an off-by-one in any single cast hides everywhere EXCEPT the exact
    // crossing boundary; sweep ULP-neighbours of a threshold to flush it out.
    function ulpNeighbours(x: number): [number, number] {
      const bits = new BigInt64Array(new Float64Array([x]).buffer);
      const down = new Float64Array(new BigInt64Array([bits[0]! - 1n]).buffer)[0]!;
      const up = new Float64Array(new BigInt64Array([bits[0]! + 1n]).buffer)[0]!;
      return [down, up];
    }
    await fc.assert(
      fc.asyncProperty(
        arbThresholds,
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: -3, max: 3 }),
        async (thresholds, ti, k) => {
          const base = thresholds[ti % thresholds.length]!;
          let v = base;
          for (let i = 0; i < Math.abs(k); i++) v = ulpNeighbours(v)[k < 0 ? 0 : 1];
          const { css, glsl, wgsl, oracle } = await castIndices(thresholds, v);
          expect(css).toBe(oracle);
          expect(glsl).toBe(oracle);
          expect(wgsl).toBe(oracle);
        },
      ),
      { numRuns: 120, seed: 0x0ff5e7 },
    );
  });
});

describe('Cast parity — compile-time STATE_* constants index the same states the casts emit', () => {
  test('LESSON (cast-parity@compile): every GLSL/WGSL STATE_<NAME> constant equals the boundary index the casts resolve to', () => {
    // WHY: the runtime casts emit an INDEX; the shader code references the state
    // by the compiler's `STATE_<NAME>` constant. If `STATE_S3 = 2` but the cast
    // emits 3, the shader branches on the wrong band. Pin the constants ↔ index
    // bijection over arbitrary boundaries so the two cannot drift apart.
    fc.assert(
      fc.property(arbThresholds, (thresholds) => {
        const boundary = makeBoundary(thresholds);
        const perState = Object.fromEntries(boundary.states.map((s) => [s as string, { v: 1 }]));
        const glsl = GLSLCompiler.compile(boundary, perState as never);
        const wgsl = WGSLCompiler.compile(boundary, perState as never);

        boundary.states.forEach((state, index) => {
          const name = (state as string).toUpperCase();
          const glslDefine = glsl.defines.find((d) => d.name === `STATE_${name}`);
          const wgslConst = wgsl.declarations.match(new RegExp(`STATE_${name}: u32 = (\\d+)u;`));
          expect(glslDefine, `GLSL missing STATE_${name}`).toBeDefined();
          expect(Number(glslDefine!.value), `GLSL STATE_${name} ≠ index`).toBe(index);
          expect(wgslConst, `WGSL missing STATE_${name}`).not.toBeNull();
          expect(Number(wgslConst![1]), `WGSL STATE_${name} ≠ index`).toBe(index);
        });
      }),
      { numRuns: 200, seed: 0xc0ffee },
    );
  });
});
