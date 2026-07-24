/**
 * `liteship check [--profile <p>]` — the profile sweep and default quick surface,
 * distinct from `check gates` (a `CheckReceipt`, check-receipt.test.ts) and
 * `check gates --ir` (check-ir-wiring.test.ts).
 *
 * Proves the sweep projects `@liteship/command`'s registry into the ordered plan for
 * the profile and runs it through the injected {@link CheckPlanRunner} seam, emitting
 * the executed `CheckReport` (profile/platform/ok/blocked/results) — NOT the legacy
 * gauntlet receipt (status/command/timestamp/findingCount). The real spawn layer is
 * replaced by a scripted runner so no registry check command is actually spawned; the
 * assertions pin the plan projection, the report emission (JSON vs human text), and the
 * blocking exit-code fold. It also pins that bare `check` selects quick while the
 * explicit `check gates` subcommand never touches the profile runner.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IntegrityDigest } from '@liteship/core';
import { CHECK_REGISTRY, createCurePacket, type CheckPlan, type CheckReport } from '@liteship/command';
import { captureCli } from '../../../integration/cli/capture.js';
import {
  check,
  createCheckPlanRunner,
  detectCheckContext,
  invokedScriptName,
  readDefinedScripts,
} from '../../../../packages/cli/src/commands/check.js';
import { run as runDispatch } from '../../../../packages/cli/src/dispatch.js';

/** A scripted profile-sweep runner: records the plan/cwd it was handed, returns a fixed report. */
const runCheckPlanMock = vi.fn<(plan: CheckPlan, cwd: string) => CheckReport>();

/** The lean handler seam — injected so the "no --profile" case never runs the real gate fold. */
const handlerMock = vi.fn();
function leanHandlerResult() {
  return {
    status: 'ok' as const,
    command: 'check.gates' as const,
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
    context: plan.context,
    ok: true,
    blocked: false,
    results: plan.checks.map((c) => ({ id: c.id, verdict: 'pass', durationMs: 1, cacheHit: false, findings: [] })),
    curePackets: [],
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
    expect(report).toMatchObject({ profile: 'quick', context: 'repository', ok: true, blocked: false });
    expect(report['platform']).toBe(
      process.platform === 'darwin' || process.platform === 'win32' ? process.platform : 'linux',
    );
    expect(Array.isArray(report['results'])).toBe(true);
    expect(report['curePackets']).toEqual([]);
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
      check({ profile: 'quick', json: true, cwd: process.cwd() }, { runCheckPlan: runCheckPlanMock }),
    );
    expect(runCheckPlanMock).toHaveBeenCalledTimes(1);
    const [plan, cwd] = runCheckPlanMock.mock.calls[0]!;
    expect(plan.profile).toBe('quick');
    expect(cwd).toBe(process.cwd());
    // The quick profile is the fast lane: every planned check declares `quick` membership.
    expect(plan.checks.length).toBeGreaterThan(0);
    expect(plan.checks.map((c) => c.id)).toContain('check/typecheck');
  });

  it('bare check in a LiteShip app projects the real application build authority', async () => {
    const app = mkdtempSync(join(tmpdir(), 'liteship-app-quick-'));
    try {
      writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'app' }));
      writeFileSync(join(app, 'liteship.config.ts'), 'export default {};\n');
      runCheckPlanMock.mockImplementation((plan) => passingReport(plan));
      const { exit } = await captureCli(() => check({ cwd: app, json: true }, { runCheckPlan: runCheckPlanMock }));
      expect(exit).toBe(0);
      const plan = runCheckPlanMock.mock.calls[0]![0];
      expect(plan).toMatchObject({ profile: 'quick', context: 'application' });
      expect(plan.checks.map((entry) => entry.id)).toEqual(['check/app-build']);
      expect(plan.checks[0]).toMatchObject({
        command: 'liteship build',
        execution: { kind: 'cli-command', argv: ['build'] },
        cacheable: false,
      });
    } finally {
      rmSync(app, { recursive: true, force: true });
    }
  });

  it('a blocked report exits 1; the JSON mirrors the runner verdict', async () => {
    runCheckPlanMock.mockImplementation((plan) => ({
      profile: plan.profile,
      platform: plan.platform,
      context: plan.context,
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
      curePackets: [],
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
      context: plan.context,
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
      curePackets: [],
    }));
    const { exit, stdout } = await captureCli(() => check({ profile: 'quick' }, { runCheckPlan: runCheckPlanMock }));
    expect(exit).toBe(1);
    expect(stdout).toContain('check report — profile "quick"');
    expect(stdout).toContain('PASS  check/format');
    expect(stdout).toContain('FAIL  check/lint');
    expect(stdout).toContain('pnpm run lint exited with status 1');
    expect(stdout).toContain('CHECK BLOCKED');
  });

  it('--cure emits only deterministic failure prompts and preserves the failing exit code', async () => {
    runCheckPlanMock.mockImplementation((plan) => {
      const packet = createCurePacket({
        headSha: 'test-head',
        treeDigest: IntegrityDigest(`sha256:${'a'.repeat(64)}`),
        checkId: 'check/probe',
        title: 'Probe',
        claim: 'The probe passes.',
        owner: 'probe.js',
        remediation: 'Repair the probe.',
        command: 'pnpm run probe',
        findings: ['planted failure'],
        profile: plan.profile,
        lane: `profile:${plan.profile}`,
        platform: plan.platform,
        toolchain: 'test',
      });
      return {
        profile: plan.profile,
        platform: plan.platform,
        context: plan.context,
        ok: false,
        blocked: true,
        results: [
          {
            id: 'check/probe',
            verdict: 'fail',
            durationMs: 1,
            cacheHit: false,
            findings: ['planted failure'],
            curePacketId: packet.packetId,
          },
        ],
        curePackets: [packet],
      };
    });

    const { exit, stdout } = await captureCli(() =>
      check({ profile: 'quick', cure: true }, { runCheckPlan: runCheckPlanMock }),
    );

    expect(exit).toBe(1);
    expect(stdout).toContain('# LiteShip cure packet sha256:');
    expect(stdout).toContain('Authority: check/probe (quick/');
    expect(stdout).toContain('planted failure');
    expect(stdout).not.toContain('check report —');
  });

  it('rejects ambiguous cure output combinations', async () => {
    const direct = await captureCli(() => check({ cure: true, json: true }, { runCheckPlan: runCheckPlanMock }));
    expect(direct.exit).toBe(1);
    expect(direct.stderr).toContain('--cure is a profile output mode');

    const dispatch = await captureCli(() => runDispatch(['check', '--cure', '--plan']));
    expect(dispatch.exit).toBe(1);
    expect(dispatch.stderr).toContain('--cure cannot be combined');
  });

  it('WITHOUT --profile, bare check runs the quick profile sweep', async () => {
    runCheckPlanMock.mockImplementation((plan) => passingReport(plan));
    const { exit } = await captureCli(() =>
      check({ json: true }, { runCheckPlan: runCheckPlanMock, checkHandler: handlerMock }),
    );
    expect(exit).toBe(0);
    expect(runCheckPlanMock).toHaveBeenCalledTimes(1);
    expect(runCheckPlanMock.mock.calls[0]![0].profile).toBe('quick');
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it('the explicit gates mode retains the lean in-process fold', async () => {
    const { exit } = await captureCli(() =>
      check({ gates: true, json: true }, { runCheckPlan: runCheckPlanMock, checkHandler: handlerMock }),
    );
    expect(exit).toBe(0);
    expect(runCheckPlanMock).not.toHaveBeenCalled();
    expect(handlerMock).toHaveBeenCalledTimes(1);
  });
});

describe('check dispatch grammar', () => {
  it('projects root `pnpm check` to the CLI quick profile without a recursive registry command', () => {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(manifest.scripts.check).toBe('pnpm exec tsx packages/cli/src/bin.ts check');
    expect(CHECK_REGISTRY.some((entry) => entry.command === 'pnpm run check')).toBe(false);
  });

  it('routes bare check to quick and check gates to the lean fold', async () => {
    runCheckPlanMock.mockImplementation((plan) => passingReport(plan));
    const bare = await captureCli(() => runDispatch(['check', '--json'], { runCheckPlan: runCheckPlanMock }));
    expect(bare.exit).toBe(0);
    expect(runCheckPlanMock.mock.calls[0]![0].profile).toBe('quick');

    const gates = await captureCli(() =>
      runDispatch(['check', 'gates', '--json'], { checkHandler: handlerMock, runCheckPlan: runCheckPlanMock }),
    );
    expect(gates.exit).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    expect(runCheckPlanMock).toHaveBeenCalledTimes(1);
  });

  it('rejects gate-only flags outside `check gates` and rejects mixed gate/profile mode', async () => {
    const missingMode = await captureCli(() =>
      runDispatch(['check', '--ir', '--json'], { checkHandler: handlerMock, runCheckPlan: runCheckPlanMock }),
    );
    expect(missingMode.exit).toBe(1);
    expect(missingMode.stderr).toContain('require the explicit `check gates`');

    const mixed = await captureCli(() =>
      runDispatch(['check', 'gates', '--profile', 'quick'], {
        checkHandler: handlerMock,
        runCheckPlan: runCheckPlanMock,
      }),
    );
    expect(mixed.exit).toBe(1);
    expect(mixed.stderr).toContain('cannot be combined');
    expect(handlerMock).not.toHaveBeenCalled();
    expect(runCheckPlanMock).not.toHaveBeenCalled();
  });
});

describe('liteship check --profile consumer — consumer-app honesty (REAL spawn layer)', () => {
  // These exercise the DEFAULT runCheckPlanBySpawn (no injected runner seam). The
  // consumer profile projects only monorepo-root scripts (`package:smoke`,
  // `test:journey`); a scaffolded LiteShip app defines none of them. The sweep must
  // therefore SKIP those checks (honest, non-blocking) rather than spawn a guaranteed
  // ERR_PNPM_NO_SCRIPT failure. Because every consumer check skips, NOTHING is spawned
  // here — the assertion is fast and non-flaky.
  it('is non-green/non-applicable when the repository-only consumer proof is invoked in an app', async () => {
    const app = mkdtempSync(join(tmpdir(), 'liteship-consumer-'));
    try {
      // A scaffold-shaped app: dev/build/preview only — none of the monorepo-root checks.
      writeFileSync(
        join(app, 'package.json'),
        JSON.stringify({ name: 'liteship-app', scripts: { dev: 'astro dev', build: 'astro build' } }),
      );
      writeFileSync(join(app, 'liteship.config.ts'), 'export default {};\n');
      const { exit, stdout } = await captureCli(() => check({ profile: 'consumer', json: true, cwd: app }));
      expect(exit).toBe(1);
      const report = JSON.parse(stdout.trim()) as CheckReport;
      expect(report.profile).toBe('consumer');
      expect(report.context).toBe('application');
      expect(report.ok).toBe(false);
      expect(report.blocked).toBe(false);
      expect(report.results.length).toBeGreaterThan(0);
      expect(report.results.every((result) => result.verdict === 'skipped')).toBe(true);
      expect(report.results.map((result) => result.findings.join(' ')).join(' ')).toContain('application context');
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
      // A malformed present manifest is a hard error, never absence.
      writeFileSync(join(dir, 'package.json'), '{ not json');
      expect(() => readDefinedScripts(dir)).toThrow(/package\.json/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('check profile cache and diagnostic execution', () => {
  function oneCheckPlan(root: string, overrides: Partial<CheckPlan['checks'][number]> = {}): CheckPlan {
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { probe: 'node probe.js' } }));
    return {
      profile: 'quick',
      platform: process.platform === 'darwin' || process.platform === 'win32' ? process.platform : 'linux',
      context: 'repository',
      estimatedMs: 1_000,
      skipped: [],
      checks: [
        {
          id: 'check/probe',
          title: 'Probe',
          claim: 'The probe passes.',
          context: 'repository',
          command: 'pnpm run probe',
          owner: 'probe.js',
          remediation: 'Repair the probe and rerun it.',
          authority: 'blocking',
          cache: 'content-addressed',
          cacheable: true,
          timeoutMs: 1_000,
          inputs: ['input.txt'],
          ...overrides,
        },
      ],
    };
  }

  it('serves a truthful warm hit and invalidates on declared input and toolchain changes', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-check-cache-'));
    try {
      writeFileSync(join(root, 'input.txt'), 'first');
      writeFileSync(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
      const spawn = vi.fn(() => ({ status: 0, signal: null, stdout: 'ok', stderr: '' }));
      const runner = createCheckPlanRunner({ spawn, env: { node: 'test', platform: 'test' } });
      const plan = oneCheckPlan(root);

      expect(runner(plan, root).results[0]).toMatchObject({ verdict: 'pass', cacheHit: false });
      expect(runner(plan, root).results[0]).toMatchObject({ verdict: 'pass', cacheHit: true, durationMs: 0 });
      expect(spawn).toHaveBeenCalledTimes(1);

      writeFileSync(join(root, 'input.txt'), 'second');
      expect(runner(plan, root).results[0]).toMatchObject({ verdict: 'pass', cacheHit: false });
      expect(spawn).toHaveBeenCalledTimes(2);

      writeFileSync(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\nchanged: true\n');
      expect(runner(plan, root).results[0]).toMatchObject({ verdict: 'pass', cacheHit: false });
      expect(spawn).toHaveBeenCalledTimes(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each([
    { manager: 'npm', expected: 'npm exec -- liteship build' },
    { manager: 'pnpm', expected: 'pnpm exec liteship build' },
  ] as const)(
    'materializes application CLI checks through the project $manager installation',
    ({ manager, expected }) => {
      const root = mkdtempSync(join(tmpdir(), `liteship-check-${manager}-`));
      try {
        const spawn = vi.fn(() => ({ status: 0, signal: null, stdout: '', stderr: '' }));
        const plan = oneCheckPlan(root, {
          context: 'application',
          command: 'liteship build',
          execution: { kind: 'cli-command', argv: ['build'] },
          cache: 'none',
          cacheable: false,
        });
        writeFileSync(join(root, 'package.json'), JSON.stringify({ packageManager: `${manager}@1.0.0` }));
        createCheckPlanRunner({ spawn })(plan, root);
        expect(spawn).toHaveBeenCalledWith(expected, root, 1_000);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it('fails an application check without spawning when the project uses Yarn', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-check-yarn-'));
    try {
      const spawn = vi.fn(() => ({ status: 0, signal: null, stdout: '', stderr: '' }));
      const plan = oneCheckPlan(root, {
        context: 'application',
        command: 'liteship build',
        execution: { kind: 'cli-command', argv: ['build'] },
        cache: 'none',
        cacheable: false,
      });
      writeFileSync(join(root, 'package.json'), JSON.stringify({ packageManager: 'yarn@4.9.2' }));

      const report = createCheckPlanRunner({ spawn })(plan, root);

      expect(spawn).not.toHaveBeenCalled();
      expect(report).toMatchObject({ ok: false, blocked: true });
      expect(report.results[0]).toMatchObject({ verdict: 'fail', cacheHit: false });
      expect(report.results[0]!.findings.join(' ')).toContain('unsupported yarn project');
      expect(report.results[0]!.findings.join(' ')).toContain('supports npm and pnpm');
      expect(report.results[0]!.curePacketId).toBe(report.curePackets[0]!.packetId);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps non-quick checks uncached and invalidates cache probes on support/config changes', () => {
    const structural = CHECK_REGISTRY.find((entry) => entry.id === 'check/lint-structural')!;
    expect(structural.inputs).toEqual(
      expect.arrayContaining(['packages/**/*.ts', 'vitest.config.ts', 'vitest.browser.config.ts', 'vitest.shared.ts']),
    );
    expect(
      CHECK_REGISTRY.filter((entry) => !entry.profiles.includes('quick')).every((entry) => entry.cache === 'none'),
    ).toBe(true);

    const root = mkdtempSync(join(tmpdir(), 'liteship-check-cache-closure-'));
    try {
      mkdirSync(join(root, 'tests', 'support'), { recursive: true });
      mkdirSync(join(root, 'packages', 'cli', 'fragments'), { recursive: true });
      writeFileSync(join(root, 'tests', 'support', 'oracle.ts'), 'export const oracle = 1;\n');
      writeFileSync(join(root, 'packages', 'cli', 'fragments', 'projection.ts'), 'export const projection = 1;\n');
      writeFileSync(join(root, 'vitest.browser.config.ts'), 'export default {};\n');
      const spawn = vi.fn(() => ({ status: 0, signal: null, stdout: '', stderr: '' }));
      const runner = createCheckPlanRunner({ spawn, env: { node: 'test' } });

      const supportPlan = oneCheckPlan(root, { id: 'check/cache-whole-repo-probe', inputs: ['**/*'] });
      expect(runner(supportPlan, root).results[0]).toMatchObject({ cacheHit: false });
      expect(runner(supportPlan, root).results[0]).toMatchObject({ cacheHit: true });
      writeFileSync(join(root, 'tests', 'support', 'oracle.ts'), 'export const oracle = 2;\n');
      expect(runner(supportPlan, root).results[0]).toMatchObject({ cacheHit: false });

      const structuralPlan = oneCheckPlan(root, {
        id: 'check/lint-structural',
        inputs: ['vitest.browser.config.ts'],
      });
      expect(runner(structuralPlan, root).results[0]).toMatchObject({ cacheHit: false });
      expect(runner(structuralPlan, root).results[0]).toMatchObject({ cacheHit: true });
      writeFileSync(join(root, 'vitest.browser.config.ts'), 'export default { changed: true };\n');
      expect(runner(structuralPlan, root).results[0]).toMatchObject({ cacheHit: false });

      const packageWideStructuralPlan = oneCheckPlan(root, {
        id: 'check/lint-structural-package-wide',
        inputs: ['packages/**/*.ts'],
      });
      expect(runner(packageWideStructuralPlan, root).results[0]).toMatchObject({ cacheHit: false });
      expect(runner(packageWideStructuralPlan, root).results[0]).toMatchObject({ cacheHit: true });
      writeFileSync(join(root, 'packages', 'cli', 'fragments', 'projection.ts'), 'export const projection = 2;\n');
      expect(runner(packageWideStructuralPlan, root).results[0]).toMatchObject({ cacheHit: false });
      expect(spawn).toHaveBeenCalledTimes(6);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('never caches failures and --no-cache bypasses a successful hit', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-check-cache-fail-'));
    try {
      writeFileSync(join(root, 'input.txt'), 'same');
      const spawn = vi
        .fn()
        .mockReturnValueOnce({ status: 1, signal: null, stdout: '', stderr: 'first failure' })
        .mockReturnValue({ status: 0, signal: null, stdout: '', stderr: '' });
      const runner = createCheckPlanRunner({ spawn, env: { node: 'test' } });
      const plan = oneCheckPlan(root);

      expect(runner(plan, root).results[0]).toMatchObject({ verdict: 'fail', cacheHit: false });
      expect(runner(plan, root).results[0]).toMatchObject({ verdict: 'pass', cacheHit: false });
      expect(runner(plan, root).results[0]).toMatchObject({ verdict: 'pass', cacheHit: true });
      expect(runner(plan, root, { noCache: true }).results[0]).toMatchObject({ verdict: 'pass', cacheHit: false });
      expect(spawn).toHaveBeenCalledTimes(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('captures bounded stderr/stdout diagnostics on failure', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-check-output-'));
    try {
      writeFileSync(join(root, 'input.txt'), 'same');
      const spawn = vi.fn(() => ({
        status: 2,
        signal: null,
        stderr: `stderr-marker-${'x'.repeat(40_000)}`,
        stdout: `stdout-marker-${'y'.repeat(40_000)}`,
      }));
      const report = createCheckPlanRunner({ spawn })(oneCheckPlan(root), root);
      expect(report.blocked).toBe(true);
      expect(report.results[0]!.findings[0]).toContain('exited with status 2');
      expect(report.results[0]!.findings[1]).toContain('output truncated');
      expect(report.results[0]!.findings[1]!.length).toBeLessThan(33_000);
      expect(report.curePackets).toHaveLength(1);
      expect(report.curePackets[0]).toMatchObject({
        authority: { checkId: 'check/probe', profile: 'quick' },
        contract: { owner: 'probe.js' },
      });
      expect(report.curePackets[0]!.prompt).toContain('Do not weaken, skip, retry away');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a missing planned script and a malformed manifest are blocking failures', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-check-unverified-'));
    try {
      const plan = oneCheckPlan(root);
      writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: {} }));
      const missing = createCheckPlanRunner({ spawn: vi.fn() })(plan, root);
      expect(missing).toMatchObject({ ok: false, blocked: true });
      expect(missing.results[0]).toMatchObject({ verdict: 'fail', cacheHit: false });
      expect(missing.results[0]!.findings.join(' ')).toContain('planned authority is missing');
      expect(missing.curePackets).toHaveLength(1);

      writeFileSync(join(root, 'package.json'), '{ malformed');
      const malformed = createCheckPlanRunner({ spawn: vi.fn() })(plan, root);
      expect(malformed).toMatchObject({ ok: false, blocked: true });
      expect(malformed.results[0]).toMatchObject({ verdict: 'fail', cacheHit: false });
      expect(malformed.results[0]!.findings.join(' ')).toContain('package.json');
      expect(malformed.curePackets).toHaveLength(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reserves repository context for the actual monorepo and treats every other cwd as an application', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-check-context-'));
    try {
      expect(detectCheckContext(process.cwd())).toBe('repository');
      expect(detectCheckContext(root)).toBe('application');
      writeFileSync(join(root, 'package.json'), '{}');
      expect(detectCheckContext(root)).toBe('application');
      writeFileSync(join(root, 'liteship.config.ts'), 'export default {};\n');
      expect(detectCheckContext(root)).toBe('application');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
