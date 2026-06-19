/**
 * Smoke tests for `czap ship`. Lives alongside the other CLI verb tests
 * (doctor, glossary, help, completion, version) so the canonical test
 * layout matches the CLI verb table. Deep behavioral coverage of ship
 * lives in tests/unit/ship-capsule.test.ts and tests/unit/ship-manifest.test.ts;
 * this file just exercises the clean error path and asserts receipt shape.
 */
import { describe, it, expect } from 'vitest';
import { ship, isAlreadyPublishedFailure } from '../../../../packages/cli/src/commands/ship.js';
import { captureCli } from '../../../integration/cli/capture.js';

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
    const event = JSON.parse(line) as { status: string; command: string; error: string; timestamp: string };
    expect(event.status).toBe('failed');
    expect(event.command).toBe('ship');
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
  // Regression: `czap ship --help` (and any unrecognized flag) used to fall
  // through the arg parser to "no --filter → publish EVERY package". A real ship
  // must NEVER start from an unknown flag.
  it('--help prints usage to stdout, exits 0, and does NOT ship', async () => {
    const { exit, stdout, stderr } = await captureCli(() => ship(['--help']));
    expect(exit).toBe(0);
    expect(stdout).toContain('czap ship');
    expect(stdout).toContain('--dry-run');
    // No ship receipt was emitted (the guard returned before any pack/publish).
    expect(stderr).not.toContain('"command":"ship"');
    expect(stdout).not.toContain('"status":"ok"');
  });

  it('-h behaves like --help (usage, exit 0, no ship)', async () => {
    const { exit, stdout } = await captureCli(() => ship(['-h']));
    expect(exit).toBe(0);
    expect(stdout).toContain('czap ship');
  });

  it('refuses an unrecognized flag (exit 1, emitError) instead of shipping', async () => {
    const { exit, stderr } = await captureCli(() => ship(['--hepl']));
    expect(exit).toBe(1);
    const event = JSON.parse(stderr.trim().split('\n').pop()!) as { status: string; command: string; error: string };
    expect(event.status).toBe('failed');
    expect(event.command).toBe('ship');
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
        'npm error 403 Forbidden - PUT https://registry.npmjs.org/@czap/core - You cannot publish over the previously published versions: 0.1.5.',
      ),
    ).toBe(true);
    expect(isAlreadyPublishedFailure('ERR_PNPM_GIT_UNKNOWN cannot publish over existing version')).toBe(true);
    expect(isAlreadyPublishedFailure('npm error code EPUBLISHCONFLICT')).toBe(true);
  });

  it('does NOT swallow real failures (auth, network, validation)', () => {
    expect(isAlreadyPublishedFailure('npm error code E401 - unable to authenticate')).toBe(false);
    expect(isAlreadyPublishedFailure('npm error code ENOTFOUND registry.npmjs.org')).toBe(false);
    expect(isAlreadyPublishedFailure('npm error 404 Not Found - PUT https://registry.npmjs.org/@czap/core')).toBe(
      false,
    );
    expect(isAlreadyPublishedFailure('')).toBe(false);
  });
});
