/** Fail-closed source-owner laws for package catalog projections and semantic campaigns. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PACKAGE_CATALOG, type PackageCatalogRecord } from '../../scripts/package-catalog.js';
import { resolvePackageSourceEntrypoints } from '../../scripts/lib/package-source-entrypoints.js';

function record(overrides: Partial<PackageCatalogRecord> = {}): PackageCatalogRecord {
  return {
    ...PACKAGE_CATALOG[0]!,
    name: '@acme/example',
    dir: 'packages/example',
    sourceEntry: 'packages/example/src/index.ts',
    publicSubpaths: ['.'],
    sourceEntryOverrides: undefined,
    ...overrides,
  };
}

function exists(paths: readonly string[]) {
  const admitted = new Set(paths);
  return (path: string): boolean => admitted.has(path);
}

const segmentArbitrary = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 10 })
  .map((characters) => characters.join(''));

describe('package source-entrypoint owner laws', () => {
  it('requires the authored root source entry and returns a frozen exact projection', () => {
    const owner = record();
    const projection = resolvePackageSourceEntrypoints(owner, '.', exists([owner.sourceEntry]));
    expect(projection).toEqual({ '.': 'packages/example/src/index.ts' });
    expect(Object.isFrozen(projection)).toBe(true);
  });

  it('resolves a conventional leaf module when exactly one candidate exists', () => {
    const owner = record({ publicSubpaths: ['.', './testing'] });
    const projection = resolvePackageSourceEntrypoints(
      owner,
      '.',
      exists(['packages/example/src/index.ts', 'packages/example/src/testing.ts']),
    );
    expect(projection).toEqual({
      '.': 'packages/example/src/index.ts',
      './testing': 'packages/example/src/testing.ts',
    });
  });

  it('resolves a conventional directory index when the leaf module is absent', () => {
    const owner = record({ publicSubpaths: ['.', './host'] });
    const projection = resolvePackageSourceEntrypoints(
      owner,
      '.',
      exists(['packages/example/src/index.ts', 'packages/example/src/host/index.ts']),
    );
    expect(projection['./host']).toBe('packages/example/src/host/index.ts');
  });

  it('refuses an ambiguous conventional owner instead of choosing by candidate order', () => {
    const owner = record({ publicSubpaths: ['.', './host'] });
    expect(() =>
      resolvePackageSourceEntrypoints(
        owner,
        '.',
        exists(['packages/example/src/index.ts', 'packages/example/src/host.ts', 'packages/example/src/host/index.ts']),
      ),
    ).toThrow(
      /@acme\/example:\.\/host: expected exactly one source entrypoint, found 2 .*host\.ts, packages\/example\/src\/host\/index\.ts/u,
    );
  });

  it('refuses a missing root owner with the attempted source path', () => {
    const owner = record();
    expect(() => resolvePackageSourceEntrypoints(owner, '.', exists([]))).toThrow(
      /@acme\/example:\.: expected exactly one source entrypoint, found 0 .*packages\/example\/src\/index\.ts/u,
    );
  });

  it('refuses a missing subpath owner with both conventional candidates', () => {
    const owner = record({ publicSubpaths: ['.', './runtime'] });
    expect(() => resolvePackageSourceEntrypoints(owner, '.', exists(['packages/example/src/index.ts']))).toThrow(
      /@acme\/example:\.\/runtime: expected exactly one source entrypoint, found 0 .*runtime\.ts, packages\/example\/src\/runtime\/index\.ts/u,
    );
  });

  it('treats an explicit override as the sole authority even when convention files also exist', () => {
    const owner = record({
      publicSubpaths: ['.', './runtime'],
      sourceEntryOverrides: { './runtime': 'packages/example/src/special/runtime-owner.ts' },
    });
    const projection = resolvePackageSourceEntrypoints(
      owner,
      '.',
      exists([
        'packages/example/src/index.ts',
        'packages/example/src/runtime.ts',
        'packages/example/src/runtime/index.ts',
        'packages/example/src/special/runtime-owner.ts',
      ]),
    );
    expect(projection['./runtime']).toBe('packages/example/src/special/runtime-owner.ts');
  });

  it('refuses a dangling explicit override instead of falling back to convention', () => {
    const owner = record({
      publicSubpaths: ['.', './runtime'],
      sourceEntryOverrides: { './runtime': 'packages/example/src/special/missing.ts' },
    });
    expect(() =>
      resolvePackageSourceEntrypoints(
        owner,
        '.',
        exists(['packages/example/src/index.ts', 'packages/example/src/runtime.ts']),
      ),
    ).toThrow(/candidates: packages\/example\/src\/special\/missing\.ts/u);
  });

  it('preserves catalog subpath order while resolving every owner independently', () => {
    const owner = record({ publicSubpaths: ['.', './zeta', './alpha'] });
    const projection = resolvePackageSourceEntrypoints(
      owner,
      '.',
      exists(['packages/example/src/index.ts', 'packages/example/src/zeta.ts', 'packages/example/src/alpha.ts']),
    );
    expect(Object.keys(projection)).toEqual(['.', './zeta', './alpha']);
  });

  it('maps arbitrary valid leaf subpaths without inventing a second catalog', () => {
    fc.assert(
      fc.property(fc.uniqueArray(segmentArbitrary, { minLength: 1, maxLength: 12 }), (segments) => {
        const publicSubpaths = ['.', ...segments.map((segment) => `./${segment}`)] as readonly string[];
        const paths = [
          'packages/example/src/index.ts',
          ...segments.map((segment) => `packages/example/src/${segment}.ts`),
        ];
        const projection = resolvePackageSourceEntrypoints(record({ publicSubpaths }), '.', exists(paths));
        expect(Object.keys(projection)).toEqual(publicSubpaths);
        for (const segment of segments) {
          expect(projection[`./${segment}`]).toBe(`packages/example/src/${segment}.ts`);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('is deterministic under unrelated filesystem noise', () => {
    fc.assert(
      fc.property(fc.array(segmentArbitrary, { maxLength: 30 }), (noise) => {
        const owner = record({ publicSubpaths: ['.', './testing'] });
        const required = ['packages/example/src/index.ts', 'packages/example/src/testing.ts'];
        const noisy = [...required, ...noise.map((segment) => `unrelated/${segment}.ts`)];
        expect(resolvePackageSourceEntrypoints(owner, '.', exists(noisy))).toEqual(
          resolvePackageSourceEntrypoints(owner, '.', exists(required)),
        );
      }),
      { numRuns: 100 },
    );
  });
});
