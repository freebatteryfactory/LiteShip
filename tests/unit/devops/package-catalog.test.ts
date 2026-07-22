/**
 * The one package catalog must reject bad authored truth before it can stamp a
 * second set of generated lies around the repository.
 *
 * @module
 */
// PROVES: INV-ROSTER-SINGLE-SOURCE
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { LITESHIP_PACKAGE_ROSTER, packageTopology } from '@liteship/audit';
import { PACKAGE_CATALOG, type PackageCatalogRecord } from '../../../scripts/package-catalog.js';
import {
  collectGeneratedProjectionDrift,
  findAuthoredFleetLists,
  renderGeneratedProjections,
  validatePackageCatalog,
  type CatalogManifest,
} from '../../../scripts/gen-roster.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

function manifests(): Map<string, CatalogManifest> {
  return new Map(
    PACKAGE_CATALOG.map((record) => [
      record.dir,
      JSON.parse(readFileSync(resolve(REPO, record.dir, 'package.json'), 'utf8')) as CatalogManifest,
    ]),
  );
}

function replaceRecord(
  catalog: readonly PackageCatalogRecord[],
  name: string,
  replace: (record: PackageCatalogRecord) => PackageCatalogRecord,
): readonly PackageCatalogRecord[] {
  return catalog.map((record) => (record.name === name ? replace(record) : record));
}

function details(catalog: readonly PackageCatalogRecord[], manifestMap = manifests()): string[] {
  return validatePackageCatalog(catalog, manifestMap, [...manifestMap.keys()]).map((drift) => drift.detail);
}

describe('PACKAGE_CATALOG negative controls', () => {
  it('accepts the exact 25-record catalog against independent manifests', () => {
    expect(details(PACKAGE_CATALOG)).toEqual([]);
  });

  it('rejects a missing package', () => {
    expect(details(PACKAGE_CATALOG.slice(1))).toEqual(
      expect.arrayContaining([expect.stringContaining('expected exactly 25 records, found 24')]),
    );
  });

  it('rejects an extra 26th package', () => {
    const extra = {
      ...PACKAGE_CATALOG[0],
      name: '@liteship/extra',
      dir: 'packages/extra',
    } satisfies PackageCatalogRecord;
    const manifestMap = manifests();
    manifestMap.set(extra.dir, {
      name: extra.name,
      publishConfig: {},
      dependencies: {},
      exports: { '.': './dist/index.js' },
      description: extra.description,
      keywords: extra.keywords,
    });
    expect(details([...PACKAGE_CATALOG, extra], manifestMap)).toEqual(
      expect.arrayContaining([expect.stringContaining('expected exactly 25 records, found 26')]),
    );
  });

  it.each([
    ['dependencies', 'dependencies'],
    ['capabilities', 'capabilities'],
    ['publicSubpaths', 'publicSubpaths'],
    ['smokeImports', 'smokeImports'],
  ] as const)('rejects duplicate %s', (field, expectedField) => {
    const original = PACKAGE_CATALOG.find((record) => record.name === '@liteship/core')!;
    const value = original[field][0]!;
    const catalog = replaceRecord(PACKAGE_CATALOG, original.name, (record) => ({
      ...record,
      [field]: [...record[field], value],
    }));
    expect(details(catalog)).toEqual(
      expect.arrayContaining([expect.stringContaining(`${expectedField} contains duplicate entries`)]),
    );
  });

  it('rejects a dependency outside the catalog', () => {
    const catalog = replaceRecord(PACKAGE_CATALOG, '@liteship/core', (record) => ({
      ...record,
      dependencies: [...record.dependencies, '@liteship/not-real'],
    }));
    expect(details(catalog)).toEqual(
      expect.arrayContaining([expect.stringContaining('dependency @liteship/not-real is not a catalog package')]),
    );
  });

  it('rejects a catalog export that differs from the manifest export map', () => {
    const manifestMap = manifests();
    const core = manifestMap.get('packages/core')!;
    manifestMap.set('packages/core', { ...core, exports: { '.': './dist/index.js' } });
    expect(details(PACKAGE_CATALOG, manifestMap)).toEqual(
      expect.arrayContaining([expect.stringContaining('publicSubpaths differ')]),
    );
  });

  it('rejects a smoke import that is not a positive public export', () => {
    const catalog = replaceRecord(PACKAGE_CATALOG, '@liteship/core', (record) => ({
      ...record,
      smokeImports: [...record.smokeImports, '@liteship/core/not-exported'],
    }));
    expect(details(catalog)).toEqual(
      expect.arrayContaining([expect.stringContaining('is not a positive publicSubpaths export')]),
    );
  });

  it('rejects duplicate projection order and a deferred package without an issue', () => {
    const duplicateOrder = replaceRecord(PACKAGE_CATALOG, '@liteship/error', (record) => ({
      ...record,
      docs: { ...record.docs, order: 1 },
    }));
    expect(details(duplicateOrder)).toEqual(
      expect.arrayContaining([expect.stringContaining('docs.foundations orders must be unique and contiguous')]),
    );

    const deferredWithoutIssue = replaceRecord(PACKAGE_CATALOG, '@liteship/core', (record) => ({
      ...record,
      plumbStatus: 'deferred',
      plumbIssue: undefined,
    }));
    expect(details(deferredWithoutIssue)).toEqual(
      expect.arrayContaining([expect.stringContaining('deferred plumb status requires plumbIssue')]),
    );
  });

  it('rejects one stale generated projection without touching the checkout', () => {
    const source = new Map(renderGeneratedProjections());
    for (const path of ['ARCHITECTURE.md', 'PACKAGE-SURFACES.md', 'AGENTS.md', 'packages/liteship/src/index.ts']) {
      source.set(path, readFileSync(resolve(REPO, path), 'utf8'));
    }
    source.set('scripts/ci/publish-roster.json', '{"stale":true}\n');
    expect(collectGeneratedProjectionDrift((path) => source.get(path))).toEqual([
      expect.objectContaining({ copy: 'scripts/ci/publish-roster.json' }),
    ]);
  });

  it('rejects a second authored full-fleet list but permits generated and red-fixture sources', () => {
    const fleet = PACKAGE_CATALOG.filter((record) => record.name.startsWith('@liteship/'))
      .map((record) => record.name)
      .join('\n');
    expect(findAuthoredFleetLists([{ path: 'src/second-roster.ts', text: fleet }])).toEqual([
      expect.objectContaining({ copy: 'src/second-roster.ts' }),
    ]);
    expect(
      findAuthoredFleetLists([
        { path: 'packages/audit/src/package-catalog.generated.ts', text: fleet },
        { path: 'tests/fixtures/package-catalog-red/second-roster.ts', text: fleet },
      ]),
    ).toEqual([]);
  });
});

describe('generated audit topology', () => {
  it('preserves the public audit roster type while generating its exact values', () => {
    expectTypeOf(LITESHIP_PACKAGE_ROSTER).toEqualTypeOf<readonly string[]>();
    expect(LITESHIP_PACKAGE_ROSTER).toEqual(
      PACKAGE_CATALOG.filter((record) => record.name.startsWith('@liteship/')).map((record) => record.name),
    );
  });

  it('intentionally expands topology coverage to all 25 catalog packages', () => {
    expect(Object.keys(packageTopology)).toEqual(PACKAGE_CATALOG.map((record) => record.name));
    for (const record of PACKAGE_CATALOG) {
      expect(packageTopology[record.name]).toEqual({
        kind: record.audit.kind,
        allowedInternalImports: record.audit.allowedInternalImports,
      });
    }
  });

  it('keeps create-liteship allowed to import its real @liteship/core scaffold dependency', () => {
    const record = PACKAGE_CATALOG.find((candidate) => candidate.name === 'create-liteship');
    expect(record?.audit).toEqual(
      expect.objectContaining({ kind: 'standalone', allowedInternalImports: ['@liteship/core'] }),
    );
  });
});
