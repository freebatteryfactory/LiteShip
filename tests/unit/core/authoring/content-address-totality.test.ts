/** Portable authoring identity is total over the curated constructor surface. @module */
import { describe, expect, it } from 'vitest';
import {
  CanonicalCbor,
  defineBoundary,
  defineConfig,
  defineStyle,
  defineTheme,
  defineToken,
  fnv1aBytes,
} from '../../../../packages/core/src/index.js';
import { defineQuantizer } from '../../../../packages/quantizer/src/index.js';
import { defineAdaptive } from '../../../../packages/liteship/src/adaptive.js';
import * as liteshipFacade from '../../../../packages/liteship/src/index.js';

interface AddressedDefinition {
  readonly id: string;
}

interface PortableFieldLaw {
  readonly field: string;
  readonly definitions: () => readonly [AddressedDefinition, AddressedDefinition];
}

interface NonAddressedField {
  readonly field: string;
  readonly reason: string;
}

interface ConstructorLaw {
  readonly constructor: string;
  readonly owner: string;
  readonly baseSpec: Readonly<object>;
  readonly portableFields: readonly PortableFieldLaw[];
  readonly nonAddressed: readonly NonAddressedField[];
}

const field = (name: string, left: () => AddressedDefinition, right: () => AddressedDefinition): PortableFieldLaw => ({
  field: name,
  definitions: () => [left(), right()],
});

const BOUNDARY_BASE = {
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [640, 'roomy'],
  ] as const,
  hysteresis: 8,
  spec: { timeRange: { from: 1_000, until: 9_000 }, experimentId: 'layout-a' },
} as const;

const BOUNDARY = defineBoundary(BOUNDARY_BASE);
const ALTERNATE_BOUNDARY = defineBoundary({ ...BOUNDARY_BASE, input: 'pointer.x' });

const STYLE_BASE = {
  boundary: BOUNDARY,
  base: {
    properties: { display: 'grid', gap: '8px' },
    pseudo: { ':hover': { opacity: '0.9' } },
    boxShadow: [{ x: 0, y: 2, blur: 8, spread: 0, color: '#0008', inset: false }],
  },
  states: { roomy: { properties: { gap: '16px' } } },
  transition: { duration: 200, easing: 'ease-out', properties: ['gap'] },
} as const;

const TOKEN_BASE = {
  name: 'space',
  category: 'spacing' as const,
  axes: ['density'] as const,
  values: { compact: 4, default: 8 },
  fallback: 8,
};

const THEME_BASE = {
  name: 'ocean',
  variants: ['light', 'dark'] as const,
  // `day` is deliberately present so the variants-only law can change the
  // selected names without changing the token or metadata fields.
  tokens: { accent: { light: '#06c', day: '#07d', dark: '#39f' } },
  meta: {
    light: { label: 'Light', mode: 'light' as const },
    day: { label: 'Day', mode: 'light' as const },
    dark: { label: 'Dark', mode: 'dark' as const },
  },
};

const TOKEN = defineToken(TOKEN_BASE);
const THEME = defineTheme(THEME_BASE);
const STYLE = defineStyle(STYLE_BASE);

const CONFIG_BASE = {
  boundaries: { viewport: BOUNDARY },
  tokens: { space: TOKEN },
  themes: { ocean: THEME },
  styles: { layout: STYLE },
  vite: {
    dirs: { boundary: 'src/boundaries' },
    hmr: true,
    environments: ['browser'] as const,
    wasm: { enabled: true, path: 'src/wasm/kernel.wasm' },
  },
  astro: { adaptive: true, edgeRuntime: false },
} as const;

const QUANTIZER_BASE = {
  boundary: BOUNDARY,
  options: {
    outputs: {
      css: {
        compact: { opacity: '0.6' },
        roomy: { opacity: '1' },
      },
    },
    tier: 'physics' as const,
    spring: { stiffness: 180, damping: 20, mass: 1 },
    force: ['glsl'] as const,
  },
} as const;

const ADAPTIVE_BASE = {
  boundary: BOUNDARY_BASE,
  style: {
    base: { properties: { display: 'grid', gap: '8px' } },
    states: { roomy: { properties: { gap: '16px' } } },
    transition: { duration: 200, easing: 'ease-out', properties: ['gap'] },
  },
  quantize: QUANTIZER_BASE.options,
  tokens: [TOKEN_BASE],
  theme: THEME_BASE,
  tier: 'styled' as const,
} as const;

const CONSTRUCTORS: readonly ConstructorLaw[] = [
  {
    constructor: 'defineBoundary',
    owner: 'packages/core/src/authoring/boundary.ts',
    baseSpec: BOUNDARY_BASE,
    portableFields: [
      field(
        'input',
        () => defineBoundary(BOUNDARY_BASE),
        () => defineBoundary({ ...BOUNDARY_BASE, input: 'pointer.x' }),
      ),
      field(
        'at.threshold',
        () => defineBoundary(BOUNDARY_BASE),
        () =>
          defineBoundary({
            ...BOUNDARY_BASE,
            at: [
              [0, 'compact'],
              [768, 'roomy'],
            ] as const,
          }),
      ),
      field(
        'at.state',
        () => defineBoundary(BOUNDARY_BASE),
        () =>
          defineBoundary({
            ...BOUNDARY_BASE,
            at: [
              [0, 'compact'],
              [640, 'wide'],
            ] as const,
          }),
      ),
      field(
        'hysteresis',
        () => defineBoundary(BOUNDARY_BASE),
        () => defineBoundary({ ...BOUNDARY_BASE, hysteresis: 12 }),
      ),
      field(
        'spec.timeRange.from',
        () => defineBoundary(BOUNDARY_BASE),
        () =>
          defineBoundary({
            ...BOUNDARY_BASE,
            spec: { ...BOUNDARY_BASE.spec, timeRange: { ...BOUNDARY_BASE.spec.timeRange, from: 2_000 } },
          }),
      ),
      field(
        'spec.timeRange.until',
        () => defineBoundary(BOUNDARY_BASE),
        () =>
          defineBoundary({
            ...BOUNDARY_BASE,
            spec: { ...BOUNDARY_BASE.spec, timeRange: { ...BOUNDARY_BASE.spec.timeRange, until: 10_000 } },
          }),
      ),
      field(
        'spec.experimentId',
        () => defineBoundary(BOUNDARY_BASE),
        () => defineBoundary({ ...BOUNDARY_BASE, spec: { ...BOUNDARY_BASE.spec, experimentId: 'layout-b' } }),
      ),
    ],
    nonAddressed: [
      {
        field: 'spec.deviceFilter',
        reason: 'host-only closure: functions cannot enter canonical portable bytes or cross the wire',
      },
    ],
  },
  {
    constructor: 'defineStyle',
    owner: 'packages/core/src/authoring/style.ts',
    baseSpec: STYLE_BASE,
    portableFields: [
      field(
        'boundary',
        () => defineStyle(STYLE_BASE),
        () => defineStyle({ ...STYLE_BASE, boundary: ALTERNATE_BOUNDARY }),
      ),
      field(
        'base',
        () => defineStyle(STYLE_BASE),
        () =>
          defineStyle({
            ...STYLE_BASE,
            base: { ...STYLE_BASE.base, properties: { ...STYLE_BASE.base.properties, gap: '10px' } },
          }),
      ),
      field(
        'states',
        () => defineStyle(STYLE_BASE),
        () =>
          defineStyle({
            ...STYLE_BASE,
            states: { roomy: { properties: { gap: '20px' } } },
          }),
      ),
      field(
        'transition',
        () => defineStyle(STYLE_BASE),
        () => defineStyle({ ...STYLE_BASE, transition: { ...STYLE_BASE.transition, duration: 240 } }),
      ),
    ],
    nonAddressed: [],
  },
  {
    constructor: 'defineToken',
    owner: 'packages/core/src/authoring/token.ts',
    baseSpec: TOKEN_BASE,
    portableFields: [
      field(
        'name',
        () => defineToken(TOKEN_BASE),
        () => defineToken({ ...TOKEN_BASE, name: 'space-alt' }),
      ),
      field(
        'category',
        () => defineToken(TOKEN_BASE),
        () => defineToken({ ...TOKEN_BASE, category: 'radius' }),
      ),
      field(
        'axes',
        () => defineToken(TOKEN_BASE),
        () => defineToken({ ...TOKEN_BASE, axes: ['viewport'] as const }),
      ),
      field(
        'values',
        () => defineToken(TOKEN_BASE),
        () => defineToken({ ...TOKEN_BASE, values: { ...TOKEN_BASE.values, compact: 6 } }),
      ),
      field(
        'fallback',
        () => defineToken(TOKEN_BASE),
        () => defineToken({ ...TOKEN_BASE, fallback: 10 }),
      ),
      field(
        'value (normalized to fallback)',
        () => defineToken({ name: 'single', category: 'spacing', value: 8 }),
        () => defineToken({ name: 'single', category: 'spacing', value: 10 }),
      ),
    ],
    nonAddressed: [
      {
        field: 'value shorthand spelling',
        reason: 'normalized into the addressed fallback field; it has no second independent identity slot',
      },
    ],
  },
  {
    constructor: 'defineTheme',
    owner: 'packages/core/src/authoring/theme.ts',
    baseSpec: THEME_BASE,
    portableFields: [
      field(
        'name',
        () => defineTheme(THEME_BASE),
        () => defineTheme({ ...THEME_BASE, name: 'forest' }),
      ),
      field(
        'variants',
        () => defineTheme(THEME_BASE),
        () => defineTheme({ ...THEME_BASE, variants: ['day', 'dark'] as const }),
      ),
      field(
        'tokens',
        () => defineTheme(THEME_BASE),
        () =>
          defineTheme({
            ...THEME_BASE,
            tokens: { accent: { ...THEME_BASE.tokens.accent, dark: '#6bf' } },
          }),
      ),
      field(
        'meta',
        () => defineTheme(THEME_BASE),
        () =>
          defineTheme({
            ...THEME_BASE,
            meta: { ...THEME_BASE.meta, dark: { label: 'Night', mode: 'dark' as const } },
          }),
      ),
    ],
    nonAddressed: [],
  },
  {
    constructor: 'defineConfig',
    owner: 'packages/core/src/authoring/config.ts',
    baseSpec: CONFIG_BASE,
    portableFields: [
      field(
        'boundaries',
        () => defineConfig(CONFIG_BASE),
        () => defineConfig({ ...CONFIG_BASE, boundaries: { viewport: ALTERNATE_BOUNDARY } }),
      ),
      field(
        'tokens',
        () => defineConfig(CONFIG_BASE),
        () => defineConfig({ ...CONFIG_BASE, tokens: { space: defineToken({ ...TOKEN_BASE, fallback: 10 }) } }),
      ),
      field(
        'themes',
        () => defineConfig(CONFIG_BASE),
        () => defineConfig({ ...CONFIG_BASE, themes: { ocean: defineTheme({ ...THEME_BASE, name: 'forest' }) } }),
      ),
      field(
        'styles',
        () => defineConfig(CONFIG_BASE),
        () =>
          defineConfig({
            ...CONFIG_BASE,
            styles: { layout: defineStyle({ ...STYLE_BASE, transition: { ...STYLE_BASE.transition, duration: 240 } }) },
          }),
      ),
      field(
        'vite',
        () => defineConfig(CONFIG_BASE),
        () => defineConfig({ ...CONFIG_BASE, vite: { ...CONFIG_BASE.vite, hmr: false } }),
      ),
      field(
        'astro',
        () => defineConfig(CONFIG_BASE),
        () => defineConfig({ ...CONFIG_BASE, astro: { ...CONFIG_BASE.astro, edgeRuntime: true } }),
      ),
    ],
    nonAddressed: [],
  },
  {
    constructor: 'defineQuantizer',
    owner: 'packages/quantizer/src/quantizer.ts',
    baseSpec: QUANTIZER_BASE,
    portableFields: [
      field(
        'boundary',
        () => defineQuantizer(QUANTIZER_BASE.boundary, QUANTIZER_BASE.options),
        () => defineQuantizer(ALTERNATE_BOUNDARY, QUANTIZER_BASE.options),
      ),
      field(
        'outputs',
        () => defineQuantizer(QUANTIZER_BASE.boundary, QUANTIZER_BASE.options),
        () =>
          defineQuantizer(QUANTIZER_BASE.boundary, {
            ...QUANTIZER_BASE.options,
            outputs: {
              css: {
                ...QUANTIZER_BASE.options.outputs.css,
                compact: { opacity: '0.7' },
              },
            },
          }),
      ),
      field(
        'tier',
        () => defineQuantizer(QUANTIZER_BASE.boundary, QUANTIZER_BASE.options),
        () => defineQuantizer(QUANTIZER_BASE.boundary, { ...QUANTIZER_BASE.options, tier: 'compute' }),
      ),
      field(
        'spring',
        () => defineQuantizer(QUANTIZER_BASE.boundary, QUANTIZER_BASE.options),
        () =>
          defineQuantizer(QUANTIZER_BASE.boundary, {
            ...QUANTIZER_BASE.options,
            spring: { ...QUANTIZER_BASE.options.spring, damping: 24 },
          }),
      ),
      field(
        'force',
        () => defineQuantizer(QUANTIZER_BASE.boundary, QUANTIZER_BASE.options),
        () => defineQuantizer(QUANTIZER_BASE.boundary, { ...QUANTIZER_BASE.options, force: ['wgsl'] }),
      ),
    ],
    nonAddressed: [],
  },
  {
    constructor: 'defineAdaptive',
    owner: 'packages/liteship/src/adaptive.ts (identity: packages/core/src/authoring/adaptive.ts)',
    baseSpec: ADAPTIVE_BASE,
    portableFields: [
      field(
        'boundary',
        () => defineAdaptive(ADAPTIVE_BASE),
        () => defineAdaptive({ ...ADAPTIVE_BASE, boundary: { ...ADAPTIVE_BASE.boundary, input: 'pointer.x' } }),
      ),
      field(
        'style',
        () => defineAdaptive(ADAPTIVE_BASE),
        () =>
          defineAdaptive({
            ...ADAPTIVE_BASE,
            style: {
              ...ADAPTIVE_BASE.style,
              base: {
                ...ADAPTIVE_BASE.style.base,
                properties: { ...ADAPTIVE_BASE.style.base.properties, gap: '10px' },
              },
            },
          }),
      ),
      field(
        'quantize',
        () => defineAdaptive(ADAPTIVE_BASE),
        () =>
          defineAdaptive({
            ...ADAPTIVE_BASE,
            quantize: {
              ...ADAPTIVE_BASE.quantize,
              outputs: {
                css: {
                  ...ADAPTIVE_BASE.quantize.outputs.css,
                  compact: { opacity: '0.7' },
                },
              },
            },
          }),
      ),
      field(
        'tokens',
        () => defineAdaptive(ADAPTIVE_BASE),
        () => defineAdaptive({ ...ADAPTIVE_BASE, tokens: [{ ...TOKEN_BASE, fallback: 10 }] }),
      ),
      field(
        'theme',
        () => defineAdaptive(ADAPTIVE_BASE),
        () => defineAdaptive({ ...ADAPTIVE_BASE, theme: { ...THEME_BASE, name: 'forest' } }),
      ),
      field(
        'tier',
        () => defineAdaptive(ADAPTIVE_BASE),
        () => defineAdaptive({ ...ADAPTIVE_BASE, tier: 'animated' }),
      ),
    ],
    nonAddressed: [],
  },
] as const;

type AdaptiveResult = ReturnType<typeof defineAdaptive>;

/**
 * Executed mutant: the historical almost-correct aggregate that omitted tier.
 * TEETH: the deliberately inverted collision assertion red at
 * `fnv1a:519720a8` before this law was corrected to require equality.
 */
function aggregateIdWithoutTier(adaptive: AdaptiveResult): string {
  return fnv1aBytes(
    CanonicalCbor.encode({
      _tag: 'AdaptiveDef',
      _version: 1,
      boundary: adaptive.boundary.id,
      style: adaptive.style.id,
      quantizer: adaptive.quantizer?.id ?? null,
      tokens: adaptive.tokens?.map(({ id }) => id) ?? null,
      theme: adaptive.theme?.id ?? null,
    }),
  );
}

const PORTABLE_FIELD_CASES = CONSTRUCTORS.flatMap((entry) =>
  entry.portableFields.map((portableField) => ({
    constructor: entry.constructor,
    owner: entry.owner,
    ...portableField,
  })),
);

describe('content addresses are total over portable spec fields', () => {
  it.each(PORTABLE_FIELD_CASES)('$constructor: $field participates in the id', ({ definitions }) => {
    const [left, right] = definitions();
    expect(left.id).not.toBe(right.id);
  });

  it('an aggregateId that omits tier collides; the real one does not (executed mutant)', () => {
    const styled = defineAdaptive({ ...ADAPTIVE_BASE, tier: 'styled' });
    const animated = defineAdaptive({ ...ADAPTIVE_BASE, tier: 'animated' });

    expect(styled.id).not.toBe(animated.id);
    expect(aggregateIdWithoutTier(styled)).toBe(aggregateIdWithoutTier(animated));
  });

  it('every constructor in the curated authoring facade appears in the table', () => {
    // The public `liteship` facade is the named authoring surface for this law.
    // Core-only defineCapsule/defineCapsuleCatalog are capsule infrastructure,
    // not members of the seven-constructor curated facade named by this commit.
    const exportedConstructors = Object.entries(liteshipFacade)
      .filter(([name, value]) => /^define[A-Z]/u.test(name) && typeof value === 'function')
      .map(([name]) => name)
      .sort();
    const enrolledConstructors = CONSTRUCTORS.map(({ constructor }) => constructor).sort();

    expect(exportedConstructors.length).toBeGreaterThan(0);
    // Floor, not target: new portable fields make this number grow.
    expect(PORTABLE_FIELD_CASES.length).toBeGreaterThanOrEqual(38);
    expect(enrolledConstructors).toEqual(exportedConstructors);
  });

  it('every deliberate non-addressed field carries a reason', () => {
    const exemptions = CONSTRUCTORS.flatMap(({ constructor, nonAddressed }) =>
      nonAddressed.map(({ field: exemptField, reason }) => ({ constructor, exemptField, reason })),
    );
    expect(exemptions.length).toBeGreaterThan(0);
    expect(exemptions.filter(({ reason }) => reason.trim().length === 0)).toEqual([]);
  });
});
