/**
 * doctor — maintainer/workspace probes. The environment checks that apply
 * to the LiteShip repo and to any consumer: Node + pnpm versions, workspace
 * install state, built `dist/` artifacts, git hooks + config, Playwright
 * browsers, the Rust/WASM toolchain, and the ffmpeg render capability.
 *
 * Every probe is read-only or capture-spawn (it shells out only to ask a
 * tool its version, never to mutate). World-mutation lives in `fix.ts`.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { probeFfmpegRender } from '@liteship/command/host';
import { spawnArgvCapture } from '../../lib/spawn.js';
import { findWorkspaceRoot } from './manifest.js';
import {
  DOCTOR_PROBE_TIMEOUT_MS,
  type DoctorCheck,
  type EngineMinima,
  type Readout,
  parseMajor,
  unreadable,
} from './types.js';

export function probeNode(minima: EngineMinima): DoctorCheck {
  const version = process.versions.node;
  const major = parseMajor(version);
  if (major === null) {
    return {
      id: 'node.version',
      label: 'Node.js',
      status: 'fail',
      detail: `unrecognized version string: ${version}`,
      hint: `Lay in Node.js ${minima.node}+ from https://nodejs.org`,
    };
  }
  if (major < minima.node) {
    return {
      id: 'node.version',
      label: 'Node.js',
      status: 'fail',
      detail: `${version} (need >= ${minima.node})`,
      hint: `Lay in Node.js ${minima.node}+ from https://nodejs.org`,
    };
  }
  return { id: 'node.version', label: 'Node.js', status: 'ok', detail: version };
}

/**
 * The subprocess-capture capability the spawn-bearing probes shell out through.
 * Injectable (defaulting to the real {@link spawnArgvCapture}) so tests script the
 * boundary deterministically — no PATH, git, cargo, or pnpm touched — while
 * production call sites stay byte-identical.
 */
export type SpawnArgvCapture = typeof spawnArgvCapture;

export async function probePnpm(
  minima: EngineMinima,
  spawn: SpawnArgvCapture = spawnArgvCapture,
): Promise<DoctorCheck> {
  const r = await spawn('pnpm', ['--version'], { timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(() => null);
  if (r?.timedOut) {
    return {
      id: 'pnpm.version',
      label: 'pnpm',
      status: 'warn',
      detail: `no response within ${DOCTOR_PROBE_TIMEOUT_MS}ms (pnpm slow or contended)`,
      hint: 'Re-run on a less-loaded machine, or check pnpm directly: pnpm --version',
    };
  }
  if (!r || r.exitCode !== 0) {
    return {
      id: 'pnpm.version',
      label: 'pnpm',
      status: 'fail',
      detail: 'pnpm not on PATH',
      hint: `Lay in pnpm ${minima.pnpm}+: corepack enable && corepack prepare pnpm@latest --activate`,
    };
  }
  const version = r.stdout.trim();
  const major = parseMajor(version);
  if (major === null) {
    return {
      id: 'pnpm.version',
      label: 'pnpm',
      status: 'warn',
      detail: `unrecognized version: ${version}`,
    };
  }
  if (major < minima.pnpm) {
    return {
      id: 'pnpm.version',
      label: 'pnpm',
      status: 'fail',
      detail: `${version} (need >= ${minima.pnpm})`,
      hint: 'Reinstall pnpm: corepack prepare pnpm@latest --activate',
    };
  }
  return { id: 'pnpm.version', label: 'pnpm', status: 'ok', detail: version };
}

export function probeWorkspaceInstalled(cwd: string): DoctorCheck {
  const modulesYaml = resolve(cwd, 'node_modules/.modules.yaml');
  if (!existsSync(modulesYaml)) {
    return {
      id: 'workspace.installed',
      label: 'workspace install',
      status: 'fail',
      detail: 'node_modules missing or stale',
      hint: 'Set up: pnpm install',
    };
  }
  return { id: 'workspace.installed', label: 'workspace install', status: 'ok', detail: 'node_modules present' };
}

/** Consumer-app install probe — accepts workspace-linked `node_modules/` without a local `.modules.yaml`. */
export function probeConsumerInstalled(cwd: string): DoctorCheck {
  const localYaml = resolve(cwd, 'node_modules/.modules.yaml');
  if (existsSync(localYaml)) {
    return { id: 'workspace.installed', label: 'workspace install', status: 'ok', detail: 'node_modules present' };
  }
  const localModules = resolve(cwd, 'node_modules');
  const rootYaml = resolve(findWorkspaceRoot(cwd), 'node_modules/.modules.yaml');
  if (existsSync(localModules) && existsSync(rootYaml)) {
    return {
      id: 'workspace.installed',
      label: 'workspace install',
      status: 'ok',
      detail: 'workspace-linked node_modules present',
    };
  }
  if (existsSync(localModules)) {
    return { id: 'workspace.installed', label: 'workspace install', status: 'ok', detail: 'node_modules present' };
  }
  return {
    id: 'workspace.installed',
    label: 'workspace install',
    status: 'fail',
    detail: 'node_modules missing or stale',
    hint: 'Set up: pnpm install',
  };
}

export function probeBuilt(cwd: string, pkg: string, label: string): DoctorCheck {
  const dist = resolve(cwd, `packages/${pkg}/dist/index.js`);
  if (!existsSync(dist)) {
    return {
      id: `${pkg}.built`,
      label,
      status: 'warn',
      detail: 'dist/ not built',
      hint: 'Build with: pnpm run build',
      fixable: true,
    };
  }
  return { id: `${pkg}.built`, label, status: 'ok', detail: 'dist/ built' };
}

/**
 * Resolve the `.git/hooks` directory for `cwd`. In a normal clone this is
 * just `<cwd>/.git/hooks`; in a git worktree, `<cwd>/.git` is a file
 * containing `gitdir: <path>` pointing at the real gitdir (which itself
 * contains a `commondir` file pointing at the main repo's gitdir, where
 * the hooks live). `absent` when no `.git` is present; `unreadable` when
 * `.git` exists but its pointer chain cannot be followed — a doctor must
 * report that as a finding, not shrug it off as "not a repo".
 */
function resolveGitHooksDir(cwd: string): Readout<string> {
  const dotGit = resolve(cwd, '.git');
  if (!existsSync(dotGit)) return { kind: 'absent' };
  try {
    if (statSync(dotGit).isDirectory()) {
      return { kind: 'ok', value: resolve(dotGit, 'hooks') };
    }
    // Worktree: `.git` is a file like `gitdir: /abs/path/.git/worktrees/foo`.
    const pointer = readFileSync(dotGit, 'utf8');
    const m = pointer.match(/^gitdir:\s*(.+)\s*$/m);
    if (!m) return { kind: 'unreadable', detail: '.git pointer file has no gitdir: line' };
    const worktreeGitDir = resolve(cwd, m[1]!);
    // Hooks live in the main repo's gitdir, not the per-worktree one.
    // `commondir` (relative to worktreeGitDir) points there.
    const commondirFile = resolve(worktreeGitDir, 'commondir');
    if (existsSync(commondirFile)) {
      const commondir = resolve(worktreeGitDir, readFileSync(commondirFile, 'utf8').trim());
      return { kind: 'ok', value: resolve(commondir, 'hooks') };
    }
    return { kind: 'ok', value: resolve(worktreeGitDir, 'hooks') };
  } catch (e) {
    return unreadable(e);
  }
}

export function probeGitHooks(cwd: string): DoctorCheck {
  const hooksDir = resolveGitHooksDir(cwd);
  if (hooksDir.kind === 'absent') {
    return { id: 'git.hooks', label: 'git hooks', status: 'ok', detail: 'no .git (not a worktree)' };
  }
  if (hooksDir.kind === 'unreadable') {
    return {
      id: 'git.hooks',
      label: 'git hooks',
      status: 'warn',
      detail: `.git present but hooks dir unresolved: ${hooksDir.detail}`,
    };
  }
  const hook = resolve(hooksDir.value, 'pre-commit');
  if (!existsSync(hook)) {
    return {
      id: 'git.hooks',
      label: 'git hooks',
      status: 'warn',
      detail: 'pre-commit hook not installed',
      hint: 'Install it: pnpm exec tsx scripts/link-pre-commit.ts',
      fixable: true,
    };
  }
  return { id: 'git.hooks', label: 'git hooks', status: 'ok', detail: 'pre-commit installed' };
}

export function probeFfmpegRenderCheck(probe: typeof probeFfmpegRender = probeFfmpegRender): DoctorCheck {
  const result = probe();
  if (result.ok) {
    return { id: 'ffmpeg.libx264', label: 'ffmpeg (libx264)', status: 'ok', detail: result.detail };
  }
  return {
    id: 'ffmpeg.libx264',
    label: 'ffmpeg (libx264)',
    status: 'warn',
    detail: result.detail,
    hint: result.hint,
  };
}

/**
 * Resolve Playwright's browser cache directory the same way Playwright does:
 * `PLAYWRIGHT_BROWSERS_PATH` when set, else the per-OS default. Returns null
 * when the path can't be determined (no HOME).
 */
function playwrightBrowsersDir(): string | null {
  const override = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (override && override !== '0') return override;
  const home = homedir();
  if (!home) return null;
  if (process.platform === 'darwin') return resolve(home, 'Library/Caches/ms-playwright');
  if (process.platform === 'win32') {
    return resolve(process.env.LOCALAPPDATA ?? resolve(home, 'AppData/Local'), 'ms-playwright');
  }
  return resolve(home, '.cache/ms-playwright');
}

/** True when the browser cache holds at least one downloaded chromium build. */
function hasChromiumBuild(): boolean {
  const dir = playwrightBrowsersDir();
  if (!dir || !existsSync(dir)) return false;
  let found: boolean;
  try {
    found = readdirSync(dir).some((entry) => entry.startsWith('chromium'));
  } catch {
    // An unreadable browsers-cache dir reads as "no chromium installed" — record the
    // conservative, non-corrupting fallback the doctor already surfaces to the user
    // (a false "missing" prompts a reinstall, never hides a real break).
    found = false;
  }
  return found;
}

export function probePlaywright(cwd: string): DoctorCheck {
  // Filesystem-only probe (no slow subprocess): check the @playwright/test
  // package AND the downloaded browser binaries. The package alone is not
  // enough — `test:e2e` / `coverage:browser` need the chromium build too.
  const pwPkg = resolve(cwd, 'node_modules/@playwright/test/package.json');
  if (!existsSync(pwPkg)) {
    return {
      id: 'playwright.installed',
      label: 'Playwright',
      status: 'warn',
      detail: '@playwright/test not in node_modules (e2e tests will not run)',
      hint: 'Install the browsers: pnpm install && pnpm exec playwright install chromium',
    };
  }
  if (!hasChromiumBuild()) {
    return {
      id: 'playwright.installed',
      label: 'Playwright',
      status: 'warn',
      detail: 'package present but no chromium browser binary downloaded (e2e/browser tests will not run)',
      hint: 'Install the browsers: pnpm exec playwright install chromium chromium-headless-shell',
    };
  }
  return { id: 'playwright.installed', label: 'Playwright', status: 'ok', detail: 'package + chromium present' };
}

export async function probeGitConfig(cwd: string, spawn: SpawnArgvCapture = spawnArgvCapture): Promise<DoctorCheck> {
  const gitDir = resolve(cwd, '.git');
  if (!existsSync(gitDir)) {
    return { id: 'git.config', label: 'git config', status: 'ok', detail: 'no .git (not a worktree)' };
  }
  const [email, name] = await Promise.all([
    spawn('git', ['config', '--get', 'user.email'], { cwd, timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(() => null),
    spawn('git', ['config', '--get', 'user.name'], { cwd, timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(() => null),
  ]);
  if (email?.timedOut || name?.timedOut) {
    return {
      id: 'git.config',
      label: 'git config',
      status: 'warn',
      detail: `git config did not respond within ${DOCTOR_PROBE_TIMEOUT_MS}ms (slow or contended)`,
      hint: 'Re-run on a less-loaded machine, or check: git config --get user.email',
    };
  }
  const haveEmail = !!email && email.exitCode === 0 && email.stdout.trim().length > 0;
  const haveName = !!name && name.exitCode === 0 && name.stdout.trim().length > 0;
  if (haveEmail && haveName) {
    return { id: 'git.config', label: 'git config', status: 'ok', detail: 'user.email + user.name set' };
  }
  const missing = [!haveName ? 'user.name' : null, !haveEmail ? 'user.email' : null].filter(Boolean).join(', ');
  return {
    id: 'git.config',
    label: 'git config',
    status: 'warn',
    detail: `unset: ${missing}`,
    hint: 'Sign the manifest: git config user.email "<you>" && git config user.name "<you>"',
  };
}

/**
 * WASM toolchain probe — only meaningful when this workspace has a Rust
 * `crates/` directory. On Rust-free clones returns null so the probe is
 * skipped entirely (no false-positive warnings on docs-only branches).
 */
export async function probeWasmToolchain(
  cwd: string,
  spawn: SpawnArgvCapture = spawnArgvCapture,
): Promise<DoctorCheck | null> {
  const cratesDir = resolve(cwd, 'crates');
  if (!existsSync(cratesDir)) return null;
  const r = await spawn('cargo', ['--version'], { timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(() => null);
  if (r?.timedOut) {
    return {
      id: 'wasm.toolchain',
      label: 'WASM toolchain',
      status: 'warn',
      detail: `cargo did not respond within ${DOCTOR_PROBE_TIMEOUT_MS}ms (slow or contended)`,
      hint: 'Re-run on a less-loaded machine, or check: cargo --version',
    };
  }
  if (!r || r.exitCode !== 0) {
    return {
      id: 'wasm.toolchain',
      label: 'WASM toolchain',
      status: 'warn',
      detail: 'cargo not on PATH (crates/ present; WASM build will not run)',
      hint: 'Install Rust: https://rustup.rs',
    };
  }
  return { id: 'wasm.toolchain', label: 'WASM toolchain', status: 'ok', detail: r.stdout.trim() };
}
