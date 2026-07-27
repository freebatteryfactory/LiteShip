// PROVES: INV-PUBLIC-SURFACE-INHABITED
/** Metamorphic laws for exact public-export declaration ownership and reachability. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  analyzePublicExportSources,
  assertPublicExportContracts,
  type PublicExportAnalysis,
} from '../../scripts/lib/public-export-contract.js';
import type { PackagePublicSurfacePolicy } from '../../scripts/package-catalog.js';

const POLICY: PackagePublicSurfacePolicy = {
  audience: 'package-author',
  stability: 'stable',
  failureContract: 'Invalid input is refused without publishing a partial surface.',
  relatedInvariant: 'INV-PUBLIC-SURFACE-INHABITED',
  reachabilityProof: 'tests/property/public-export-inhabitation-laws.prop.test.ts',
};

const identifierArbitrary = fc
  .tuple(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { maxLength: 10 }),
  )
  .map(([head, tail]) => `${head}${tail.join('')}`);

function entrypoint(packageName: string, subpath: string, sourceFile: string) {
  return { packageName, subpath, sourceFile, policy: POLICY };
}

function contractProjection(analysis: PublicExportAnalysis) {
  return analysis.contracts.map((contract) => ({
    specifier: contract.specifier,
    name: contract.name,
    kind: contract.kind,
    producer: contract.producer,
    purpose: contract.purpose,
    example: contract.example,
    replacement: contract.replacement,
  }));
}

describe('public-export ownership algebra', () => {
  it('is deterministic under source-map and entrypoint insertion order', () => {
    fc.assert(
      fc.property(fc.uniqueArray(identifierArbitrary, { minLength: 1, maxLength: 8 }), (names) => {
        const sourceEntries = names.map(
          (name, index) =>
            [
              `owner-${index}.ts`,
              `/** Construct ${name}. */\nexport function create${name}(): string { return '${name}'; }`,
            ] as const,
        );
        const routeEntries = names.map((_, index) => entrypoint(`@acme/pkg-${index}`, '.', `owner-${index}.ts`));
        const forward = analyzePublicExportSources(Object.fromEntries(sourceEntries), routeEntries);
        const reverse = analyzePublicExportSources(
          Object.fromEntries([...sourceEntries].reverse()),
          [...routeEntries].reverse(),
        );
        expect(contractProjection(reverse)).toEqual(contractProjection(forward));
        expect(reverse.undocumented).toEqual(forward.undocumented);
        expect(reverse.producerless).toEqual(forward.producerless);
        expect(reverse.duplicateBindings).toEqual(forward.duplicateBindings);
      }),
      { numRuns: 60 },
    );
  });

  it('classifies type, value, and merged declarations without widening imports', () => {
    const analysis = analyzePublicExportSources(
      {
        'index.ts': [
          '/** A compile-time record. */',
          'export interface RecordType { readonly value: string }',
          '/** A runtime constructor. */',
          "export const makeValue = () => 'value';",
          '/** A merged runtime and type vocabulary. */',
          'export class Merged { readonly value = 1; }',
        ].join('\n'),
      },
      [entrypoint('@acme/grammar', '.', 'index.ts')],
    );
    expect(analysis.contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'RecordType',
          kind: 'type',
          example: "import type { RecordType } from '@acme/grammar';",
        }),
        expect.objectContaining({
          name: 'makeValue',
          kind: 'value',
          example: "import { makeValue } from '@acme/grammar';",
        }),
        expect.objectContaining({ name: 'Merged', kind: 'value-and-type', category: 'merged-value-type' }),
      ]),
    );
    expect(() => assertPublicExportContracts(analysis)).not.toThrow();
  });

  it('attributes a barrel alias to the real producer rather than the frontage file', () => {
    const analysis = analyzePublicExportSources(
      {
        'index.ts': "export { createEngine as launchEngine } from './engine.js';\n",
        'engine.ts': '/** Launch the owned engine. */\nexport function createEngine(): number { return 1; }\n',
      },
      [entrypoint('@acme/engine', '.', 'index.ts')],
    );
    expect(analysis.contracts).toEqual([
      expect.objectContaining({
        name: 'launchEngine',
        producer: 'engine.ts',
        purpose: 'Launch the owned engine.',
        example: "import { launchEngine } from '@acme/engine';",
      }),
    ]);
  });

  it('keeps the same binding independent across real public subpaths', () => {
    const analysis = analyzePublicExportSources(
      {
        'index.ts': '/** Root value. */\nexport const shared = 1;\n',
        'advanced.ts': '/** Advanced value. */\nexport const shared = 2;\n',
      },
      [entrypoint('@acme/routes', '.', 'index.ts'), entrypoint('@acme/routes', './advanced', 'advanced.ts')],
    );
    expect(analysis.duplicateBindings).toEqual([]);
    expect(analysis.contracts.map((contract) => contract.specifier)).toEqual(['@acme/routes', '@acme/routes/advanced']);
    expect(analysis.contracts.map((contract) => contract.surfaceClass)).toEqual(['advanced-module', 'advanced-module']);
  });

  it('detects a duplicate route even when both declarations are documented', () => {
    const analysis = analyzePublicExportSources({ 'index.ts': '/** One value. */\nexport const value = 1;\n' }, [
      entrypoint('@acme/duplicate', '.', 'index.ts'),
      entrypoint('@acme/duplicate', '.', 'index.ts'),
    ]);
    expect(analysis.duplicateBindings).toEqual(['@acme/duplicate:value']);
    expect(() => assertPublicExportContracts(analysis)).toThrow(/duplicate @acme\/duplicate:value/u);
  });

  it('normalizes multiline purpose text and records explicit deprecation guidance', () => {
    const analysis = analyzePublicExportSources(
      {
        'index.ts': [
          '/**',
          ' * Build one stable unit across',
          ' * multiple authored lines.',
          ' * @deprecated Use createUnit instead.',
          ' */',
          'export function oldUnit(): number { return 1; }',
        ].join('\n'),
      },
      [entrypoint('@acme/deprecated', '.', 'index.ts')],
    );
    expect(analysis.contracts[0]).toMatchObject({
      purpose: 'Build one stable unit across multiple authored lines.',
      replacement: 'deprecated: Use createUnit instead.',
    });
  });

  it('flags every undocumented member independently under arbitrary valid names', () => {
    fc.assert(
      fc.property(fc.uniqueArray(identifierArbitrary, { minLength: 1, maxLength: 12 }), (names) => {
        const source = names.map((name) => `export interface ${name} { readonly value: string }`).join('\n');
        const analysis = analyzePublicExportSources({ 'index.ts': source }, [
          entrypoint('@acme/rumors', '.', 'index.ts'),
        ]);
        expect(analysis.undocumented).toEqual(names.map((name) => `@acme/rumors:${name}`).sort());
        expect(() => assertPublicExportContracts(analysis)).toThrow(
          new RegExp(`public export contract is incomplete \\(${names.length}\\)`, 'u'),
        );
      }),
      { numRuns: 50 },
    );
  });

  it('admits documented ambient declarations through a reference import', () => {
    const analysis = analyzePublicExportSources(
      {
        'virtual.d.ts': [
          '/** Ambient declarations for the host virtual module. */',
          "declare module 'virtual:acme/config' {",
          '  export const config: Readonly<Record<string, unknown>>;',
          '}',
        ].join('\n'),
      },
      [entrypoint('@acme/vite', './virtual', 'virtual.d.ts')],
    );
    expect(analysis.contracts).toEqual([
      expect.objectContaining({
        name: 'ambient-declarations',
        kind: 'type',
        producer: 'virtual.d.ts',
        example: '/// <reference types="@acme/vite/virtual" />',
      }),
    ]);
    expect(() => assertPublicExportContracts(analysis)).not.toThrow();
  });

  it('bounds a large failure report while preserving the exact total', () => {
    const names = Array.from({ length: 75 }, (_, index) => `Rumor${index}`);
    const analysis = analyzePublicExportSources(
      { 'index.ts': names.map((name) => `export interface ${name} { readonly n: number }`).join('\n') },
      [entrypoint('@acme/many-rumors', '.', 'index.ts')],
    );
    expect(() => assertPublicExportContracts(analysis)).toThrow(/contract is incomplete \(75\)[\s\S]*\.\.\. 15 more/u);
  });
});
