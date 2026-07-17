/**
 * Handler-level contract tests for gate commands whose bodies live in @czap/command.
 * Subprocess orchestration stays integration-only; these pin pure projection logic.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import {
  plumbCommand,
  checkInvariantsCommand,
  auditFloorCommand,
  packageSmokeCommand,
  type CommandContext,
} from '@czap/command';

describe('plumb command — handler contract', () => {
  it('projects a passing scan to status ok / exit 0', async () => {
    const result = await plumbCommand.handler(
      { name: 'plumb', args: {} },
      {
        cwd: '/repo',
        runPlumb: async () => ({
          ok: true,
          skips: [],
          unclassified: [],
          generatedPresent: true,
          generatedCorpusMessage: null,
        }),
      },
    );
    expect(result.status).toBe('ok');
    // ok() stamps no exitCode — success maps to 0 at the adapter (see registry.ok).
    expect(result.exitCode).toBeUndefined();
    expect((result.payload as { ok: boolean }).ok).toBe(true);
  });

  it('projects a failing scan to status failed / exit 1 with skip work-list', async () => {
    const result = await plumbCommand.handler(
      { name: 'plumb', args: {} },
      {
        cwd: '/repo',
        runPlumb: async () => ({
          ok: false,
          skips: [{ file: 'tests/generated/x.test.ts', kind: 'it.skip', message: 'unwired' }],
          unclassified: ['@czap/mystery'],
          generatedPresent: true,
          generatedCorpusMessage: null,
        }),
      },
    );
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(1);
    const payload = result.payload as { skips: unknown[]; unclassified: string[] };
    expect(payload.skips).toHaveLength(1);
    expect(payload.unclassified).toEqual(['@czap/mystery']);
  });

  it('capability absent → structured capability_unavailable', async () => {
    const result = await plumbCommand.handler({ name: 'plumb', args: {} }, { cwd: '/repo' });
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(2);
    expect((result.payload as { error: string }).error).toBe('capability_unavailable');
  });
});

describe('check-invariants command — handler contract', () => {
  it('projects a clean scan to status ok', async () => {
    const result = await checkInvariantsCommand.handler(
      { name: 'check-invariants', args: {} },
      {
        cwd: '/repo',
        runCheckInvariants: async () => ({ ok: true, groups: [], lineEndings: [] }),
      },
    );
    expect(result.status).toBe('ok');
    expect((result.payload as { ok: boolean }).ok).toBe(true);
  });

  it('projects violations to status failed with grouped findings', async () => {
    const result = await checkInvariantsCommand.handler(
      { name: 'check-invariants', args: {} },
      {
        cwd: '/repo',
        runCheckInvariants: async () => ({
          ok: false,
          groups: [
            {
              name: 'NO_VAR',
              message: 'Use const/let, not var.',
              violations: [{ file: 'packages/x/src/y.ts', line: 3, content: 'var x = 1;' }],
            },
          ],
          lineEndings: ['packages/x/src/z.ts'],
        }),
      },
    );
    expect(result.status).toBe('failed');
    expect((result.payload as { groups: unknown[] }).groups).toHaveLength(1);
  });

  it('capability absent → structured capability_unavailable', async () => {
    const result = await checkInvariantsCommand.handler({ name: 'check-invariants', args: {} }, { cwd: '/repo' });
    expect(result.exitCode).toBe(2);
    expect((result.payload as { error: string }).error).toBe('capability_unavailable');
  });
});

describe('audit-floor command — handler contract', () => {
  it('projects a passing floor diff to status ok', async () => {
    const result = await auditFloorCommand.handler(
      { name: 'audit-floor', args: {} },
      {
        cwd: '/repo',
        runAuditFloor: async () => ({
          ok: true,
          expectedWarnings: 10,
          actualWarnings: 10,
          errorCount: 0,
          delta: { added: [], removed: [] },
          inventory: ['rule@file'],
        }),
      },
    );
    expect(result.status).toBe('ok');
    expect((result.payload as { ok: boolean }).ok).toBe(true);
  });

  it('projects warning drift to status failed', async () => {
    const result = await auditFloorCommand.handler(
      { name: 'audit-floor', args: {} },
      {
        cwd: '/repo',
        runAuditFloor: async () => ({
          ok: false,
          expectedWarnings: 10,
          actualWarnings: 11,
          errorCount: 0,
          delta: { added: ['new@file'], removed: [] },
          inventory: ['new@file'],
        }),
      },
    );
    expect(result.status).toBe('failed');
    expect((result.payload as { delta: { added: string[] } }).delta.added).toEqual(['new@file']);
  });

  it('capability absent → structured capability_unavailable', async () => {
    const ctx: CommandContext = { cwd: '/repo' };
    const result = await auditFloorCommand.handler({ name: 'audit-floor', args: {} }, ctx);
    expect(result.exitCode).toBe(2);
  });
});

describe('package-smoke command — handler contract', () => {
  it('projects a passing smoke to status ok', async () => {
    const result = await packageSmokeCommand.handler(
      { name: 'package-smoke', args: {} },
      {
        cwd: '/repo',
        runPackageSmoke: async () => ({
          ok: true,
          packagesPacked: 12,
          importsSmoked: 48,
          failedStep: null,
          failure: null,
        }),
      },
    );
    expect(result.status).toBe('ok');
    expect((result.payload as { packagesPacked: number }).packagesPacked).toBe(12);
  });

  it('projects first failure step without running subprocess chain in test', async () => {
    const result = await packageSmokeCommand.handler(
      { name: 'package-smoke', args: {} },
      {
        cwd: '/repo',
        runPackageSmoke: async () => ({
          ok: false,
          packagesPacked: 3,
          importsSmoked: 0,
          failedStep: 'pnpm install',
          failure: 'install failed',
        }),
      },
    );
    expect(result.status).toBe('failed');
    expect((result.payload as { failedStep: string | null }).failedStep).toBe('pnpm install');
  });

  it('capability absent → structured capability_unavailable', async () => {
    const result = await packageSmokeCommand.handler({ name: 'package-smoke', args: {} }, { cwd: '/repo' });
    expect(result.exitCode).toBe(2);
  });
});
