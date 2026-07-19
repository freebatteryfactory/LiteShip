/**
 * doctor/probes-workspace — the maintainer/consumer environment probes. Every
 * probe is read-only or capture-spawn; world-mutation lives in fix.ts. Tests
 * drive the sync probes against synthetic temp fixtures and inject the two
 * outbound capabilities (the `spawnArgvCapture` subprocess and the
 * `probeFfmpegRender` host probe) so the suite is deterministic and never
 * touches the real PATH, git, cargo, or ffmpeg.
 *
 * THE LAWS:
 *  - probeNode: an unparseable / below-minimum major ⇒ fail; >= minimum ⇒ ok.
 *  - probePnpm: timeout ⇒ warn; not-on-PATH ⇒ fail; below-minimum ⇒ fail.
 *  - workspace install: a `.modules.yaml` (or a workspace-linked node_modules)
 *    reads as ok; a bare missing node_modules ⇒ fail.
 *  - probeBuilt: dist/index.js present ⇒ ok; absent ⇒ a FIXABLE warn.
 *  - git.hooks: no .git ⇒ ok; a corrupt pointer ⇒ warn-unresolved; a missing
 *    pre-commit ⇒ a FIXABLE warn; a present hook ⇒ ok.
 *  - git.config: no .git ⇒ ok; a timeout ⇒ warn; unset name/email ⇒ warn.
 *  - ffmpeg: probe.ok ⇒ ok; else ⇒ warn carrying the probe's hint.
 *  - wasm: no crates/ ⇒ null (skipped); cargo absent/timeout ⇒ warn.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import type * as CommandHost from '@liteship/command/host';

const spawnMock = vi.hoisted(() => ({ spawnArgvCapture: vi.fn() }));
const ffmpegMock = vi.hoisted(() => ({ probeFfmpegRender: vi.fn() }));

vi.mock('../../../../../packages/cli/src/lib/spawn.js', () => spawnMock);
vi.mock('@liteship/command/host', async (importOriginal) => {
  const actual = await importOriginal<typeof CommandHost>();
  return { ...actual, probeFfmpegRender: ffmpegMock.probeFfmpegRender };
});

import {
  probeBuilt,
  probeConsumerInstalled,
  probeFfmpegRenderCheck,
  probeGitConfig,
  probeGitHooks,
  probeNode,
  probePlaywright,
  probePnpm,
  probeWasmToolchain,
  probeWorkspaceInstalled,
} from '../../../../../packages/cli/src/commands/doctor/probes-workspace.js';
import type { EngineMinima } from '../../../../../packages/cli/src/commands/doctor/types.js';

const tmps: string[] = [];
function mkTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'liteship-doctor-ws-'));
  tmps.push(dir);
  return dir;
}
afterEach(() => {
  while (tmps.length) rmSync(tmps.pop()!, { recursive: true, force: true });
});
beforeEach(() => {
  spawnMock.spawnArgvCapture.mockReset();
  ffmpegMock.probeFfmpegRender.mockReset();
});

const MINIMA: EngineMinima = { node: 22, pnpm: 10 };
type CaptureResult = { exitCode: number; stdout: string; stderr: string; timedOut?: boolean };
function captured(over: Partial<CaptureResult> & Pick<CaptureResult, 'exitCode'>): CaptureResult {
  return { stdout: '', stderr: '', timedOut: false, ...over };
}

describe('doctor/probes-workspace — probeNode()', () => {
  it('ok when the running Node major meets the minimum', () => {
    // The test runner itself is on a supported Node, so minimum 1 always passes.
    const r = probeNode({ node: 1, pnpm: 10 });
    expect(r).toMatchObject({ id: 'node.version', status: 'ok' });
  });

  it('fail when the running major is below the minimum', () => {
    const r = probeNode({ node: 9999, pnpm: 10 });
    expect(r.status).toBe('fail');
    expect(r.detail).toContain('need >= 9999');
  });
});

describe('doctor/probes-workspace — probePnpm()', () => {
  it('warn on a timeout', async () => {
    spawnMock.spawnArgvCapture.mockResolvedValue(captured({ exitCode: 124, timedOut: true }));
    const r = await probePnpm(MINIMA);
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/no response within/);
  });

  it('fail when pnpm is not on PATH (spawn rejects)', async () => {
    spawnMock.spawnArgvCapture.mockRejectedValue(new Error('ENOENT'));
    const r = await probePnpm(MINIMA);
    expect(r.status).toBe('fail');
    expect(r.detail).toMatch(/not on PATH/);
  });

  it('fail when pnpm exits nonzero', async () => {
    spawnMock.spawnArgvCapture.mockResolvedValue(captured({ exitCode: 1 }));
    expect((await probePnpm(MINIMA)).status).toBe('fail');
  });

  it('warn on an unrecognized version string', async () => {
    spawnMock.spawnArgvCapture.mockResolvedValue(captured({ exitCode: 0, stdout: 'garbage\n' }));
    const r = await probePnpm(MINIMA);
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/unrecognized version/);
  });

  it('fail when the version is below the minimum', async () => {
    spawnMock.spawnArgvCapture.mockResolvedValue(captured({ exitCode: 0, stdout: '8.0.0\n' }));
    const r = await probePnpm(MINIMA);
    expect(r.status).toBe('fail');
    expect(r.detail).toContain('need >= 10');
  });

  it('ok when the version meets the minimum', async () => {
    spawnMock.spawnArgvCapture.mockResolvedValue(captured({ exitCode: 0, stdout: '10.4.0\n' }));
    expect(await probePnpm(MINIMA)).toMatchObject({ status: 'ok', detail: '10.4.0' });
  });
});

describe('doctor/probes-workspace — probeWorkspaceInstalled()', () => {
  it('ok when node_modules/.modules.yaml is present', () => {
    const dir = mkTmp();
    mkdirSync(resolve(dir, 'node_modules'), { recursive: true });
    writeFileSync(resolve(dir, 'node_modules', '.modules.yaml'), 'lockfile: x\n');
    expect(probeWorkspaceInstalled(dir)).toMatchObject({ status: 'ok' });
  });

  it('fail when node_modules is missing or stale', () => {
    expect(probeWorkspaceInstalled(mkTmp())).toMatchObject({ status: 'fail' });
  });
});

describe('doctor/probes-workspace — probeConsumerInstalled()', () => {
  it('ok via a local .modules.yaml', () => {
    const dir = mkTmp();
    mkdirSync(resolve(dir, 'node_modules'), { recursive: true });
    writeFileSync(resolve(dir, 'node_modules', '.modules.yaml'), 'x\n');
    expect(probeConsumerInstalled(dir)).toMatchObject({ status: 'ok', detail: 'node_modules present' });
  });

  it('ok via a workspace-linked node_modules (root .modules.yaml + local node_modules)', () => {
    const root = mkTmp();
    writeFileSync(resolve(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    mkdirSync(resolve(root, 'node_modules'), { recursive: true });
    writeFileSync(resolve(root, 'node_modules', '.modules.yaml'), 'x\n');
    const app = resolve(root, 'packages', 'app');
    mkdirSync(resolve(app, 'node_modules'), { recursive: true });
    const r = probeConsumerInstalled(app);
    expect(r.status).toBe('ok');
    expect(r.detail).toMatch(/workspace-linked/);
  });

  it('ok via a bare local node_modules even without any .modules.yaml', () => {
    const dir = mkTmp();
    mkdirSync(resolve(dir, 'node_modules'), { recursive: true });
    expect(probeConsumerInstalled(dir)).toMatchObject({ status: 'ok', detail: 'node_modules present' });
  });

  it('fail when there is no node_modules at all', () => {
    expect(probeConsumerInstalled(mkTmp())).toMatchObject({ status: 'fail' });
  });
});

describe('doctor/probes-workspace — probeBuilt()', () => {
  it('ok when dist/index.js exists', () => {
    const dir = mkTmp();
    mkdirSync(resolve(dir, 'packages', 'core', 'dist'), { recursive: true });
    writeFileSync(resolve(dir, 'packages', 'core', 'dist', 'index.js'), '// built\n');
    expect(probeBuilt(dir, 'core', '@liteship/core build')).toMatchObject({ id: 'core.built', status: 'ok' });
  });

  it('a FIXABLE warn when dist/ is not laid', () => {
    const r = probeBuilt(mkTmp(), 'cli', '@liteship/cli build');
    expect(r).toMatchObject({ id: 'cli.built', status: 'warn', fixable: true });
  });
});

describe('doctor/probes-workspace — probeGitHooks()', () => {
  it('ok when there is no .git (not a worktree)', () => {
    expect(probeGitHooks(mkTmp())).toMatchObject({ status: 'ok', detail: 'no .git (not a worktree)' });
  });

  it('a FIXABLE warn when .git/hooks exists but pre-commit is missing', () => {
    const dir = mkTmp();
    mkdirSync(resolve(dir, '.git', 'hooks'), { recursive: true });
    expect(probeGitHooks(dir)).toMatchObject({ status: 'warn', fixable: true });
  });

  it('ok when the pre-commit hook is rigged', () => {
    const dir = mkTmp();
    const hooks = resolve(dir, '.git', 'hooks');
    mkdirSync(hooks, { recursive: true });
    writeFileSync(resolve(hooks, 'pre-commit'), '#!/bin/sh\n');
    expect(probeGitHooks(dir)).toMatchObject({ status: 'ok', detail: 'pre-commit rigged' });
  });

  it('warn-unresolved (NOT fixable) on a corrupt .git pointer file', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, '.git'), 'garbage with no pointer\n');
    const r = probeGitHooks(dir);
    expect(r.status).toBe('warn');
    expect(r.fixable).toBeUndefined();
    expect(r.detail).toMatch(/hooks dir unresolved/);
  });

  it('resolves a worktree .git pointer to the main repo hooks via commondir', () => {
    const dir = mkTmp();
    // Real gitdir with a worktree subdir + commondir pointing back at it.
    const realGit = resolve(dir, 'realrepo', '.git');
    const wt = resolve(realGit, 'worktrees', 'feat');
    mkdirSync(resolve(realGit, 'hooks'), { recursive: true });
    writeFileSync(resolve(realGit, 'hooks', 'pre-commit'), '#!/bin/sh\n');
    mkdirSync(wt, { recursive: true });
    writeFileSync(resolve(wt, 'commondir'), '../..\n');
    const work = resolve(dir, 'worktree');
    mkdirSync(work, { recursive: true });
    writeFileSync(resolve(work, '.git'), `gitdir: ${wt}\n`);
    expect(probeGitHooks(work)).toMatchObject({ status: 'ok', detail: 'pre-commit rigged' });
  });

  it('falls back to the worktree gitdir hooks when no commondir file exists', () => {
    const dir = mkTmp();
    const wt = resolve(dir, '.git', 'worktrees', 'feat');
    mkdirSync(resolve(wt, 'hooks'), { recursive: true });
    writeFileSync(resolve(wt, 'hooks', 'pre-commit'), '#!/bin/sh\n');
    const work = resolve(dir, 'worktree');
    mkdirSync(work, { recursive: true });
    writeFileSync(resolve(work, '.git'), `gitdir: ${wt}\n`);
    expect(probeGitHooks(work)).toMatchObject({ status: 'ok', detail: 'pre-commit rigged' });
  });
});

describe('doctor/probes-workspace — probeGitConfig()', () => {
  it('ok when there is no .git (not a worktree)', async () => {
    expect(await probeGitConfig(mkTmp())).toMatchObject({ status: 'ok', detail: 'no .git (not a worktree)' });
  });

  it('ok when both user.name and user.email are set', async () => {
    const dir = mkTmp();
    mkdirSync(resolve(dir, '.git'), { recursive: true });
    spawnMock.spawnArgvCapture.mockImplementation(async (_cmd: string, args: readonly string[]) =>
      captured({ exitCode: 0, stdout: args.includes('user.email') ? 'me@x.dev\n' : 'Me\n' }),
    );
    expect(await probeGitConfig(dir)).toMatchObject({ status: 'ok' });
  });

  it('warn listing the unset keys', async () => {
    const dir = mkTmp();
    mkdirSync(resolve(dir, '.git'), { recursive: true });
    spawnMock.spawnArgvCapture.mockImplementation(async (_cmd: string, args: readonly string[]) =>
      captured({ exitCode: args.includes('user.email') ? 1 : 0, stdout: args.includes('user.email') ? '' : 'Me\n' }),
    );
    const r = await probeGitConfig(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toContain('user.email');
    expect(r.detail).not.toContain('user.name');
  });

  it('warn on a git config timeout', async () => {
    const dir = mkTmp();
    mkdirSync(resolve(dir, '.git'), { recursive: true });
    spawnMock.spawnArgvCapture.mockResolvedValue(captured({ exitCode: 124, timedOut: true }));
    const r = await probeGitConfig(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/did not respond within/);
  });
});

describe('doctor/probes-workspace — probeFfmpegRenderCheck()', () => {
  it('ok when the underlying ffmpeg probe is ok', () => {
    ffmpegMock.probeFfmpegRender.mockReturnValue({ ok: true, detail: 'libx264 encode probe ok' });
    expect(probeFfmpegRenderCheck()).toMatchObject({ id: 'ffmpeg.libx264', status: 'ok' });
  });

  it('warn carrying the probe detail + hint when ffmpeg is not capable', () => {
    ffmpegMock.probeFfmpegRender.mockReturnValue({ ok: false, detail: 'ffmpeg not on PATH', hint: 'install ffmpeg' });
    const r = probeFfmpegRenderCheck();
    expect(r.status).toBe('warn');
    expect(r.detail).toBe('ffmpeg not on PATH');
    expect(r.hint).toBe('install ffmpeg');
  });
});

describe('doctor/probes-workspace — probePlaywright()', () => {
  it('warn when @playwright/test is not installed', () => {
    const r = probePlaywright(mkTmp());
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/@playwright\/test not in node_modules/);
  });

  it('warn when the package is present but no chromium build is downloaded', () => {
    const dir = mkTmp();
    const pw = resolve(dir, 'node_modules', '@playwright', 'test');
    mkdirSync(pw, { recursive: true });
    writeFileSync(resolve(pw, 'package.json'), JSON.stringify({ version: '1.0.0' }));
    // Point the browser cache at an empty dir so hasChromiumBuild() is false.
    const cache = resolve(dir, 'pw-cache');
    mkdirSync(cache, { recursive: true });
    vi.stubEnv('PLAYWRIGHT_BROWSERS_PATH', cache);
    try {
      const r = probePlaywright(dir);
      expect(r.status).toBe('warn');
      expect(r.detail).toMatch(/no chromium browser binary/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('ok when both the package and a chromium build are present', () => {
    const dir = mkTmp();
    const pw = resolve(dir, 'node_modules', '@playwright', 'test');
    mkdirSync(pw, { recursive: true });
    writeFileSync(resolve(pw, 'package.json'), JSON.stringify({ version: '1.0.0' }));
    const cache = resolve(dir, 'pw-cache');
    mkdirSync(resolve(cache, 'chromium-1234'), { recursive: true });
    vi.stubEnv('PLAYWRIGHT_BROWSERS_PATH', cache);
    try {
      expect(probePlaywright(dir)).toMatchObject({ status: 'ok' });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('doctor/probes-workspace — probeWasmToolchain()', () => {
  it('returns null (probe skipped) when there is no crates/ dir', async () => {
    expect(await probeWasmToolchain(mkTmp())).toBeNull();
  });

  it('warn on a cargo timeout', async () => {
    const dir = mkTmp();
    mkdirSync(resolve(dir, 'crates'), { recursive: true });
    spawnMock.spawnArgvCapture.mockResolvedValue(captured({ exitCode: 124, timedOut: true }));
    const r = await probeWasmToolchain(dir);
    expect(r?.status).toBe('warn');
    expect(r?.detail).toMatch(/did not respond within/);
  });

  it('warn when cargo is not on PATH (crates/ present)', async () => {
    const dir = mkTmp();
    mkdirSync(resolve(dir, 'crates'), { recursive: true });
    spawnMock.spawnArgvCapture.mockRejectedValue(new Error('ENOENT'));
    const r = await probeWasmToolchain(dir);
    expect(r?.status).toBe('warn');
    expect(r?.detail).toMatch(/cargo not on PATH/);
  });

  it('ok when cargo answers', async () => {
    const dir = mkTmp();
    mkdirSync(resolve(dir, 'crates'), { recursive: true });
    spawnMock.spawnArgvCapture.mockResolvedValue(captured({ exitCode: 0, stdout: 'cargo 1.80.0\n' }));
    const r = await probeWasmToolchain(dir);
    expect(r).toMatchObject({ status: 'ok', detail: 'cargo 1.80.0' });
  });
});
