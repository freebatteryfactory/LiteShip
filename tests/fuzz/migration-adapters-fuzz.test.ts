import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  fromContainerQueries,
  fromCSSCustomProperties,
  fromDesignTokens,
  fromMediaQueries,
  fromTailwindTheme,
  type MigrationResult,
} from '@liteship/compiler/migrate';

const SEED = 0x1a7e5eed;

function projection(result: MigrationResult): unknown {
  return {
    boundaries: result.boundaries.map((entry) => entry.id),
    tokens: result.tokens.map((entry) => entry.id),
    themes: result.themes.map((entry) => entry.id),
    diagnostics: result.diagnostics.map(({ code, message, path, severity }) => ({ code, message, path, severity })),
  };
}

function prototypeIsClean(): boolean {
  const probe = {} as Record<string, unknown>;
  return probe['polluted'] === undefined && probe['isAdmin'] === undefined && probe['__polluted__'] === undefined;
}

describe('migration adapter deterministic fuzz', () => {
  it('all CSS-family adapters deterministically preserve or refuse arbitrary source text', () => {
    const adapters = [fromMediaQueries, fromContainerQueries, fromTailwindTheme, fromCSSCustomProperties] as const;
    fc.assert(
      fc.property(fc.string({ maxLength: 1_024 }), (source) => {
        for (const adapter of adapters) {
          const first = adapter(source);
          const second = adapter(source);
          expect(projection(second)).toEqual(projection(first));
          expect(first.diagnostics.every((diagnostic) => diagnostic.code.startsWith('migrate/'))).toBe(true);
          expect(prototypeIsClean()).toBe(true);
        }
      }),
      { seed: SEED, numRuns: 300, endOnFailure: true },
    );
  });

  it('the DTCG subset deterministically preserves or refuses arbitrary JSON values', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (document) => {
        const first = fromDesignTokens(document);
        const second = fromDesignTokens(document);
        expect(projection(second)).toEqual(projection(first));
        expect(first.diagnostics.every((diagnostic) => diagnostic.code.startsWith('migrate/'))).toBe(true);
        expect(prototypeIsClean()).toBe(true);
      }),
      { seed: SEED ^ 0x5a5a5a5a, numRuns: 300, endOnFailure: true },
    );
  });

  it('carries a fixed replay seed and planted hostile cases into the permanent corpus', () => {
    const hostiles = [
      '@media (((',
      '@container x style(--token: value) { :root { --x: 1 } }',
      '@theme { --breakpoint-x: calc(1px + var(--x)); }',
      '@layer tokens { :root { --__proto__: polluted; } }',
    ];
    for (const hostile of hostiles) {
      expect(() => fromMediaQueries(hostile)).not.toThrow();
      expect(() => fromContainerQueries(hostile)).not.toThrow();
      expect(() => fromTailwindTheme(hostile)).not.toThrow();
      expect(() => fromCSSCustomProperties(hostile)).not.toThrow();
      expect(prototypeIsClean()).toBe(true);
    }
    expect(SEED).toBe(0x1a7e5eed);
  });
});
