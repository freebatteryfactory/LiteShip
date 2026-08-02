/**
 * API-surface SNAPSHOT + SEMVER gates (Slice C, the avionics tier).
 *
 * Four locks on the public surface. The first three read the generated,
 * committed format-1 root snapshot (`tests/fixtures/api-surface-snapshot.json`);
 * the fourth closes the complete package export-map denominator:
 *
 *  1. DRIFT — regenerate every policy package's live root barrel + diff it
 *     against the committed snapshot. Any added/removed/signature-changed
 *     export FAILS with a precise message, so an accidental public-API change is
 *     impossible to miss and a deliberate one is a reviewed snapshot edit
 *     (`LITESHIP_UPDATE_API_SNAPSHOT=1` regenerates the committed file).
 *
 *  2. SEMVER — classify each drift (added = minor-compatible; removed / signature
 *     changed = breaking) and assert the package version bump satisfies the
 *     host-injected policy. The load-bearing gate is the UNBUMPED-BREAKING-CHANGE
 *     gate: a breaking change with no version bump (vs the snapshot's recorded
 *     version) FAILS. Pre-1.0, a breaking change requires at least a MINOR bump.
 *
 *  3. POLICY — the LiteShip policy is DATA (`api-surface-policy.ts`):
 *     which packages are public + the bump rule are repo-local, host-injectable
 *     CONTRACTS, never baked into a shipped package.
 *
 *  4. CENSUS — classify every raw package `exports` key exactly once as runtime,
 *     host-component, types-only, or denied. Unknown shapes fail closed rather
 *     than being omitted from the denominator.
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { scaledTimeout } from '../../../vitest.shared.js';
import {
  classifyExportMapEntries,
  generatePackageSurface,
  serializeSnapshot,
  diffPackageSurface,
  parseSemver,
  classifyBump,
  bumpSatisfies,
  type ApiSurfaceSnapshot,
  type ExportMapPackageInput,
  type PackageSurface,
  type SurfaceDiff,
} from './api-surface.js';
import {
  LITESHIP_API_SURFACE_POLICY,
  isBreakingClass,
  type ApiSurfacePolicy,
} from '../../fixtures/api-surface-policy.js';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';

const SNAPSHOT_PATH = fileURLToPath(new URL('../../fixtures/api-surface-snapshot.json', import.meta.url));
const PACKAGES_DIR = fileURLToPath(new URL('../../../packages', import.meta.url));

interface WorkspaceRuntimePackage {
  readonly version: string;
  readonly entryFile: string;
}

/**
 * Map every workspace package NAME → its `package.json` version, read once from
 * disk (the source of truth the snapshot records). Built from the actual
 * `packages/*` directories so it can never drift from the real version stamps.
 */
const runtimePackageByName = (): Readonly<Record<string, WorkspaceRuntimePackage>> => {
  const byName: Record<string, WorkspaceRuntimePackage> = {};
  for (const dir of readdirSync(PACKAGES_DIR)) {
    const manifestPath = resolve(PACKAGES_DIR, dir, 'package.json');
    let raw: string;
    try {
      raw = readFileSync(manifestPath, 'utf8');
    } catch {
      continue; // not a package directory (no manifest) — skip
    }
    const manifest = JSON.parse(raw) as {
      name?: string;
      version?: string;
      exports?: { readonly '.'?: { readonly import?: string } };
    };
    if (typeof manifest.name !== 'string' || typeof manifest.version !== 'string') continue;
    const importTarget = manifest.exports?.['.']?.import;
    if (typeof importTarget !== 'string') continue;
    byName[manifest.name] = {
      version: manifest.version,
      entryFile: resolve(dirname(manifestPath), importTarget),
    };
  }
  return byName;
};

/**
 * Import every policy package's root barrel + read its version from disk,
 * building the format-1 LIVE surface snapshot.
 */
async function computeLiveSnapshot(policy: ApiSurfacePolicy): Promise<ApiSurfaceSnapshot> {
  const runtimePackages = runtimePackageByName();
  const packages: Record<string, PackageSurface> = {};
  for (const pkg of policy.publicPackages) {
    const runtimePackage = runtimePackages[pkg];
    if (runtimePackage === undefined) {
      throw new Error(`No importable package.json "." entry found for ${pkg} — cannot record its API surface`);
    }
    const moduleNamespace = (await import(/* @vite-ignore */ pathToFileURL(runtimePackage.entryFile).href)) as Record<
      string,
      unknown
    >;
    packages[pkg] = generatePackageSurface(runtimePackage.version, moduleNamespace);
  }
  return { snapshotFormat: 1, packages };
}

/**
 * Memoize the live snapshot: importing the policy roots is the only slow step, and
 * both the drift gate and the semver gate need the same surface. Computed once
 * per run so neither test pays the import cost twice.
 */
let liveSnapshotPromise: Promise<ApiSurfaceSnapshot> | undefined;
const buildLiveSnapshot = (policy: ApiSurfacePolicy): Promise<ApiSurfaceSnapshot> => {
  liveSnapshotPromise ??= computeLiveSnapshot(policy);
  return liveSnapshotPromise;
};

const readCommittedSnapshot = (): ApiSurfaceSnapshot =>
  JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as ApiSurfaceSnapshot;

function liveExportMapPackages(): readonly ExportMapPackageInput[] {
  return PACKAGE_CATALOG.map((record) => {
    const manifestPath = resolve(PACKAGES_DIR, record.dir.slice('packages/'.length), 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { readonly exports?: unknown };
    if (typeof manifest.exports !== 'object' || manifest.exports === null || Array.isArray(manifest.exports)) {
      throw new Error(`${record.name}: package.json exports must be a subpath map`);
    }
    return {
      packageName: record.name,
      runtimeSurface: record.runtimeSurface,
      exports: manifest.exports as Readonly<Record<string, unknown>>,
    };
  });
}

describe('published export-map census (W1.6 packet 1)', () => {
  test('classifies synthetic runtime, host-component, types-only, and denied routes without omission', () => {
    const entries = classifyExportMapEntries([
      {
        packageName: '@acme/example',
        runtimeSurface: 'module',
        exports: {
          '.': { types: './dist/index.d.ts', import: './dist/index.js' },
          './Widget': './src/Widget.astro',
          './virtual': { types: './virtual.d.ts' },
          './internal': null,
        },
      },
    ]);

    expect(entries).toEqual([
      {
        packageName: '@acme/example',
        subpath: '.',
        surfaceClass: 'runtime',
        target: './dist/index.js',
      },
      {
        packageName: '@acme/example',
        subpath: './Widget',
        surfaceClass: 'host-component',
        target: './src/Widget.astro',
      },
      {
        packageName: '@acme/example',
        subpath: './virtual',
        surfaceClass: 'types-only',
        target: './virtual.d.ts',
      },
      {
        packageName: '@acme/example',
        subpath: './internal',
        surfaceClass: 'denied',
      },
    ]);
  });

  test('the 25-package live export map closes exactly across all 88 keys', () => {
    const packages = liveExportMapPackages();
    const entries = classifyExportMapEntries(packages);
    const expectedIdentities = packages
      .flatMap((pkg) => Object.keys(pkg.exports).map((subpath) => `${pkg.packageName}:${subpath}`))
      .sort();
    const classifiedIdentities = entries.map((entry) => `${entry.packageName}:${entry.subpath}`).sort();
    const counts = Object.fromEntries(
      (['runtime', 'host-component', 'types-only', 'denied'] as const).map((surfaceClass) => [
        surfaceClass,
        entries.filter((entry) => entry.surfaceClass === surfaceClass).length,
      ]),
    );

    expect(entries).toHaveLength(88);
    expect(new Set(classifiedIdentities).size).toBe(entries.length);
    expect(classifiedIdentities).toEqual(expectedIdentities);
    expect(counts).toEqual({ runtime: 78, 'host-component': 2, 'types-only': 7, denied: 1 });
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(entries.length);
  });

  test('special routes retain their manifest-owned identity and classification', () => {
    const entries = classifyExportMapEntries(liveExportMapPackages());
    const byIdentity = new Map(entries.map((entry) => [`${entry.packageName}:${entry.subpath}`, entry]));

    expect(byIdentity.get('@liteship/cloudflare:./cache-provider')).toEqual({
      packageName: '@liteship/cloudflare',
      subpath: './cache-provider',
      surfaceClass: 'runtime',
      target: './cache-provider.mjs',
    });
    expect(byIdentity.get('@liteship/astro:./Adaptive')).toMatchObject({
      surfaceClass: 'host-component',
      target: './src/Adaptive.astro',
    });
    expect(byIdentity.get('@liteship/astro:./Adaptive.astro')).toMatchObject({
      surfaceClass: 'host-component',
      target: './src/Adaptive.astro',
    });
    expect(byIdentity.get('@liteship/vite:./virtual')).toMatchObject({
      surfaceClass: 'types-only',
      target: './virtual.d.ts',
    });
    expect(byIdentity.get('@liteship/core:./validated-output')).toEqual({
      packageName: '@liteship/core',
      subpath: './validated-output',
      surfaceClass: 'denied',
    });

    const spine = entries.filter((entry) => entry.packageName === '@liteship/_spine');
    expect(spine).toHaveLength(6);
    expect(spine.every((entry) => entry.surfaceClass === 'types-only')).toBe(true);
  });

  test('unknown condition shapes and duplicate package identities fail closed', () => {
    expect(() =>
      classifyExportMapEntries([
        {
          packageName: '@acme/unknown',
          runtimeSurface: 'module',
          exports: { '.': { browser: './browser.js' } },
        },
      ]),
    ).toThrow(/unclassified export target/u);

    const duplicate: ExportMapPackageInput = {
      packageName: '@acme/duplicate',
      runtimeSurface: 'module',
      exports: { '.': './index.js' },
    };
    expect(() => classifyExportMapEntries([duplicate, duplicate])).toThrow(/duplicate export-map identity/u);
  });
});

describe('API-surface snapshot gate (drift)', () => {
  test(
    'the committed snapshot matches the live public root surface (regenerate intentionally with LITESHIP_UPDATE_API_SNAPSHOT=1)',
    { timeout: scaledTimeout(60_000) },
    async () => {
      const live = await buildLiveSnapshot(LITESHIP_API_SURFACE_POLICY);
      const serialized = serializeSnapshot(live);

      if (process.env.LITESHIP_UPDATE_API_SNAPSHOT === '1') {
        writeFileSync(SNAPSHOT_PATH, serialized);
      } else {
        const committed = serializeSnapshot(readCommittedSnapshot());

        // Build a per-export drift report so the failure names exactly what changed.
        const committedSnapshot = readCommittedSnapshot();
        const drift: SurfaceDiff[] = [];
        for (const pkg of LITESHIP_API_SURFACE_POLICY.publicPackages) {
          const prior = committedSnapshot.packages[pkg];
          const current = live.packages[pkg]!;
          if (!prior) {
            drift.push({
              pkg,
              changeClass: 'added',
              name: '<package>',
              detail: `package ${pkg} is new to the public surface`,
            });
            continue;
          }
          drift.push(...diffPackageSurface(pkg, prior, current));
        }

        expect(
          serialized === committed,
          drift.length === 0
            ? 'API surface serialization drifted but no per-export diff was found — the snapshot schema or version stamp changed; run LITESHIP_UPDATE_API_SNAPSHOT=1 to regenerate and review.'
            : `Public API surface drifted from the committed snapshot:\n` +
                drift.map((d) => `  • ${d.pkg}: ${d.detail} [${d.changeClass}]`).join('\n') +
                `\n\nIf this change is intentional, regenerate the snapshot ` +
                `(LITESHIP_UPDATE_API_SNAPSHOT=1 npx vitest run tests/unit/meta/api-surface.test.ts) ` +
                `and review the diff. An accidental public-API change must never pass silently.`,
        ).toBe(true);
      }
    },
  );

  test('the committed snapshot is byte-canonical (re-serializing it is a no-op)', () => {
    const committed = readFileSync(SNAPSHOT_PATH, 'utf8');
    const reserialized = serializeSnapshot(readCommittedSnapshot());
    expect(reserialized).toBe(committed);
  });

  test('the committed snapshot covers exactly the policy package set', () => {
    const committed = readCommittedSnapshot();
    const committedPkgs = Object.keys(committed.packages).sort();
    const policyPkgs = [...LITESHIP_API_SURFACE_POLICY.publicPackages].sort();
    expect(committedPkgs).toEqual(policyPkgs);
  });

  // ── BITE PROOF — the drift gate must catch a simulated export removal ────────

  test('BITE: a simulated export removal from the committed snapshot is detected as drift', () => {
    // Take the REAL committed @liteship/core surface and simulate the live build
    // having DROPPED a public export (e.g. `fnv1a`). The diff must report it as a
    // `removed` change — proving the drift gate would fail the build, not pass it.
    const committed = readCommittedSnapshot();
    const corePrior = committed.packages['@liteship/core']!;
    expect(corePrior.exports.some((e) => e.name === 'fnv1a')).toBe(true);

    const liveWithRemoval: PackageSurface = {
      version: corePrior.version,
      exports: corePrior.exports.filter((e) => e.name !== 'fnv1a'),
    };
    const diffs = diffPackageSurface('@liteship/core', corePrior, liveWithRemoval);
    const removal = diffs.find((d) => d.name === 'fnv1a');
    expect(removal).toBeDefined();
    expect(removal?.changeClass).toBe('removed');
    expect(removal?.detail).toMatch(/removed/);
  });
});

describe('API-surface semver gate (unbumped breaking change)', () => {
  /**
   * The load-bearing assertion: GIVEN a prior snapshot surface and a current
   * surface for a package, IF the diff contains a breaking change (a removed or
   * signature-changed export), THEN the current version MUST satisfy the policy's
   * required bump vs the prior version — else FAIL.
   */
  const assertVersionBumpForDiff = (
    pkg: string,
    priorVersion: string,
    currentVersion: string,
    diffs: readonly SurfaceDiff[],
    policy: ApiSurfacePolicy,
  ): { readonly ok: true } | { readonly ok: false; readonly reason: string } => {
    if (diffs.length === 0) return { ok: true };

    // The strongest required bump across all changes in this package.
    let requiredRank = 0;
    let strongestClass: SurfaceDiff['changeClass'] = 'added';
    const rank: Record<'none' | 'patch' | 'minor' | 'major', number> = { none: 0, patch: 1, minor: 2, major: 3 };
    for (const d of diffs) {
      const required = policy.requiredBumpFor(d.changeClass);
      if (rank[required] > requiredRank) {
        requiredRank = rank[required];
        strongestClass = d.changeClass;
      }
    }
    const requiredBump = (['none', 'patch', 'minor', 'major'] as const)[requiredRank]!;

    const prior = parseSemver(priorVersion);
    const current = parseSemver(currentVersion);
    if (!prior || !current) {
      return {
        ok: false,
        reason: `${pkg}: unparseable version (prior="${priorVersion}", current="${currentVersion}")`,
      };
    }
    const observed = classifyBump(prior, current);
    if (observed === undefined) {
      return {
        ok: false,
        reason: `${pkg}: version DOWNGRADE ${priorVersion} → ${currentVersion} while the surface changed — never legal`,
      };
    }
    if (!bumpSatisfies(observed, requiredBump)) {
      const breaking = diffs.filter((d) => isBreakingClass(d.changeClass));
      return {
        ok: false,
        reason:
          `${pkg}: surface changed (strongest class "${strongestClass}", requires a ${requiredBump} bump) but version ` +
          `${priorVersion} → ${currentVersion} is only a "${observed}" bump.` +
          (breaking.length > 0 ? ` BREAKING changes present: ${breaking.map((d) => d.detail).join('; ')}.` : ''),
      };
    }
    return { ok: true };
  };

  test(
    'every public package satisfies the bump policy for its live surface vs the committed snapshot',
    { timeout: scaledTimeout(60_000) },
    async () => {
      const committed = readCommittedSnapshot();
      const live = await buildLiveSnapshot(LITESHIP_API_SURFACE_POLICY);
      const failures: string[] = [];
      for (const pkg of LITESHIP_API_SURFACE_POLICY.publicPackages) {
        const prior = committed.packages[pkg];
        const current = live.packages[pkg]!;
        if (!prior) continue; // a brand-new package has no prior surface to bump against
        const diffs = diffPackageSurface(pkg, prior, current);
        const verdict = assertVersionBumpForDiff(
          pkg,
          prior.version,
          current.version,
          diffs,
          LITESHIP_API_SURFACE_POLICY,
        );
        if (!verdict.ok) failures.push(verdict.reason);
      }
      expect(failures, `Semver policy violations:\n${failures.join('\n')}`).toEqual([]);
    },
  );

  // ── BITE PROOFS — the gates must actually fail on the conditions they guard ──

  test('BITE: a removed export with NO version bump trips the unbumped-breaking-change gate', () => {
    const prior: PackageSurface = {
      version: '0.4.0',
      exports: [
        { name: 'keep', kind: 'function', signature: '(1)' },
        { name: 'gone', kind: 'function', signature: '(0)' },
      ],
    };
    const current: PackageSurface = {
      version: '0.4.0', // UNBUMPED despite removing `gone`
      exports: [{ name: 'keep', kind: 'function', signature: '(1)' }],
    };
    const diffs = diffPackageSurface('@liteship/demo', prior, current);
    expect(diffs.some((d) => d.changeClass === 'removed' && d.name === 'gone')).toBe(true);

    const verdict = assertVersionBumpForDiff(
      '@liteship/demo',
      prior.version,
      current.version,
      diffs,
      LITESHIP_API_SURFACE_POLICY,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/BREAKING changes present/);
  });

  test('BITE: a removed export WITH a minor bump passes (pre-1.0 breaking = minor)', () => {
    const prior: PackageSurface = {
      version: '0.4.0',
      exports: [
        { name: 'keep', kind: 'function', signature: '(1)' },
        { name: 'gone', kind: 'function', signature: '(0)' },
      ],
    };
    const current: PackageSurface = {
      version: '0.5.0', // a minor bump — the pre-1.0 breaking channel
      exports: [{ name: 'keep', kind: 'function', signature: '(1)' }],
    };
    const diffs = diffPackageSurface('@liteship/demo', prior, current);
    const verdict = assertVersionBumpForDiff(
      '@liteship/demo',
      prior.version,
      current.version,
      diffs,
      LITESHIP_API_SURFACE_POLICY,
    );
    expect(verdict.ok).toBe(true);
  });

  test('BITE: a changed signature (arity) is classified breaking and demands a bump', () => {
    const prior: PackageSurface = { version: '0.4.0', exports: [{ name: 'f', kind: 'function', signature: '(1)' }] };
    const current: PackageSurface = { version: '0.4.0', exports: [{ name: 'f', kind: 'function', signature: '(2)' }] };
    const diffs = diffPackageSurface('@liteship/demo', prior, current);
    expect(diffs.some((d) => d.changeClass === 'signature-changed' && d.name === 'f')).toBe(true);
    const verdict = assertVersionBumpForDiff(
      '@liteship/demo',
      prior.version,
      current.version,
      diffs,
      LITESHIP_API_SURFACE_POLICY,
    );
    expect(verdict.ok).toBe(false);
  });

  test('BITE: a removed namespace METHOD surfaces as a signature change (breaking)', () => {
    const prior: PackageSurface = {
      version: '0.4.0',
      exports: [{ name: 'Boundary', kind: 'namespace', signature: 'evaluate:function,make:function' }],
    };
    const current: PackageSurface = {
      version: '0.4.0',
      exports: [{ name: 'Boundary', kind: 'namespace', signature: 'make:function' }], // `evaluate` removed
    };
    const diffs = diffPackageSurface('@liteship/demo', prior, current);
    expect(diffs.some((d) => d.changeClass === 'signature-changed' && d.name === 'Boundary')).toBe(true);
    const verdict = assertVersionBumpForDiff(
      '@liteship/demo',
      prior.version,
      current.version,
      diffs,
      LITESHIP_API_SURFACE_POLICY,
    );
    expect(verdict.ok).toBe(false);
  });

  test('BITE: an added export with NO bump fails too (pre-1.0 a new feature requires at least a minor)', () => {
    const prior: PackageSurface = { version: '0.4.0', exports: [{ name: 'a', kind: 'const' }] };
    const current: PackageSurface = {
      version: '0.4.0',
      exports: [
        { name: 'a', kind: 'const' },
        { name: 'b', kind: 'const' }, // added, unbumped
      ],
    };
    const diffs = diffPackageSurface('@liteship/demo', prior, current);
    expect(diffs.some((d) => d.changeClass === 'added' && d.name === 'b')).toBe(true);
    const verdict = assertVersionBumpForDiff(
      '@liteship/demo',
      prior.version,
      current.version,
      diffs,
      LITESHIP_API_SURFACE_POLICY,
    );
    expect(verdict.ok).toBe(false);
  });

  test('BITE: a version DOWNGRADE on a changed surface is always rejected', () => {
    const prior: PackageSurface = { version: '0.5.0', exports: [{ name: 'a', kind: 'const' }] };
    const current: PackageSurface = {
      version: '0.4.0', // downgrade
      exports: [
        { name: 'a', kind: 'const' },
        { name: 'b', kind: 'const' },
      ],
    };
    const diffs = diffPackageSurface('@liteship/demo', prior, current);
    const verdict = assertVersionBumpForDiff(
      '@liteship/demo',
      prior.version,
      current.version,
      diffs,
      LITESHIP_API_SURFACE_POLICY,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/DOWNGRADE/);
  });
});
