import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { parseWgslCastValue } from '../../../packages/vite/src/boundary-manifest.js';

describe('WGSL cast numeric grammar', () => {
  test.each([
    ['1', 1],
    ['-1.25e+2', -125],
    ['1, 2', [1, 2]],
    ['vec2<f32>(1, 2)', [1, 2]],
    ['vec3f(1, -.5, +2.)', [1, -0.5, 2]],
    ['vec4f(1 2 3 4)', [1, 2, 3, 4]],
  ] as const)('parses %s', (source, expected) => {
    expect(parseWgslCastValue(source)).toEqual(expected);
  });

  test.each(['vec2i(1, 2)', 'vec2u(1, 2)', 'vec2<i32>(1, 2)', 'vec2<u32>(1, 2)', 'vec4u(1 2 3 4)'])(
    'refuses an unsupported vector element type in %s',
    (source) => {
      expect(parseWgslCastValue(source)).toBe('invalid');
    },
  );

  test.each(['10px', 'calc(100% - 1px)', 'var(--scale-2)', '1-2', 'vec2f(1)', 'vec3f(1,2)', ',', '0x10'])(
    'refuses non-WGSL numeric input %s',
    (source) => {
      expect(parseWgslCastValue(source)).toBe('invalid');
    },
  );

  test('is total and deterministic for arbitrary and long hostile input', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 1_024 }), (source) => {
        expect(parseWgslCastValue(source)).toEqual(parseWgslCastValue(source));
      }),
      { seed: 0x7651, numRuns: 256 },
    );
    expect(parseWgslCastValue(`${'1'.repeat(50_000)}x`)).toBe('invalid');
    expect(parseWgslCastValue(`vec4f(${'1,'.repeat(20_000)}x)`)).toBe('invalid');
  });
});
