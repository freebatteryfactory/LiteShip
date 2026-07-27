/** Independent round-trip oracle for DTCG path to CSS identifier projection. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fromDesignTokens } from '@liteship/compiler/migrate';

const acceptedSegment = fc
  .string({ minLength: 1, maxLength: 24 })
  .filter(
    (name) =>
      !name.startsWith('$') &&
      !/[{}.]/u.test(name) &&
      name !== '__proto__' &&
      name !== 'prototype' &&
      name !== 'constructor',
  );

function documentAt(path: readonly string[], value: number): Record<string, unknown> {
  let node: Record<string, unknown> = { $type: 'number', $value: value };
  for (const segment of [...path].reverse()) node = { [segment]: node };
  return node;
}

function decodeIdentifier(name: string): readonly string[] {
  expect(name.startsWith('dtcg-path-')).toBe(true);
  const payload = name.slice('dtcg-path-'.length);
  const segments: string[] = [];
  let cursor = 0;
  while (cursor < payload.length) {
    const dash = payload.indexOf('-', cursor);
    expect(dash).toBeGreaterThan(cursor);
    const lengthText = payload.slice(cursor, dash);
    expect(lengthText).toMatch(/^[0-9]+$/u);
    const length = Number.parseInt(lengthText, 10);
    expect(Number.isSafeInteger(length)).toBe(true);
    expect(length).toBeGreaterThan(0);
    const hexStart = dash + 1;
    const hexEnd = hexStart + length * 4;
    const hex = payload.slice(hexStart, hexEnd);
    expect(hex).toHaveLength(length * 4);
    expect(hex).toMatch(/^[0-9a-f]+$/u);
    let segment = '';
    for (let offset = 0; offset < hex.length; offset += 4) {
      segment += String.fromCharCode(Number.parseInt(hex.slice(offset, offset + 4), 16));
    }
    segments.push(segment);
    cursor = hexEnd;
    if (cursor < payload.length) {
      expect(payload[cursor]).toBe('-');
      cursor += 1;
    }
  }
  return segments;
}

function oneToken(path: readonly string[], value = 1) {
  const result = fromDesignTokens(documentAt(path, value));
  expect(result.boundaries).toEqual([]);
  expect(result.themes).toEqual([]);
  expect(result.diagnostics).toEqual([]);
  expect(result.tokens).toHaveLength(1);
  return result.tokens[0]!;
}

describe('DTCG identifier reference codec', () => {
  it('round-trips arbitrary accepted paths through emitted token identity', () => {
    fc.assert(
      fc.property(fc.array(acceptedSegment, { minLength: 1, maxLength: 6 }), fc.integer(), (path, value) => {
        const token = oneToken(path, value);
        expect(decodeIdentifier(token.name)).toEqual(path);
        expect(token.cssProperty).toBe(`--liteship-${token.name}`);
        expect(token.fallback).toBe(value);
      }),
      { seed: 0xd7c6_c001, numRuns: 1_000 },
    );
  });

  it('preserves every UTF-16 code unit, including lone surrogates', () => {
    const hostile = fc.constantFrom(
      '\ud800',
      '\ud801',
      '\udbff',
      '\udc00',
      '\udfff',
      '😀',
      '👩‍💻',
      'é',
      'e\u0301',
      ' ',
      '\t',
      '\n',
    );
    fc.assert(
      fc.property(fc.array(hostile, { minLength: 1, maxLength: 5 }), (path) => {
        const token = oneToken(path);
        const decoded = decodeIdentifier(token.name);
        expect(decoded).toHaveLength(path.length);
        for (const [index, segment] of path.entries()) {
          expect(decoded[index]).toBe(segment);
          expect(decoded[index]!.length).toBe(segment.length);
          for (let unit = 0; unit < segment.length; unit += 1) {
            expect(decoded[index]!.charCodeAt(unit)).toBe(segment.charCodeAt(unit));
          }
        }
      }),
      { seed: 0xd7c6_c002, numRuns: 400 },
    );
  });

  it('distinguishes canonically equivalent but authorially distinct Unicode spellings', () => {
    const pairs = [
      ['é', 'e\u0301'],
      ['Å', 'A\u030a'],
      ['ñ', 'n\u0303'],
      ['ü', 'u\u0308'],
      ['가', '\u1100\u1161'],
    ] as const;
    fc.assert(
      fc.property(fc.constantFrom(...pairs), ([left, right]) => {
        expect(left.normalize('NFC')).toBe(right.normalize('NFC'));
        const leftToken = oneToken([left]);
        const rightToken = oneToken([right]);
        expect(leftToken.name).not.toBe(rightToken.name);
        expect(decodeIdentifier(leftToken.name)).toEqual([left]);
        expect(decodeIdentifier(rightToken.name)).toEqual([right]);
      }),
      { seed: 0xd7c6_c003, numRuns: 100 },
    );
  });

  it('distinguishes all path-boundary permutations that naive separators collapse', () => {
    fc.assert(
      fc.property(acceptedSegment, acceptedSegment, acceptedSegment, (a, b, c) => {
        const paths = [[`${a}-${b}`, c], [a, `${b}-${c}`], [`${a}-${b}-${c}`], [a, b, c]];
        const names = paths.map((path, index) => oneToken(path, index).name);
        for (const [index, name] of names.entries()) expect(decodeIdentifier(name)).toEqual(paths[index]);
        const distinctPaths = new Set(paths.map((path) => JSON.stringify(path)));
        expect(new Set(names).size).toBe(distinctPaths.size);
      }),
      { seed: 0xd7c6_c004, numRuns: 400 },
    );
  });

  it('keeps numeric-looking, encoded-looking, and whitespace names distinct', () => {
    const spellings = fc.constantFrom(
      '0',
      '00',
      '1-0061',
      'dtcg-path-1-0061',
      'a',
      ' a',
      'a ',
      'a\t',
      '\ta',
      '-',
      '--',
      '_',
    );
    fc.assert(
      fc.property(fc.uniqueArray(spellings, { minLength: 2, maxLength: 10 }), (names) => {
        const tokens = names.map((name, index) => oneToken([name], index));
        expect(new Set(tokens.map((token) => token.name)).size).toBe(names.length);
        expect(new Set(tokens.map((token) => token.cssProperty)).size).toBe(names.length);
        for (const [index, token] of tokens.entries()) expect(decodeIdentifier(token.name)).toEqual([names[index]!]);
      }),
      { seed: 0xd7c6_c005, numRuns: 200 },
    );
  });

  it('is deterministic across fresh lowering calls and object allocation histories', () => {
    fc.assert(
      fc.property(fc.array(acceptedSegment, { minLength: 1, maxLength: 5 }), fc.integer(), (path, value) => {
        const first = oneToken(path, value);
        // Allocate and lower unrelated definitions between the two observations.
        oneToken(['unrelated', String(value)], value + 1);
        const second = oneToken([...path], value);
        expect(second.name).toBe(first.name);
        expect(second.cssProperty).toBe(first.cssProperty);
        expect(second.id).toBe(first.id);
      }),
      { seed: 0xd7c6_c006, numRuns: 300 },
    );
  });

  it('keeps $root identity equal to the containing group and not a literal segment', () => {
    fc.assert(
      fc.property(fc.array(acceptedSegment, { minLength: 1, maxLength: 5 }), fc.integer(), (path, value) => {
        let node: Record<string, unknown> = { $root: { $type: 'number', $value: value } };
        for (const segment of [...path].reverse()) node = { [segment]: node };
        const result = fromDesignTokens(node);
        expect(result.diagnostics).toEqual([]);
        expect(result.tokens).toHaveLength(1);
        expect(decodeIdentifier(result.tokens[0]!.name)).toEqual(path);
        expect(decodeIdentifier(result.tokens[0]!.name)).not.toContain('$root');
      }),
      { seed: 0xd7c6_c007, numRuns: 300 },
    );
  });

  it('never emits punctuation outside the CSS-safe encoding alphabet', () => {
    fc.assert(
      fc.property(fc.array(acceptedSegment, { minLength: 1, maxLength: 6 }), (path) => {
        const token = oneToken(path);
        expect(token.name).toMatch(/^dtcg-path-(?:[0-9]+-[0-9a-f]+)(?:-[0-9]+-[0-9a-f]+)*$/u);
        expect(token.cssProperty).toMatch(/^--liteship-dtcg-path-[0-9a-f-]+$/u);
        expect(token.name).not.toMatch(/[\s{}.$]/u);
      }),
      { seed: 0xd7c6_c008, numRuns: 500 },
    );
  });

  it('uses the same path identity for scalar and mode-valued tokens', () => {
    fc.assert(
      fc.property(
        fc.array(acceptedSegment, { minLength: 1, maxLength: 5 }),
        fc.integer(),
        fc.integer(),
        (path, light, dark) => {
          let node: Record<string, unknown> = {
            $type: 'number',
            $value: { light, dark },
          };
          for (const segment of [...path].reverse()) node = { [segment]: node };
          const result = fromDesignTokens(node);
          expect(result.diagnostics).toEqual([]);
          expect(result.tokens).toEqual([]);
          expect(result.themes).toHaveLength(1);
          expect(Object.keys(result.themes[0]!.tokens)).toEqual([oneToken(path).name]);
          expect(result.themes[0]!.tokens[oneToken(path).name]).toEqual({ light, dark });
        },
      ),
      { seed: 0xd7c6_c009, numRuns: 300 },
    );
  });

  it('keeps the literal name dtcg-root distinct from a containing-group $root token', () => {
    fc.assert(
      fc.property(acceptedSegment, (group) => {
        const literal = oneToken(['dtcg-root']);
        const result = fromDesignTokens({
          [group]: { $root: { $type: 'number', $value: 1 } },
        });
        expect(result.diagnostics).toEqual([]);
        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0]!.name).not.toBe(literal.name);
        expect(decodeIdentifier(literal.name)).toEqual(['dtcg-root']);
        expect(decodeIdentifier(result.tokens[0]!.name)).toEqual([group]);
      }),
      { seed: 0xd7c6_c00a, numRuns: 200 },
    );
  });

  it('keeps insertion order from changing the identifier assigned to each authored path', () => {
    fc.assert(
      fc.property(fc.uniqueArray(acceptedSegment, { minLength: 2, maxLength: 10 }), (names) => {
        const forward = Object.fromEntries(names.map((name, index) => [name, { $type: 'number', $value: index }]));
        const reverse = Object.fromEntries(
          [...names].reverse().map((name) => [name, { $type: 'number', $value: names.indexOf(name) }]),
        );
        const first = fromDesignTokens(forward);
        const second = fromDesignTokens(reverse);
        expect(first.diagnostics).toEqual([]);
        expect(second.diagnostics).toEqual([]);
        const firstByValue = new Map(first.tokens.map((token) => [token.fallback, token.name]));
        const secondByValue = new Map(second.tokens.map((token) => [token.fallback, token.name]));
        expect(secondByValue).toEqual(firstByValue);
      }),
      { seed: 0xd7c6_c00b, numRuns: 250 },
    );
  });

  it('does not normalize case, spacing, or punctuation before addressing a name', () => {
    const transform = fc.constantFrom(
      (value: string) => value.toUpperCase(),
      (value: string) => value.toLowerCase(),
      (value: string) => ` ${value}`,
      (value: string) => `${value} `,
      (value: string) => value.replaceAll('-', '_'),
    );
    fc.assert(
      fc.property(acceptedSegment, transform, (name, mutate) => {
        const changed = mutate(name);
        fc.pre(changed !== name && changed.length > 0 && !/[{}.$]/u.test(changed));
        const original = oneToken([name]);
        const altered = oneToken([changed]);
        expect(original.name).not.toBe(altered.name);
        expect(decodeIdentifier(original.name)).toEqual([name]);
        expect(decodeIdentifier(altered.name)).toEqual([changed]);
      }),
      { seed: 0xd7c6_c00c, numRuns: 250 },
    );
  });

  it('binds every nested group boundary even when adjacent segments repeat', () => {
    fc.assert(
      fc.property(acceptedSegment, fc.integer({ min: 1, max: 8 }), (segment, depth) => {
        const path = Array.from({ length: depth }, () => segment);
        const token = oneToken(path);
        expect(decodeIdentifier(token.name)).toEqual(path);
        expect(decodeIdentifier(token.name)).toHaveLength(depth);
      }),
      { seed: 0xd7c6_c00d, numRuns: 200 },
    );
  });

  it('keeps numeric values out of identifier identity while retaining them in definition identity', () => {
    fc.assert(
      fc.property(
        fc.array(acceptedSegment, { minLength: 1, maxLength: 5 }),
        fc.integer(),
        fc.integer(),
        (path, left, right) => {
          fc.pre(left !== right);
          const first = oneToken(path, left);
          const second = oneToken(path, right);
          expect(first.name).toBe(second.name);
          expect(first.cssProperty).toBe(second.cssProperty);
          expect(first.id).not.toBe(second.id);
          expect(first.fallback).toBe(left);
          expect(second.fallback).toBe(right);
        },
      ),
      { seed: 0xd7c6_c00e, numRuns: 300 },
    );
  });

  it('keeps parent and child tokens distinct when both are authored through $root', () => {
    fc.assert(
      fc.property(
        acceptedSegment,
        acceptedSegment,
        fc.integer(),
        fc.integer(),
        (group, child, rootValue, childValue) => {
          const result = fromDesignTokens({
            [group]: {
              $root: { $type: 'number', $value: rootValue },
              [child]: { $type: 'number', $value: childValue },
            },
          });
          expect(result.diagnostics).toEqual([]);
          expect(result.tokens).toHaveLength(2);
          const decoded = result.tokens.map((token) => decodeIdentifier(token.name));
          expect(decoded).toContainEqual([group]);
          expect(decoded).toContainEqual([group, child]);
          expect(new Set(result.tokens.map((token) => token.name)).size).toBe(2);
        },
      ),
      { seed: 0xd7c6_c00f, numRuns: 300 },
    );
  });

  it('keeps custom mode names from changing token-path identity', () => {
    fc.assert(
      fc.property(
        fc.array(acceptedSegment, { minLength: 1, maxLength: 5 }),
        fc.integer(),
        fc.integer(),
        (path, day, night) => {
          let node: Record<string, unknown> = {
            $type: 'number',
            $value: { day, night },
          };
          for (const segment of [...path].reverse()) node = { [segment]: node };
          const result = fromDesignTokens(node, { modes: ['day', 'night'], themeName: 'brand' });
          expect(result.diagnostics).toEqual([]);
          expect(result.tokens).toEqual([]);
          expect(result.themes).toHaveLength(1);
          expect(result.themes[0]!.name).toBe('brand');
          expect(Object.keys(result.themes[0]!.tokens)).toEqual([oneToken(path).name]);
          expect(result.themes[0]!.tokens[oneToken(path).name]).toEqual({ day, night });
        },
      ),
      { seed: 0xd7c6_c010, numRuns: 250 },
    );
  });

  it('binds token identity only to path while definition identity also binds scalar type and value', () => {
    fc.assert(
      fc.property(fc.array(acceptedSegment, { minLength: 1, maxLength: 5 }), fc.integer(), (path, value) => {
        const numberToken = oneToken(path, value);
        let dimensionNode: Record<string, unknown> = {
          $type: 'dimension',
          $value: { value, unit: 'px' },
        };
        for (const segment of [...path].reverse()) dimensionNode = { [segment]: dimensionNode };
        const dimension = fromDesignTokens(dimensionNode);
        expect(dimension.diagnostics).toEqual([]);
        expect(dimension.tokens).toHaveLength(1);
        expect(dimension.tokens[0]!.name).toBe(numberToken.name);
        expect(dimension.tokens[0]!.cssProperty).toBe(numberToken.cssProperty);
        expect(dimension.tokens[0]!.fallback).toBe(`${value}px`);
        expect(dimension.tokens[0]!.id).not.toBe(numberToken.id);
      }),
      { seed: 0xd7c6_c011, numRuns: 250 },
    );
  });
});
