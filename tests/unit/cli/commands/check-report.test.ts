/**
 * `liteship check --profile <p>` (the profile SWEEP) — the third `check` surface,
 * distinct from the bare-`check` gauntlet gate fold (a `CheckReceipt`,
 * check-receipt.test.ts) and the `--ir` cross-check (check-ir-wiring.test.ts).
 *
 * Proves the sweep projects `@liteship/command`'s registry into the ordered plan for
 * the profile and runs it through the injected {@link CheckPlanRunner} seam, emitting
 * the executed `CheckReport` (profile/platform/ok/blocked/results) — NOT the legacy
 * gauntlet receipt (status/command/timestamp/findingCount). The real spawn layer is
 * replaced by a scripted runner so no registry check command is actually spawned; the
 * assertions pin the plan projection, the report emission (JSON vs human text), and the
 * blocking exit-code fold. It also pins the boundary: WITHOUT `--profile`, the sweep
 * runner is NEVER touched (bare `check` stays the lean gate fold).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CheckPlan, CheckReport } from '@liteship/command';
import { captureCli } from '../../../integration/cli/capture.js';
import { check } from '../../../../packages/cli/src/commands/check.js';

/** A scripted profile-sweep runner: records the plan/cwd it was handed, returns a fixed report. */
const runCheckPlanMock = vi.fn<(plan: CheckPlan, cwd: string) => CheckReport>();

/** The lean handler seam — injected so the "no --profile" case never runs the real gate fold. */
const handlerMock = vi.fn();
function leanHandlerResult() {
  return {
    status: 'ok' as const,
    command: 'check' as const,
    timestamp: '2026-01-01T00:00:00.000Z',
    exitCode: 0,
    payload: { ok: true, blocked: false, findingCount: 0, findings: [] },
  };
}

beforeEach(() => {
  runCheckPlanMock.mockReset();
  handlerMock.mockReset();
  handlerMock.mockResolvedValue(leanHandlerResult());
});
afterEach(() => vi.restoreAllMocks());

/** Build a clean (all-pass) report echoing the plan it was handed. */
function passingReport(plan: CheckPlan): CheckReport {
  return {
    profile: plan.profile,
    platform: plan.platform,
    ok: true,
    blocked: false,
    results: plan.checks.map((c) => ({ id: c.id, verdict: 'pass', durationMs: 1, cacheHit: false, findings: [] })),
  };
}

describe('liteship check --profile — the profile sweep emits a CheckReport', () => {
  it('--profile quick --json emits a valid CheckReport (profile/platform/ok/blocked/results), NOT the legacy receipt', async () => {
    runCheckPlanMock.mockImplementation((plan) => passingReport(plan));
    const { exit, stdout } = await captureCli(() =>
      check({ profile: 'quick', json: true }, { runCheckPlan: runCheckPlanMock }),
    );
    expect(exit).toBe(0);
    const report = JSON.parse(stdout.trim()) as Record<string, unknown>;
    // The CheckReport contract fields are all present…
    expect(report).toMatchObject({ profile: 'quick', ok: true, blocked: false });
    expect(report['platform']).toBe(
      process.platform === 'darwin' || process.platform === 'win32' ? process.platform : 'linux',
    );
    expect(Array.isArray(report['results'])).toBe(true);
    for (const r of report['results'] as Record<string, unknown>[]) {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('verdict');
      expect(r).toHaveProperty('durationMs');
      expect(r).toHaveProperty('cacheHit');
      expect(r).toHaveProperty('findings');
    }
    // …and NONE of the legacy gauntlet-receipt fields leak into the report.
    for (const legacy of ['status', 'command', 'timestamp', 'findingCount']) {
      expect(report).not.toHaveProperty(legacy);
    }
  });

  it('projects the registry into the plan for the requested profile + current platform and hands it to the runner', async () => {
    runCheckPlanMock.mockImplementation((plan) => passingReport(plan));
    await captureCli(() =>
      check({ profile: 'quick', json: true, cwd: '/repo/root' }, { runCheckPlan: runCheckPlanMock }),
    );
    expect(runCheckPlanMock).toHaveBeenCalledTimes(1);
    const [plan, cwd] = runCheckPlanMock.mock.calls[0]!;
    expect(plan.profile).toBe('quick');
    expect(cwd).toBe('/repo/root');
    // The quick profile is the fast lane: every planned check declares `quick` membership.
    expect(plan.checks.length).toBeGreaterThan(0);
    expect(plan.checks.map((c) => c.id)).toContain('check/typecheck');
  });

  it('a blocked report exits 1; the JSON mirrors the runner verdict', async () => {
    runCheckPlanMock.mockImplementation((plan) => ({
      profile: plan.profile,
      platform: plan.platform,
      ok: false,
      blocked: true,
      results: [
        {
          id: 'check/lint',
          verdict: 'fail',
          durationMs: 5,
          cacheHit: false,
          findings: ['pnpm run lint exited with status 1'],
        },
      ],
    }));
    const { exit, stdout } = await captureCli(() =>
      check({ profile: 'full', json: true }, { runCheckPlan: runCheckPlanMock }),
    );
    expect(exit).toBe(1);
    const report = JSON.parse(stdout.trim()) as CheckReport;
    expect(report.blocked).toBe(true);
    expect(report.ok).toBe(false);
    expect(report.results[0]!.verdict).toBe('fail');
  });

  it('without --json, the sweep prints a human report (per-check verdict + aggregate footer)', async () => {
    runCheckPlanMock.mockImplementation((plan) => ({
      profile: plan.profile,
      platform: plan.platform,
      ok: false,
      blocked: true,
      results: [
        { id: 'check/format', verdict: 'pass', durationMs: 12, cacheHit: false, findings: [] },
        {
          id: 'check/lint',
          verdict: 'fail',
          durationMs: 34,
          cacheHit: false,
          findings: ['pnpm run lint exited with status 1'],
        },
      ],
    }));
    const { exit, stdout } = await captureCli(() => check({ profile: 'quick' }, { runCheckPlan: runCheckPlanMock }));
    expect(exit).toBe(1);
    expect(stdout).toContain('check report — profile "quick"');
    expect(stdout).toContain('PASS  check/format');
    expect(stdout).toContain('FAIL  check/lint');
    expect(stdout).toContain('pnpm run lint exited with status 1');
    expect(stdout).toContain('CHECK BLOCKED');
  });

  it('WITHOUT --profile, the sweep runner is NEVER touched — bare check stays the lean gate fold', async () => {
    const { exit } = await captureCli(() =>
      check({ json: true }, { runCheckPlan: runCheckPlanMock, checkHandler: handlerMock }),
    );
    expect(exit).toBe(0);
    expect(runCheckPlanMock).not.toHaveBeenCalled();
    // The bare-check path ran the lean handler, not the profile sweep.
    expect(handlerMock).toHaveBeenCalledTimes(1);
  });
});
