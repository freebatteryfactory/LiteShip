/**
 * Supply-chain analyzer (host, @czap/cli) — Slice C, the avionics tier.
 *
 * Pins the heavy host work the lean gauntlet gate refuses to do:
 *  - the pnpm-lock.yaml parser (importers + packages + integrity).
 *  - the lockfile POLICY over the REAL repo lockfile (it MUST pass — the repo is
 *    compliant; the `effect` prerelease is a NAMED exception, not a weakening)
 *    plus BITE proofs: a git-URL dep, a floating (unhashed) unit, and an
 *    unsanctioned prerelease runtime dep each red the policy.
 *  - the deterministic SBOM + its completeness gate (a dropped package fails).
 *  - provenance validation: the capsule's lockfile_address must equal the LIVE
 *    pnpm-lock.yaml address (drift is caught); a malformed source_commit fails.
 *  - the no-ambient-CI-authority scan over the REAL workflows (must pass — OIDC)
 *    plus a BITE proof: a workflow with an NPM_TOKEN fails.
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  AddressedDigest,
  ShipCapsule,
  ContentAddress,
  IntegrityDigest,
  type AddressedDigest as AD,
  type HLC,
} from '@czap/core';
import { parseLockfile } from '../../../packages/cli/src/lib/lockfile.js';
import {
  evaluateLockfilePolicy,
  LITESHIP_LOCKFILE_POLICY,
  type PublishedImporters,
} from '../../../packages/cli/src/lib/supply-chain-policy.js';
import {
  analyzeLockfile,
  buildSbom,
  checkSbomCompleteness,
  validateProvenance,
  scanCiAuthority,
  readWorkflows,
  type WorkspacePkg,
} from '../../../packages/cli/src/lib/supply-chain.js';
import { readWorkspacePackages } from '../../../packages/cli/src/lib/workspace.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const LOCKFILE_PATH = resolve(REPO_ROOT, 'pnpm-lock.yaml');
const lockfileText = readFileSync(LOCKFILE_PATH, 'utf8');
const lockfileBytes = new Uint8Array(readFileSync(LOCKFILE_PATH));

const workspace: readonly WorkspacePkg[] = readWorkspacePackages(REPO_ROOT).map((p) => ({
  name: p.name,
  version: p.version,
  private: p.private,
  importerPath: p.importerPath,
}));

describe('pnpm-lock.yaml parser', () => {
  const parsed = parseLockfile(lockfileText);

  it('reads the lockfile version, importers, and packages', () => {
    expect(parsed.lockfileVersion).toBe('9.0');
    expect(parsed.importers.length).toBeGreaterThan(1);
    expect(parsed.packages.length).toBeGreaterThan(100);
  });

  it('splits scoped + peer-suffixed keys into name + version', () => {
    const scoped = parsed.packages.find((p) => p.name.startsWith('@') && p.version !== '');
    expect(scoped).toBeDefined();
    expect(scoped!.name).toMatch(/^@[^/]+\/.+/);
  });

  it('every real registry unit carries an integrity hash', () => {
    const unhashed = parsed.packages.filter((p) => p.integrity === null && p.resolutionKind === null);
    expect(unhashed).toEqual([]);
  });

  it('fails LOUD (ParseError) on a lockfile with no version', async () => {
    const { hasTag } = await import('@czap/error');
    let caught: unknown;
    try {
      parseLockfile('importers:\n  .:\n');
    } catch (e) {
      caught = e;
    }
    expect(hasTag(caught, 'ParseError')).toBe(true);
  });
});

describe('lockfile policy — REAL repo is compliant', () => {
  it('the real pnpm-lock.yaml passes the LiteShip policy (zero violations)', () => {
    const { facts } = analyzeLockfile(lockfileText, workspace);
    expect(facts.violations, JSON.stringify(facts.violations, null, 2)).toEqual([]);
  });

  it('the effect prerelease is the SINGLE named exception (not a weakened rule)', () => {
    expect(LITESHIP_LOCKFILE_POLICY.prereleaseAllowlist.map((e) => e.dependency)).toEqual(['effect']);
    expect(LITESHIP_LOCKFILE_POLICY.allowNonRegistryResolutions).toBe(false);
  });
});

describe('lockfile policy — BITE proofs', () => {
  const published: PublishedImporters = {
    byPath: new Map(workspace.filter((w) => !w.private).map((w) => [w.importerPath, w.name])),
  };

  it('a git-URL dependency reds the policy', () => {
    const lf = parseLockfile(
      `lockfileVersion: '9.0'\nimporters:\n  .:\npackages:\n  'evil@1.0.0':\n    resolution: {tarball: https://x/y.tgz}\n`,
    );
    const v = evaluateLockfilePolicy(lf, LITESHIP_LOCKFILE_POLICY, published);
    expect(v.some((x) => x.code === 'git-url-dependency')).toBe(true);
  });

  it('a floating (unhashed) unit reds the policy', () => {
    const lf = parseLockfile(
      `lockfileVersion: '9.0'\nimporters:\n  .:\npackages:\n  'loose@1.0.0':\n    resolution: {}\n`,
    );
    const v = evaluateLockfilePolicy(lf, LITESHIP_LOCKFILE_POLICY, published);
    expect(v.some((x) => x.code === 'floating-resolution')).toBe(true);
  });

  it('an unsanctioned prerelease in a PUBLISHED package runtime dep reds the policy', () => {
    const lf = parseLockfile(
      [
        `lockfileVersion: '9.0'`,
        `importers:`,
        `  packages/pub:`,
        `    dependencies:`,
        `      sketchy:`,
        `        specifier: 1.0.0-beta.1`,
        `        version: 1.0.0-beta.1`,
        `packages:`,
        `  'sketchy@1.0.0-beta.1':`,
        `    resolution: {integrity: sha512-abc}`,
        ``,
      ].join('\n'),
    );
    const pub: PublishedImporters = { byPath: new Map([['packages/pub', '@czap/pub']]) };
    const v = evaluateLockfilePolicy(lf, LITESHIP_LOCKFILE_POLICY, pub);
    expect(v.some((x) => x.code === 'prerelease-range')).toBe(true);
  });

  it('an UNRECOGNIZED lockfile version reds the policy (frozen-truth law)', () => {
    const lf = parseLockfile(`lockfileVersion: '6.0'\nimporters:\n  .:\npackages:\n`);
    const v = evaluateLockfilePolicy(lf, LITESHIP_LOCKFILE_POLICY, published);
    expect(v.some((x) => x.code === 'unrecognized-lockfile-version')).toBe(true);
  });
});

describe('SBOM — completeness + determinism', () => {
  const parsed = parseLockfile(lockfileText);

  it('covers EVERY lockfile + workspace package (zero gaps)', () => {
    const { sbom, address } = buildSbom(parsed, workspace);
    const facts = checkSbomCompleteness(sbom, parsed, workspace, address);
    expect(facts.violations, JSON.stringify(facts.violations.slice(0, 5), null, 2)).toEqual([]);
    expect(facts.componentCount).toBe(sbom.components.length);
  });

  it('is deterministic — same input → identical bytes + identical address', () => {
    const a = buildSbom(parsed, workspace);
    const b = buildSbom(parsed, workspace);
    expect(a.serialized).toBe(b.serialized);
    expect(a.address).toBe(b.address);
  });

  it('a dropped package FAILS completeness (bite proof)', () => {
    const { sbom, address } = buildSbom(parsed, workspace);
    const truncated = { ...sbom, components: sbom.components.slice(0, -1) };
    const facts = checkSbomCompleteness(truncated, parsed, workspace, address);
    expect(facts.violations.some((x) => x.code === 'incomplete-sbom')).toBe(true);
  });
});

describe('provenance validation', () => {
  const baseInput = (lockAddr: AD): ShipCapsule.Input => ({
    _kind: 'shipCapsule',
    schema_version: 1,
    package_name: '@czap/x',
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

  it('PASSES when the capsule lockfile_address equals the LIVE pnpm-lock.yaml address', () => {
    const liveAddr = AddressedDigest.of(lockfileBytes);
    const capsule = ShipCapsule.make(baseInput(liveAddr));
    const facts = validateProvenance(capsule, lockfileBytes);
    expect(facts.violations).toEqual([]);
  });

  it('FAILS lockfile-address-drift when the capsule recorded a different address (bite proof)', () => {
    const wrong: AD = {
      display_id: ContentAddress('fnv1a:00000000'),
      integrity_digest: IntegrityDigest('sha256:' + '0'.repeat(64)),
      algo: 'sha256',
    };
    const capsule = ShipCapsule.make(baseInput(wrong));
    const facts = validateProvenance(capsule, lockfileBytes);
    expect(facts.violations.some((x) => x.code === 'lockfile-address-drift')).toBe(true);
  });

  it('FAILS malformed-source-commit on a non-SHA commit', () => {
    const liveAddr = AddressedDigest.of(lockfileBytes);
    const capsule = ShipCapsule.make({ ...baseInput(liveAddr), source_commit: 'HEAD' });
    const facts = validateProvenance(capsule, lockfileBytes);
    expect(facts.violations.some((x) => x.code === 'malformed-source-commit')).toBe(true);
  });
});

describe('no-ambient-CI-authority', () => {
  it('the REAL workflows hold the OIDC invariant (zero ambient publish tokens)', () => {
    const facts = scanCiAuthority(readWorkflows(REPO_ROOT));
    expect(facts.violations, JSON.stringify(facts.violations, null, 2)).toEqual([]);
    expect(facts.workflowsScanned.length).toBeGreaterThan(0);
  });

  it('a self-documenting `# NPM_TOKEN is dead` comment does NOT trip the scan', () => {
    const facts = scanCiAuthority([
      { path: 'wf.yml', text: 'jobs:\n  x:\n    # The NPM_TOKEN secret is dead and no longer read.\n    steps: []\n' },
    ]);
    expect(facts.violations).toEqual([]);
  });

  it('a real NPM_TOKEN reference FAILS the scan (bite proof)', () => {
    const facts = scanCiAuthority([{ path: 'wf.yml', text: 'env:\n  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}\n' }]);
    expect(facts.violations.some((x) => x.code === 'ambient-publish-token')).toBe(true);
  });
});
