/**
 * Supply-chain HOST library — synthetic-fixture unit tests (Slice C, avionics tier).
 *
 * Companion to `supply-chain.test.ts` (which proves the laws against the REAL
 * repo lockfile/workflows). THIS file is pure synthetic + deterministic: it
 * feeds hand-written pnpm-lock.yaml strings and in-memory dep lists so it can
 * exercise the parser/policy/SBOM/fold branches the real-repo file cannot reach
 * (git resolutions, malformed keys, every CycloneDX hash alg, the absent
 * build-env provenance path, `decodeCapsule`, and the full `analyzeSupplyChain`
 * fold) WITHOUT any dependence on the live tree's contents.
 *
 * THE LAWS pinned here (not implementation churn):
 *  - lockfile parser: total over the pnpm@9 shape, FAILS LOUD on malformed input,
 *    and never silently drops a unit (a missing-specifier version is a ParseError).
 *  - SBOM: deterministic (same input ⇒ byte-identical document + stable address),
 *    workspace beats lockfile on a shared purl, integrity maps to the right
 *    CycloneDX alg or is dropped (never invented).
 *  - policy: a non-registry resolution short-circuits the floating check; law (b)
 *    only bites a PUBLISHED importer's runtime surface.
 *  - provenance: build-env absence is its own violation; decode is a tagged result.
 *  - fold: `analyzeSupplyChain` assembles all four fact families and only emits
 *    `provenance` when a capsule was supplied.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as fc from 'fast-check';
import {
  AddressedDigest,
  ShipCapsule,
  ContentAddress,
  IntegrityDigest,
  type AddressedDigest as AD,
  type HLC,
} from '@liteship/core';
import { parseLockfile, type ParsedLockfile } from '../../../packages/cli/src/lib/lockfile.js';
import {
  evaluateLockfilePolicy,
  LITESHIP_LOCKFILE_POLICY,
  type LockfilePolicy,
  type PublishedImporters,
} from '../../../packages/cli/src/lib/supply-chain-policy.js';
import { generateSbom, serializeSbom, sbomAddress } from '../../../packages/cli/src/lib/sbom.js';
import {
  analyzeLockfile,
  buildSbom,
  checkSbomCompleteness,
  validateProvenance,
  decodeCapsule,
  scanCiAuthority,
  readWorkflows,
  analyzeSupplyChain,
  SBOM_ARTIFACT_PATH,
  type WorkspacePkg,
  type AnalyzeInput,
} from '../../../packages/cli/src/lib/supply-chain.js';

// ── synthetic fixtures (no live-tree reads) ──────────────────────────────────

/** A minimal valid pnpm@9 lockfile with one published importer + two packages. */
const VALID_LOCK = [
  `lockfileVersion: '9.0'`,
  `importers:`,
  `  .:`,
  `    dependencies:`,
  `      left-pad:`,
  `        specifier: ^1.3.0`,
  `        version: 1.3.0`,
  `  packages/cli:`,
  `    dependencies:`,
  `      '@liteship/core':`,
  `        specifier: workspace:*`,
  `        version: link:../core`,
  `    devDependencies:`,
  `      typescript:`,
  `        specifier: ^5.0.0`,
  `        version: 5.0.0`,
  `packages:`,
  `  'left-pad@1.3.0':`,
  `    resolution: {integrity: sha512-leftpadbase64}`,
  `  '@liteship/core@0.4.0':`,
  `    resolution: {integrity: sha256-coreba64}`,
  ``,
].join('\n');

const WORKSPACE: readonly WorkspacePkg[] = [
  { name: '@liteship/cli', version: '0.4.0', private: false, importerPath: 'packages/cli' },
  { name: '@liteship/private-tool', version: '0.4.0', private: true, importerPath: 'packages/private-tool' },
];

// ── lockfile parser ──────────────────────────────────────────────────────────

describe('lockfile parser — synthetic shape coverage', () => {
  it('reads version, importers (with sections), and packages with integrity', () => {
    const lf = parseLockfile(VALID_LOCK);
    expect(lf.lockfileVersion).toBe('9.0');
    const root = lf.importers.find((i) => i.path === '.');
    const cli = lf.importers.find((i) => i.path === 'packages/cli');
    expect(root?.specifiers).toEqual([
      { name: 'left-pad', specifier: '^1.3.0', version: '1.3.0', section: 'dependencies' },
    ]);
    // both a dependencies + a devDependencies edge under one importer.
    expect(cli?.specifiers.map((s) => s.section).sort()).toEqual(['dependencies', 'devDependencies']);
    const leftPad = lf.packages.find((p) => p.name === 'left-pad');
    expect(leftPad).toMatchObject({
      key: 'left-pad@1.3.0',
      version: '1.3.0',
      integrity: 'sha512-leftpadbase64',
      resolutionKind: null,
    });
  });

  it('parses a SCOPED packages-block key into @scope/name + version (the real pnpm@9 shape)', () => {
    // In a real pnpm@9 lockfile the `packages:` block keys are clean
    // `name@version` (peer suffixes live in the unmodeled `snapshots:` block),
    // so the version `@` is correctly the last `@` before a digit run.
    const lf = parseLockfile(
      [
        `lockfileVersion: '9.0'`,
        `importers:`,
        `  .:`,
        `packages:`,
        `  '@scope/pkg@2.5.1':`,
        `    resolution: {integrity: sha512-x}`,
        ``,
      ].join('\n'),
    );
    const p = lf.packages[0];
    expect(p?.name).toBe('@scope/pkg');
    expect(p?.version).toBe('2.5.1');
  });

  it('a key with NO version @ falls back to {name: key, version: ""} (splitKey guard)', () => {
    const lf = parseLockfile(
      [
        `lockfileVersion: '9.0'`,
        `importers:`,
        `  .:`,
        `packages:`,
        `  'bareword:':`,
        `    resolution: {integrity: sha512-x}`,
        ``,
      ].join('\n'),
    );
    const p = lf.packages[0];
    expect(p?.name).toBe('bareword:');
    expect(p?.version).toBe('');
  });

  it('classifies each non-registry resolution kind: tarball / git(commit) / git(repo) / directory', () => {
    const lf = parseLockfile(
      [
        `lockfileVersion: '9.0'`,
        `importers:`,
        `  .:`,
        `packages:`,
        `  'a@1.0.0':`,
        `    resolution: {tarball: https://x/y.tgz}`,
        `  'b@1.0.0':`,
        `    resolution: {commit: abc, repo: git+https://github.com/x/b}`,
        `  'c@1.0.0':`,
        `    resolution: {repo: git+https://github.com/x/c}`,
        `  'd@1.0.0':`,
        `    resolution: {directory: ../local, type: directory}`,
        ``,
      ].join('\n'),
    );
    const kinds = Object.fromEntries(lf.packages.map((p) => [p.name, p.resolutionKind]));
    expect(kinds).toEqual({ a: 'tarball', b: 'git', c: 'git', d: 'directory' });
    // a non-registry resolution carries no integrity.
    expect(lf.packages.every((p) => p.integrity === null)).toBe(true);
  });

  it('a resolution map with no { } yields integrity:null, kind:null (floating unit)', () => {
    const lf = parseLockfile(
      [`lockfileVersion: '9.0'`, `importers:`, `  .:`, `packages:`, `  'loose@1.0.0':`, `    resolution:`, ``].join(
        '\n',
      ),
    );
    expect(lf.packages[0]).toMatchObject({ integrity: null, resolutionKind: null });
  });

  it('FAILS LOUD (ParseError, offset pointed at the line) when a version has no specifier', async () => {
    const { hasTag } = await import('@liteship/error');
    let caught: unknown;
    try {
      parseLockfile(
        [
          `lockfileVersion: '9.0'`,
          `importers:`,
          `  .:`,
          `    dependencies:`,
          `      orphan:`,
          `        version: 1.0.0`,
          ``,
        ].join('\n'),
      );
    } catch (e) {
      caught = e;
    }
    expect(hasTag(caught, 'ParseError')).toBe(true);
  });

  it('FAILS LOUD when no lockfileVersion is present (not a pnpm lockfile)', async () => {
    const { hasTag } = await import('@liteship/error');
    let caught: unknown;
    try {
      parseLockfile('packages:\n  x:\n');
    } catch (e) {
      caught = e;
    }
    expect(hasTag(caught, 'ParseError')).toBe(true);
  });

  it('ignores unmodeled top-level blocks (settings/overrides) without dropping packages', () => {
    const lf = parseLockfile(
      [
        `lockfileVersion: '9.0'`,
        `settings:`,
        `  autoInstallPeers: true`,
        `overrides:`,
        `  foo: 1.0.0`,
        `importers:`,
        `  .:`,
        `packages:`,
        `  'left-pad@1.3.0':`,
        `    resolution: {integrity: sha512-x}`,
        ``,
      ].join('\n'),
    );
    expect(lf.packages.map((p) => p.name)).toEqual(['left-pad']);
    expect(lf.importers.map((i) => i.path)).toEqual(['.']);
  });

  it('handles CRLF line endings + double-quoted scalars', () => {
    const lf = parseLockfile(
      `lockfileVersion: "9.0"\r\nimporters:\r\n  .:\r\npackages:\r\n  "x@1.0.0":\r\n    resolution: {integrity: sha512-x}\r\n`,
    );
    expect(lf.lockfileVersion).toBe('9.0');
    expect(lf.packages[0]?.name).toBe('x');
  });
});

// ── lockfile policy — synthetic bite + short-circuit ─────────────────────────

describe('lockfile policy — synthetic decisions', () => {
  const published: PublishedImporters = { byPath: new Map([['packages/cli', '@liteship/cli']]) };

  it('a clean synthetic lockfile passes (registry + integrity + recognized version)', () => {
    const lf = parseLockfile(VALID_LOCK);
    const v = evaluateLockfilePolicy(lf, LITESHIP_LOCKFILE_POLICY, published);
    expect(v).toEqual([]);
  });

  it('a non-registry resolution reds git-url-dependency AND short-circuits the floating check', () => {
    const lf = parseLockfile(
      [
        `lockfileVersion: '9.0'`,
        `importers:`,
        `  .:`,
        `packages:`,
        `  'g@1.0.0':`,
        `    resolution: {repo: git+https://x/g}`,
        ``,
      ].join('\n'),
    );
    const v = evaluateLockfilePolicy(lf, LITESHIP_LOCKFILE_POLICY, published);
    expect(v.map((x) => x.code)).toEqual(['git-url-dependency']);
    // exactly one violation: floating-resolution did NOT also fire (continue short-circuit).
    expect(v.filter((x) => x.code === 'floating-resolution')).toEqual([]);
  });

  it('allowNonRegistryResolutions:true lets a non-registry unit through (host-injected policy is DATA)', () => {
    const lf = parseLockfile(
      [
        `lockfileVersion: '9.0'`,
        `importers:`,
        `  .:`,
        `packages:`,
        `  'g@1.0.0':`,
        `    resolution: {tarball: https://x/g.tgz}`,
        ``,
      ].join('\n'),
    );
    const permissive: LockfilePolicy = { ...LITESHIP_LOCKFILE_POLICY, allowNonRegistryResolutions: true };
    const v = evaluateLockfilePolicy(lf, permissive, published);
    expect(v).toEqual([]);
  });

  it('law (b) does NOT bite a PRIVATE / unpublished importer (only the consumer surface)', () => {
    const lf = parseLockfile(
      [
        `lockfileVersion: '9.0'`,
        `importers:`,
        `  packages/private-tool:`,
        `    dependencies:`,
        `      sketchy:`,
        `        specifier: 1.0.0-beta.1`,
        `        version: 1.0.0-beta.1`,
        `packages:`,
        `  'sketchy@1.0.0-beta.1':`,
        `    resolution: {integrity: sha512-x}`,
        ``,
      ].join('\n'),
    );
    // private-tool is NOT in `published`, so law (b) is skipped.
    const v = evaluateLockfilePolicy(lf, LITESHIP_LOCKFILE_POLICY, published);
    expect(v.filter((x) => x.code === 'prerelease-range')).toEqual([]);
  });

  it('law (b) skips a workspace: specifier even in a published importer', () => {
    const lf = parseLockfile(
      [
        `lockfileVersion: '9.0'`,
        `importers:`,
        `  packages/cli:`,
        `    dependencies:`,
        `      '@liteship/core':`,
        `        specifier: workspace:*`,
        `        version: link:../core`,
        `packages:`,
        ``,
      ].join('\n'),
    );
    const v = evaluateLockfilePolicy(lf, LITESHIP_LOCKFILE_POLICY, published);
    expect(v).toEqual([]);
  });

  it('the prerelease allowlist MECHANISM permits a named dep; the now-empty default reds', () => {
    // Wave 8 shed `effect` — LiteShip's own allowlist is EMPTY, so an unlisted
    // prerelease reds. The exception mechanism survives for downstream policies:
    // a policy that NAMES the dep still permits it.
    const lf = parseLockfile(
      [
        `lockfileVersion: '9.0'`,
        `importers:`,
        `  packages/cli:`,
        `    dependencies:`,
        `      somelib:`,
        `        specifier: '>=1.0.0-beta.0 <2'`,
        `        version: 1.0.0-beta.0`,
        `packages:`,
        `  'somelib@1.0.0-beta.0':`,
        `    resolution: {integrity: sha512-x}`,
        ``,
      ].join('\n'),
    );
    // Empty default → the prerelease reds.
    const redded = evaluateLockfilePolicy(lf, LITESHIP_LOCKFILE_POLICY, published);
    expect(redded.some((x) => x.code === 'prerelease-range')).toBe(true);

    // A custom policy naming the dep → permitted (the mechanism still works).
    const allowing = {
      ...LITESHIP_LOCKFILE_POLICY,
      prereleaseAllowlist: [{ dependency: 'somelib', reason: 'reviewed downstream seam' }],
    };
    const permitted = evaluateLockfilePolicy(lf, allowing, published);
    expect(permitted.filter((x) => x.code === 'prerelease-range')).toEqual([]);
  });

  it('a non-prerelease range in a published runtime dep is fine (only prerelease forms bite)', () => {
    const lf = parseLockfile(
      [
        `lockfileVersion: '9.0'`,
        `importers:`,
        `  packages/cli:`,
        `    dependencies:`,
        `      ranged:`,
        `        specifier: ^1.0.0`,
        `        version: 1.4.2`,
        `packages:`,
        `  'ranged@1.4.2':`,
        `    resolution: {integrity: sha512-x}`,
        ``,
      ].join('\n'),
    );
    const v = evaluateLockfilePolicy(lf, LITESHIP_LOCKFILE_POLICY, published);
    expect(v.filter((x) => x.code === 'prerelease-range')).toEqual([]);
  });
});

// ── SBOM — every hash alg + dedup + determinism ──────────────────────────────

describe('SBOM — synthetic build coverage', () => {
  it('maps sha512 / sha256 / sha1 integrity to the right CycloneDX alg, drops unknown/dashless', () => {
    const lf: ParsedLockfile = {
      lockfileVersion: '9.0',
      importers: [],
      packages: [
        { key: 'a@1.0.0', name: 'a', version: '1.0.0', integrity: 'sha512-AAA', resolutionKind: null },
        { key: 'b@1.0.0', name: 'b', version: '1.0.0', integrity: 'sha256-BBB', resolutionKind: null },
        { key: 'c@1.0.0', name: 'c', version: '1.0.0', integrity: 'sha1-CCC', resolutionKind: null },
        { key: 'd@1.0.0', name: 'd', version: '1.0.0', integrity: 'md5-DDD', resolutionKind: null },
        { key: 'e@1.0.0', name: 'e', version: '1.0.0', integrity: 'nodash', resolutionKind: null },
        { key: 'f@1.0.0', name: 'f', version: '1.0.0', integrity: null, resolutionKind: 'git' },
      ],
    };
    const sbom = generateSbom(lf, []);
    const byName = Object.fromEntries(sbom.components.map((c) => [c.name, c]));
    expect(byName.a?.hashes).toEqual([{ alg: 'SHA-512', content: 'AAA' }]);
    expect(byName.b?.hashes).toEqual([{ alg: 'SHA-256', content: 'BBB' }]);
    expect(byName.c?.hashes).toEqual([{ alg: 'SHA-1', content: 'CCC' }]);
    // unknown alg, dashless, and null integrity all produce NO hashes (never invented).
    expect(byName.d?.hashes).toBeUndefined();
    expect(byName.e?.hashes).toBeUndefined();
    expect(byName.f?.hashes).toBeUndefined();
    // every external package is a `library` component.
    expect(sbom.components.every((c) => c.type === 'library')).toBe(true);
  });

  it('a leading-dash integrity (`-foo`, dash at index 0) is dropped, not split into an empty alg', () => {
    const lf: ParsedLockfile = {
      lockfileVersion: '9.0',
      importers: [],
      packages: [{ key: 'a@1.0.0', name: 'a', version: '1.0.0', integrity: '-foo', resolutionKind: null }],
    };
    expect(generateSbom(lf, []).components[0]?.hashes).toBeUndefined();
  });

  it('a workspace package is an `application` component and WINS a shared purl over the lockfile', () => {
    const lf: ParsedLockfile = {
      lockfileVersion: '9.0',
      importers: [],
      packages: [
        { key: '@liteship/cli@0.4.0', name: '@liteship/cli', version: '0.4.0', integrity: 'sha512-X', resolutionKind: null },
      ],
    };
    const sbom = generateSbom(lf, [{ name: '@liteship/cli', version: '0.4.0' }]);
    const comp = sbom.components.filter((c) => c.purl === 'pkg:npm/@liteship/cli@0.4.0');
    expect(comp).toHaveLength(1); // deduped by purl
    expect(comp[0]?.type).toBe('application');
    expect(comp[0]?.hashes).toBeUndefined(); // application carries no registry integrity
  });

  it('strips a peer-suffix `(…)` from the purl version slot', () => {
    const lf: ParsedLockfile = {
      lockfileVersion: '9.0',
      importers: [],
      packages: [
        { key: 'a@1.0.0(b@2.0.0)', name: 'a', version: '1.0.0(b@2.0.0)', integrity: 'sha512-X', resolutionKind: null },
      ],
    };
    expect(generateSbom(lf, []).components[0]?.purl).toBe('pkg:npm/a@1.0.0');
  });

  it('components are sorted by purl (deterministic ordering)', () => {
    const lf: ParsedLockfile = {
      lockfileVersion: '9.0',
      importers: [],
      packages: [
        { key: 'zeta@1.0.0', name: 'zeta', version: '1.0.0', integrity: 'sha512-Z', resolutionKind: null },
        { key: 'alpha@1.0.0', name: 'alpha', version: '1.0.0', integrity: 'sha512-A', resolutionKind: null },
        { key: 'mid@1.0.0', name: 'mid', version: '1.0.0', integrity: 'sha512-M', resolutionKind: null },
      ],
    };
    const purls = generateSbom(lf, []).components.map((c) => c.purl);
    expect(purls).toEqual([...purls].sort());
  });

  it('serializeSbom is key-sorted, 2-space, newline-terminated JSON that round-trips', () => {
    const sbom = generateSbom(
      {
        lockfileVersion: '9.0',
        importers: [],
        packages: [{ key: 'a@1.0.0', name: 'a', version: '1.0.0', integrity: 'sha512-X', resolutionKind: null }],
      },
      [],
    );
    const json = serializeSbom(sbom);
    expect(json.endsWith('\n')).toBe(true);
    expect(json.includes('\n  ')).toBe(true); // 2-space indent present
    // keys are sorted: bomFormat < components < specVersion.
    expect(json.indexOf('"bomFormat"')).toBeLessThan(json.indexOf('"specVersion"'));
    expect(JSON.parse(json)).toEqual(JSON.parse(JSON.stringify(sbom)));
  });

  it('the address is a content address of the canonical CBOR (deterministic, stable)', () => {
    const sbom = generateSbom(
      {
        lockfileVersion: '9.0',
        importers: [],
        packages: [{ key: 'a@1.0.0', name: 'a', version: '1.0.0', integrity: 'sha512-X', resolutionKind: null }],
      },
      [],
    );
    expect(sbomAddress(sbom)).toBe(sbomAddress(sbom));
    expect(sbomAddress(sbom)).toMatch(/^fnv1a:[0-9a-f]+$/);
  });

  it('LAW (property): same package set in ANY input order ⇒ byte-identical SBOM + address', () => {
    const pkgArb = fc.record({
      name: fc.constantFrom('alpha', 'beta', 'gamma', 'delta', '@scope/x', '@scope/y'),
      version: fc.constantFrom('1.0.0', '2.3.4', '0.0.1'),
    });
    fc.assert(
      fc.property(
        fc.uniqueArray(pkgArb, { selector: (p) => `${p.name}@${p.version}`, minLength: 1, maxLength: 6 }),
        (pkgs) => {
          const mk = (order: typeof pkgs): ParsedLockfile => ({
            lockfileVersion: '9.0',
            importers: [],
            packages: order.map((p) => ({
              key: `${p.name}@${p.version}`,
              name: p.name,
              version: p.version,
              integrity: 'sha512-X',
              resolutionKind: null,
            })),
          });
          const forward = buildHashable(generateSbom(mk(pkgs), []));
          const reversed = buildHashable(generateSbom(mk([...pkgs].reverse()), []));
          return forward === reversed;
        },
      ),
      { numRuns: 40 },
    );
  });
});

/** Determinism helper: serialized SBOM ⊕ address (the two outputs the gate addresses). */
function buildHashable(sbom: ReturnType<typeof generateSbom>): string {
  return `${serializeSbom(sbom)}::${sbomAddress(sbom)}`;
}

// ── SBOM completeness via the host wrapper ───────────────────────────────────

describe('checkSbomCompleteness — synthetic gaps + phantoms', () => {
  const lf = parseLockfile(VALID_LOCK);

  it('a complete SBOM has zero violations and reports the artifact path', () => {
    const { sbom, address } = buildSbom(lf, WORKSPACE);
    const facts = checkSbomCompleteness(sbom, lf, WORKSPACE, address);
    expect(facts.violations).toEqual([]);
    expect(facts.artifactPath).toBe(SBOM_ARTIFACT_PATH);
    expect(facts.contentAddress).toBe(address);
    expect(facts.componentCount).toBe(sbom.components.length);
  });

  it('a lockfile/workspace unit missing from the SBOM ⇒ incomplete-sbom', () => {
    const { sbom, address } = buildSbom(lf, WORKSPACE);
    const truncated = { ...sbom, components: sbom.components.slice(1) };
    const facts = checkSbomCompleteness(truncated, lf, WORKSPACE, address);
    expect(facts.violations.some((x) => x.code === 'incomplete-sbom')).toBe(true);
  });

  it('an SBOM component backed by no lockfile/workspace unit ⇒ phantom-sbom-component', () => {
    const { sbom, address } = buildSbom(lf, WORKSPACE);
    const phantom = {
      ...sbom,
      components: [
        ...sbom.components,
        { type: 'library' as const, name: 'ghost', version: '9.9.9', purl: 'pkg:npm/ghost@9.9.9' },
      ],
    };
    const facts = checkSbomCompleteness(phantom, lf, WORKSPACE, address);
    expect(facts.violations.some((x) => x.code === 'phantom-sbom-component')).toBe(true);
  });
});

// ── analyzeLockfile wrapper (private importers excluded from `published`) ─────

describe('analyzeLockfile — facts assembly', () => {
  it('builds lockfile facts and excludes private packages from the published set', () => {
    const lock = [
      `lockfileVersion: '9.0'`,
      `importers:`,
      `  packages/private-tool:`,
      `    dependencies:`,
      `      sketchy:`,
      `        specifier: 1.0.0-beta.1`,
      `        version: 1.0.0-beta.1`,
      `packages:`,
      `  'sketchy@1.0.0-beta.1':`,
      `    resolution: {integrity: sha512-x}`,
      ``,
    ].join('\n');
    const { facts } = analyzeLockfile(lock, WORKSPACE);
    // private-tool is private ⇒ not published ⇒ law (b) does not bite.
    expect(facts.lockfileVersion).toBe('9.0');
    expect(facts.packageCount).toBe(1);
    expect(facts.violations.filter((x) => x.code === 'prerelease-range')).toEqual([]);
  });
});

// ── provenance — absent build-env path + decodeCapsule ───────────────────────

const baseInput = (lockAddr: AD): ShipCapsule.Input => ({
  _kind: 'shipCapsule',
  schema_version: 1,
  package_name: '@liteship/x',
  package_version: '0.1.0',
  source_commit: '0123456789abcdef0123456789abcdef01234567',
  source_dirty: false,
  lockfile_address: lockAddr,
  workspace_manifest_address: {
    display_id: ContentAddress('fnv1a:bbbbbbbb'),
    integrity_digest: IntegrityDigest('sha256:' + 'b'.repeat(64)),
    algo: 'sha256',
  },
  tarball_manifest_address: {
    display_id: ContentAddress('fnv1a:cccccccc'),
    integrity_digest: IntegrityDigest('sha256:' + 'c'.repeat(64)),
    algo: 'sha256',
  },
  build_env: { node_version: 'v24.0.0', pnpm_version: '10.32.1', os: 'linux', arch: 'x64' },
  package_manager: 'pnpm',
  package_manager_version: '10.32.1',
  publish_dry_run_address: {
    display_id: ContentAddress('fnv1a:dddddddd'),
    integrity_digest: IntegrityDigest('sha256:' + 'd'.repeat(64)),
    algo: 'sha256',
  },
  lifecycle_scripts_observed: [],
  generated_at: { wall_ms: 1_715_500_000_000, counter: 0, node_id: 'test' } as HLC,
  previous_ship_capsule: null,
});

describe('validateProvenance — absent build-env', () => {
  const liveBytes = new Uint8Array([1, 2, 3, 4]);
  const liveAddr = AddressedDigest.of(liveBytes);

  it('a clean capsule (matching addr, sha commit, full build-env, dirty flag) has zero violations', () => {
    const capsule = ShipCapsule.make(baseInput(liveAddr));
    const facts = validateProvenance(capsule, liveBytes);
    expect(facts.violations).toEqual([]);
    expect(facts.packageName).toBe('@liteship/x');
    expect(facts.sourceCommit).toBe('0123456789abcdef0123456789abcdef01234567');
    expect(facts.sourceDirty).toBe(false);
  });

  it('an empty node_version reds absent-build-env', () => {
    const input = baseInput(liveAddr);
    const capsule = ShipCapsule.make({ ...input, build_env: { ...input.build_env, node_version: '' } });
    const facts = validateProvenance(capsule, liveBytes);
    expect(facts.violations.some((x) => x.code === 'absent-build-env')).toBe(true);
  });

  it('an empty pnpm_version reds absent-build-env', () => {
    const input = baseInput(liveAddr);
    const capsule = ShipCapsule.make({ ...input, build_env: { ...input.build_env, pnpm_version: '' } });
    const facts = validateProvenance(capsule, liveBytes);
    expect(facts.violations.some((x) => x.code === 'absent-build-env')).toBe(true);
  });

  it('reports source_dirty=true verbatim', () => {
    const capsule = ShipCapsule.make({ ...baseInput(liveAddr), source_dirty: true });
    const facts = validateProvenance(capsule, liveBytes);
    expect(facts.sourceDirty).toBe(true);
  });
});

describe('decodeCapsule — tagged round-trip', () => {
  it('decodes canonical bytes back to the capsule (ok:true)', () => {
    const liveAddr = AddressedDigest.of(new Uint8Array([9]));
    const capsule = ShipCapsule.make(baseInput(liveAddr));
    const bytes = ShipCapsule.canonicalize(capsule);
    const result = decodeCapsule(bytes);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.capsule.package_name).toBe('@liteship/x');
  });

  it('returns ok:false with a descriptive error on garbage bytes (never throws)', () => {
    const result = decodeCapsule(new Uint8Array([0xff, 0xff, 0xff, 0xff]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('ShipCapsule.decode failed');
  });
});

// ── CI authority scan — token classes + comment stripping ────────────────────

describe('scanCiAuthority — synthetic token classes', () => {
  it('flags each long-lived publish token class', () => {
    for (const token of ['NPM_TOKEN', 'NODE_AUTH_TOKEN', 'NPM_AUTH_TOKEN', 'npm_config__authToken', '_authToken']) {
      const facts = scanCiAuthority([{ path: 'wf.yml', text: `env:\n  X: ${token}\n` }]);
      expect(
        facts.violations.some((x) => x.code === 'ambient-publish-token'),
        token,
      ).toBe(true);
    }
  });

  it('does NOT flag GITHUB_TOKEN (the runner built-in short-lived token)', () => {
    const facts = scanCiAuthority([{ path: 'wf.yml', text: 'env:\n  GH: ${{ secrets.GITHUB_TOKEN }}\n' }]);
    expect(facts.violations).toEqual([]);
  });

  it('ignores a token mentioned ONLY in a `#` comment, but bites a quoted-`#` code line', () => {
    const commentOnly = scanCiAuthority([{ path: 'wf.yml', text: '    # NPM_TOKEN is dead\n    steps: []\n' }]);
    expect(commentOnly.violations).toEqual([]);
    // a `#` inside a quoted string does not start a comment ⇒ the token still counts.
    const quotedHash = scanCiAuthority([{ path: 'wf.yml', text: `run: echo "NPM_TOKEN # not a comment"\n` }]);
    expect(quotedHash.violations.some((x) => x.code === 'ambient-publish-token')).toBe(true);
  });

  it('reports the workflow:line subject and the scanned-paths list', () => {
    const facts = scanCiAuthority([{ path: 'a.yml', text: 'l1\nl2 NPM_TOKEN\n' }]);
    expect(facts.workflowsScanned).toEqual(['a.yml']);
    expect(facts.violations[0]?.subject).toBe('a.yml:2');
  });

  it('an empty / comment-only line set yields no violations', () => {
    const facts = scanCiAuthority([{ path: 'a.yml', text: '\n   \n# just a header\n' }]);
    expect(facts.violations).toEqual([]);
  });
});

// ── readWorkflows + the full fold over a synthetic repo dir ──────────────────

describe('readWorkflows + analyzeSupplyChain — full fold (synthetic temp repo)', () => {
  it('readWorkflows returns [] when .github/workflows is absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-sc-empty-'));
    try {
      expect(readWorkflows(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('readWorkflows reads only *.yml / *.yaml, sorted, with the repo-relative path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-sc-wf-'));
    try {
      const wfDir = join(dir, '.github', 'workflows');
      mkdirSync(wfDir, { recursive: true });
      writeFileSync(join(wfDir, 'release.yaml'), 'name: release\n');
      writeFileSync(join(wfDir, 'ci.yml'), 'name: ci\n');
      writeFileSync(join(wfDir, 'README.md'), 'ignored\n');
      const wfs = readWorkflows(dir);
      expect(wfs.map((w) => w.path)).toEqual(['.github/workflows/ci.yml', '.github/workflows/release.yaml']);
      expect(wfs[0]?.text).toContain('name: ci');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('analyzeSupplyChain folds lockfile + sbom + ci facts; OMITS provenance with no capsule', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-sc-fold-'));
    try {
      const input: AnalyzeInput = {
        repoRoot: dir, // no .github/workflows ⇒ empty CI scan
        lockfileText: VALID_LOCK,
        liveLockfileBytes: new Uint8Array(Buffer.from(VALID_LOCK, 'utf8')),
        workspace: WORKSPACE,
      };
      const { facts, sbomJson } = analyzeSupplyChain(input);
      expect(facts.lockfile.lockfileVersion).toBe('9.0');
      expect(facts.lockfile.violations).toEqual([]);
      expect(facts.sbom.violations).toEqual([]);
      expect(facts.sbom.artifactPath).toBe(SBOM_ARTIFACT_PATH);
      expect(facts.ci.violations).toEqual([]);
      expect(facts.ci.workflowsScanned).toEqual([]);
      expect(facts.provenance).toBeUndefined(); // no capsule supplied
      expect(sbomJson.endsWith('\n')).toBe(true);
      expect(JSON.parse(sbomJson).bomFormat).toBe('CycloneDX');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('analyzeSupplyChain INCLUDES provenance when a capsule is supplied (and bites address drift)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-sc-prov-'));
    try {
      const liveBytes = new Uint8Array(Buffer.from(VALID_LOCK, 'utf8'));
      // capsule records a DIFFERENT lockfile address ⇒ drift violation.
      const wrong: AD = {
        display_id: ContentAddress('fnv1a:00000000'),
        integrity_digest: IntegrityDigest('sha256:' + '0'.repeat(64)),
        algo: 'sha256',
      };
      const capsule = ShipCapsule.make(baseInput(wrong));
      const input: AnalyzeInput = {
        repoRoot: dir,
        lockfileText: VALID_LOCK,
        liveLockfileBytes: liveBytes,
        workspace: WORKSPACE,
        capsule,
      };
      const { facts } = analyzeSupplyChain(input);
      expect(facts.provenance).toBeDefined();
      expect(facts.provenance?.violations.some((x) => x.code === 'lockfile-address-drift')).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('analyzeSupplyChain honors a host-injected permissive policy (DATA, not code)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-sc-policy-'));
    try {
      const lock = [
        `lockfileVersion: '9.0'`,
        `importers:`,
        `  .:`,
        `packages:`,
        `  'g@1.0.0':`,
        `    resolution: {tarball: https://x/g.tgz}`,
        ``,
      ].join('\n');
      const permissive: LockfilePolicy = { ...LITESHIP_LOCKFILE_POLICY, allowNonRegistryResolutions: true };
      const { facts } = analyzeSupplyChain({
        repoRoot: dir,
        lockfileText: lock,
        liveLockfileBytes: new Uint8Array(Buffer.from(lock, 'utf8')),
        workspace: [],
        policy: permissive,
      });
      expect(facts.lockfile.violations.filter((v) => v.code === 'git-url-dependency')).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
