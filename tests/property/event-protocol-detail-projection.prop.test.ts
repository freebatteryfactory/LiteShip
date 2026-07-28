import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type EventProtocolRecord,
  validateProjectedDetailReferences,
} from '../../scripts/lib/event-protocol-contract.js';

const identifierArbitrary = fc
  .tuple(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'),
    fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$0123456789'), {
      maxLength: 16,
    }),
  )
  .map(([head, tail]) => `${head}${tail.join('')}`);

const moduleArbitrary = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'), { minLength: 1, maxLength: 16 })
  .filter((segments) => segments.some((segment) => /[a-z0-9]/u.test(segment)))
  .map((segments) => `./${segments.join('')}.js`);

function record(detail: string, suffix = 'event'): EventProtocolRecord {
  return {
    name: `liteship:${suffix}`,
    owner: 'fixture',
    channel: 'dom',
    detail,
    producers: ['tests/fixture.ts'],
    description: 'Fixture event.',
    catalog: 'tests/fixture-event-protocol.ts',
  };
}

function exportsMap(
  entries: readonly (readonly [moduleName: string, symbolName: string])[],
): ReadonlyMap<string, ReadonlySet<string>> {
  const map = new Map<string, Set<string>>();
  for (const [moduleName, symbolName] of entries) {
    const names = map.get(moduleName) ?? new Set<string>();
    names.add(symbolName);
    map.set(moduleName, names);
  }
  return map;
}

describe('event detail projection properties', () => {
  it('admits every projected detail when its exact leaf exports its symbol', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.tuple(moduleArbitrary, identifierArbitrary), {
          minLength: 1,
          maxLength: 12,
          selector: ([moduleName, symbolName]) => `${moduleName}:${symbolName}`,
        }),
        (references) => {
          const detail = references
            .map(([moduleName, symbolName]) => `import(${JSON.stringify(moduleName)}).${symbolName}`)
            .join(' | ');
          expect(() => validateProjectedDetailReferences([record(detail)], exportsMap(references))).not.toThrow();
        },
      ),
      { numRuns: 250 },
    );
  });

  it('refuses a symbol exported by the wrong leaf even when its name exists elsewhere', () => {
    fc.assert(
      fc.property(moduleArbitrary, moduleArbitrary, identifierArbitrary, (ownerModule, otherModule, symbolName) => {
        fc.pre(ownerModule !== otherModule);
        const detail = `import(${JSON.stringify(ownerModule)}).${symbolName}`;
        expect(() =>
          validateProjectedDetailReferences([record(detail)], exportsMap([[otherModule, symbolName]])),
        ).toThrow(`${ownerModule}.${symbolName}`);
      }),
      { numRuns: 250 },
    );
  });

  it('refuses a missing symbol without accepting a same-leaf near miss', () => {
    fc.assert(
      fc.property(moduleArbitrary, identifierArbitrary, identifierArbitrary, (moduleName, expected, nearMiss) => {
        fc.pre(expected !== nearMiss);
        const detail = `Readonly<import(${JSON.stringify(moduleName)}).${expected}>`;
        expect(() =>
          validateProjectedDetailReferences([record(detail)], exportsMap([[moduleName, nearMiss]])),
        ).toThrow(`${moduleName}.${expected}`);
      }),
      { numRuns: 250 },
    );
  });

  it('checks every imported detail inside nested unions, intersections, records, and arrays', () => {
    fc.assert(
      fc.property(
        moduleArbitrary,
        fc.uniqueArray(identifierArbitrary, { minLength: 2, maxLength: 8 }),
        fc.integer({ min: 0, max: 7 }),
        (moduleName, names, missingIndex) => {
          const missing = names[missingIndex % names.length]!;
          const admitted = names.filter((name) => name !== missing);
          const detail = `ReadonlyArray<{ value: ${names
            .map((name) => `import(${JSON.stringify(moduleName)}).${name}`)
            .join(' & ')} }>`;
          expect(() =>
            validateProjectedDetailReferences(
              [record(detail)],
              exportsMap(admitted.map((name) => [moduleName, name] as const)),
            ),
          ).toThrow(`${moduleName}.${missing}`);
        },
      ),
      { numRuns: 250 },
    );
  });

  it('is invariant to record order, export order, and irrelevant extra exports', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.tuple(moduleArbitrary, identifierArbitrary), {
          minLength: 1,
          maxLength: 10,
          selector: ([moduleName, symbolName]) => `${moduleName}:${symbolName}`,
        }),
        identifierArbitrary,
        (references, extraName) => {
          const records = references.map(([moduleName, symbolName], index) =>
            record(`import(${JSON.stringify(moduleName)}).${symbolName}`, `event-${index}`),
          );
          const entries = [...references, ...references.map(([moduleName]) => [moduleName, extraName] as const)];
          expect(() => validateProjectedDetailReferences(records, exportsMap(entries))).not.toThrow();
          expect(() => validateProjectedDetailReferences([...records].reverse(), exportsMap(entries.reverse()))).not.toThrow();
        },
      ),
      { numRuns: 200 },
    );
  });

  it('leaves inline structural and primitive details independent of spine leaves', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'undefined',
          'unknown',
          'string',
          '{ readonly state: string }',
          'Readonly<Record<string, string | number>>',
          '{ readonly ok: true } | { readonly ok: false; readonly reason: string }',
        ),
        (detail) => {
          expect(() => validateProjectedDetailReferences([record(detail)], new Map())).not.toThrow();
        },
      ),
    );
  });

  it('recognizes both quote styles for real TypeScript import types', () => {
    fc.assert(
      fc.property(moduleArbitrary, identifierArbitrary, (moduleName, symbolName) => {
        const admitted = exportsMap([[moduleName, symbolName]]);
        expect(() =>
          validateProjectedDetailReferences(
            [record(`import(${JSON.stringify(moduleName)}).${symbolName}`)],
            admitted,
          ),
        ).not.toThrow();
        expect(() =>
          validateProjectedDetailReferences([record(`import('${moduleName}').${symbolName}`)], admitted),
        ).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('fails closed on namespace and nested-qualified projected imports', () => {
    fc.assert(
      fc.property(moduleArbitrary, identifierArbitrary, identifierArbitrary, (moduleName, namespace, symbolName) => {
        for (const detail of [
          `typeof import(${JSON.stringify(moduleName)})`,
          `import(${JSON.stringify(moduleName)}).${namespace}.${symbolName}`,
        ]) {
          expect(() => validateProjectedDetailReferences([record(detail)], new Map())).toThrow(
            `projected event detail import ${moduleName} must select one named spine export`,
          );
        }
      }),
      { numRuns: 150 },
    );
  });

  it('attributes a missing detail to the exact owner catalog and event identity', () => {
    fc.assert(
      fc.property(moduleArbitrary, identifierArbitrary, (moduleName, symbolName) => {
        const subject = {
          ...record(`import(${JSON.stringify(moduleName)}).${symbolName}`, 'attributed-event'),
          catalog: 'packages/fixture/src/event-protocol.ts',
        };
        expect(() => validateProjectedDetailReferences([subject], new Map())).toThrow(
          `packages/fixture/src/event-protocol.ts: liteship:attributed-event detail projects missing spine export ${moduleName}.${symbolName}`,
        );
      }),
      { numRuns: 150 },
    );
  });

  it('refuses one missing projection among otherwise complete independent owner records', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.tuple(moduleArbitrary, identifierArbitrary), {
          minLength: 2,
          maxLength: 10,
          selector: ([moduleName, symbolName]) => `${moduleName}:${symbolName}`,
        }),
        fc.integer({ min: 0, max: 9 }),
        (references, missingIndex) => {
          const missing = references[missingIndex % references.length]!;
          const records = references.map(([moduleName, symbolName], index) =>
            record(`import(${JSON.stringify(moduleName)}).${symbolName}`, `owner-${index}`),
          );
          const admitted = references.filter((entry) => entry !== missing);
          expect(() => validateProjectedDetailReferences(records, exportsMap(admitted))).toThrow(
            `${missing[0]}.${missing[1]}`,
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('does not mistake prose, quoted text, or a partial import expression for an admitted reference', () => {
    fc.assert(
      fc.property(moduleArbitrary, identifierArbitrary, (moduleName, symbolName) => {
        for (const detail of [
          `'import(${JSON.stringify(moduleName)}).${symbolName}'`,
          `"import('${moduleName}').${symbolName}"`,
          `${moduleName}.${symbolName}`,
        ]) {
          expect(() => validateProjectedDetailReferences([record(detail)], new Map())).not.toThrow();
        }
      }),
      { numRuns: 100 },
    );
  });
});
