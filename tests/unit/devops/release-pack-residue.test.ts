/**
 * Release-path smoke (scar S0.5, docs/plan/scar-ledger.md): packed release
 * artifacts carry NO workspace/catalog residue.
 *
 * `catalog:` refs broke a standalone `pnpm pack` (ERR_PNPM_CATALOG_ENTRY_NOT_FOUND
 * outside workspace context); the deeper law is that a *published* tarball must
 * carry zero unresolved `catalog:`/`workspace:` specs — a consumer that
 * `npm install`s it cannot resolve them. `@czap/core@0.1.4` shipped exactly this
 * defect (workspace: leak). The `package-smoke` command already guards
 * `workspace:` residue (`ensureNoWorkspaceProtocolsInTarball`) but NOT `catalog:`
 * residue, and never asserts the resolved ranges MATCH their catalog/workspace
 * source values — the gap this guard fills.
 *
 * For a representative deterministic subset (NOT all 24 — runtime < 60s), pack
 * each package IN-WORKSPACE the way release.yml packs (via the shared owner
 * tests/support/pack.ts, cwd = the package dir so pnpm resolves the specs),
 * extract the packed `package.json`, and assert per dependency:
 *   (1) zero `catalog:` residue,
 *   (2) zero `workspace:` residue,
 *   (3) the resolved value is a valid semver range, and
 *   (4) it equals the resolution its SOURCE spec should produce — `catalog:` →
 *       the pnpm-workspace.yaml catalog value, `workspace:*` → the (lockstep)
 *       workspace version, a plain range → itself unchanged.
 *
 * Source-of-truth values come from the repo-truths single owner (scar S0.4):
 * `catalogEntry()`, `workspaceVersion()`, `packageManifests()` — no private
 * re-parsing of pnpm-workspace.yaml or the manifests here.
 *
 * The pack uses `ignoreScripts: true`: pnpm's manifest transform is byte-identical
 * with or without `prepack`, and this guard reads ONLY the manifest, so skipping
 * the `prepack` `tsc` rebuild keeps the guard fast and deterministic (no dist
 * mutation racing sibling `pnpm test` workers) without weakening the assertion.
 * The load-bearing S0.5 property — in-workspace resolution — is unchanged.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { scaledTimeout } from '../../../vitest.shared.js';
import { packInWorkspace, readPackedManifest, type PackedManifest } from '../../support/pack.js';
import { catalogEntry, workspaceVersion, packageManifests } from '../../support/repo-truths.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');

/** The install-relevant dependency sections (devDependencies are ignored by npm on install). */
type DepSection = 'dependencies' | 'peerDependencies' | 'optionalDependencies';
const INSTALL_SECTIONS: readonly DepSection[] = ['dependencies', 'peerDependencies', 'optionalDependencies'];

/** The unresolved (source) or resolved (packed) dependency sections a manifest carries. */
interface DepSections {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
}

/** Everything {@link residueViolations} needs — fully injected, so the check is pure and IO-free. */
interface ResidueContext {
  readonly packageName: string;
  /** The in-repo manifest (unresolved: still carries `catalog:` / `workspace:*`). */
  readonly source: DepSections;
  /** The packed manifest (pnpm should have resolved every spec). */
  readonly packed: PackedManifest;
  /** The lockstep workspace version (`workspace:*` resolves to this exact string). */
  readonly workspaceVersion: string;
  /** Catalog accessor (an unnamed `catalog:` resolves to the entry keyed by the dep name). */
  readonly catalog: (name: string) => string | undefined;
}

/**
 * A single comparator: an optional operator/caret/tilde, an optional `v`, a
 * partial-or-full version, and optional prerelease/build. A range is one or more
 * comparators joined by whitespace (AND), across `||`-separated disjuncts (OR).
 */
const SEMVER_COMPARATOR = /^(>=|<=|>|<|=|\^|~)?v?\d+(\.\d+)?(\.\d+)?(-[0-9A-Za-z][0-9A-Za-z.-]*)?(\+[0-9A-Za-z.-]+)?$/;

/** True when `range` parses as a semver range in the grammar the catalog/workspace resolutions produce. */
function isSemverRange(range: string): boolean {
  const trimmed = range.trim();
  if (trimmed === '') return false;
  return trimmed.split('||').every((disjunct) => {
    const comparators = disjunct.trim().split(/\s+/).filter((c) => c.length > 0);
    return comparators.length > 0 && comparators.every((c) => SEMVER_COMPARATOR.test(c));
  });
}

/** The range a source spec SHOULD resolve to on the release path (or `undefined` if there is no source counterpart). */
function expectedResolution(
  dep: string,
  sourceRange: string | undefined,
  ctx: Pick<ResidueContext, 'workspaceVersion' | 'catalog'>,
): string | undefined {
  if (sourceRange === undefined) return undefined;
  if (sourceRange === 'catalog:') return ctx.catalog(dep); // unnamed default catalog: keyed by dep name
  if (sourceRange.startsWith('catalog:')) return ctx.catalog(sourceRange.slice('catalog:'.length));
  if (sourceRange.startsWith('workspace:')) {
    const spec = sourceRange.slice('workspace:'.length);
    if (spec === '*') return ctx.workspaceVersion;
    if (spec === '^') return `^${ctx.workspaceVersion}`;
    if (spec === '~') return `~${ctx.workspaceVersion}`;
    return spec; // workspace:<explicit-range>
  }
  return sourceRange; // a plain range passes through unchanged
}

/** Every residue/mismatch violation in `ctx.packed` — empty means the tarball is release-clean. */
function residueViolations(ctx: ResidueContext): string[] {
  const violations: string[] = [];
  for (const section of INSTALL_SECTIONS) {
    const packedSection = ctx.packed[section] ?? {};
    const sourceSection = ctx.source[section] ?? {};
    for (const [dep, packedRange] of Object.entries(packedSection)) {
      const where = `${ctx.packageName} ${section}.${dep}`;
      if (packedRange.startsWith('catalog:')) {
        violations.push(`${where}: unresolved catalog residue "${packedRange}"`);
        continue;
      }
      if (packedRange.startsWith('workspace:')) {
        violations.push(`${where}: unresolved workspace residue "${packedRange}"`);
        continue;
      }
      if (!isSemverRange(packedRange)) {
        violations.push(`${where}: "${packedRange}" is not a valid semver range`);
        continue;
      }
      const expected = expectedResolution(dep, sourceSection[dep], ctx);
      if (expected !== undefined && packedRange !== expected) {
        violations.push(
          `${where}: resolved to "${packedRange}" but the source spec "${sourceSection[dep]}" should resolve to "${expected}"`,
        );
      }
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// The representative set. Deterministic and explicit (reviewable in PR, like
// release.yml's own publish list) rather than derived — but drift-checked below
// so a manifest change that empties the set of catalog:/workspace: specs fails
// loud rather than leaving the guard vacuous. Picked by reading the manifests:
//   - _spine    : ZERO workspace deps (astro/vite plain-range peers) — fast baseline.
//   - quantizer : a leaf (only `liteship` depends on it) with two `workspace:*` deps.
//   - core      : the workspace hub — three `workspace:*` deps + external plain
//                 deps (^ ranges) that must pass through UNCHANGED.
// (Wave 8 shed `effect`, the monorepo's ONLY `catalog:` dep — so no real manifest
//  carries a catalog: spec any more; catalog:-residue detection now lives solely in
//  the synthetic negative control below.)
// ---------------------------------------------------------------------------
const REPRESENTATIVE_DIRS: readonly string[] = ['_spine', 'quantizer', 'core'];

const SOURCE_BY_DIR = new Map(packageManifests().map((manifest) => [manifest.dir, manifest]));

describe('release-pack residue: representative set stays meaningful', () => {
  it('every representative resolves to a real packages/* manifest', () => {
    for (const dir of REPRESENTATIVE_DIRS) {
      expect(SOURCE_BY_DIR.has(dir)).toBe(true);
    }
  });

  it('the set collectively carries at least one workspace: source spec', () => {
    const specs = REPRESENTATIVE_DIRS.flatMap((dir) => {
      const manifest = SOURCE_BY_DIR.get(dir);
      return [
        ...Object.values(manifest?.dependencies ?? {}),
        ...Object.values(manifest?.peerDependencies ?? {}),
      ];
    });
    // Post-Wave-8 no real manifest carries a `catalog:` spec (effect was the only
    // catalog dep); the workspace: residue class is what real packing exercises.
    // catalog:-residue detection stays covered by the synthetic negative control.
    expect(specs.some((spec) => spec.startsWith('workspace:'))).toBe(true);
  });
});

describe('packed release artifacts carry no workspace/catalog residue', () => {
  for (const dir of REPRESENTATIVE_DIRS) {
    it(`packages/${dir}: packed manifest resolves every catalog:/workspace: spec`, async () => {
      const source = SOURCE_BY_DIR.get(dir);
      if (source === undefined) throw new Error(`no source manifest for packages/${dir}`);

      const workDir = mkdtempSync(join(tmpdir(), `czap-pack-residue-${dir}-`));
      try {
        const tgzPath = await packInWorkspace(join(REPO_ROOT, 'packages', dir), workDir, {
          ignoreScripts: true,
        });
        const packed = readPackedManifest(new Uint8Array(readFileSync(tgzPath)));

        const violations = residueViolations({
          packageName: source.name ?? dir,
          source,
          packed,
          workspaceVersion: workspaceVersion(),
          catalog: catalogEntry,
        });
        expect(violations).toEqual([]);
      } finally {
        rmSync(workDir, { recursive: true, force: true });
      }
      // pnpm pack spawns a subprocess (slow on Windows CI); the assertion is
      // residue-freedom, not speed. Headroom over the 10s default.
    }, scaledTimeout(30000));
  }
});

// ---------------------------------------------------------------------------
// Negative control — the guard is not decoration. `residueViolations` is handed
// a CLEAN packed manifest (must report nothing) and then the same manifest
// DOCTORED with each violation class (must report each). This is the scar-S0.5
// red-prove — "hand a doctored manifest with a catalog: left in to the assertion
// helper and watch it red" — made permanent, and it pins that the clean path is
// non-vacuous (a doctored value that were left resolved would fail these).
//
// NOTE: the `effect` name below is SYNTHETIC illustrative fixture data — a
// representative `catalog:` spec. `residueViolations` is name-agnostic, so this
// coverage stands unchanged after effect's real removal (Wave 8); it is the ONLY
// place a `catalog:` spec now appears, since no real manifest carries one.
// ---------------------------------------------------------------------------
describe('residueViolations detects each residue class (negative control)', () => {
  const cleanPacked: PackedManifest = {
    name: '@czap/example',
    version: '0.12.0',
    dependencies: { '@czap/core': '0.12.0', cborg: '^4.2.0' },
    peerDependencies: { effect: '>=4.0.0-beta.32 <5' },
  };
  const source: DepSections = {
    dependencies: { '@czap/core': 'workspace:*', cborg: '^4.2.0' },
    peerDependencies: { effect: 'catalog:' },
  };
  const base = {
    packageName: '@czap/example',
    source,
    workspaceVersion: '0.12.0',
    catalog: (name: string): string | undefined => (name === 'effect' ? '>=4.0.0-beta.32 <5' : undefined),
  };

  it('reports nothing for a fully-resolved packed manifest', () => {
    expect(residueViolations({ ...base, packed: cleanPacked })).toEqual([]);
  });

  it('flags a catalog: spec left unresolved in the packed manifest', () => {
    const doctored: PackedManifest = { ...cleanPacked, peerDependencies: { effect: 'catalog:' } };
    expect(residueViolations({ ...base, packed: doctored })).toContain(
      '@czap/example peerDependencies.effect: unresolved catalog residue "catalog:"',
    );
  });

  it('flags a workspace: spec left unresolved in the packed manifest', () => {
    const doctored: PackedManifest = {
      ...cleanPacked,
      dependencies: { '@czap/core': 'workspace:*', cborg: '^4.2.0' },
    };
    expect(residueViolations({ ...base, packed: doctored })).toContain(
      '@czap/example dependencies.@czap/core: unresolved workspace residue "workspace:*"',
    );
  });

  it('flags a resolved range that does not match its catalog/workspace source', () => {
    const doctored: PackedManifest = {
      ...cleanPacked,
      dependencies: { '@czap/core': '9.9.9', cborg: '^4.2.0' }, // valid semver, WRONG version
    };
    const violations = residueViolations({ ...base, packed: doctored });
    expect(violations.some((v) => v.includes('@czap/core') && v.includes('should resolve to "0.12.0"'))).toBe(true);
  });

  it('flags a resolved value that is not a valid semver range', () => {
    const doctored: PackedManifest = {
      ...cleanPacked,
      dependencies: { '@czap/core': 'not-a-range', cborg: '^4.2.0' },
    };
    const violations = residueViolations({ ...base, packed: doctored });
    expect(violations.some((v) => v.includes('is not a valid semver range'))).toBe(true);
  });
});
