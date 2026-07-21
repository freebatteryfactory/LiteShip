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
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CheckPlan, CheckReport } from '@liteship/command';
import { captureCli } from '../../../integration/cli/capture.js';
import { check, invokedScriptName, readDefinedScripts } from '../../../../packages/cli/src/commands/check.js';

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

describe('liteship check --profile consumer — consumer-app honesty (REAL spawn layer)', () => {
  // These exercise the DEFAULT runCheckPlanBySpawn (no injected runner seam). The
  // consumer profile projects only monorepo-root scripts (`package:smoke`,
  // `test:journey`); a scaffolded LiteShip app defines none of them. The sweep must
  // therefore SKIP those checks (honest, non-blocking) rather than spawn a guaranteed
  // ERR_PNPM_NO_SCRIPT failure. Because every consumer check skips, NOTHING is spawned
  // here — the assertion is fast and non-flaky.
  it('skips (does not fail/block) every check whose script is absent in a scaffold-shaped package.json', async () => {
    const app = mkdtempSync(join(tmpdir(), 'liteship-consumer-'));
    try {
      // A scaffold-shaped app: dev/build/preview only — none of the monorepo-root checks.
      writeFileSync(
        join(app, 'package.json'),
        JSON.stringify({ name: 'liteship-app', scripts: { dev: 'astro dev', build: 'astro build' } }),
      );
      const { exit, stdout } = await captureCli(() => check({ profile: 'consumer', json: true, cwd: app }));
      expect(exit).toBe(0);
      const report = JSON.parse(stdout.trim()) as CheckReport;
      expect(report.profile).toBe('consumer');
      expect(report.ok).toBe(true);
      expect(report.blocked).toBe(false);
      expect(report.results.length).toBeGreaterThan(0);
      // Every projected consumer check skipped (its script is not in this package.json).
      for (const r of report.results) {
        expect(r.verdict).toBe('skipped');
        expect(r.durationMs).toBe(0);
        expect(r.findings.join(' ')).toContain('script in this package.json');
      }
    } finally {
      rmSync(app, { recursive: true, force: true });
    }
  });
});

describe('check-sweep skip predicate — invokedScriptName / readDefinedScripts (pure)', () => {
  it('invokedScriptName extracts the script from `pnpm run <script>` and the `pnpm test` shorthand', () => {
    expect(invokedScriptName('pnpm run package:smoke')).toBe('package:smoke');
    expect(invokedScriptName('pnpm run test:journey')).toBe('test:journey');
    expect(invokedScriptName('pnpm run lint')).toBe('lint');
    expect(invokedScriptName('pnpm test')).toBe('test');
    expect(invokedScriptName('pnpm test -- --filter x')).toBe('test');
    // A command that names no single script → null (the sweep runs it as-is, never skips).
    expect(invokedScriptName('node scripts/thing.mjs')).toBeNull();
    expect(invokedScriptName('pnpm exec astro build')).toBeNull();
  });

  it('readDefinedScripts returns the script name set, or null for an unreadable/absent manifest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-scripts-'));
    try {
      // No package.json yet → null (cannot prove a script is absent, so the sweep must NOT skip).
      expect(readDefinedScripts(dir)).toBeNull();
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'x', build: 'y' } }));
      const scripts = readDefinedScripts(dir);
      expect(scripts).not.toBeNull();
      expect([...scripts!].sort()).toEqual(['build', 'dev']);
      expect(scripts!.has('package:smoke')).toBe(false);
      // A malformed manifest is also null (not evidence a script is absent).
      writeFileSync(join(dir, 'package.json'), '{ not json');
      expect(readDefinedScripts(dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
