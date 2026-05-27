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

import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arrow, bearingGlyph, color, colorEnabled, header } from '../lib/ansi.js';
import type { WallClockTimestamp } from '../receipts.js';
import { spawnArgvCapture, spawnArgvVisible } from '../lib/spawn.js';
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
 * doctor and the build never drift. Falls back to a static list if
 * package.json is unreadable.
 */
function loadBuiltPackages(cwd: string): readonly string[] {
  try {
    const pkgPath = resolve(cwd, 'package.json');
    if (!existsSync(pkgPath)) return [];
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: { build?: string } };
    const build = pkg.scripts?.build ?? '';
    const matches = Array.from(build.matchAll(/packages\/([\w-]+)/g));
    return matches.flatMap((m) => (m[1] ? [m[1]] : []));
  } catch {
    return [];
  }
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
 * the hooks live). Returns null when no `.git` is present.
 */
function resolveGitHooksDir(cwd: string): string | null {
  const dotGit = resolve(cwd, '.git');
  if (!existsSync(dotGit)) return null;
  try {
    if (statSync(dotGit).isDirectory()) {
      return resolve(dotGit, 'hooks');
    }
    // Worktree: `.git` is a file like `gitdir: /abs/path/.git/worktrees/foo`.
    const pointer = readFileSync(dotGit, 'utf8');
    const m = pointer.match(/^gitdir:\s*(.+)\s*$/m);
    if (!m) return null;
    const worktreeGitDir = resolve(cwd, m[1]!);
    // Hooks live in the main repo's gitdir, not the per-worktree one.
    // `commondir` (relative to worktreeGitDir) points there.
    const commondirFile = resolve(worktreeGitDir, 'commondir');
    if (existsSync(commondirFile)) {
      const commondir = resolve(worktreeGitDir, readFileSync(commondirFile, 'utf8').trim());
      return resolve(commondir, 'hooks');
    }
    return resolve(worktreeGitDir, 'hooks');
  } catch {
    return null;
  }
}

function probeGitHooks(cwd: string): DoctorCheck {
  const hooksDir = resolveGitHooksDir(cwd);
  if (hooksDir === null) {
    return { id: 'git.hooks', label: 'git hooks', status: 'ok', detail: 'no .git (not a worktree)' };
  }
  const hook = resolve(hooksDir, 'pre-commit');
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

function probePlaywright(cwd: string): DoctorCheck {
  // Playwright stashes browser binaries under ms-playwright/. We probe the
  // package.json + node_modules path rather than running playwright itself
  // to avoid a slow subprocess on every doctor call.
  const pwPkg = resolve(cwd, 'node_modules/@playwright/test/package.json');
  if (!existsSync(pwPkg)) {
    return {
      id: 'playwright.installed',
      label: 'Playwright',
      status: 'warn',
      detail: '@playwright/test not in node_modules (e2e tests will not run)',
      hint: 'Stow the browsers: pnpm install && pnpm exec playwright install',
    };
  }
  return { id: 'playwright.installed', label: 'Playwright', status: 'ok', detail: 'package present' };
}

async function probeGitConfig(cwd: string): Promise<DoctorCheck> {
  const gitDir = resolve(cwd, '.git');
  if (!existsSync(gitDir)) {
    return { id: 'git.config', label: 'git config', status: 'ok', detail: 'no .git (not a worktree)' };
  }
  const [email, name] = await Promise.all([
    spawnArgvCapture('git', ['config', '--get', 'user.email'], { cwd, timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(() => null),
    spawnArgvCapture('git', ['config', '--get', 'user.name'], { cwd, timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(() => null),
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

async function runAllProbes(cwd: string): Promise<readonly DoctorCheck[]> {
  const minima = loadEngineMinima(cwd);
  // The three external (spawn-bearing) probes are independent — run them
  // concurrently so the wall time is the slowest single probe, not the serial
  // sum of cargo + pnpm + git (CUT test-flake). Sync probes stay sync. Receipt
  // order below is preserved regardless of completion order.
  const [wasm, pnpm, gitConfig] = await Promise.all([
    probeWasmToolchain(cwd),
    probePnpm(minima),
    probeGitConfig(cwd),
  ]);
  return [
    probeNode(minima),
    pnpm,
    probeWorkspaceInstalled(cwd),
    probeBuilt(cwd, 'core', '@czap/core build'),
    probeBuilt(cwd, 'cli', '@czap/cli build'),
    probeGitHooks(cwd),
    gitConfig,
    probePlaywright(cwd),
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

/**
 * Verify that `cwd` looks like the LiteShip workspace before applyFixes
 * is allowed to run the build remediation. Without this guard, a user
 * running `czap doctor --fix` from an unrelated project would:
 *   1. `findWorkspaceRoot` falls back to that project's cwd (no
 *      pnpm-workspace.yaml above means start === fallback).
 *   2. core.built/cli.built warn because packages/core|cli/dist don't
 *      exist in that project.
 *   3. applyFixes runs `pnpm run build` against THAT project's package
 *      — executing arbitrary code the user didn't intend.
 *
 * Codex P1 (PR #3 discussion r3254680246). Fix: refuse to --fix unless
 * root package.json declares the @czap/* family (a name that's hard
 * to fake unintentionally).
 */
function isLiteShipWorkspace(cwd: string): boolean {
  const rootPkgPath = resolve(cwd, 'package.json');
  if (!existsSync(rootPkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(rootPkgPath, 'utf8')) as { name?: string };
    // Repo root's package.json names itself "czap"; the workspace itself
    // is the surface that owns the @czap/* package family.
    return pkg.name === 'czap';
  } catch {
    return false;
  }
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
  const needsHook = checks.some((c) => c.id === 'git.hooks' && c.status === 'warn');
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
  opts: { pretty?: boolean; fix?: boolean; ci?: boolean; cwd?: string } = {},
): Promise<number> {
  // Explicit cwd from tests/MCP is used verbatim (predictable fixtures).
  // Default behavior anchors probes to the workspace root so `czap doctor`
  // works correctly from any monorepo subdir, not just the repo root.
  const cwd = opts.cwd ?? findWorkspaceRoot(process.cwd());
  let checks = await runAllProbes(cwd);

  let fixes: readonly DoctorFix[] | undefined;
  if (opts.fix) {
    fixes = await applyFixes(checks, cwd);
    if (fixes.length > 0) checks = await runAllProbes(cwd);
  }

  const verdict = aggregate(checks);
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
  };
  emit(receipt);

  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (wantPretty) {
    process.stderr.write(prettySummary(checks, verdict, fixes));
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
