/** Migration adapters diagnose every source construct they refuse. @module */
import { describe, expect, it } from 'vitest';
import {
  fromContainerQueries,
  fromCSSCustomProperties,
  fromDesignTokens,
  fromMediaQueries,
  fromTailwindTheme,
  MIGRATE_CODES,
  type MigrationResult,
} from '@liteship/compiler/migrate';

type MigrateCode = (typeof MIGRATE_CODES)[keyof typeof MIGRATE_CODES];

interface DropShape {
  readonly name: string;
  readonly code: MigrateCode;
  readonly pathIncludes: string;
  readonly run: () => MigrationResult;
}

const DROP_SHAPES: readonly DropShape[] = [
  {
    name: 'media prelude without a block',
    code: MIGRATE_CODES.malformedInput,
    pathIncludes: '@media',
    run: () => fromMediaQueries('@media (min-width: 10px)'),
  },
  {
    name: 'container prelude without a block',
    code: MIGRATE_CODES.malformedInput,
    pathIncludes: '@container',
    run: () =>
      fromContainerQueries('@container (min-width: 10px)', {
        resolveInput: () => 'custom:container.width',
      }),
  },
  {
    name: 'finite media upper bound',
    code: MIGRATE_CODES.unsupportedAtRule,
    pathIncludes: 'max-width',
    run: () => fromMediaQueries('@media (max-width: 767px) { .x { color: red; } }'),
  },
  {
    name: 'relative media threshold without a host input',
    code: MIGRATE_CODES.unmappableMediaFeature,
    pathIncludes: 'min-width',
    run: () => fromMediaQueries('@media (min-width: 48rem) { .x { color: red; } }'),
  },
  {
    name: 'duplicate media thresholds',
    code: MIGRATE_CODES.ambiguousBreakpoint,
    pathIncludes: 'viewport.width',
    run: () =>
      fromMediaQueries(`
        @media (min-width: 768px) { .x { color: red; } }
        @media (min-width: 768px) { .y { color: blue; } }
      `),
  },
  {
    name: 'non-ascending media thresholds',
    code: MIGRATE_CODES.nonAscendingThresholds,
    pathIncludes: 'viewport.width',
    run: () =>
      fromMediaQueries(`
        @media (min-width: 1280px) { .x { color: red; } }
        @media (min-width: 768px) { .y { color: blue; } }
      `),
  },
  {
    name: 'scoped color-scheme declaration',
    code: MIGRATE_CODES.unsupportedSelector,
    pathIncludes: '.card',
    run: () =>
      fromMediaQueries(`
        @media (prefers-color-scheme: dark) {
          .card { --bg: black; }
        }
      `),
  },
  {
    name: 'non-media at-rule',
    code: MIGRATE_CODES.unsupportedAtRule,
    pathIncludes: '@supports',
    run: () => fromMediaQueries('@supports (display: grid) { .x { display: grid; } }'),
  },
  {
    name: 'finite container upper bound',
    code: MIGRATE_CODES.unsupportedAtRule,
    pathIncludes: 'max-width',
    run: () =>
      fromContainerQueries('@container card (max-width: 768px) { .x {} }', {
        resolveInput: () => 'custom:container.width',
      }),
  },
  {
    name: 'container threshold without an input mapping',
    code: MIGRATE_CODES.unsupportedAtRule,
    pathIncludes: 'width',
    run: () => fromContainerQueries('@container (min-width: 400px) { .x {} }'),
  },
  {
    name: 'duplicate container thresholds',
    code: MIGRATE_CODES.ambiguousBreakpoint,
    pathIncludes: 'width',
    run: () =>
      fromContainerQueries(
        `
          @container card (min-width: 500px) { .x {} }
          @container card (min-width: 500px) { .y {} }
        `,
        { resolveInput: () => 'custom:container.width' },
      ),
  },
  {
    name: 'non-ascending container thresholds',
    code: MIGRATE_CODES.nonAscendingThresholds,
    pathIncludes: 'width',
    run: () =>
      fromContainerQueries(
        `
          @container card (min-width: 768px) { .x {} }
          @container card (min-width: 500px) { .y {} }
        `,
        { resolveInput: () => 'custom:container.width' },
      ),
  },
  {
    name: 'scoped custom property',
    code: MIGRATE_CODES.unsupportedSelector,
    pathIncludes: '.card',
    run: () => fromCSSCustomProperties('.card { --accent: red; }'),
  },
  {
    name: 'at-rule-wrapped custom property',
    code: MIGRATE_CODES.unsupportedAtRule,
    pathIncludes: '@layer',
    run: () => fromCSSCustomProperties('@layer tokens { :root { --accent: red; } }'),
  },
  {
    name: 'lone named theme variant',
    code: MIGRATE_CODES.lossyTokenConversion,
    pathIncludes: 'dark',
    run: () => fromCSSCustomProperties('html[data-theme="dark"] { --liteship-accent: red; }'),
  },
  {
    name: 'unclassifiable CSS token value',
    code: MIGRATE_CODES.unknownTokenCategory,
    pathIncludes: 'weird',
    run: () => fromCSSCustomProperties(':root { --liteship-weird: auto; }'),
  },
  {
    name: 'theme token without a base variant',
    code: MIGRATE_CODES.incompleteThemeVariant,
    pathIncludes: 'c',
    run: () =>
      fromCSSCustomProperties(`
        :root { --liteship-a: white; }
        html[data-theme="dark"] { --liteship-a: black; --liteship-c: red; }
      `),
  },
  {
    name: 'named default variant colliding with root',
    code: MIGRATE_CODES.malformedInput,
    pathIncludes: 'default',
    run: () =>
      fromCSSCustomProperties(`
        :root { --liteship-bg: white; }
        html[data-theme="default"] { --liteship-bg: black; }
      `),
  },
  {
    name: 'malformed DTCG root token',
    code: MIGRATE_CODES.malformedInput,
    pathIncludes: '$root',
    run: () => fromDesignTokens({ color: { $root: { nested: true } } }),
  },
  {
    name: 'typeless DTCG value',
    code: MIGRATE_CODES.unknownTokenCategory,
    pathIncludes: 'weird',
    run: () => fromDesignTokens({ weird: { $value: 'auto' } }),
  },
  {
    name: 'DTCG alias value',
    code: MIGRATE_CODES.lossyTokenConversion,
    pathIncludes: 'ref',
    run: () => fromDesignTokens({ ref: { $type: 'color', $value: '{color.primary}' } }),
  },
  {
    name: 'DTCG group extension',
    code: MIGRATE_CODES.unsupportedAtRule,
    pathIncludes: '$extends',
    run: () =>
      fromDesignTokens({
        brand: {
          $extends: '{base}',
          accent: { $type: 'color', $value: '#ff9900' },
        },
      }),
  },
  {
    name: 'Tailwind breakpoint outside the length subset',
    code: MIGRATE_CODES.unsupportedAtRule,
    pathIncludes: 'wide',
    run: () => fromTailwindTheme('@theme { --breakpoint-sm: 640px; --breakpoint-wide: 40vw; }'),
  },
  {
    name: 'Tailwind token without a namespace suffix',
    code: MIGRATE_CODES.lossyTokenConversion,
    pathIncludes: '--color-',
    run: () => fromTailwindTheme('@theme { --color-: #ffffff; }'),
  },
  {
    name: 'unclosed Tailwind theme block',
    code: MIGRATE_CODES.malformedInput,
    pathIncludes: '@theme',
    run: () => fromTailwindTheme('@theme { --color-x: red;'),
  },
] as const;

describe('migration diagnostics are total over confirmed refusal shapes', () => {
  it.each(DROP_SHAPES)('$name emits a path-bearing $code diagnostic', ({ run, code, pathIncludes }) => {
    const result = run();
    const diagnostic = result.diagnostics.find((entry) => entry.code === code);
    expect(diagnostic, `${code} must diagnose the refused source member`).toBeDefined();
    expect(diagnostic?.path?.map(String).join('.')).toContain(pathIncludes);
  });

  it('every emitted corpus code is a member of MIGRATE_CODES', () => {
    const knownCodes = new Set<string>(Object.values(MIGRATE_CODES));
    const emittedCodes = DROP_SHAPES.flatMap(({ run }) => run().diagnostics.map(({ code }) => code));
    expect(emittedCodes.length).toBeGreaterThan(0);
    expect(emittedCodes.filter((code) => !knownCodes.has(code))).toEqual([]);
  });

  it('the corpus is non-empty and covers every MIGRATE_CODES refusal class', () => {
    const knownCodes = [...new Set(Object.values(MIGRATE_CODES))].sort();
    const corpusCodes = [...new Set(DROP_SHAPES.map(({ code }) => code))].sort();
    expect(DROP_SHAPES.length).toBeGreaterThanOrEqual(20);
    expect(corpusCodes).toEqual(knownCodes);
  });
});
