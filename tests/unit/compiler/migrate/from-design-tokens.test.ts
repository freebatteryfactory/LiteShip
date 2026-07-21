/**
 * `migrate/from-design-tokens` — unit tests.
 *
 * Covers the clean lossless lowering (exact produced defs), every NEW
 * decomposition branch ($type→category map, inferSyntax fallback, nested-group
 * flatten to dotted names, group-level $type inheritance, mode-set→theme with
 * cross-fill and mode metadata), teeth for every diagnostic code the adapter can
 * emit (malformed-input, unknown-token-category, lossy-token-conversion,
 * incomplete-theme-variant), and the pathological-input path where a `define*`
 * throw is caught and surfaced as a `severity:'error'` diagnostic rather than
 * escaping.
 *
 * NOTE: imports through the `@liteship/compiler/migrate` subpath (the dev
 * condition resolves to `src`). The facade re-export of `fromDesignTokens` is
 * added in Phase C, so this suite is authored now and run then.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { fromDesignTokens } from '@liteship/compiler/migrate';
import { MIGRATE_CODES } from '@liteship/compiler/migrate';

describe('fromDesignTokens — clean lossless case', () => {
  it('lowers a two-group document into exactly two single-value tokens with no diagnostics', () => {
    const result = fromDesignTokens({
      color: { primary: { $type: 'color', $value: '#0066cc' } },
      space: { sm: { $type: 'dimension', $value: '8px' } },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.boundaries).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.tokens).toHaveLength(2);

    const [primary, sm] = result.tokens;
    expect(primary!._tag).toBe('TokenDef');
    expect(primary!.name).toBe('color.primary');
    expect(primary!.category).toBe('color');
    expect([...primary!.axes]).toEqual([]);
    expect(primary!.values).toEqual({});
    expect(primary!.fallback).toBe('#0066cc');
    expect(primary!.cssProperty).toBe('--liteship-color.primary');

    expect(sm!.name).toBe('space.sm');
    expect(sm!.category).toBe('spacing');
    expect(sm!.fallback).toBe('8px');
  });

  it('lowers a mode token document into exactly one complete defineTheme with no diagnostics', () => {
    const result = fromDesignTokens({
      color: {
        bg: { $type: 'color', $value: { light: '#ffffff', dark: '#111111' } },
        fg: { $type: 'color', $value: { light: '#000000', dark: '#eeeeee' } },
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.boundaries).toEqual([]);
    expect(result.tokens).toEqual([]); // mode tokens collect into the theme, not defineToken
    expect(result.themes).toHaveLength(1);

    const t = result.themes[0]!;
    expect(t._tag).toBe('ThemeDef');
    expect(t.name).toBe('migrated-theme');
    expect([...t.variants]).toEqual(['light', 'dark']);
    expect(t.tokens).toEqual({
      'color.bg': { light: '#ffffff', dark: '#111111' },
      'color.fg': { light: '#000000', dark: '#eeeeee' },
    });
    expect(t.meta).toEqual({
      light: { label: 'Light', mode: 'light' },
      dark: { label: 'Dark', mode: 'dark' },
    });
  });
});

describe('fromDesignTokens — $type → TokenCategory map', () => {
  const cases: ReadonlyArray<readonly [string, unknown, string]> = [
    ['color', '#fff', 'color'],
    ['dimension', '4px', 'spacing'],
    ['fontFamily', ['Inter', 'sans-serif'], 'typography'],
    ['fontWeight', 600, 'typography'],
    ['typography', { fontFamily: 'Inter', fontSize: '16px' }, 'typography'],
    ['shadow', { color: '#000', offsetX: '0', offsetY: '2px', blur: '4px' }, 'shadow'],
    ['borderRadius', '8px', 'radius'],
    ['duration', '200ms', 'animation'],
    ['cubicBezier', [0.4, 0, 0.2, 1], 'animation'],
  ];

  for (const [dtcgType, value, category] of cases) {
    it(`maps $type "${dtcgType}" → category "${category}"`, () => {
      const result = fromDesignTokens({ tok: { $type: dtcgType, $value: value } });
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.category).toBe(category);
      expect(result.tokens[0]!.fallback).toEqual(value);
      // A recognized $type never triggers unknown-token-category.
      expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.unknownTokenCategory)).toBe(false);
    });
  }
});

describe('fromDesignTokens — decomposition branches', () => {
  it('flattens deeply nested groups to dotted names', () => {
    const result = fromDesignTokens({ a: { b: { c: { $type: 'dimension', $value: '4px' } } } });
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]!.name).toBe('a.b.c');
  });

  it('inherits a group-level $type for tokens that declare none', () => {
    const result = fromDesignTokens({
      color: { $type: 'color', primary: { $value: '#123456' }, secondary: { $value: '#654321' } },
    });
    expect(result.tokens.map((t) => t.category)).toEqual(['color', 'color']);
    expect(result.tokens.map((t) => t.name)).toEqual(['color.primary', 'color.secondary']);
    expect(result.diagnostics).toEqual([]);
  });

  it('classifies a typeless value via inferSyntax when no $type is present', () => {
    const result = fromDesignTokens({
      c: { $value: '#abcdef' }, // color syntax
      n: { $value: '16px' }, // length → spacing
      t: { $value: '250ms' }, // time → animation
    });
    const byName = Object.fromEntries(result.tokens.map((t) => [t.name, t.category]));
    expect(byName).toEqual({ c: 'color', n: 'spacing', t: 'animation' });
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.unknownTokenCategory)).toBe(false);
  });

  it('cross-fills a mode token that is missing a mode and flags it incomplete', () => {
    const result = fromDesignTokens({ color: { accent: { $type: 'color', $value: { light: '#f90' } } } });
    const t = result.themes[0]!;
    // dark reuses the light value so the theme stays complete.
    expect(t.tokens['color.accent']).toEqual({ light: '#f90', dark: '#f90' });
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.incompleteThemeVariant)).toBe(true);
  });

  it('honours custom modes and a custom theme name', () => {
    const result = fromDesignTokens(
      { c: { x: { $value: { day: '#ffffff', night: '#000000' } } } },
      { modes: ['day', 'night'], themeName: 'brand' },
    );
    const t = result.themes[0]!;
    expect(t.name).toBe('brand');
    expect([...t.variants]).toEqual(['day', 'night']);
    expect(t.tokens['c.x']).toEqual({ day: '#ffffff', night: '#000000' });
    expect(result.tokens).toEqual([]);
  });

  it('treats a composite object value ($type shadow) as a single token, not a mode map', () => {
    const shadow = { color: '#000', offsetX: '0', offsetY: '2px', blur: '4px' };
    const result = fromDesignTokens({ elevation: { low: { $type: 'shadow', $value: shadow } } });
    expect(result.themes).toEqual([]);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]!.category).toBe('shadow');
    expect(result.tokens[0]!.fallback).toEqual(shadow);
  });

  it('serializes a scalar DTCG dimension object {value,unit} to a CSS length (never [object Object])', () => {
    const result = fromDesignTokens({ space: { sm: { $type: 'dimension', $value: { value: 8, unit: 'px' } } } });
    expect(result.tokens).toHaveLength(1);
    const t = result.tokens[0]!;
    expect(t.name).toBe('space.sm');
    expect(t.category).toBe('spacing');
    // Serialized to a CSS string, so the Token CSS compiler emits `8px`, not `[object Object]`.
    expect(t.fallback).toBe('8px');
    // A cleanly-serialized scalar is lossless — no lossy/composite flag.
    expect(result.diagnostics).toEqual([]);
  });

  it('serializes structured scalar MODE values to CSS strings (never [object Object])', () => {
    const result = fromDesignTokens({
      space: {
        gap: { $type: 'dimension', $value: { light: { value: 8, unit: 'px' }, dark: { value: 16, unit: 'px' } } },
      },
    });
    expect(result.themes).toHaveLength(1);
    const t = result.themes[0]!;
    // Each mode's { value, unit } is serialized, so the Theme CSS compiler emits
    // `8px`/`16px`, not `[object Object]`.
    expect(t.tokens['space.gap']).toEqual({ light: '8px', dark: '16px' });
    // A cleanly-serialized scalar is lossless — no lossy/composite flag.
    expect(result.diagnostics).toEqual([]);
  });

  it('cross-fills a structured scalar mode value and serializes the fabricated variant', () => {
    const result = fromDesignTokens({
      space: { gap: { $type: 'dimension', $value: { light: { value: 4, unit: 'px' } } } },
    });
    const t = result.themes[0]!;
    // The missing dark variant reuses the serialized light value (not the raw object).
    expect(t.tokens['space.gap']).toEqual({ light: '4px', dark: '4px' });
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.incompleteThemeVariant)).toBe(true);
  });

  it('flags a composite MODE value (kept structurally) rather than [object Object]', () => {
    const shadow = { color: '#000', offsetX: '0', offsetY: '2px', blur: '4px' };
    const result = fromDesignTokens({
      elevation: { low: { $type: 'shadow', $value: { light: shadow, dark: shadow } } },
    });
    // The composite has no single CSS form, so it is kept structurally...
    const t = result.themes[0]!;
    expect(t.tokens['elevation.low']).toEqual({ light: shadow, dark: shadow });
    // ...but the un-renderable composite is surfaced, mirroring the plain-token path.
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.lossyTokenConversion)).toBe(true);
  });

  it('uses an explicit hex on a DTCG color object', () => {
    const result = fromDesignTokens({
      brand: { $type: 'color', $value: { colorSpace: 'srgb', components: [1, 0, 0], hex: '#ff0000' } },
    });
    expect(result.tokens[0]!.fallback).toBe('#ff0000');
  });

  it('flags a composite DTCG value (kept structurally) rather than silently rendering [object Object]', () => {
    const shadow = { color: '#000', offsetX: '0', offsetY: '2px', blur: '4px' };
    const result = fromDesignTokens({ elevation: { low: { $type: 'shadow', $value: shadow } } });
    // Still stored structurally (the deliberate composite behavior)...
    expect(result.tokens[0]!.fallback).toEqual(shadow);
    // ...but the un-renderable composite is surfaced now, not silent.
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.lossyTokenConversion)).toBe(true);
  });
});

describe('fromDesignTokens — every diagnostic code has teeth', () => {
  it('emits malformed-input (fatal) for a non-object document, folding a ParseError', () => {
    const result = fromDesignTokens('not a token document');
    expect(result.tokens).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.boundaries).toEqual([]);
    const d = result.diagnostics.find((x) => x.code === MIGRATE_CODES.malformedInput);
    expect(d).toBeDefined();
    expect(d!.severity).toBe('error');
    expect(d!.cause).toBeDefined();
  });

  it('emits malformed-input (per token) when a leaf $value is null via the schema brand', () => {
    const result = fromDesignTokens({ broken: { $value: null } });
    expect(result.tokens).toEqual([]);
    const d = result.diagnostics.find((x) => x.code === MIGRATE_CODES.malformedInput);
    expect(d).toBeDefined();
    expect(d!.severity).toBe('error');
    // The DecodeIssue path is preserved under the token path.
    expect(d!.path).toEqual(['broken']);
  });

  it('emits malformed-input for a nested primitive that is neither token nor group', () => {
    const result = fromDesignTokens({ group: { tok: 5 } });
    const d = result.diagnostics.find((x) => x.code === MIGRATE_CODES.malformedInput);
    expect(d).toBeDefined();
    expect(d!.path).toEqual(['group', 'tok']);
  });

  it('emits unknown-token-category for an unclassifiable typeless value', () => {
    const result = fromDesignTokens({ weird: { $value: 'auto' } });
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.unknownTokenCategory)).toBe(true);
    // Still produces a best-effort token under the fallback category.
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]!.category).toBe('effect');
  });

  it('emits lossy-token-conversion for an alias reference', () => {
    const result = fromDesignTokens({ ref: { $type: 'color', $value: '{color.primary}' } });
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.lossyTokenConversion)).toBe(true);
    // No unknown-token-category — $type carried the category.
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.unknownTokenCategory)).toBe(false);
  });

  it('emits lossy-token-conversion for a calc() expression', () => {
    const result = fromDesignTokens({ w: { $type: 'dimension', $value: 'calc(100% - 8px)' } });
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.lossyTokenConversion)).toBe(true);
  });

  it('emits incomplete-theme-variant', () => {
    const result = fromDesignTokens({ c: { x: { $type: 'color', $value: { light: '#fff' } } } });
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.incompleteThemeVariant)).toBe(true);
  });
});

describe('fromDesignTokens — pathological input is caught, not thrown', () => {
  it('surfaces a defineToken ValidationError (empty name from an empty JSON key) as a severity:error diagnostic', () => {
    let result!: ReturnType<typeof fromDesignTokens>;
    expect(() => {
      // An empty JSON key yields an empty token name; defineToken rejects it.
      result = fromDesignTokens({ '': { $type: 'color', $value: '#fff' } });
    }).not.toThrow();

    // No token was produced (the throw was caught)...
    expect(result.tokens).toEqual([]);
    // ...and the failure is an error-severity diagnostic carrying the cause.
    const d = result.diagnostics.find((x) => x.severity === 'error');
    expect(d).toBeDefined();
    expect(d!.code).toBe(MIGRATE_CODES.malformedInput);
    expect(d!.cause).toBeDefined();
  });
});

describe('fromDesignTokens — property: flat color tokens fold losslessly', () => {
  it('produces one token per entry with the exact hex fallback and no diagnostics', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.tuple(
            fc.stringMatching(/^[a-z][a-z0-9]{0,7}$/),
            fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`),
          ),
          { selector: ([name]) => name, minLength: 1, maxLength: 8 },
        ),
        (entries) => {
          const doc: Record<string, unknown> = {};
          for (const [name, hex] of entries) doc[name] = { $type: 'color', $value: hex };

          const result = fromDesignTokens(doc);
          expect(result.tokens).toHaveLength(entries.length);
          expect(result.diagnostics).toEqual([]);
          const byName = Object.fromEntries(result.tokens.map((t) => [t.name, t.fallback]));
          for (const [name, hex] of entries) {
            expect(byName[name]).toBe(hex);
            expect(result.tokens.find((t) => t.name === name)!.category).toBe('color');
          }
        },
      ),
      { numRuns: 60 },
    );
  });
});
