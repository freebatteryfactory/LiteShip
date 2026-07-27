/** Property and metamorphic laws for the generated declaration-only spine surface. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  analyzeSpineSources,
  classifySpineProvenance,
  renderSpineBarrel,
  renderSpineSymbolDocumentation,
  type SpineSurfaceAnalysis,
} from '../../scripts/lib/spine-surface-contract.js';

const typeNameArbitrary = fc
  .tuple(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { maxLength: 9 }),
  )
  .map(([head, tail]) => `${head}${tail.join('')}`);

function projection(analysis: SpineSurfaceAnalysis) {
  return {
    symbols: analysis.symbols.map(({ name, kind, leaf, moduleSpecifier, summary }) => ({
      name,
      kind,
      leaf,
      moduleSpecifier,
      summary,
    })),
    rejectedValues: analysis.rejectedValues,
    collisions: analysis.collisions,
    undocumented: analysis.undocumented,
  };
}

describe('_spine surface generation laws', () => {
  it('is deterministic under declaration-leaf insertion order', () => {
    fc.assert(
      fc.property(fc.uniqueArray(typeNameArbitrary, { minLength: 1, maxLength: 10 }), (names) => {
        const entries = names.map(
          (name, index) =>
            [
              `leaf-${index}.d.ts`,
              `/** ${name} is the canonical type owner. */\nexport interface ${name} { readonly value: string }\n`,
            ] as const,
        );
        const forward = analyzeSpineSources(Object.fromEntries(entries));
        const reverse = analyzeSpineSources(Object.fromEntries([...entries].reverse()));
        expect(projection(reverse)).toEqual(projection(forward));
        expect(renderSpineBarrel(reverse)).toBe(renderSpineBarrel(forward));
        expect(renderSpineSymbolDocumentation(reverse)).toBe(renderSpineSymbolDocumentation(forward));
      }),
      { numRuns: 60 },
    );
  });

  it('classifies every type-capable declaration kind and excludes runtime-only declarations', () => {
    const analysis = analyzeSpineSources({
      'kinds.d.ts': [
        '/** Interface owner. */',
        'export interface InterfaceOwner { readonly value: string }',
        '/** Type owner. */',
        'export type TypeOwner = string;',
        '/** Class owner. */',
        'export declare class ClassOwner { readonly value: string; }',
        '/** Enum owner. */',
        'export declare enum EnumOwner { One = 1 }',
        '/** Namespace owner. */',
        'export declare namespace NamespaceOwner { type Item = string; }',
        '/** Runtime-only owner. */',
        'export declare const runtimeOnly: number;',
        '/** Function-only owner. */',
        'export declare function executeOnly(): void;',
      ].join('\n'),
    });
    expect(analysis.symbols.map(({ name, kind }) => ({ name, kind }))).toEqual([
      { name: 'ClassOwner', kind: 'class' },
      { name: 'EnumOwner', kind: 'enum' },
      { name: 'InterfaceOwner', kind: 'interface' },
      { name: 'NamespaceOwner', kind: 'namespace' },
      { name: 'TypeOwner', kind: 'type' },
    ]);
    expect(analysis.rejectedValues).toEqual([
      { name: 'executeOnly', leaf: 'kinds.d.ts' },
      { name: 'runtimeOnly', leaf: 'kinds.d.ts' },
    ]);
  });

  it('renders only explicit type exports and exactly one terminal newline', () => {
    const analysis = analyzeSpineSources({
      'alpha.d.ts':
        '/** Alpha contract. */\nexport interface Alpha { readonly x: number }\nexport declare const hidden: number;\n',
      'beta.d.ts': '/** Beta contract. */\nexport type Beta = string;\n',
    });
    const barrel = renderSpineBarrel(analysis);
    expect(barrel).toContain("export type {\n  Alpha,\n} from './alpha.js';");
    expect(barrel).toContain("export type {\n  Beta,\n} from './beta.js';");
    expect(barrel).not.toContain('hidden');
    expect(barrel.endsWith('\n')).toBe(true);
    expect(barrel.endsWith('\n\n')).toBe(false);
    expect(barrel).not.toMatch(/export \*/u);
  });

  it('sorts modules and names by code unit rather than filesystem enumeration', () => {
    const analysis = analyzeSpineSources({
      'zeta.d.ts': [
        '/** Zulu contract. */',
        'export interface Zulu { readonly z: true }',
        '/** Alpha contract in zeta. */',
        'export interface Alpha { readonly a: true }',
      ].join('\n'),
      'alpha.d.ts': '/** Beta contract. */\nexport interface Beta { readonly b: true }\n',
    });
    const barrel = renderSpineBarrel(analysis);
    expect(barrel.indexOf("from './alpha.js'")).toBeLessThan(barrel.indexOf("from './zeta.js'"));
    expect(barrel.indexOf('  Alpha,')).toBeLessThan(barrel.indexOf('  Zulu,'));
  });

  it('refuses a collision instead of silently choosing a declaration owner', () => {
    const analysis = analyzeSpineSources({
      'left.d.ts': '/** Left identity. */\nexport interface Shared { readonly left: true }\n',
      'right.d.ts': '/** Right identity. */\nexport interface Shared { readonly right: true }\n',
    });
    expect(analysis.collisions).toEqual(['Shared: left.d.ts, right.d.ts']);
    expect(analysis.symbols).toEqual([]);
    expect(() => renderSpineBarrel(analysis)).toThrow(/collision Shared: left\.d\.ts, right\.d\.ts/u);
    expect(() => renderSpineSymbolDocumentation(analysis)).toThrow(/surface is not admissible/u);
  });

  it('refuses undocumented type owners while ignoring documentation on rejected values', () => {
    const analysis = analyzeSpineSources({
      'mixed.d.ts': [
        'export interface MissingDocs { readonly value: string }',
        '/** Runtime helper deliberately excluded from the type root. */',
        'export declare function helper(): void;',
      ].join('\n'),
    });
    expect(analysis.undocumented).toEqual(['mixed.d.ts:MissingDocs']);
    expect(analysis.rejectedValues).toEqual([{ name: 'helper', leaf: 'mixed.d.ts' }]);
    expect(() => renderSpineBarrel(analysis)).toThrow(/undocumented mixed\.d\.ts:MissingDocs/u);
  });

  it('normalizes multiline declaration documentation into one stable summary', () => {
    const analysis = analyzeSpineSources({
      'summary.d.ts': [
        '/**',
        ' * One declaration summary spread',
        ' * across several authored lines.',
        ' */',
        'export interface Summary { readonly value: string }',
      ].join('\n'),
    });
    expect(analysis.symbols[0]?.summary).toBe('One declaration summary spread across several authored lines.');
  });

  it('escapes markdown table delimiters without changing declaration meaning', () => {
    const analysis = analyzeSpineSources({
      'markdown.d.ts': '/** A `left` | `right` relation. */\nexport interface Relation { readonly value: string }\n',
    });
    const docs = renderSpineSymbolDocumentation(analysis);
    expect(docs).toContain('A \\`left\\` \\| \\`right\\` relation.');
    expect(docs).toContain('| `Relation` | interface | `markdown.d.ts` |');
  });

  it('keeps unrelated unique owners when another name collides', () => {
    const analysis = analyzeSpineSources({
      'a.d.ts': [
        '/** Shared A. */',
        'export interface Shared { readonly a: true }',
        '/** Unique A. */',
        'export interface UniqueA { readonly a: true }',
      ].join('\n'),
      'b.d.ts': [
        '/** Shared B. */',
        'export interface Shared { readonly b: true }',
        '/** Unique B. */',
        'export interface UniqueB { readonly b: true }',
      ].join('\n'),
    });
    expect(analysis.symbols.map((symbol) => symbol.name)).toEqual(['UniqueA', 'UniqueB']);
    expect(analysis.collisions).toEqual(['Shared: a.d.ts, b.d.ts']);
  });

  it('keeps value-only exclusions multiplicity-stable under arbitrary names', () => {
    fc.assert(
      fc.property(fc.uniqueArray(typeNameArbitrary, { minLength: 1, maxLength: 15 }), (names) => {
        const source = names.map((name) => `export declare const value${name}: number;`).join('\n');
        const analysis = analyzeSpineSources({ 'values.d.ts': source });
        expect(analysis.symbols).toEqual([]);
        expect(analysis.undocumented).toEqual([]);
        expect(analysis.rejectedValues.map((value) => value.name)).toEqual(names.map((name) => `value${name}`).sort());
        const barrel = renderSpineBarrel(analysis);
        for (const name of names) expect(barrel).not.toContain(`value${name}`);
      }),
      { numRuns: 50 },
    );
  });

  it('partitions arbitrary unique symbols exactly once between mirrors and protocols', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(typeNameArbitrary, { minLength: 1, maxLength: 20 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        (names, bits) => {
          const analysis = analyzeSpineSources(
            Object.fromEntries(
              names.map((name, index) => [
                `${index}.d.ts`,
                `/** ${name} owner. */\nexport interface ${name} { readonly value: string }`,
              ]),
            ),
          );
          const mirrors = names.filter((_, index) => bits[index % bits.length]);
          const contracts = mirrors.flatMap((name) => [
            {
              packageName: '@acme/runtime',
              specifier: '@acme/runtime',
              name,
              kind: 'type' as const,
              producer: `packages/runtime/src/${name}.ts`,
            },
            // Duplicate routes to the SAME producer must not manufacture a second owner.
            {
              packageName: '@acme/facade',
              specifier: '@acme/facade/types',
              name,
              kind: 'type' as const,
              producer: `packages/runtime/src/${name}.ts`,
            },
          ]);
          const forward = classifySpineProvenance(analysis, contracts, []);
          const reversed = classifySpineProvenance(analysis, [...contracts].reverse(), []);
          expect(forward.findings).toEqual([]);
          expect(reversed).toEqual(forward);
          expect(forward.classifications).toHaveLength(names.length);
          expect(new Set(forward.classifications.map((row) => row.symbol))).toEqual(new Set(names));
          expect(forward.generatedAdmissions.map((row) => row.typeName)).toEqual([...mirrors].sort());
          expect(
            forward.classifications
              .filter((row) => row.classification === 'spine-protocol')
              .map((row) => row.symbol),
          ).toEqual(names.filter((name) => !mirrors.includes(name)).sort());
        },
      ),
      { numRuns: 80 },
    );
  });
});
