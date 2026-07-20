/**
 * Property test: quantizer outputChanges dispatches every configured target.
 *
 * The expected target set is derived from the quantizer config's per-state
 * output tables, while the crossing state comes from the core Boundary
 * evaluator. The stream under test only supplies the actual emitted record.
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { Boundary, type OutputsFor, type StateUnion, defineBoundary } from '@liteship/core';
import {
  defineQuantizer,
  createQuantizer,
  type OutputTarget,
  type QuantizerConfig,
  type QuantizerOutputs,
} from '@liteship/quantizer';

const outputTargets = ['css', 'glsl', 'wgsl', 'aria', 'ai'] as const satisfies readonly OutputTarget[];

type ShaderBoundary = ReturnType<typeof shaderBoundary>;
type ShaderState = StateUnion<ShaderBoundary>;

function shaderBoundary() {
  return defineBoundary({
    input: 'viewport.width',
    at: [
      [0, 'compact'],
      [768, 'expanded'],
    ] as const,
  });
}

function targetsForState<B extends Boundary>(outputs: QuantizerOutputs<B>, state: StateUnion<B>): OutputTarget[] {
  return outputTargets.filter((target) => {
    const table = outputs[target] as Record<string, Record<string, unknown>> | undefined;
    return table?.[state as string] !== undefined;
  });
}

function emittedAfterCrossing<B extends Boundary, O extends QuantizerOutputs<B>>(
  config: QuantizerConfig<B, O>,
  value: number,
): Partial<{ [K in OutputTarget]: Record<string, unknown> }> {
  const { quantizer: live, lifetime } = createQuantizer(config);
  // outputChanges is a replay-1 kernel: subscribe replays the current outputs
  // (events[0]), evaluate() publishes the post-crossing outputs (events[1]) —
  // both synchronous (was `Stream.take(live.outputChanges, 2)` forked in a scope).
  const events: Partial<{ [K in OutputTarget]: Record<string, unknown> }>[] = [];
  const dispose = live.outputChanges.subscribe((record) => events.push(record));
  live.evaluate(value);
  dispose();
  void lifetime.dispose();
  return events[1] ?? {};
}

describe('quantizer outputChanges target dispatch properties', () => {
  test('emits every configured output target for a boundary crossing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          cssGap: fc.integer({ min: 0, max: 4096 }),
          glslScale: fc.integer({ min: -4096, max: 4096 }),
          wgslScale: fc.integer({ min: -4096, max: 4096 }),
        }),
        async ({ cssGap, glslScale, wgslScale }) => {
          const boundary = shaderBoundary();
          const outputs = {
            css: {
              compact: { '--gap': 0 },
              expanded: { '--gap': cssGap },
            } satisfies OutputsFor<ShaderBoundary, Record<string, string | number>>,
            glsl: {
              compact: { u_scale: 0 },
              expanded: { u_scale: glslScale },
            } satisfies OutputsFor<ShaderBoundary, Record<string, number>>,
            wgsl: {
              compact: { u_scale: 0 },
              expanded: { u_scale: wgslScale },
            } satisfies OutputsFor<ShaderBoundary, Record<string, number>>,
          };
          const config = defineQuantizer(boundary, { outputs });
          const crossingValue = 1024;
          const crossingState = Boundary.evaluateResult(boundary, crossingValue).state as ShaderState;

          const expectedTargets = targetsForState(config.outputs, crossingState).sort();
          const emitted = await emittedAfterCrossing(config, crossingValue);

          expect(Object.keys(emitted).sort()).toEqual(expectedTargets);
          for (const target of expectedTargets) {
            expect(emitted[target]).toEqual(config.outputs[target]?.[crossingState]);
          }
        },
      ),
      { numRuns: 80, seed: 0x60cafe },
    );
  });
});
