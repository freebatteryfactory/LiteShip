/**
 * doctor — preflight rig-check. Casts environment signals (Node, pnpm,
 * workspace state, build artifacts, git hooks, Playwright browsers) into
 * three named bearings — `ok` / `warn` / `fail` — and resolves to one
 * verdict — `ready` / `caution` / `blocked`. Emits a JSON receipt to
 * stdout; pretty TTY summary to stderr when attached to a terminal.
 *
 * `doctor({ fix: true })` attempts the cheap, local fixes (link git
 * hooks; rebuild stale dist) and re-probes afterwards. The receipt
 * records which fixes ran via the `fixed` array.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arrow, bearingGlyph, color, colorEnabled, header } from '../lib/ansi.js';
import type { WallClockTimestamp } from '../receipts.js';
import { spawnArgvCapture, spawnArgvVisible } from '../lib/spawn.js';
import { isLiteShipWorkspace } from '../lib/workspace.js';
import { probeFfmpegRender } from '@czap/command/host';
import { emit } from '../receipts.js';

/**
 * Walk up from `start` until a workspace marker is found. Probes need
 * the workspace root, not the caller's cwd — running `czap doctor` from
 * `packages/core` should still check the repo's `node_modules/.modules.yaml`,
 * its `packages/cli/dist/`, and its `.git/hooks/`, not a phantom
 * `packages/core/packages/cli/dist/` that never exists.
 *
 * Falls back to `start` itself when no marker is found (external install,
 * single-package project) — probes will then warn/fail honestly rather
 * than hide behind a wrong-root lookup.
 */
export function findWorkspaceRoot(start: string): string {
  let dir = start;
  while (true) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

/** Bearing for a single probe — quantized from a continuous "is it set up?" signal. */
export type DoctorBearing = 'ok' | 'warn' | 'fail';

/** Overall sailing readiness. Aggregates the per-check bearings. */
export type DoctorVerdict = 'ready' | 'caution' | 'blocked';

/** Host deployment target for focused probe profiles. */
export type DoctorTarget = 'cloudflare';

/** One probe outcome. */
export interface DoctorCheck {
  readonly id: string;
  readonly label: string;
  readonly status: DoctorBearing;
  readonly detail: string;
  readonly hint?: string;
  /** Whether `doctor --fix` knows how to remediate this check. */
  readonly fixable?: boolean;
}

/** One applied fix, recorded in the receipt. */
export interface DoctorFix {
  readonly id: string;
  readonly action: string;
  readonly status: 'applied' | 'failed';
  readonly detail?: string;
}

/**
 * Discriminated read result for environment probes. Doctor's one job is
 * diagnosis, so file probes must not collapse "the file is absent" (often
 * fine) and "the file exists but cannot be read or parsed" (always a real
 * environment problem worth reporting) into one falsy value — that turns a
 * corrupt manifest into a bogus "dependency missing" verdict.
 */
type Readout<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'absent' }
  | { readonly kind: 'unreadable'; readonly detail: string };

function unreadable(e: unknown): { kind: 'unreadable'; detail: string } {
  return { kind: 'unreadable', detail: e instanceof Error ? e.message : String(e) };
}

/** Receipt shape emitted by `czap doctor`. */
export interface DoctorReceipt {
  readonly status: 'ok' | 'failed';
  readonly command: 'doctor';
  readonly timestamp: WallClockTimestamp;
  readonly verdict: DoctorVerdict;
  readonly checks: readonly DoctorCheck[];
  readonly fixed?: readonly DoctorFix[];
  /** Present when `--ci` was passed — warns escalate to exit 1. */
  readonly strict?: true;
  /** Present when `--preflight` was passed — `*.built` probes excluded from verdict. */
  readonly preflight?: true;
  /** Present when `--target` was passed — names the focused host profile. */
  readonly target?: DoctorTarget;
}

/** Engine minima read from root package.json `engines`. Fallback to safe defaults. */
interface EngineMinima {
  readonly node: number;
  readonly pnpm: number;
}

function parseEngineMajor(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function loadEngineMinima(cwd: string): EngineMinima {
  const DEFAULTS: EngineMinima = { node: 22, pnpm: 10 };
  try {
    const pkgPath = resolve(cwd, 'package.json');
    if (!existsSync(pkgPath)) return DEFAULTS;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { engines?: { node?: string; pnpm?: string } };
    return {
      node: parseEngineMajor(pkg.engines?.node) ?? DEFAULTS.node,
      pnpm: parseEngineMajor(pkg.engines?.pnpm) ?? DEFAULTS.pnpm,
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Read the build-script's package list out of root package.json so the
 * doctor and the build never drift. No catch: every caller is gated by
 * `isLiteShipWorkspace(cwd)`, which already parsed this same manifest — a
 * parse failure here is a real bug and must surface, not silently skip
 * tsbuildinfo invalidation (which would let `pnpm run build` no-op against
 * stale dist/).
 */
function loadBuiltPackages(cwd: string): readonly string[] {
  const pkgPath = resolve(cwd, 'package.json');
  if (!existsSync(pkgPath)) return [];
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: { build?: string } };
  const build = pkg.scripts?.build ?? '';
  const matches = Array.from(build.matchAll(/packages\/([\w-]+)/g));
  return matches.flatMap((m) => (m[1] ? [m[1]] : []));
}

/** Parse `vMAJOR.MINOR.PATCH` (or `MAJOR.MINOR.PATCH`) into a major-version number. */
function parseMajor(version: string): number | null {
  const cleaned = version.trim().replace(/^v/, '');
  const [maj] = cleaned.split('.');
  const n = Number(maj);
  return Number.isFinite(n) ? n : null;
}

function probeNode(minima: EngineMinima): DoctorCheck {
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
 * Per-probe subprocess bound (CUT test-flake). External probes (`pnpm`/`cargo`/`git`)
 * shell out; under parallel load those spawns can drag past the test timeout. A bound
 * keeps `czap doctor` deterministic and non-hanging: a slow/wedged tool degrades to a
 * `warn` ("didn't answer in time") instead of blocking forever. Concurrency (see
 * runAllProbes) makes the path "max single probe", not the sum — so 4s is comfortable.
 */
const DOCTOR_PROBE_TIMEOUT_MS = 4_000;

async function probePnpm(minima: EngineMinima): Promise<DoctorCheck> {
  const r = await spawnArgvCapture('pnpm', ['--version'], { timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(() => null);
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
      hint: 'Re-rig pnpm: corepack prepare pnpm@latest --activate',
    };
  }
  return { id: 'pnpm.version', label: 'pnpm', status: 'ok', detail: version };
}

function probeWorkspaceInstalled(cwd: string): DoctorCheck {
  const modulesYaml = resolve(cwd, 'node_modules/.modules.yaml');
  if (!existsSync(modulesYaml)) {
    return {
      id: 'workspace.installed',
      label: 'workspace install',
      status: 'fail',
      detail: 'node_modules missing or stale',
      hint: 'Cast off: pnpm install',
    };
  }
  return { id: 'workspace.installed', label: 'workspace install', status: 'ok', detail: 'node_modules present' };
}

/** Consumer-app install probe — accepts workspace-linked `node_modules/` without a local `.modules.yaml`. */
function probeConsumerInstalled(cwd: string): DoctorCheck {
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
    hint: 'Cast off: pnpm install',
  };
}

function probeBuilt(cwd: string, pkg: string, label: string): DoctorCheck {
  const dist = resolve(cwd, `packages/${pkg}/dist/index.js`);
  if (!existsSync(dist)) {
    return {
      id: `${pkg}.built`,
      label,
      status: 'warn',
      detail: 'dist/ not laid',
      hint: 'Lay the keel with: pnpm run build',
      fixable: true,
    };
  }
  return { id: `${pkg}.built`, label, status: 'ok', detail: 'dist/ laid' };
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

function probeGitHooks(cwd: string): DoctorCheck {
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
      detail: 'pre-commit hook not rigged',
      hint: 'Rig it: pnpm exec tsx scripts/link-pre-commit.ts',
      fixable: true,
    };
  }
  return { id: 'git.hooks', label: 'git hooks', status: 'ok', detail: 'pre-commit rigged' };
}

function probeFfmpegRenderCheck(): DoctorCheck {
  const probe = probeFfmpegRender();
  if (probe.ok) {
    return { id: 'ffmpeg.libx264', label: 'ffmpeg (libx264)', status: 'ok', detail: probe.detail };
  }
  return {
    id: 'ffmpeg.libx264',
    label: 'ffmpeg (libx264)',
    status: 'warn',
    detail: probe.detail,
    hint: probe.hint,
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
  let found = false;
  try {
    found = readdirSync(dir).some((entry) => entry.startsWith('chromium'));
  } catch {
    /* unreadable cache dir — treat as no chromium */
  }
  return found;
}

function probePlaywright(cwd: string): DoctorCheck {
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
      hint: 'Stow the browsers: pnpm install && pnpm exec playwright install chromium',
    };
  }
  if (!hasChromiumBuild()) {
    return {
      id: 'playwright.installed',
      label: 'Playwright',
      status: 'warn',
      detail: 'package present but no chromium browser binary downloaded (e2e/browser tests will not run)',
      hint: 'Stow the browsers: pnpm exec playwright install chromium chromium-headless-shell',
    };
  }
  return { id: 'playwright.installed', label: 'Playwright', status: 'ok', detail: 'package + chromium present' };
}

async function probeGitConfig(cwd: string): Promise<DoctorCheck> {
  const gitDir = resolve(cwd, '.git');
  if (!existsSync(gitDir)) {
    return { id: 'git.config', label: 'git config', status: 'ok', detail: 'no .git (not a worktree)' };
  }
  const [email, name] = await Promise.all([
    spawnArgvCapture('git', ['config', '--get', 'user.email'], { cwd, timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(
      () => null,
    ),
    spawnArgvCapture('git', ['config', '--get', 'user.name'], { cwd, timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(
      () => null,
    ),
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
async function probeWasmToolchain(cwd: string): Promise<DoctorCheck | null> {
  const cratesDir = resolve(cwd, 'crates');
  if (!existsSync(cratesDir)) return null;
  const r = await spawnArgvCapture('cargo', ['--version'], { timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(() => null);
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
      hint: 'Stow Rust: https://rustup.rs',
    };
  }
  return { id: 'wasm.toolchain', label: 'WASM toolchain', status: 'ok', detail: r.stdout.trim() };
}

interface RunProbesOptions {
  readonly target?: DoctorTarget;
}

/**
 * Consumer-context probe — the `liteship` umbrella under pnpm's strict
 * `node_modules` does not hoist the transitive `@czap/*` packages it installs,
 * so `import '@czap/core'` dies with Node's raw ERR_MODULE_NOT_FOUND before
 * LiteShip can say anything. Returns null (probe skipped) when the host
 * package.json does not declare `liteship`, or when the layout is not
 * pnpm-strict (npm/yarn hoisted layouts expose the transitives).
 */
function probeLiteshipPnpm(cwd: string): DoctorCheck | null {
  const manifest = readCwdPackageJson(cwd);
  if (manifest.kind !== 'ok') return null;
  const deps = manifest.value['dependencies'] as Record<string, string> | undefined;
  const devDeps = manifest.value['devDependencies'] as Record<string, string> | undefined;
  if (!(deps?.['liteship'] ?? devDeps?.['liteship'])) return null;
  if (!existsSync(resolve(cwd, 'node_modules/.pnpm'))) return null;
  if (existsSync(resolve(cwd, 'node_modules/@czap'))) {
    return {
      id: 'liteship.pnpm',
      label: 'liteship (pnpm)',
      status: 'ok',
      detail: '@czap/* packages resolvable beside liteship',
    };
  }
  return {
    id: 'liteship.pnpm',
    label: 'liteship (pnpm)',
    status: 'warn',
    detail: 'liteship is installed under pnpm, which does not expose its transitive @czap/* packages to imports',
    hint: 'Declare what you import: pnpm add @czap/core @czap/astro (or hoist the scope with public-hoist-pattern[]=@czap/* in .npmrc)',
  };
}

function readCwdPackageJson(cwd: string): Readout<Record<string, unknown>> {
  const pkgPath = resolve(cwd, 'package.json');
  if (!existsSync(pkgPath)) return { kind: 'absent' };
  try {
    return { kind: 'ok', value: JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown> };
  } catch (e) {
    return unreadable(e);
  }
}

function readInstalledVersion(cwd: string, pkgName: string): Readout<string> {
  const pkgPath = resolve(cwd, 'node_modules', pkgName, 'package.json');
  if (!existsSync(pkgPath)) return { kind: 'absent' };
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return typeof pkg.version === 'string' ? { kind: 'ok', value: pkg.version } : { kind: 'absent' };
  } catch (e) {
    return unreadable(e);
  }
}

function hasDep(manifest: Record<string, unknown> | null, cwd: string, pkgName: string): boolean {
  const deps = manifest?.['dependencies'] as Record<string, string> | undefined;
  const devDeps = manifest?.['devDependencies'] as Record<string, string> | undefined;
  if (deps?.[pkgName] ?? devDeps?.[pkgName]) return true;
  return readInstalledVersion(cwd, pkgName).kind === 'ok';
}

function findAstroConfig(cwd: string): string | null {
  for (const name of ['astro.config.mjs', 'astro.config.ts', 'astro.config.js', 'astro.config.cjs']) {
    const path = resolve(cwd, name);
    if (existsSync(path)) return path;
  }
  return null;
}

function probeCloudflareAstro(cwd: string): DoctorCheck {
  const manifest = readCwdPackageJson(cwd);
  if (manifest.kind === 'unreadable') {
    return {
      id: 'cloudflare.astro',
      label: 'Astro',
      status: 'warn',
      detail: `package.json unreadable: ${manifest.detail}`,
      hint: 'Fix the JSON before trusting dependency probes',
    };
  }
  if (!hasDep(manifest.kind === 'ok' ? manifest.value : null, cwd, 'astro')) {
    return {
      id: 'cloudflare.astro',
      label: 'Astro',
      status: 'fail',
      detail: 'astro not in package.json or node_modules',
      hint: 'Add Astro 6+: pnpm add astro@^6',
    };
  }
  const installed = readInstalledVersion(cwd, 'astro');
  if (installed.kind === 'unreadable') {
    return {
      id: 'cloudflare.astro',
      label: 'Astro',
      status: 'warn',
      detail: `installed astro manifest unreadable: ${installed.detail}`,
      hint: 'Run pnpm install',
    };
  }
  if (installed.kind === 'absent') {
    return {
      id: 'cloudflare.astro',
      label: 'Astro',
      status: 'warn',
      detail: 'astro declared but package.json not resolved in node_modules',
      hint: 'Run pnpm install',
    };
  }
  const version = installed.value;
  const major = parseMajor(version);
  if (major === null || major < 6) {
    return {
      id: 'cloudflare.astro',
      label: 'Astro',
      status: 'fail',
      detail: `${version} (need >= 6 for @astrojs/cloudflare v13+)`,
      hint: 'Upgrade: pnpm add astro@^6',
    };
  }
  return { id: 'cloudflare.astro', label: 'Astro', status: 'ok', detail: version };
}

function probeCloudflareAdapter(cwd: string): DoctorCheck {
  const manifest = readCwdPackageJson(cwd);
  if (manifest.kind === 'unreadable') {
    return {
      id: 'cloudflare.adapter',
      label: '@astrojs/cloudflare',
      status: 'warn',
      detail: `package.json unreadable: ${manifest.detail}`,
      hint: 'Fix the JSON before trusting dependency probes',
    };
  }
  if (!hasDep(manifest.kind === 'ok' ? manifest.value : null, cwd, '@astrojs/cloudflare')) {
    return {
      id: 'cloudflare.adapter',
      label: '@astrojs/cloudflare',
      status: 'fail',
      detail: '@astrojs/cloudflare not in package.json or node_modules',
      hint: 'Add the adapter: pnpm add @astrojs/cloudflare@^13',
    };
  }
  const installed = readInstalledVersion(cwd, '@astrojs/cloudflare');
  if (installed.kind === 'unreadable') {
    return {
      id: 'cloudflare.adapter',
      label: '@astrojs/cloudflare',
      status: 'warn',
      detail: `installed adapter manifest unreadable: ${installed.detail}`,
      hint: 'Run pnpm install',
    };
  }
  if (installed.kind === 'absent') {
    return {
      id: 'cloudflare.adapter',
      label: '@astrojs/cloudflare',
      status: 'warn',
      detail: 'adapter declared but not resolved in node_modules',
      hint: 'Run pnpm install',
    };
  }
  const version = installed.value;
  const major = parseMajor(version);
  if (major === null || major < 13) {
    return {
      id: 'cloudflare.adapter',
      label: '@astrojs/cloudflare',
      status: 'warn',
      detail: `${version} (Astro 6 requires @astrojs/cloudflare v13+)`,
      hint: 'Upgrade: pnpm add @astrojs/cloudflare@^13',
    };
  }
  return { id: 'cloudflare.adapter', label: '@astrojs/cloudflare', status: 'ok', detail: version };
}

async function probeCloudflareWrangler(cwd: string): Promise<DoctorCheck> {
  const installed = readInstalledVersion(cwd, 'wrangler');
  const pkgVersion = installed.kind === 'ok' ? installed.value : null;
  const r = await spawnArgvCapture('wrangler', ['--version'], { cwd, timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(
    () => null,
  );
  if (r?.timedOut) {
    return {
      id: 'cloudflare.wrangler',
      label: 'Wrangler',
      status: 'warn',
      detail: `no response within ${DOCTOR_PROBE_TIMEOUT_MS}ms`,
      hint: 'Check wrangler directly: wrangler --version',
    };
  }
  const cliVersion = r && r.exitCode === 0 ? r.stdout.trim() : null;
  if (!cliVersion && installed.kind === 'unreadable') {
    return {
      id: 'cloudflare.wrangler',
      label: 'Wrangler',
      status: 'warn',
      detail: `wrangler not on PATH and installed manifest unreadable: ${installed.detail}`,
      hint: 'Run pnpm install',
    };
  }
  if (!cliVersion && !pkgVersion) {
    return {
      id: 'cloudflare.wrangler',
      label: 'Wrangler',
      status: 'warn',
      detail: 'wrangler not on PATH and not in node_modules',
      hint: 'Add Wrangler 4+: pnpm add -D wrangler@^4',
    };
  }
  const version = cliVersion ?? pkgVersion ?? 'unknown';
  const major = parseMajor(version);
  if (major !== null && major < 4) {
    return {
      id: 'cloudflare.wrangler',
      label: 'Wrangler',
      status: 'warn',
      detail: `${version} (recommend >= 4)`,
      hint: 'Upgrade: pnpm add -D wrangler@^4',
    };
  }
  return { id: 'cloudflare.wrangler', label: 'Wrangler', status: 'ok', detail: version };
}

function readWranglerConfig(cwd: string): Readout<string> {
  for (const name of ['wrangler.jsonc', 'wrangler.json', 'wrangler.toml']) {
    const path = resolve(cwd, name);
    if (existsSync(path)) {
      try {
        return { kind: 'ok', value: readFileSync(path, 'utf8') };
      } catch (e) {
        return unreadable(e);
      }
    }
  }
  return { kind: 'absent' };
}

function probeCloudflareConfig(cwd: string): DoctorCheck {
  const config = readWranglerConfig(cwd);
  if (config.kind === 'unreadable') {
    return {
      id: 'cloudflare.config',
      label: 'Wrangler config',
      status: 'warn',
      detail: `wrangler config present but unreadable: ${config.detail}`,
    };
  }
  if (config.kind === 'absent') {
    return {
      id: 'cloudflare.config',
      label: 'Wrangler config',
      status: 'warn',
      detail: 'no wrangler.jsonc / wrangler.toml (optional when using adapter defaults)',
      hint: 'Add wrangler.jsonc when you need KV/D1/R2 bindings — see docs/HOSTING.md',
    };
  }
  const raw = config.value;
  const issues: string[] = [];
  if (!/compatibility_date/i.test(raw)) issues.push('compatibility_date');
  if (!/nodejs_compat/i.test(raw)) issues.push('nodejs_compat');
  if (!/kv_namespaces/i.test(raw) && !/CZAP_BOUNDARY_CACHE/i.test(raw)) {
    issues.push('kv_namespaces binding for boundary cache');
  }
  if (issues.length > 0) {
    return {
      id: 'cloudflare.config',
      label: 'Wrangler config',
      status: 'warn',
      detail: `present but missing: ${issues.join(', ')}`,
      hint: 'Declare CZAP_BOUNDARY_CACHE in kv_namespaces when using @czap/edge boundary cache',
    };
  }
  return {
    id: 'cloudflare.config',
    label: 'Wrangler config',
    status: 'ok',
    detail: 'bindings and compatibility flags present',
  };
}

function probeCloudflareOutput(cwd: string): DoctorCheck {
  const configPath = findAstroConfig(cwd);
  if (!configPath) {
    return {
      id: 'cloudflare.output',
      label: 'Astro output mode',
      status: 'warn',
      detail: 'no astro.config.* found',
      hint: 'Set output: "server" and adapter: cloudflare() in astro.config',
    };
  }
  let raw = '';
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (e) {
    return {
      id: 'cloudflare.output',
      label: 'Astro output mode',
      status: 'warn',
      detail: `astro.config unreadable: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  const hasAdapter = /@astrojs\/cloudflare|cloudflare\s*\(/.test(raw);
  const hasServer = /output\s*:\s*['"]server['"]/.test(raw);
  if (!hasAdapter || !hasServer) {
    const missing = [!hasServer ? 'output: server' : null, !hasAdapter ? 'adapter: cloudflare()' : null]
      .filter(Boolean)
      .join(', ');
    return {
      id: 'cloudflare.output',
      label: 'Astro output mode',
      status: 'warn',
      detail: `astro.config may be missing ${missing}`,
      hint: 'Use output: "server" and adapter: cloudflare() for Workers SSR',
    };
  }
  return {
    id: 'cloudflare.output',
    label: 'Astro output mode',
    status: 'ok',
    detail: 'server output + cloudflare adapter',
  };
}

function probeCloudflareCsp(): DoctorCheck {
  return {
    id: 'cloudflare.csp',
    label: 'CSP / isolation',
    status: 'ok',
    detail: 'advisory — doctor cannot read deployed response headers',
    hint: "Host CSP: worker-src 'self' blob:; connect-src for SSE/LLM; add COOP/COEP if using client:worker",
  };
}

async function runCloudflareProbes(cwd: string): Promise<readonly DoctorCheck[]> {
  const minima = loadEngineMinima(cwd);
  const [pnpm, wrangler] = await Promise.all([probePnpm(minima), probeCloudflareWrangler(cwd)]);
  return [
    probeNode(minima),
    pnpm,
    probeConsumerInstalled(cwd),
    probeCloudflareAstro(cwd),
    probeCloudflareAdapter(cwd),
    wrangler,
    probeCloudflareConfig(cwd),
    probeCloudflareOutput(cwd),
    probeCloudflareCsp(),
  ];
}

/**
 * Generic consumer probe profile — auto-selected when `cwd` is not the
 * LiteShip workspace (root package.json name !== 'czap'). A consumer who
 * installed @czap/cli in their own app gets the environment checks that
 * apply to them (node, pnpm, install state, ffmpeg) instead of the
 * maintainer probes (packages/<pkg>/dist, scripts/link-pre-commit.ts,
 * crates/ WASM toolchain), which are all wrong outside this repo.
 * `--target` stays the explicit override for host-focused profiles.
 */
async function runConsumerProbes(cwd: string): Promise<readonly DoctorCheck[]> {
  const minima = loadEngineMinima(cwd);
  const pnpm = await probePnpm(minima);
  // liteship.pnpm is a consumer-context probe by definition (it reads the
  // host package.json for a liteship dependency) — it lives on this profile,
  // not the maintainer one, and skips itself (null) when inapplicable.
  const liteshipPnpm = probeLiteshipPnpm(cwd);
  return [
    probeNode(minima),
    pnpm,
    probeConsumerInstalled(cwd),
    ...(liteshipPnpm ? [liteshipPnpm] : []),
    probeFfmpegRenderCheck(),
  ];
}

async function runAllProbes(cwd: string, opts: RunProbesOptions = {}): Promise<readonly DoctorCheck[]> {
  if (opts.target === 'cloudflare') return runCloudflareProbes(cwd);
  if (!isLiteShipWorkspace(cwd)) return runConsumerProbes(cwd);
  const minima = loadEngineMinima(cwd);
  // The three external (spawn-bearing) probes are independent — run them
  // concurrently so the wall time is the slowest single probe, not the serial
  // sum of cargo + pnpm + git (CUT test-flake). Sync probes stay sync. Receipt
  // order below is preserved regardless of completion order.
  const [wasm, pnpm, gitConfig] = await Promise.all([probeWasmToolchain(cwd), probePnpm(minima), probeGitConfig(cwd)]);
  return [
    probeNode(minima),
    pnpm,
    probeWorkspaceInstalled(cwd),
    probeBuilt(cwd, 'core', '@czap/core build'),
    probeBuilt(cwd, 'cli', '@czap/cli build'),
    probeGitHooks(cwd),
    gitConfig,
    probePlaywright(cwd),
    probeFfmpegRenderCheck(),
    ...(wasm ? [wasm] : []),
  ];
}

function aggregate(checks: readonly DoctorCheck[]): DoctorVerdict {
  if (checks.some((c) => c.status === 'fail')) return 'blocked';
  if (checks.some((c) => c.status === 'warn')) return 'caution';
  return 'ready';
}

const VERDICT_SENTENCE: Record<DoctorVerdict, string> = {
  ready: 'Hull check: ready to sail.',
  caution: 'Hull check: caution — non-blocking warnings, but you can cast off.',
  blocked: 'Hull check: blocked — fix the failures before sailing.',
};

const VERDICT_COLOR: Record<DoctorVerdict, 'green' | 'yellow' | 'red'> = {
  ready: 'green',
  caution: 'yellow',
  blocked: 'red',
};

function prettySummary(checks: readonly DoctorCheck[], verdict: DoctorVerdict, fixes?: readonly DoctorFix[]): string {
  const on = colorEnabled();
  const lines: string[] = [];
  lines.push(header('czap doctor — preflight rig check', on));
  lines.push('');
  const widest = Math.max(...checks.map((c) => c.label.length));
  for (const c of checks) {
    const glyph = bearingGlyph(c.status, on);
    const pad = c.label.padEnd(widest, ' ');
    const detail = c.status === 'ok' ? color('dim', c.detail, on) : c.detail;
    lines.push(`  ${glyph}  ${pad}  ${detail}`);
    if (c.hint && c.status !== 'ok') {
      lines.push(`      ${' '.repeat(widest)}  ${arrow(on)} ${color('dim', c.hint, on)}`);
    }
  }
  if (fixes && fixes.length > 0) {
    lines.push('');
    lines.push(color('cyan', `Applied ${fixes.length} fix(es):`, on));
    for (const f of fixes) {
      const glyph = bearingGlyph(f.status === 'applied' ? 'ok' : 'fail', on);
      lines.push(`  ${glyph}  ${f.id}: ${f.action}${f.detail ? color('dim', `  (${f.detail})`, on) : ''}`);
    }
  }
  lines.push('');
  lines.push(color(VERDICT_COLOR[verdict], VERDICT_SENTENCE[verdict], on));
  return lines.join('\n') + '\n';
}

/** Attempt the cheap, local fixes for whatever checks are fixable. */
async function applyFixes(checks: readonly DoctorCheck[], cwd: string): Promise<readonly DoctorFix[]> {
  const fixes: DoctorFix[] = [];
  const inWorkspace = isLiteShipWorkspace(cwd);

  // Rebuild stale dist/ — covers both core.built and cli.built in one shot.
  // tsc --build trusts tsbuildinfo more than the filesystem, so invalidate
  // the per-package tsbuildinfo first; otherwise tsc no-ops when dist/ is
  // missing-but-tsbuildinfo-claims-up-to-date.
  const needsBuild = checks.some((c) => (c.id === 'core.built' || c.id === 'cli.built') && c.status === 'warn');
  if (needsBuild && !inWorkspace) {
    // Safety guard: refuse to run `pnpm run build` outside the LiteShip
    // workspace. See isLiteShipWorkspace doc for the security rationale.
    fixes.push({
      id: 'build',
      action: 'skipped: cwd is not the LiteShip workspace',
      status: 'failed',
      detail: 'doctor --fix only invokes pnpm run build when root package.json name === "czap"',
    });
  } else if (needsBuild) {
    // Package list is read from root package.json's build script, so adding a
    // new package to the build never silently desyncs this loop. `force:true`
    // closes the TOCTOU window between existsSync and rmSync.
    for (const pkg of loadBuiltPackages(cwd)) {
      const info = resolve(cwd, `packages/${pkg}/tsconfig.tsbuildinfo`);
      rmSync(info, { force: true });
    }
    // `spawnArgvVisible` keeps build progress on the user's terminal (piped
    // to stderr) while leaving our stdout clean — doctor's contract is JSON
    // receipt on stdout, and a plain stdio:'inherit' would interleave tsc's
    // per-package compile lines into that stream and break `jq` consumers.
    const r = await spawnArgvVisible('pnpm', ['run', 'build'], { cwd }).catch(() => ({
      exitCode: 1,
      stderrTail: 'spawn failed',
    }));
    fixes.push({
      id: 'build',
      action: 'pnpm run build (after invalidating tsbuildinfo)',
      status: r.exitCode === 0 ? 'applied' : 'failed',
      detail: r.exitCode === 0 ? undefined : `exit ${r.exitCode}`,
    });
  }

  // Link the pre-commit hook.
  // Keyed off `fixable`, not the warn status alone: an unresolved hooks dir
  // (corrupt .git pointer) also reports git.hooks/warn but linking the
  // pre-commit hook is not its remediation (Codex, PR #11).
  const needsHook = checks.some((c) => c.id === 'git.hooks' && c.status === 'warn' && c.fixable === true);
  if (needsHook && !inWorkspace) {
    // Same isLiteShipWorkspace guard as the build branch above
    // (Codex P1 follow-up on commit 3212fa4): scripts/link-pre-commit.ts
    // is resolved relative to cwd; running it from an unrelated project
    // would either execute that project's same-named script if it has
    // one, or fail in project-specific ways — same unintended-side-effect
    // class as the build guard prevents.
    fixes.push({
      id: 'git.hooks',
      action: 'skipped: cwd is not the LiteShip workspace',
      status: 'failed',
      detail:
        'doctor --fix only invokes pnpm exec tsx scripts/link-pre-commit.ts when root package.json name === "czap"',
    });
  } else if (needsHook) {
    // Same JSON-stdout-purity reason as the build invocation above.
    const r = await spawnArgvVisible('pnpm', ['exec', 'tsx', 'scripts/link-pre-commit.ts'], {
      cwd,
    }).catch(() => ({ exitCode: 1, stderrTail: 'spawn failed' }));
    fixes.push({
      id: 'git.hooks',
      action: 'link pre-commit',
      status: r.exitCode === 0 ? 'applied' : 'failed',
      detail: r.exitCode === 0 ? undefined : `exit ${r.exitCode}`,
    });
  }

  return fixes;
}

/**
 * Run all probes, emit a JSON receipt, optionally print a TTY summary.
 *
 * @param opts.pretty - when true, also write a human-readable summary to
 *   stderr. When omitted, pretty output is enabled whenever stderr is a
 *   TTY.
 * @param opts.fix - when true, attempt cheap local remediation (rebuild
 *   stale dist, link missing git hook) and re-probe after.
 * @param opts.ci - when true, treat any `warn` as exit-failing too. The
 *   verdict in the receipt stays honest (`caution`); only the exit code
 *   escalates. Use in CI workflows that should refuse to merge on warnings.
 * @returns process exit code: 0 when ready (and, without --ci, also caution).
 */
export async function doctor(
  opts: {
    pretty?: boolean;
    fix?: boolean;
    ci?: boolean;
    preflight?: boolean;
    target?: DoctorTarget;
    cwd?: string;
  } = {},
): Promise<number> {
  // Explicit cwd from tests/MCP is used verbatim (predictable fixtures).
  // Default behavior anchors probes to the workspace root so `czap doctor`
  // works correctly from any monorepo subdir, not just the repo root.
  const cwd = opts.cwd ?? findWorkspaceRoot(process.cwd());
  let checks = await runAllProbes(cwd, { target: opts.target });

  let fixes: readonly DoctorFix[] | undefined;
  if (opts.fix) {
    fixes = await applyFixes(checks, cwd);
    if (fixes.length > 0) checks = await runAllProbes(cwd, { target: opts.target });
  }

  const scoped = opts.preflight ? checks.filter((c) => !c.id.endsWith('.built')) : checks;
  const verdict = aggregate(scoped);
  const exitCode = verdict === 'blocked' || (opts.ci && verdict === 'caution') ? 1 : 0;
  const status: 'ok' | 'failed' = exitCode === 0 ? 'ok' : 'failed';

  const receipt: DoctorReceipt = {
    status,
    command: 'doctor',
    timestamp: new Date().toISOString(),
    verdict,
    checks,
    ...(fixes && fixes.length > 0 ? { fixed: fixes } : {}),
    ...(opts.ci ? { strict: true as const } : {}),
    ...(opts.preflight ? { preflight: true as const } : {}),
    ...(opts.target ? { target: opts.target } : {}),
  };
  emit(receipt);

  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (wantPretty) {
    process.stderr.write(prettySummary(checks, verdict, fixes));
    if (verdict === 'caution') {
      process.stderr.write(
        color(
          'dim',
          '  zsh paste trap: one command per line — no inline # comments with (parentheses).\n',
          colorEnabled(),
        ),
      );
    }
  }

  return exitCode;
}

/**
 * Read the @czap/cli package version off disk. Used by `czap version`.
 *
 * Resolution order:
 *   1. Module-relative — `packages/cli/{src,dist}/commands/doctor.{ts,js}`
 *      back to the cli package.json is `../../package.json` either way.
 *      Works from any cwd (monorepo subdir, global install, external project).
 *   2. cwd-relative fallback — for test seams that pass a synthesized cwd
 *      containing a `packages/cli/package.json` or root `package.json`.
 *
 * Returns `'0.0.0-unknown'` only if every candidate fails (unusual: would
 * indicate the package was unpacked without its own package.json).
 */
export function readCliVersion(cwd?: string): string {
  const candidates: string[] = [];
  try {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    candidates.push(resolve(moduleDir, '../../package.json'));
  } catch {
    // import.meta.url may be unavailable in odd contexts; fall through.
  }
  const root = cwd ?? process.cwd();
  candidates.push(resolve(root, 'packages/cli/package.json'));
  candidates.push(resolve(root, 'package.json'));
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const pkg = JSON.parse(readFileSync(path, 'utf8')) as { name?: string; version?: string };
    if (pkg.name === '@czap/cli' && typeof pkg.version === 'string') return pkg.version;
  }
  return '0.0.0-unknown';
}
