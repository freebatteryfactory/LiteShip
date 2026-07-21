/**
 * Shared plumbing for the consumer-JOURNEY family (`pnpm run test:journey`).
 *
 * A journey is an END-TO-END consumer experience proven against REAL packed
 * artifacts and a REAL headless `astro build` — never a mock. The six journeys
 * (fresh-app, add-feature, debug-diagnostic, upgrade, package-author,
 * cold-agent-context) each return a {@link JourneyResult}; the `scripts/test-journey.ts`
 * orchestrator packs the workspace ONCE, runs them, prints a PASS/FAIL/GATE line
 * per journey, and exits 0 on all-green / 1 on any-fail.
 *
 * This module owns the machinery the tarball-consuming journeys (1, 2, 4) share:
 * packing every publishable scope in-workspace (REUSING `tests/support/pack.ts`),
 * scaffolding the `create-liteship` starter, rewriting its manifest to
 * `file://…tgz` deps + a `pnpm.overrides` map (MIRRORING
 * `packages/cli/src/commands/package-smoke.ts`), an offline-first install, and a
 * headless `astro build` + `data-liteship-*` HTML assertion (the
 * `tests/integration/astro/test.ts` pattern).
 *
 * SANDBOX HONESTY: a sub-step that genuinely cannot run in this sandbox (a real
 * network fetch, a real prior-published version) is ENV-GATED — reported as a
 * pass-with-note carrying a clear reason — never faked. The offline-detection
 * helper ({@link isOfflineOrNetworkError}) turns a store-miss with no reachable
 * registry into a gate rather than a spurious failure.
 *
 * @module
 */

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGES, PEER_INSTALLS } from '../../packages/command/src/commands/package-smoke-registry.js';
import { scaffold } from '../../packages/create-liteship/src/scaffold.js';
import { packInWorkspace } from '../support/pack.js';
import { tarballFileUrl } from '../../packages/cli/src/lib/package-smoke-helpers.js';
import { spawnArgvCapture } from '../../scripts/lib/spawn.js';
import { runPnpm, type PnpmRunResult } from '../../scripts/support/pnpm-process.js';

/** Absolute repo root (this file lives at `<root>/tests/journey/harness.ts`). */
export const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');

/** The verdict of one journey. `gated` is a pass-with-note (a sandbox-impossible sub-step). */
export type JourneyStatus = 'pass' | 'fail' | 'gated';

/** The structured outcome one journey reports to the orchestrator. */
export interface JourneyResult {
  /** The journey id (`journey-fresh-app`, …). */
  readonly name: string;
  /** Its verdict. */
  readonly status: JourneyStatus;
  /** A one-line human summary of what was proven (or why it failed / gated). */
  readonly detail: string;
  /** Any env-gate reasons or sub-step notes surfaced alongside the verdict. */
  readonly notes: readonly string[];
}

/** The packed-workspace context the tarball-consuming journeys (1, 2, 4) share. */
export interface PackedWorkspace {
  /** The scratch directory holding every `.tgz`. */
  readonly tarballDir: string;
  /** Publishable package name → its packed tarball path. */
  readonly tarballByName: ReadonlyMap<string, string>;
}

/** A journey throws this to signal a genuine assertion failure (distinct from an env-gate). */
export class JourneyAssertionError extends Error {}

/** Assert `condition`; on failure throw a {@link JourneyAssertionError} carrying `message`. */
export function journeyAssert(condition: boolean, message: string): void {
  if (!condition) throw new JourneyAssertionError(message);
}

/**
 * `PEER_INSTALLS` specifier (`name@version`, scope-safe on the LAST `@`) → its exact
 * pinned version. Used to install the consumer's `astro` / `typescript` at the exact
 * versions the warm store already holds, maximizing offline hits.
 */
export function peerVersion(name: string): string {
  for (const specifier of PEER_INSTALLS) {
    const at = specifier.lastIndexOf('@');
    if (specifier.slice(0, at) === name) return specifier.slice(at + 1);
  }
  throw new JourneyAssertionError(`PEER_INSTALLS has no pin for ${name}`);
}

/**
 * Pack EVERY publishable scope in-workspace (REUSING `packInWorkspace`, so
 * `catalog:`/`workspace:*` specs resolve to concrete ranges) into a fresh scratch
 * dir. `ignoreScripts` skips the `prepack` `tsc` rebuild — the dist is already
 * built in this phase, and the manifest transform is byte-identical with or
 * without it (per the pack owner's contract) — so packing 25 scopes stays fast.
 */
export async function packWorkspace(): Promise<PackedWorkspace> {
  const tarballDir = mkdtempSync(join(tmpdir(), 'liteship-journey-tarballs-'));
  const tarballByName = new Map<string, string>();
  for (const pkg of PACKAGES) {
    const tgz = await packInWorkspace(resolve(REPO_ROOT, pkg.dir), tarballDir, { ignoreScripts: true });
    tarballByName.set(pkg.name, tgz);
  }
  return { tarballDir, tarballByName };
}

/** Scaffold the `create-liteship` default starter into a fresh scratch app dir; returns its path. */
export function scaffoldConsumer(): string {
  const scratch = mkdtempSync(join(tmpdir(), 'liteship-journey-app-'));
  return scaffold('app', { cwd: scratch }).projectDir;
}

/** Options for {@link rewriteConsumerToTarballs}. */
export interface RewriteOptions {
  /**
   * The version SPEC written for the app's own `liteship` dependency (the manifest
   * range a consumer declares). `pnpm.overrides` force it to resolve to the packed
   * tarball regardless — the spec models "what the consumer's package.json says"
   * (e.g. a prior range in the upgrade journey). Defaults to the packed tarball URL.
   */
  readonly liteshipSpec?: string;
}

/**
 * Rewrite the scaffolded app's `package.json` so every `@liteship/*` scope (plus
 * the `liteship` umbrella and `create-liteship`) resolves to its packed
 * `file://…tgz` tarball via a `pnpm.overrides` map — MIRRORING how
 * `package-smoke.ts` builds its consumer. The app's DIRECT deps stay the real
 * consumer shape (`liteship` + `astro` + `typescript`); the overrides resolve the
 * umbrella's transitive workspace edges to the local tarballs. Writes a hoisted
 * `.npmrc` (the package-smoke precedent) so the umbrella's deep subpaths — e.g.
 * `@liteship/astro/client-directives/adaptive`, which astro's integration bundles —
 * resolve from the app root under pnpm's linker.
 */
export function rewriteConsumerToTarballs(appDir: string, packed: PackedWorkspace, options: RewriteOptions = {}): void {
  const overrides: Record<string, string> = {};
  for (const [name, tgz] of packed.tarballByName) overrides[name] = tarballFileUrl(tgz);

  const liteshipTgz = packed.tarballByName.get('liteship');
  journeyAssert(liteshipTgz !== undefined, 'packed workspace is missing the `liteship` umbrella tarball');

  const manifestPath = join(appDir, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  manifest['dependencies'] = {
    liteship: options.liteshipSpec ?? tarballFileUrl(liteshipTgz!),
    astro: peerVersion('astro'),
    typescript: peerVersion('typescript'),
  };
  manifest['pnpm'] = { overrides };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(appDir, '.npmrc'), ['node-linker=hoisted', 'public-hoist-pattern[]=*', ''].join('\n'));
}

/**
 * Install the consumer with `--prefer-offline` — the warm store (seeded by the
 * workspace install) satisfies the bulk; the file:// tarballs need no network; only
 * the handful of transitively-drifted external versions the store lacks are fetched.
 * A pure `--offline` run store-misses on those drifted versions (a fresh consumer
 * re-resolves ranges the workspace lockfile pinned differently), so `--prefer-offline`
 * is the design-sanctioned choice. When even that cannot reach a registry the caller
 * env-gates via {@link isOfflineOrNetworkError}.
 */
export async function installConsumer(appDir: string): Promise<PnpmRunResult> {
  return runPnpm(['install', '--prefer-offline'], { cwd: appDir, env: { FORCE_COLOR: '0' } });
}

/** Run a headless `astro build` in the consumer app (the `tests/integration/astro/test.ts` pattern). */
export async function astroBuild(appDir: string): Promise<PnpmRunResult> {
  return runPnpm(['exec', 'astro', 'build'], { cwd: appDir, env: { FORCE_COLOR: '0' } });
}

/** True when a pnpm failure is a store-miss with no reachable registry (an env-gate, not a bug). */
export function isOfflineOrNetworkError(text: string): boolean {
  return /ERR_PNPM_NO_OFFLINE|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|registry\.npmjs\.org|network|ERR_PNPM_META_FETCH_FAIL|getaddrinfo/i.test(
    text,
  );
}

/** Recursively collect every file under `dir` whose name ends with `ext`. */
export function findFiles(dir: string, ext: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findFiles(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

/** Decode the HTML entity encoding astro applies to an attribute VALUE (`&quot;` → `"`, …). */
export function htmlUnescape(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Remove a scratch directory, ignoring errors (best-effort cleanup in a `finally`). */
export function removeDir(dir: string | undefined): void {
  if (dir === undefined) return;
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best-effort: a leftover scratch dir under os.tmpdir() is harmless.
  }
}

/**
 * Run the repo's `packages/cli/src/bin.ts` via the workspace `tsx` in `cwd`, capturing
 * stdout/stderr — the canonical `liteship` CLI invocation a journey drives. Uses the
 * absolute `tsx` binary + absolute `bin.ts` path so `cwd` can be a scratch consumer
 * OUTSIDE the workspace (the CLI reads `process.cwd()` for its repo scope). Never
 * throws on a nonzero exit; resolves with the captured streams + exit code (the
 * canonical `spawnArgvCapture` helper, so subprocess coverage inheritance is preserved).
 */
export async function runLiteshipCli(
  args: readonly string[],
  cwd: string,
): Promise<{ readonly code: number; readonly stdout: string; readonly stderr: string }> {
  const tsx = resolve(REPO_ROOT, 'node_modules', '.bin', 'tsx');
  const bin = resolve(REPO_ROOT, 'packages', 'cli', 'src', 'bin.ts');
  const result = await spawnArgvCapture(tsx, [bin, ...args], { cwd });
  return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

/** Parse the last JSON object emitted on a CLI receipt stdout stream (tolerant of leading log lines). */
export function parseReceipt(stdout: string): Record<string, unknown> {
  const trimmed = stdout.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const line = trimmed
      .split('\n')
      .reverse()
      .find((l) => l.trim().startsWith('{'));
    if (line === undefined) throw new JourneyAssertionError(`no JSON receipt on stdout:\n${stdout.slice(0, 400)}`);
    return JSON.parse(line) as Record<string, unknown>;
  }
}
