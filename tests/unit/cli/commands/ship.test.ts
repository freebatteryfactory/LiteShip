/**
 * Smoke tests for `liteship ship`. Lives alongside the other CLI verb tests
 * (doctor, glossary, help, completion, version) so the canonical test
 * layout matches the CLI verb table. Deep behavioral coverage of ship
 * lives in tests/unit/ship-capsule.test.ts and tests/unit/ship-manifest.test.ts;
 * this file just exercises the clean error path and asserts receipt shape.
 */
import { describe, it, expect } from 'vitest';
import {
  ship,
  isAlreadyPublishedFailure,
  buildNpmPublishArgv,
  topoSortByDependencies,
} from '../../../../packages/cli/src/commands/ship.js';
import type { WorkspacePackage } from '@liteship/command';
import { captureCli } from '../../../integration/cli/capture.js';

/** Synthetic workspace package for the topo-sort tests. */
function pkgFixture(name: string, deps: readonly string[]): WorkspacePackage {
  const manifest = { name, version: '0.6.0', dependencies: Object.fromEntries(deps.map((d) => [d, 'workspace:*'])) };
  return {
    absolutePath: `/repo/packages/${name}`,
    relativePath: `packages/${name}`,
    packageJsonBytes: new TextEncoder().encode(JSON.stringify(manifest)),
    packageJson: { name, version: '0.6.0' },
  };
}

describe('ship command (smoke)', () => {
  it('is importable and returns a numeric exit code', async () => {
    expect(typeof ship).toBe('function');
    const { exit } = await captureCli(() => ship(['--filter', 'no-such-package-xyz']));
    expect(typeof exit).toBe('number');
  });

  it('emits an emitError-shaped event on stderr for an unknown --filter', async () => {
    const { exit, stderr } = await captureCli(() => ship(['--filter', 'no-such-package-xyz']));
    expect(exit).toBe(1);
    const line = stderr.trim().split('\n').pop()!;
    const event = JSON.parse(line) as {
      status: string;
      command: string;
      code: string;
      error: string;
      timestamp: string;
    };
    expect(event.status).toBe('failed');
    expect(event.command).toBe('ship');
    expect(event.code).toBe('cli/not-found');
    expect(typeof event.error).toBe('string');
    expect(event.error.length).toBeGreaterThan(0);
    expect(typeof event.timestamp).toBe('string');
  });

  it('emitError event includes the offending filter value in the error message', async () => {
    const { stderr } = await captureCli(() => ship(['--filter', 'no-such-package-xyz']));
    const event = JSON.parse(stderr.trim().split('\n').pop()!) as { error: string };
    expect(event.error).toContain('no-such-package-xyz');
  });
});

describe('ship arg safety (fail-closed: no flag typo can trigger a publish)', () => {
  // Regression: `liteship ship --help` (and any unrecognized flag) used to fall
  // through the arg parser to "no --filter → publish EVERY package". A real ship
  // must NEVER start from an unknown flag.
  it('--help prints usage to stdout, exits 0, and does NOT ship', async () => {
    const { exit, stdout, stderr } = await captureCli(() => ship(['--help']));
    expect(exit).toBe(0);
    expect(stdout).toContain('liteship ship');
    expect(stdout).toContain('--dry-run');
    // No ship receipt was emitted (the guard returned before any pack/publish).
    expect(stderr).not.toContain('"command":"ship"');
    expect(stdout).not.toContain('"status":"ok"');
  });

  it('-h behaves like --help (usage, exit 0, no ship)', async () => {
    const { exit, stdout } = await captureCli(() => ship(['-h']));
    expect(exit).toBe(0);
    expect(stdout).toContain('liteship ship');
  });

  it('refuses an unrecognized flag (exit 1, emitError) instead of shipping', async () => {
    const { exit, stderr } = await captureCli(() => ship(['--hepl']));
    expect(exit).toBe(1);
    const event = JSON.parse(stderr.trim().split('\n').pop()!) as {
      status: string;
      command: string;
      code: string;
      error: string;
    };
    expect(event.status).toBe('failed');
    expect(event.command).toBe('ship');
    expect(event.code).toBe('cli/invalid-argument');
    expect(event.error).toContain('--hepl');
  });

  it('refuses a plausible-but-wrong flag like --all (no accidental publish-everything)', async () => {
    const { exit } = await captureCli(() => ship(['--all']));
    expect(exit).toBe(1);
  });
});

describe('isAlreadyPublishedFailure (ship idempotency contract, ROADMAP §4)', () => {
  // The release workflow used to grep publish output for these signatures
  // and translate them to success; ship now owns the decision, so workflow
  // re-runs after a mid-batch failure need no shell fallback.

  it('recognizes the npm registry conflict shapes for an already-published version', () => {
    expect(
      isAlreadyPublishedFailure(
        'npm error 403 Forbidden - PUT https://registry.npmjs.org/@liteship/core - You cannot publish over the previously published versions: 0.1.5.',
      ),
    ).toBe(true);
    expect(isAlreadyPublishedFailure('ERR_PNPM_GIT_UNKNOWN cannot publish over existing version')).toBe(true);
    expect(isAlreadyPublishedFailure('npm error code EPUBLISHCONFLICT')).toBe(true);
  });

  it('does NOT swallow real failures (auth, network, validation)', () => {
    expect(isAlreadyPublishedFailure('npm error code E401 - unable to authenticate')).toBe(false);
    expect(isAlreadyPublishedFailure('npm error code ENOTFOUND registry.npmjs.org')).toBe(false);
    expect(isAlreadyPublishedFailure('npm error 404 Not Found - PUT https://registry.npmjs.org/@liteship/core')).toBe(
      false,
    );
    expect(isAlreadyPublishedFailure('')).toBe(false);
  });
});

describe('buildNpmPublishArgv (OIDC publish handoff — npm CLI, not pnpm)', () => {
  // The publish handoff uploads the already-packed tarball via the npm CLI so npm's
  // native OIDC trusted-publishing token exchange runs (pnpm publish does not do it —
  // pnpm#11513 — which was the ENEEDAUTH at prior cuts). Pin the argv shape.
  const tgz = '/repo/packages/core/liteship-core-0.6.0.tgz';

  it('publishes the tarball path with public access (no pnpm --filter / -r / --no-git-checks)', () => {
    const argv = buildNpmPublishArgv(tgz, { provenance: false });
    expect(argv).toEqual(['publish', tgz, '--access', 'public']);
    expect(argv).not.toContain('--filter');
    expect(argv).not.toContain('-r');
    expect(argv).not.toContain('--no-git-checks');
  });

  it('adds --provenance for the OIDC/CI path', () => {
    expect(buildNpmPublishArgv(tgz, { provenance: true })).toEqual([
      'publish',
      tgz,
      '--access',
      'public',
      '--provenance',
    ]);
  });

  it('threads an OTP through when supplied (local 2FA publish)', () => {
    expect(buildNpmPublishArgv(tgz, { provenance: false, otp: '123456' })).toEqual([
      'publish',
      tgz,
      '--access',
      'public',
      '--otp',
      '123456',
    ]);
  });
});

describe('topoSortByDependencies (deps publish before dependents)', () => {
  // pnpm -r publish sorted topologically; the per-tarball npm handoff must too, or a
  // no-filter ship could push the liteship umbrella before its same-version deps exist.
  it('orders an in-batch dependency before its dependent even when input is reversed', () => {
    const input = [
      pkgFixture('liteship', ['@liteship/core', '@liteship/astro']),
      pkgFixture('@liteship/astro', ['@liteship/core']),
      pkgFixture('@liteship/core', []),
    ];
    const order = topoSortByDependencies(input).map((t) => t.packageJson.name);
    expect(order.indexOf('@liteship/core')).toBeLessThan(order.indexOf('@liteship/astro'));
    expect(order.indexOf('@liteship/astro')).toBeLessThan(order.indexOf('liteship'));
  });

  it('only orders packages present in the batch (out-of-batch deps like effect are ignored)', () => {
    const order = topoSortByDependencies([pkgFixture('@liteship/core', ['effect'])]).map((t) => t.packageJson.name);
    expect(order).toEqual(['@liteship/core']);
  });

  it('degrades to input order on a dependency cycle instead of looping', () => {
    const input = [pkgFixture('@liteship/a', ['@liteship/b']), pkgFixture('@liteship/b', ['@liteship/a'])];
    const order = topoSortByDependencies(input).map((t) => t.packageJson.name);
    expect(order.sort()).toEqual(['@liteship/a', '@liteship/b']); // both present, no infinite loop
  });
});
