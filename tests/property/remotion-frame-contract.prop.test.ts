/** Stateful frame-selection properties for the public Remotion adapter. */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import type { CompositeState, VideoFrameOutput } from '@liteship/core';
import { cssVarsFromState, stateAtFrame } from '@liteship/remotion';

function frames(count: number): readonly VideoFrameOutput[] {
  return Array.from({ length: count }, (_, frame) => ({
    frame,
    timestamp: frame * 10,
    progress: count === 1 ? 1 : frame / (count - 1),
    state: {
      discrete: { frame: String(frame) },
      blend: {},
      outputs: {
        css: { '--frame': frame, '--parity': frame % 2 === 0 ? 'even' : 'odd' },
        glsl: {},
        wgsl: {},
        aria: {},
      },
    },
  }));
}

describe('@liteship/remotion frame contract', () => {
  test('lookup is total and clamps to the exact authored frame without mutating the stream', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 64 }), fc.integer({ min: -256, max: 256 }), (count, requested) => {
        const source = frames(count);
        const before = JSON.stringify(source);
        const expectedIndex = Math.max(0, Math.min(requested, count - 1));

        const selected = stateAtFrame(source, requested);

        expect(selected).toBe(source[expectedIndex]!.state);
        expect(selected.discrete['frame']).toBe(String(expectedIndex));
        expect(JSON.stringify(source)).toBe(before);
      }),
      { seed: 0x5eed_1801, numRuns: 400 },
    );
  });

  test('CSS projection is a fresh string-only value map and leaves the composite state untouched', () => {
    const cssValueArb = fc.oneof(fc.string(), fc.integer());
    fc.assert(
      fc.property(fc.dictionary(fc.stringMatching(/^--[a-z][a-z0-9-]{0,12}$/), cssValueArb), (css) => {
        const state: CompositeState = {
          discrete: {},
          blend: {},
          outputs: { css, glsl: {}, wgsl: {}, aria: {} },
        };
        const before = JSON.stringify(state);

        const projected = cssVarsFromState(state);

        expect(projected).toEqual(Object.fromEntries(Object.entries(css).map(([key, value]) => [key, String(value)])));
        expect(projected).not.toBe(css);
        expect(JSON.stringify(state)).toBe(before);
      }),
      { seed: 0x5eed_1802, numRuns: 300 },
    );
  });

  test('empty streams have one stable structural fallback for every requested frame', () => {
    fc.assert(
      fc.property(fc.integer(), (requested) => {
        expect(stateAtFrame([], requested)).toEqual({
          discrete: {},
          blend: {},
          outputs: { css: {}, glsl: {}, wgsl: {}, aria: {} },
        });
      }),
      { seed: 0x5eed_1803, numRuns: 100 },
    );
  });
});
