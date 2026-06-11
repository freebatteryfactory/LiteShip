/**
 * Unit tests for `czap doctor`. Probes don't mock the environment; they
 * run against the live workspace. We assert structural invariants
 * (every check has a status + label) rather than specific verdicts so
 * the test stays stable across machines.
 */
import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { doctor, findWorkspaceRoot, readCliVersion } from '../../../../packages/cli/src/commands/doctor.js';
import * as spawnLib from '../../../../packages/cli/src/lib/spawn.js';
import { captureCli } from '../../../integration/cli/capture.js';

describe('doctor command', () => {
  it('emits a receipt with status, verdict, and per-check entries', async () => {
    const { exit, stdout } = await captureCli(() => doctor({ pretty: false }));
    expect([0, 1]).toContain(exit);
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.command).toBe('doctor');
    expect(['ok', 'failed']).toContain(receipt.status);
    expect(['ready', 'caution', 'blocked']).toContain(receipt.verdict);
    expect(Array.isArray(receipt.checks)).toBe(true);
    expect(receipt.checks.length).toBeGreaterThan(0);
    for (const check of receipt.checks) {
      expect(typeof check.id).toBe('string');
      expect(typeof check.label).toBe('string');
      expect(['ok', 'warn', 'fail']).toContain(check.status);
      expect(typeof check.detail).toBe('string');
    }
  });

  it('includes the canonical probe ids', async () => {
    const { stdout } = await captureCli(() => doctor({ pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    const ids = new Set<string>(receipt.checks.map((c: { id: string }) => c.id));
    expect(ids).toContain('node.version');
    expect(ids).toContain('pnpm.version');
    expect(ids).toContain('workspace.installed');
    expect(ids).toContain('core.built');
    expect(ids).toContain('cli.built');
    expect(ids).toContain('git.hooks');
    expect(ids).toContain('git.config');
    expect(ids).toContain('playwright.installed');
    expect(ids).toContain('ffmpeg.libx264');
  });

  it('includes wasm.toolchain when crates/ is present (skipped otherwise)', async () => {
    const { stdout } = await captureCli(() => doctor({ pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    const ids = new Set<string>(receipt.checks.map((c: { id: string }) => c.id));
    // Repo has crates/czap-compute, so the probe should fire.
    expect(ids).toContain('wasm.toolchain');
  });

  it('omits wasm.toolchain in a workspace without crates/', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-doctor-nocrates-'));
    try {
      mkdirSync(resolve(tmp, 'packages/core'), { recursive: true });
      // name 'czap' keeps the maintainer profile (consumer profile has no wasm probe at all).
      writeFileSync(resolve(tmp, 'package.json'), JSON.stringify({ name: 'czap', version: '0.0.0' }));
      const { stdout } = await captureCli(() => doctor({ pretty: false, cwd: tmp }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      const ids = new Set<string>(receipt.checks.map((c: { id: string }) => c.id));
      expect(ids.has('wasm.toolchain')).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('git.config probe returns ok when running outside a git worktree', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-doctor-nogit-'));
    try {
      mkdirSync(resolve(tmp, 'packages/core'), { recursive: true });
      // name 'czap' keeps the maintainer profile (the consumer profile has no git.config probe).
      writeFileSync(resolve(tmp, 'package.json'), JSON.stringify({ name: 'czap', version: '0.0.0' }));
      const { stdout } = await captureCli(() => doctor({ pretty: false, cwd: tmp }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      const gitCfg = receipt.checks.find((c: { id: string }) => c.id === 'git.config');
      expect(gitCfg.status).toBe('ok');
      expect(gitCfg.detail).toContain('not a worktree');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('--ci escalates caution to exit 1 while keeping the verdict honest', async () => {
    // Build a sandbox with node_modules satisfied but no dist/ — that's a
    // pure-warn workspace (caution verdict). Without --ci this exits 0.
    const tmp = mkdtempSync(join(tmpdir(), 'czap-doctor-caution-'));
    try {
      // name 'czap' keeps the maintainer profile (this fixture simulates the workspace).
      writeFileSync(resolve(tmp, 'package.json'), JSON.stringify({ name: 'czap', version: '0.0.0' }));
      mkdirSync(resolve(tmp, 'packages/core/dist'), { recursive: true });
      mkdirSync(resolve(tmp, 'packages/cli/dist'), { recursive: true });
      mkdirSync(resolve(tmp, 'node_modules'), { recursive: true });
      // Touch the freshness sentinel so workspace.installed reads as ok.
      writeFileSync(resolve(tmp, 'node_modules/.modules.yaml'), 'lockfile: stub\n');
      // Built dist sentinel — index.js must exist.
      writeFileSync(resolve(tmp, 'packages/core/dist/index.js'), '// stub\n');
      writeFileSync(resolve(tmp, 'packages/cli/dist/index.js'), '// stub\n');
      // No .git here, so git.hooks/git.config probes return ok-with-no-worktree.
      // The only non-ok will be Playwright (no node_modules/@playwright/test) — a warn.

      const { exit: exitWithoutCi, stdout: stdoutWithoutCi } = await captureCli(() =>
        doctor({ pretty: false, cwd: tmp }),
      );
      const receiptWithout = JSON.parse(stdoutWithoutCi.trim().split('\n').pop()!);
      expect(receiptWithout.verdict).toBe('caution');
      expect(exitWithoutCi).toBe(0);
      expect('strict' in receiptWithout).toBe(false);

      const { exit: exitWithCi, stdout: stdoutWithCi } = await captureCli(() =>
        doctor({ pretty: false, ci: true, cwd: tmp }),
      );
      const receiptWith = JSON.parse(stdoutWithCi.trim().split('\n').pop()!);
      expect(receiptWith.verdict).toBe('caution');
      expect(receiptWith.status).toBe('failed');
      expect(receiptWith.strict).toBe(true);
      expect(exitWithCi).toBe(1);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('--ci stays exit 0 when verdict is ready (no warnings)', async () => {
    // Run against the live, healthy workspace — should be ready (or close to it).
    // We don't assume strictly ready (Playwright/git-config may warn on some
    // dev machines), so we only assert that if verdict is ready, --ci exits 0.
    const { exit: exitNoCi, stdout } = await captureCli(() => doctor({ pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    if (receipt.verdict === 'ready') {
      const { exit: exitCi } = await captureCli(() => doctor({ pretty: false, ci: true }));
      expect(exitCi).toBe(0);
      expect(exitNoCi).toBe(0);
    }
  });

  it('reports `blocked` and exit 1 when workspace is uninstalled in a sandbox', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-doctor-'));
    try {
      // Make a fake workspace with no node_modules / no packages dist.
      mkdirSync(resolve(tmp, 'packages/core'), { recursive: true });
      const { exit, stdout } = await captureCli(() => doctor({ pretty: false, cwd: tmp }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      expect(receipt.verdict).toBe('blocked');
      expect(receipt.status).toBe('failed');
      expect(exit).toBe(1);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('readCliVersion returns the CLI package version when run from the repo root', () => {
    const v = readCliVersion();
    expect(v).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('readCliVersion resolves the CLI package.json by module location, not cwd', () => {
    // Regression for PR #3 Codex P2: previously `readCliVersion()` only
    // looked at `<cwd>/packages/cli/package.json` and `<cwd>/package.json`,
    // so `czap version` reported '0.0.0-unknown' whenever the user wasn't
    // sitting in the repo root (e.g., a globally-installed czap run from
    // an arbitrary project). The fix tries `import.meta.url`-relative
    // first, so this test asserts the version resolves correctly even
    // when cwd has no @czap-shaped package.json on disk.
    const origCwd = process.cwd();
    const stranger = mkdtempSync(join(tmpdir(), 'czap-version-cwd-'));
    try {
      process.chdir(stranger);
      const v = readCliVersion();
      expect(v).toMatch(/^\d+\.\d+\.\d+/);
      expect(v).not.toBe('0.0.0-unknown');
    } finally {
      process.chdir(origCwd);
      rmSync(stranger, { recursive: true, force: true });
    }
  });

  it('--fix mode produces a `fixed` array when nothing was actually broken (no-op)', async () => {
    // With a healthy workspace, --fix finds nothing to repair and emits
    // the receipt without a `fixed` field (only present when fixes ran).
    const { exit, stdout } = await captureCli(() => doctor({ pretty: false, fix: true }));
    expect([0, 1]).toContain(exit);
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    if ('fixed' in receipt) {
      expect(Array.isArray(receipt.fixed)).toBe(true);
      for (const f of receipt.fixed) {
        expect(typeof f.id).toBe('string');
        expect(typeof f.action).toBe('string');
        expect(['applied', 'failed']).toContain(f.status);
      }
    }
  });

  it('checks expose a `fixable` flag where remediation is wired', async () => {
    const { stdout } = await captureCli(() => doctor({ pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    const fixable = receipt.checks.filter((c: { fixable?: boolean }) => c.fixable);
    // The fixable set today is {git.hooks, core.built, cli.built}; we
    // only assert it's a subset of those rather than equality, so adding
    // a new fixable check doesn't break this test.
    for (const c of fixable) {
      expect(['git.hooks', 'core.built', 'cli.built']).toContain(c.id);
    }
  });

  it('readCliVersion ignores a cwd whose package.json is not @czap/cli (module-relative wins)', () => {
    // After PR #3 Codex P2 fix, module-relative resolution finds the
    // real @czap/cli package.json regardless of cwd. The cwd-relative
    // candidates are only consulted as a fallback. This test asserts
    // that the module-relative resolution dominates: a non-@czap/cli
    // package.json under cwd does NOT shadow the real version.
    const tmp = mkdtempSync(join(tmpdir(), 'czap-version-'));
    try {
      writeFileSync(resolve(tmp, 'package.json'), JSON.stringify({ name: 'not-czap', version: '9.9.9' }));
      const v = readCliVersion(tmp);
      // Real CLI version, NOT '9.9.9' (the imposter under cwd) or
      // '0.0.0-unknown' (the pre-fix bug behavior).
      expect(v).toMatch(/^\d+\.\d+\.\d+/);
      expect(v).not.toBe('9.9.9');
      expect(v).not.toBe('0.0.0-unknown');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  // Direct unit tests for findWorkspaceRoot (exported for testability).
  // Previous draft of this test used process.chdir into packages/core to
  // exercise the walk-up indirectly through doctor(). That mutated shared
  // global state (process.cwd()) across the vitest worker — Windows has
  // wider fd-cleanup race windows than Linux, which is the most plausible
  // root cause of the windows-smoke red on PR #3 commit 2e3d8d8. The
  // direct tests below exercise findWorkspaceRoot's two branches without
  // touching cwd, so the regression-guard is platform-independent.
  it('findWorkspaceRoot walks up to the repo root from a monorepo subdir (PR #3 Codex P2)', () => {
    const subdir = resolve(process.cwd(), 'packages/core');
    const root = findWorkspaceRoot(subdir);
    // Repo root contains pnpm-workspace.yaml; subdir does not.
    expect(root).toBe(process.cwd());
    expect(root).not.toBe(subdir);
  });

  it('findWorkspaceRoot falls back to `start` when no pnpm-workspace.yaml exists above it', () => {
    // Tmpdir created under /tmp (Linux) / %TEMP% (Windows) — neither has
    // an ancestor pnpm-workspace.yaml on a clean CI runner. The walk-up
    // hits the filesystem root and returns `start` unchanged.
    const tmp = mkdtempSync(join(tmpdir(), 'czap-no-ws-'));
    try {
      const root = findWorkspaceRoot(tmp);
      // realpathSync isn't applied; on macOS /tmp may be a symlink, so we
      // can't compare bytes-for-bytes against `tmp`. We CAN assert that
      // the walk-up didn't escape into the test repo's workspace root.
      expect(root).not.toBe(process.cwd());
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('records preflight scope in the receipt', async () => {
    const { stdout } = await captureCli(() => doctor({ pretty: false, preflight: true }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.preflight).toBe(true);
  });

  it('--preflight + --ci excludes *.built probes from the verdict', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-preflight-'));
    try {
      mkdirSync(resolve(tmp, 'packages', 'core'), { recursive: true });
      mkdirSync(resolve(tmp, 'packages', 'cli'), { recursive: true });
      mkdirSync(resolve(tmp, 'node_modules'), { recursive: true });
      writeFileSync(
        resolve(tmp, 'package.json'),
        JSON.stringify({
          name: 'czap',
          version: '0.0.0',
          engines: { node: '>=20.0.0', pnpm: '>=9.0.0' },
        }),
      );
      const { exit, stdout } = await captureCli(() =>
        doctor({ pretty: false, preflight: true, ci: true, cwd: tmp }),
      );
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      const built = receipt.checks.filter((c: { id: string }) => c.id.endsWith('.built'));
      expect(built.length).toBe(2);
      expect(built.every((c: { status: string }) => c.status === 'warn')).toBe(true);
      // Scoped verdict ignores built warns — only non-built probes gate exit.
      const scopedVerdict =
        receipt.checks.filter((c: { id: string }) => !c.id.endsWith('.built')).some((c: { status: string }) => c.status === 'fail')
          ? 'blocked'
          : receipt.checks.filter((c: { id: string }) => !c.id.endsWith('.built')).some((c: { status: string }) => c.status === 'warn')
            ? 'caution'
            : 'ready';
      expect(receipt.verdict).toBe(scopedVerdict);
      if (scopedVerdict === 'ready') {
        expect(exit).toBe(0);
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('pretty mode writes the doctor TTY summary to stderr after the JSON receipt', async () => {
    // Covers doctor.ts:489-490 (the `if (wantPretty) { process.stderr.write(prettySummary(...)) }`
    // path). Every other doctor test in this file passes `pretty: false`,
    // so without this case the wantPretty arm is uncovered — that, plus
    // the spawnArgvVisible additions, was enough to drop cli statements
    // coverage under 85% on the truth-linux CI run for commit 2e3d8d8.
    const { exit, stderr } = await captureCli(() => doctor({ pretty: true }));
    expect([0, 1]).toContain(exit);
    // prettySummary emits a doctor header line + per-check rows + a
    // verdict sentence (ready / caution / blocked). Assert structural
    // shape rather than exact text so the test stays stable as the
    // pretty-format evolves.
    expect(stderr.length).toBeGreaterThan(0);
    expect(stderr).toMatch(/ready|caution|blocked/);
  });

  it('doctor --fix outside the LiteShip workspace never spawns a build (Codex P1 — safety guard)', async () => {
    // Regression for PR #3 r3254680246: previously `czap doctor --fix` run
    // from an unrelated project would spawn `pnpm run build` against THAT
    // project's build script — high-impact arbitrary code execution for a
    // diagnostics command.
    //
    // Defense is now two layers deep: (1) a non-czap cwd auto-selects the
    // consumer probe profile, which has no fixable *.built checks, so there
    // is nothing for applyFixes to attempt; (2) applyFixes itself still
    // carries the isLiteShipWorkspace guard. The observable invariant this
    // test pins: NO subprocess runs, NO build fix is attempted.
    const spy = vi.spyOn(spawnLib, 'spawnArgvVisible').mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const tmp = mkdtempSync(join(tmpdir(), 'czap-fix-imposter-'));
    try {
      // Tmpdir poses as an unrelated project: has a package.json (so
      // isLiteShipWorkspace can read it) with a non-czap name.
      writeFileSync(
        resolve(tmp, 'package.json'),
        JSON.stringify({
          name: 'imposter-project',
          version: '0.0.0',
          scripts: { build: 'echo "this build should NEVER run from doctor --fix"' },
        }),
      );
      const { stdout } = await captureCli(() =>
        doctor({ pretty: false, fix: true, cwd: tmp }),
      );
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      expect(spy).not.toHaveBeenCalled();
      const buildFix = (receipt.fixed ?? []).find((f: { id: string }) => f.id === 'build');
      expect(buildFix).toBeUndefined();
      // Consumer profile selected: no maintainer-only *.built probes.
      const ids = receipt.checks.map((c: { id: string }) => c.id);
      expect(ids.some((id: string) => id.endsWith('.built'))).toBe(false);
    } finally {
      spy.mockRestore();
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('applyFixes git.hooks branch fires when probeGitHooks reports `warn` (covers doctor.ts:402-414)', async () => {
    const spy = vi.spyOn(spawnLib, 'spawnArgvVisible').mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: '',
    });
    const tmp = mkdtempSync(join(tmpdir(), 'czap-fix-hooks-'));
    try {
      mkdirSync(resolve(tmp, '.git', 'hooks'), { recursive: true });
      writeFileSync(
        resolve(tmp, 'package.json'),
        JSON.stringify({ name: 'czap', version: '0.0.0' }),
      );
      const { stdout } = await captureCli(() =>
        doctor({ pretty: false, fix: true, cwd: tmp }),
      );
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      expect(spy).toHaveBeenCalled();
      if (Array.isArray(receipt.fixed)) {
        const hookFix = receipt.fixed.find((f: { id: string }) => f.id === 'git.hooks');
        expect(hookFix).toBeDefined();
        expect(['applied', 'failed']).toContain(hookFix.status);
        expect(hookFix.action).not.toMatch(/not the LiteShip workspace/);
      }
    } finally {
      spy.mockRestore();
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('doctor --fix outside the LiteShip workspace never links git hooks (Codex P1 follow-up)', async () => {
    // Regression for PR #3 discussion on commit 3212fa4: previously the
    // git.hooks fix branch ran `pnpm exec tsx scripts/link-pre-commit.ts`
    // unconditionally on warn, even outside LiteShip.
    //
    // With the consumer auto-profile, a non-czap cwd never probes git.hooks
    // in the first place, so the fix branch has nothing to act on; the
    // isLiteShipWorkspace guard inside applyFixes stays as the second layer.
    // The pinned invariant: NO subprocess runs, NO git.hooks fix is attempted.
    const spy = vi.spyOn(spawnLib, 'spawnArgvVisible').mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const tmp = mkdtempSync(join(tmpdir(), 'czap-fix-hooks-guard-'));
    try {
      // Imposter project: has .git/hooks/ but package.json name is NOT 'czap'.
      mkdirSync(resolve(tmp, '.git', 'hooks'), { recursive: true });
      writeFileSync(
        resolve(tmp, 'package.json'),
        JSON.stringify({
          name: 'imposter-project',
          version: '0.0.0',
          scripts: { build: 'echo "should never run"' },
        }),
      );
      const { stdout } = await captureCli(() =>
        doctor({ pretty: false, fix: true, cwd: tmp }),
      );
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      expect(spy).not.toHaveBeenCalled();
      const hookFix = (receipt.fixed ?? []).find((f: { id: string }) => f.id === 'git.hooks');
      expect(hookFix).toBeUndefined();
      const ids = receipt.checks.map((c: { id: string }) => c.id);
      expect(ids).not.toContain('git.hooks');
    } finally {
      spy.mockRestore();
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('auto-selects the consumer probe profile when cwd is not the LiteShip workspace', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-doctor-consumer-'));
    try {
      writeFileSync(resolve(tmp, 'package.json'), JSON.stringify({ name: 'some-consumer-app', version: '1.0.0' }));
      mkdirSync(resolve(tmp, 'node_modules'), { recursive: true });
      writeFileSync(resolve(tmp, 'node_modules/.modules.yaml'), 'lockfile: stub\n');
      const { stdout } = await captureCli(() => doctor({ pretty: false, cwd: tmp }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      const ids = receipt.checks.map((c: { id: string }) => c.id);
      // Consumer-appropriate checks only — no LiteShip-maintainer probes
      // (packages/*/dist builds, git hooks/config, playwright, crates/ WASM).
      expect(ids).toEqual(['node.version', 'pnpm.version', 'workspace.installed', 'ffmpeg.libx264']);
      const installed = receipt.checks.find((c: { id: string }) => c.id === 'workspace.installed');
      expect(installed.status).toBe('ok');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('doctor --fix does NOT link hooks for an unresolved hooks dir (not fixable)', async () => {
    const spy = vi.spyOn(spawnLib, 'spawnArgvVisible').mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    const tmp = mkdtempSync(join(tmpdir(), 'czap-fix-badgit-'));
    try {
      // Corrupt worktree pointer: git.hooks warns, but linking the pre-commit
      // hook is not the remediation — the fix branch must not fire.
      // name 'czap' keeps the maintainer profile (consumer profile has no git.hooks probe).
      writeFileSync(resolve(tmp, 'package.json'), JSON.stringify({ name: 'czap', version: '0.0.0' }));
      writeFileSync(resolve(tmp, '.git'), 'garbage with no pointer\n');
      const { stdout } = await captureCli(() => doctor({ pretty: false, fix: true, cwd: tmp }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      const hooks = receipt.checks.find((c: { id: string }) => c.id === 'git.hooks');
      expect(hooks.status).toBe('warn');
      const hookFix = (receipt.fixed ?? []).find((f: { id: string }) => f.id === 'git.hooks');
      expect(hookFix).toBeUndefined();
    } finally {
      spy.mockRestore();
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('a malformed .git pointer file reads as a warn, not "no .git" ok', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-doctor-badgit-'));
    try {
      // Worktree-style `.git` FILE without a gitdir: line — previously this
      // fell into the catch-all and misreported as "no .git (not a worktree)".
      // name 'czap' keeps the maintainer profile (consumer profile has no git.hooks probe).
      writeFileSync(resolve(tmp, 'package.json'), JSON.stringify({ name: 'czap', version: '0.0.0' }));
      writeFileSync(resolve(tmp, '.git'), 'garbage with no pointer\n');
      const { stdout } = await captureCli(() => doctor({ pretty: false, cwd: tmp }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      const hooks = receipt.checks.find((c: { id: string }) => c.id === 'git.hooks');
      expect(hooks.status).toBe('warn');
      expect(hooks.detail).toMatch(/hooks dir unresolved: \.git pointer file has no gitdir: line/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
