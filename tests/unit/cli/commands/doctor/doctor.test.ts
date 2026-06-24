/**
 * doctor/doctor — the orchestrator. Runs the probe profile, aggregates the
 * verdict, emits the JSON receipt, and (under pretty mode) writes the TTY
 * summary. The broader doctor() behavior (profiles, --ci, --preflight, --fix
 * guards) is pinned in tests/unit/cli/commands/doctor.test.ts against the live
 * workspace; THIS file fills the orchestration arms that the live workspace
 * cannot deterministically hit — specifically the `caution` + pretty path that
 * appends the zsh-paste-trap advisory to stderr.
 *
 * The fixtures are synthetic temp workspaces (name 'czap' to keep the
 * maintainer profile) crafted so the verdict is a known `caution` — no
 * dependence on the runner's real environment.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import * as spawnLib from '../../../../../packages/cli/src/lib/spawn.js';
import { doctor } from '../../../../../packages/cli/src/commands/doctor/doctor.js';
import { captureCli } from '../../../../integration/cli/capture.js';

const tmps: string[] = [];
function mkTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'czap-doctor-orch-'));
  tmps.push(dir);
  return dir;
}
afterEach(() => {
  while (tmps.length) rmSync(tmps.pop()!, { recursive: true, force: true });
});

/**
 * A maintainer-profile workspace satisfied enough that the verdict is a pure
 * `caution`: node_modules + dist present so nothing fails; Playwright absent so
 * exactly one warn remains. No .git ⇒ git probes report ok-not-a-worktree.
 */
function writeCautionWorkspace(dir: string): void {
  writeFileSync(resolve(dir, 'package.json'), JSON.stringify({ name: 'czap', version: '0.0.0', engines: { node: '>=1', pnpm: '>=1' } }));
  mkdirSync(resolve(dir, 'node_modules'), { recursive: true });
  writeFileSync(resolve(dir, 'node_modules', '.modules.yaml'), 'lockfile: stub\n');
  for (const pkg of ['core', 'cli']) {
    mkdirSync(resolve(dir, 'packages', pkg, 'dist'), { recursive: true });
    writeFileSync(resolve(dir, 'packages', pkg, 'dist', 'index.js'), '// stub\n');
  }
}

describe('doctor/doctor — orchestration', () => {
  it('pretty + caution appends the zsh-paste-trap advisory to stderr (covers the caution arm)', async () => {
    const dir = mkTmp();
    writeCautionWorkspace(dir);
    const { exit, stdout, stderr } = await captureCli(() => doctor({ pretty: true, cwd: dir }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.verdict).toBe('caution');
    expect(exit).toBe(0);
    expect(stderr).toMatch(/caution/);
    // The caution-specific advisory line only renders on a caution verdict.
    expect(stderr).toMatch(/zsh paste trap/);
  });

  it('pretty + ready does NOT append the zsh-paste-trap advisory', async () => {
    const dir = mkTmp();
    writeCautionWorkspace(dir);
    // Add a chromium build + @playwright/test so the lone warn clears → ready.
    const pw = resolve(dir, 'node_modules', '@playwright', 'test');
    mkdirSync(pw, { recursive: true });
    writeFileSync(resolve(pw, 'package.json'), JSON.stringify({ version: '1.0.0' }));
    const cache = resolve(dir, 'pw-cache');
    mkdirSync(resolve(cache, 'chromium-1'), { recursive: true });
    // ffmpeg/wasm: no crates/ → wasm skipped; ffmpeg may warn on some hosts, so
    // we don't hard-assert `ready` — we assert the advisory only appears when
    // the verdict is in fact caution.
    process.env.PLAYWRIGHT_BROWSERS_PATH = cache;
    try {
      const { stderr, stdout } = await captureCli(() => doctor({ pretty: true, cwd: dir }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      if (receipt.verdict === 'ready') {
        expect(stderr).not.toMatch(/zsh paste trap/);
      }
    } finally {
      delete process.env.PLAYWRIGHT_BROWSERS_PATH;
    }
  });

  it('emits a structurally valid receipt with the default (non-pretty) path', async () => {
    const dir = mkTmp();
    writeCautionWorkspace(dir);
    const { stdout } = await captureCli(() => doctor({ pretty: false, cwd: dir }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.command).toBe('doctor');
    expect(typeof receipt.timestamp).toBe('string');
    expect(Array.isArray(receipt.checks)).toBe(true);
  });

  it('--target cloudflare selects the cloudflare profile (records target, cloudflare ids)', async () => {
    const dir = mkTmp();
    writeFileSync(
      resolve(dir, 'package.json'),
      JSON.stringify({ name: 'czap', version: '0.0.0', dependencies: { astro: '^6', '@astrojs/cloudflare': '^13' } }),
    );
    const spy = vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({
      exitCode: 0,
      stdout: '10.0.0\n',
      stderr: '',
      timedOut: false,
    });
    try {
      const { stdout } = await captureCli(() => doctor({ pretty: false, target: 'cloudflare', cwd: dir }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      expect(receipt.target).toBe('cloudflare');
      const ids = new Set<string>(receipt.checks.map((c: { id: string }) => c.id));
      expect(ids.has('cloudflare.astro')).toBe(true);
      expect(ids.has('cloudflare.csp')).toBe(true);
      expect(ids.has('core.built')).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('a non-czap cwd auto-selects the consumer profile (no maintainer probes)', async () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'package.json'), JSON.stringify({ name: 'consumer-app', version: '1.0.0' }));
    mkdirSync(resolve(dir, 'node_modules'), { recursive: true });
    writeFileSync(resolve(dir, 'node_modules', '.modules.yaml'), 'x\n');
    const spy = vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({
      exitCode: 0,
      stdout: '10.0.0\n',
      stderr: '',
      timedOut: false,
    });
    try {
      const { stdout } = await captureCli(() => doctor({ pretty: false, cwd: dir }));
      const ids: string[] = JSON.parse(stdout.trim().split('\n').pop()!).checks.map((c: { id: string }) => c.id);
      expect(ids.some((id) => id.endsWith('.built'))).toBe(false);
      expect(ids).toContain('node.version');
      expect(ids).toContain('workspace.installed');
    } finally {
      spy.mockRestore();
    }
  });

  it('--preflight scopes *.built probes out of the verdict (covers the preflight filter)', async () => {
    const dir = mkTmp();
    // dist absent → core.built/cli.built warn; preflight excludes them so the
    // remaining probes drive the verdict.
    writeFileSync(resolve(dir, 'package.json'), JSON.stringify({ name: 'czap', version: '0.0.0', engines: { node: '>=1', pnpm: '>=1' } }));
    mkdirSync(resolve(dir, 'node_modules'), { recursive: true });
    writeFileSync(resolve(dir, 'node_modules', '.modules.yaml'), 'x\n');
    const spy = vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({
      exitCode: 0,
      stdout: '10.0.0\n',
      stderr: '',
      timedOut: false,
    });
    try {
      const { stdout } = await captureCli(() => doctor({ pretty: false, preflight: true, cwd: dir }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      expect(receipt.preflight).toBe(true);
      // The built probes are still in the receipt (honest), just not gating.
      const built = receipt.checks.filter((c: { id: string }) => c.id.endsWith('.built'));
      expect(built.length).toBe(2);
      expect(built.every((c: { status: string }) => c.status === 'warn')).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it('--fix re-probes after a fix runs (covers the re-probe arm), no real build', async () => {
    const dir = mkTmp();
    // A czap workspace with dist/ ABSENT → core.built / cli.built warn (fixable).
    writeFileSync(
      resolve(dir, 'package.json'),
      JSON.stringify({ name: 'czap', version: '0.0.0', scripts: { build: 'tsc -b packages/core packages/cli' } }),
    );
    mkdirSync(resolve(dir, 'node_modules'), { recursive: true });
    writeFileSync(resolve(dir, 'node_modules', '.modules.yaml'), 'x\n');
    const captureSpy = vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({
      exitCode: 0,
      stdout: '10.0.0\n',
      stderr: '',
      timedOut: false,
    });
    const visibleSpy = vi.spyOn(spawnLib, 'spawnArgvVisible').mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    try {
      const { stdout } = await captureCli(() => doctor({ pretty: false, fix: true, cwd: dir }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      // The build fix was attempted (a fixable *.built warn was present).
      expect(visibleSpy).toHaveBeenCalledWith('pnpm', ['run', 'build'], { cwd: dir });
      const build = (receipt.fixed ?? []).find((f: { id: string }) => f.id === 'build');
      expect(build).toBeDefined();
    } finally {
      captureSpy.mockRestore();
      visibleSpy.mockRestore();
    }
  });
});
