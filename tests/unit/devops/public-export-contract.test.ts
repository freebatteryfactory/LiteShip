// PROVES: INV-PUBLIC-SURFACE-INHABITED
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { PACKAGE_CATALOG, type PackagePublicSurfacePolicy } from '../../../scripts/package-catalog.js';
import {
  analyzePublicExportSources,
  analyzeRepositoryPublicExports,
  assertPublicExportContracts,
} from '../../../scripts/lib/public-export-contract.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const POLICY: PackagePublicSurfacePolicy = {
  audience: 'package-author',
  stability: 'stable',
  failureContract: 'Invalid input is refused.',
  relatedInvariant: 'INV-PUBLIC-SURFACE-INHABITED',
  reachabilityProof: 'tests/unit/devops/public-export-contract.test.ts',
};

describe('public export ownership contract', () => {
  test('records the source declaration owner, import example, purpose, and package policy', () => {
    const analysis = analyzePublicExportSources(
      {
        'index.ts': [
          '/** A thing consumers can construct. */',
          'export interface Thing { readonly value: string }',
          '/** Construct one thing. */',
          "export function makeThing(): Thing { return { value: 'ok' }; }",
        ].join('\n'),
      },
      [{ packageName: '@acme/thing', subpath: '.', sourceFile: 'index.ts', policy: POLICY }],
    );

    expect(analysis.undocumented).toEqual([]);
    expect(analysis.producerless).toEqual([]);
    expect(analysis.contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'makeThing',
          kind: 'value',
          producer: 'index.ts',
          example: "import { makeThing } from '@acme/thing';",
          purpose: 'Construct one thing.',
        }),
        expect.objectContaining({
          name: 'Thing',
          kind: 'type',
          example: "import type { Thing } from '@acme/thing';",
        }),
      ]),
    );
  });

  test('refuses an undocumented phantom instead of counting a small surface as healthy', () => {
    const analysis = analyzePublicExportSources(
      { 'index.ts': 'export interface Rumor { readonly advertised: true }' },
      [{ packageName: '@acme/rumor', subpath: '.', sourceFile: 'index.ts', policy: POLICY }],
    );

    expect(analysis.undocumented).toEqual(['@acme/rumor:Rumor']);
    expect(() => assertPublicExportContracts(analysis)).toThrow(/undocumented @acme\/rumor:Rumor/u);
  });

  test('the complete package graph has exact declared export contracts', () => {
    const analysis = analyzeRepositoryPublicExports(REPO_ROOT, PACKAGE_CATALOG);
    expect(() => assertPublicExportContracts(analysis)).not.toThrow();
    expect(new Set(analysis.contracts.map((contract) => contract.packageName))).toEqual(
      new Set(PACKAGE_CATALOG.map((record) => record.name)),
    );
    expect(analysis.contracts.length).toBeGreaterThan(3_000);
    for (const contract of analysis.contracts) {
      expect(contract.producer).not.toBe('(missing)');
      expect(existsSync(resolve(REPO_ROOT, contract.producer))).toBe(true);
      expect(contract.purpose).not.toBe('');
      expect(existsSync(resolve(REPO_ROOT, contract.proof))).toBe(true);
    }
  });
});
