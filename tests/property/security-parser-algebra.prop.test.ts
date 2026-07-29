/**
 * Cross-owner algebra for the parsers hardened after the default-branch CodeQL
 * census. These properties prove the accepted language, not individual attack
 * spellings, so implementation refactors remain free while behavior stays fixed.
 */
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { parseRootScriptCheckExecution } from '../../packages/command/src/checks/definition.js';
import { compileViewTransition } from '../../packages/compiler/src/view-transition-compile.js';
import { classifyBenchSource } from '../../packages/core/src/evidence/bench-classify.js';
import { parseTypedBinding } from '../../packages/core/src/motion/interpolate.js';
import { projectNameFromDir } from '../../packages/create-liteship/src/scaffold.js';
import { detectEarlyReturnBeforeExpect } from '../../packages/gauntlet/src/gates/early-return-detect.js';
import { parseWgslCastValue } from '../../packages/vite/src/boundary-manifest.js';
import { parseEventId } from '../../packages/web/src/stream/resumption-pure.js';

const asciiWord = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'), { minLength: 1, maxLength: 32 })
  .map((chars) => chars.join(''));
const javascriptIdentifier = fc
  .tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$'),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$'), { maxLength: 31 }),
  )
  .map(([first, rest]) => `${first}${rest.join('')}`);
const horizontalWhitespace = fc
  .array(fc.constantFrom(' ', '\t'), { minLength: 1, maxLength: 24 })
  .map((chars) => chars.join(''));
const finiteInteger = fc.integer({ min: -1_000_000, max: 1_000_000 });
const blockCommentPayload = fc.string({ maxLength: 512 }).map((payload) => payload.replaceAll('*/', '* /'));

describe('root-script command grammar', () => {
  test('tokenizes every admitted pnpm-run command independently of whitespace width', () => {
    fc.assert(
      fc.property(
        asciiWord,
        fc.array(asciiWord, { maxLength: 8 }),
        horizontalWhitespace,
        horizontalWhitespace,
        (script, args, firstGap, secondGap) => {
          const command = `pnpm${firstGap}run${secondGap}${script}${args.map((arg) => `${firstGap}${arg}`).join('')}`;
          expect(parseRootScriptCheckExecution(command)).toEqual({
            kind: 'root-script',
            script,
            args,
            invocation: 'pnpm-run',
          });
        },
      ),
      { seed: 0xc011ab1e, numRuns: 256 },
    );
  });

  test('never admits a different executable or a missing script name', () => {
    fc.assert(
      fc.property(fc.constantFrom('npm', 'node', 'bun', 'pnpmx', 'xpnpm'), asciiWord, (program, token) => {
        expect(parseRootScriptCheckExecution(`${program} run ${token}`)).toBeNull();
      }),
      { seed: 0xc011ab1f, numRuns: 128 },
    );
    expect(parseRootScriptCheckExecution('pnpm run')).toBeNull();
  });
});

describe('numeric grammar projections', () => {
  test('round-trips finite integer lengths and angles without accepting a prefix', () => {
    fc.assert(
      fc.property(
        finiteInteger,
        fc.constantFrom('px', 'rem', '%', 'vw', 'vh'),
        fc.constantFrom('deg', 'rad', 'turn'),
        (value, lengthUnit, angleUnit) => {
          expect(parseTypedBinding('--length', `${value}${lengthUnit}`)).toEqual({
            k: 'length',
            v: value,
            unit: lengthUnit,
          });
          expect(parseTypedBinding('--angle', `${value}${angleUnit}`)).toEqual({
            k: 'angle',
            v: value,
            unit: angleUnit,
          });
          expect(parseTypedBinding('--length', `${value}${lengthUnit}junk`)).toEqual({ k: 'number', v: 0 });
        },
      ),
      { seed: 0xdec1a1, numRuns: 256 },
    );
  });

  test('projects every bounded scientific CSS length through its complete exponent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10_000, max: 10_000 }),
        fc.integer({ min: -6, max: 6 }),
        fc.constantFrom('px', 'rem', 'vw', 'vh'),
        (coefficient, exponent, unit) => {
          const source = `${coefficient}e${exponent}${unit}`;
          expect(parseTypedBinding('--length', source)).toEqual({
            k: 'length',
            v: Number(`${coefficient}e${exponent}`),
            unit,
          });
        },
      ),
      { seed: 0x5c1e17, numRuns: 256 },
    );
  });

  test('preserves WGSL vector arity and rejects any mismatched constructor', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }),
        fc.array(finiteInteger, { minLength: 1, maxLength: 5 }),
        (arity, values) => {
          const source = `vec${arity}f(${values.join(', ')})`;
          if (values.length === arity) expect(parseWgslCastValue(source)).toEqual(values);
          else expect(parseWgslCastValue(source)).toBe('invalid');
        },
      ),
      { seed: 0x7651ca57, numRuns: 256 },
    );
  });

  test('parses bare WGSL component lists iff their supported width is 1 through 4', () => {
    fc.assert(
      fc.property(fc.array(finiteInteger, { minLength: 1, maxLength: 7 }), (values) => {
        const parsed = parseWgslCastValue(values.join(' '));
        if (values.length === 1) expect(parsed).toBe(values[0]);
        else if (values.length <= 4) expect(parsed).toEqual(values);
        else expect(parsed).toBe('invalid');
      }),
      { seed: 0x7651ca58, numRuns: 256 },
    );
  });
});

describe('identifier projection laws', () => {
  test('view-transition names are non-empty custom identifiers with a stable prefix', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 256 }), (boundary) => {
        const result = compileViewTransition({ boundary, durationMs: 1, easing: 'linear' });
        expect(result.viewTransitionName).toMatch(/^liteship-vt-[A-Za-z0-9_-]+$/u);
        expect(result.nameAssignment).toContain(`view-transition-name: ${result.viewTransitionName};`);
      }),
      { seed: 0x51a6, numRuns: 256 },
    );
  });

  test('project names are stable npm-safe names after one projection', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 256 }), (name) => {
        const first = projectNameFromDir(name);
        expect(first).toMatch(/^[a-z0-9~][a-z0-9._~-]*$/u);
        expect(projectNameFromDir(first)).toBe(first);
        expect(first.startsWith('.')).toBe(false);
        expect(first.startsWith('_')).toBe(false);
      }),
      { seed: 0x5ca7701d, numRuns: 256 },
    );
  });
});

describe('event, benchmark, and early-return topology', () => {
  test('extracts the maximal trailing decimal sequence from opaque event ids', () => {
    fc.assert(
      fc.property(
        asciiWord.filter((prefix) => !/\d$/u.test(prefix)),
        fc.nat({ max: 1_000_000 }),
        (prefix, sequence) => {
          const result = parseEventId(`${prefix}:${sequence}`);
          expect(result.sequence).toBe(sequence);
          expect(result.raw).toBe(`${prefix}:${sequence}`);
        },
      ),
      { seed: 0xe7e17, numRuns: 256 },
    );
  });

  test('comment and string decoys never make an empty bench executable', () => {
    fc.assert(
      fc.property(blockCommentPayload, (payload) => {
        const escaped = JSON.stringify(`bench('fake', () => { ${payload} })`);
        expect(classifyBenchSource(`const decoy = ${escaped}; bench('real', () => { /* ${payload} */ });`)).toBe(
          'placeholder',
        );
      }),
      { seed: 0xbeac4, numRuns: 192 },
    );
  });

  test('template text stays inert while every interpolated invocation remains executable evidence', () => {
    fc.assert(
      fc.property(javascriptIdentifier, (callee) => {
        expect(classifyBenchSource("bench('x', () => { `" + callee + '()` })')).toBe('placeholder');
        expect(classifyBenchSource("bench('x', () => { `${" + callee + '()}` })')).toBe('real');
      }),
      { seed: 0x7e4d_1a7e, numRuns: 192 },
    );
  });

  test('nested function returns are never attributed to the outer test callback', () => {
    fc.assert(
      fc.property(javascriptIdentifier, (name) => {
        const source =
          `test('x', () => {\n` +
          `  const fixture = { async ${name}() { return 'nested'; } };\n` +
          `  expect(fixture).toBeDefined();\n` +
          `});\n`;
        expect(detectEarlyReturnBeforeExpect(source)).toEqual([]);
      }),
      { seed: 0xea71, numRuns: 192 },
    );
  });
});
