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
import { defaultAnalyzableArtifacts } from '@liteship/audit';
import { LITESHIP_PACKAGE_ROSTER } from '../../../packages/cli/src/internal/liteship-audit-profile.js';
import { packageTopology } from '../../../packages/cli/src/internal/liteship-audit-policy.js';
import {
  DEFAULT_ANALYZABLE_ARTIFACTS,
  PACKAGE_CATALOG,
  type PackageCatalogRecord,
} from '../../../scripts/package-catalog.js';
import {
  validateProjectReferenceClosure,
  type ProjectReferenceConfig,
  type ProjectReferenceSource,
} from '../../../scripts/lib/project-reference-contract.js';
import { walkTrackedFiles } from '../../../scripts/audit/shared.js';
import {
  collectGeneratedProjectionDrift,
  findAuthoredFleetLists,
  renderGeneratedProjections,
  renderTestPathsTsconfig,
  validatePackageCatalog,
  resolvePackageSourceEntrypoints,
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

function projectReferenceTruth(): {
  readonly configs: ReadonlyMap<string, ProjectReferenceConfig>;
  readonly sources: readonly ProjectReferenceSource[];
} {
  return {
    configs: new Map(
      PACKAGE_CATALOG.map((record) => [
        record.dir,
        JSON.parse(readFileSync(resolve(REPO, record.dir, 'tsconfig.json'), 'utf8')) as ProjectReferenceConfig,
      ]),
    ),
    sources: walkTrackedFiles(REPO)
      .filter((path) => /^packages\/[^/]+\/src\/.*\.tsx?$/.test(path))
      .map((path) => ({ path, text: readFileSync(resolve(REPO, path), 'utf8') })),
  };
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

  it('rejects a sourceEntry outside its package owner', () => {
    const catalog = replaceRecord(PACKAGE_CATALOG, '@liteship/core', (record) => ({
      ...record,
      sourceEntry: 'packages/foreign/src/index.ts',
    }));
    expect(details(catalog)).toEqual(
      expect.arrayContaining([expect.stringContaining('sourceEntry must be a TypeScript file owned by packages/core')]),
    );
  });

  it('fails closed when a public subpath has zero or multiple source owners', () => {
    const core = PACKAGE_CATALOG.find((record) => record.name === '@liteship/core')!;
    const mutant = {
      ...core,
      publicSubpaths: ['.', './ambiguous'],
    } satisfies PackageCatalogRecord;
    expect(() => resolvePackageSourceEntrypoints(mutant, (path) => path === core.sourceEntry)).toThrow(
      /expected exactly one source entrypoint, found 0/,
    );
    expect(() =>
      resolvePackageSourceEntrypoints(mutant, (path) => path === core.sourceEntry || path.includes('/ambiguous')),
    ).toThrow(/expected exactly one source entrypoint, found 2/);
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

  it('binds runtime-surface classification to positive smoke imports', () => {
    const typeOnlyWithImport = replaceRecord(PACKAGE_CATALOG, '@liteship/_spine', (record) => ({
      ...record,
      smokeImports: ['@liteship/_spine'],
    }));
    expect(details(typeOnlyWithImport)).toEqual(
      expect.arrayContaining([expect.stringContaining('types-only runtime surface cannot declare')]),
    );

    const moduleWithoutImport = replaceRecord(PACKAGE_CATALOG, '@liteship/core', (record) => ({
      ...record,
      smokeImports: [],
    }));
    expect(details(moduleWithoutImport)).toEqual(
      expect.arrayContaining([expect.stringContaining('module runtime surface requires at least one')]),
    );
  });

  it('rejects empty analysis contracts and types-only packages without declarations', () => {
    const empty = replaceRecord(PACKAGE_CATALOG, '@liteship/core', (record) => ({
      ...record,
      audit: { ...record.audit, analyzableArtifacts: [] },
    }));
    expect(details(empty)).toEqual(
      expect.arrayContaining([expect.stringContaining('analyzableArtifacts must name at least one')]),
    );

    const noDeclarations = replaceRecord(PACKAGE_CATALOG, '@liteship/_spine', (record) => ({
      ...record,
      audit: { ...record.audit, analyzableArtifacts: ['src/**/*.ts', '!src/**/*.d.ts'] },
    }));
    expect(details(noDeclarations)).toEqual(
      expect.arrayContaining([expect.stringContaining('must declare an analyzable declaration artifact')]),
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

  it('admits the curated facade to API and TypeDoc projection from the one package owner', () => {
    const facade = PACKAGE_CATALOG.find((record) => record.name === 'liteship');
    expect(facade).toEqual(
      expect.objectContaining({
        apiSurface: true,
        apiSurfaceOrder: 23,
        typedocEntry: 'packages/liteship/src',
        typedocOrder: 24,
      }),
    );
    expect(facade?.publicSubpaths).toContain('./testing');
  });

  it.each([
    ['apiSurfaceOrder', 22, 'apiSurface orders must be unique and contiguous from zero'],
    ['typedocOrder', 23, 'typedoc orders must be unique and contiguous from zero'],
  ] as const)('rejects a duplicate %s projection slot', (field, value, expected) => {
    const duplicate = replaceRecord(PACKAGE_CATALOG, 'liteship', (record) => ({
      ...record,
      [field]: value,
    }));
    expect(details(duplicate)).toEqual(expect.arrayContaining([expect.stringContaining(expected)]));
  });

  it('rejects one stale generated projection without touching the checkout', () => {
    const source = new Map(renderGeneratedProjections());
    for (const path of [
      'ARCHITECTURE.md',
      'PACKAGE-SURFACES.md',
      'AGENTS.md',
      'packages/liteship/src/package-roster.generated.ts',
    ]) {
      source.set(path, readFileSync(resolve(REPO, path), 'utf8'));
    }
    source.set('scripts/ci/publish-roster.json', '{"stale":true}\n');
    expect(collectGeneratedProjectionDrift((path) => source.get(path))).toEqual([
      expect.objectContaining({ copy: 'scripts/ci/publish-roster.json' }),
    ]);
  });

  it('projects every declaration-only spine subpath into focused test resolution', () => {
    const rendered = JSON.parse(renderTestPathsTsconfig()) as { compilerOptions: { paths: Record<string, string[]> } };
    expect(rendered.compilerOptions.paths['@liteship/_spine/events']).toEqual([
      './packages/_spine/events.generated.d.ts',
    ]);
    const mutant = structuredClone(rendered);
    delete mutant.compilerOptions.paths['@liteship/_spine/events'];
    expect(JSON.stringify(mutant, null, 2)).not.toBe(renderTestPathsTsconfig());
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
        { path: 'packages/cli/src/internal/audit-package-catalog.generated.ts', text: fleet },
        { path: 'benchmarks/one-install-cost-baseline.json', text: fleet },
        { path: 'tests/fixtures/package-catalog-red/second-roster.ts', text: fleet },
      ]),
    ).toEqual([]);
  });
});

describe('generated audit topology', () => {
  it('projects the one authored default artifact tuple byte-for-byte', () => {
    expect(defaultAnalyzableArtifacts).toEqual(DEFAULT_ANALYZABLE_ARTIFACTS);
  });

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
        analyzableArtifacts: record.audit.analyzableArtifacts,
      });
    }
  });

  it('projects an explicit analyzable artifact contract for every package', () => {
    for (const record of PACKAGE_CATALOG) {
      expect(record.audit.analyzableArtifacts.length, record.name).toBeGreaterThan(0);
    }
    expect(PACKAGE_CATALOG.find((record) => record.name === '@liteship/_spine')?.audit.analyzableArtifacts).toEqual([
      '*.d.ts',
    ]);
  });

  it('keeps create-liteship allowed to import its real @liteship/core scaffold dependency', () => {
    const record = PACKAGE_CATALOG.find((candidate) => candidate.name === 'create-liteship');
    expect(record?.audit).toEqual(
      expect.objectContaining({ kind: 'standalone', allowedInternalImports: ['@liteship/core'] }),
    );
  });
});

describe('workspace project-reference closure', () => {
  it('declares every static workspace import as a TypeScript build edge', () => {
    const truth = projectReferenceTruth();
    expect(validateProjectReferenceClosure(PACKAGE_CATALOG, truth.configs, truth.sources)).toEqual([]);
  });

  it('reds when a real source edge is removed from a package project', () => {
    const truth = projectReferenceTruth();
    const configs = new Map(truth.configs);
    const vite = configs.get('packages/vite')!;
    configs.set('packages/vite', {
      ...vite,
      references: vite.references?.filter((reference) => reference.path !== '../web'),
    });

    expect(validateProjectReferenceClosure(PACKAGE_CATALOG, configs, truth.sources)).toEqual([
      expect.objectContaining({
        copy: 'packages/vite/tsconfig.json',
        packageName: '@liteship/vite',
        dependency: '@liteship/web',
        importers: expect.arrayContaining(['packages/vite/src/hmr.ts']),
      }),
    ]);
  });
});
