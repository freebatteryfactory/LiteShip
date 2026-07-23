/**
 * package-smoke pure helpers — the branch-heavy, spawn-FREE logic extracted from
 * the `package-smoke` subprocess-orchestration command so it can be unit-tested
 * directly (the ship.ts precedent: a pure-orchestration command earns coverage
 * exclusion ONLY once its composable pure helpers are extracted + tested).
 *
 * These four are the real decision logic the orchestrator composes:
 *  - {@link resolveExecutable} — the platform/npm_execpath executable resolution.
 *  - {@link tarballFileUrl} — the cross-platform `file://` URL for a tarball path
 *    (the Windows 8.3 short-path realpath fix-up).
 *  - {@link peerDependenciesOnly} — `PEER_INSTALLS` → a `{name: version}` map,
 *    splitting on the LAST `@` so scoped specifiers (`@scope/pkg@1.0.0`) parse.
 *  - {@link findConsumerDependencyRoot} — the three-strategy pnpm resolution
 *    (direct → hoisted `.pnpm/node_modules` → `.pnpm/<pkg>@ver/...` store scan).
 *
 * The remaining package-smoke.ts logic is pure subprocess orchestration
 * (`pnpm pack` ×N → `pnpm install` → `node smoke.mjs` → `liteship describe`) plus
 * `tar`-spawning manifest reads, so that file stays coverage-excluded.
 *
 * @module
 */
import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { IntegrityError } from '@liteship/error';

/**
 * Resolve the executable to spawn for `command`. `pnpm` invoked through an
 * `npm_execpath` is re-pointed at the current Node WHEN that entrypoint is a JS
 * file (the common pnpm CLI). But some setups point `npm_execpath` at a NATIVE
 * standalone binary (`@pnpm/exe`, e.g. Blacksmith runners' `setup-pnpm`), which
 * must be run DIRECTLY — `node <binary>` chokes on the ELF/Mach-O/PE header
 * (`SyntaxError: Invalid or unexpected token`). On Windows the `pnpm.cmd` shim
 * is required.
 */
export function resolveExecutable(command: string): string {
  const execpath = process.env['npm_execpath'];
  if (command === 'pnpm' && execpath) {
    // JS entrypoint → run via node; native binary → run it directly.
    return /\.[cm]?js$/i.test(execpath) ? process.execPath : execpath;
  }
  if (process.platform === 'win32' && command === 'pnpm') {
    return 'pnpm.cmd';
  }
  return command;
}

/**
 * Tarball path → `file://` URL for pnpm `dependencies` / `pnpm.overrides`.
 * Windows CI profiles often live under 8.3 short paths (`RUNNER~1`);
 * `pathToFileURL` percent-encodes `~` as `%7E`, which pnpm then can't find, so
 * the path is realpath-resolved first on win32.
 */
export function tarballFileUrl(absolutePath: string): string {
  const resolved = process.platform === 'win32' ? realpathSync.native(absolutePath) : absolutePath;
  return pathToFileURL(resolved).href;
}

/**
 * `PEER_INSTALLS` specifiers → a `{name: version}` map. Splits on the LAST `@` so
 * a scoped specifier (`@scope/pkg@1.0.0`) keeps its leading scope `@`.
 */
export function peerDependenciesOnly(peerInstalls: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    peerInstalls.map((specifier) => {
      const atIndex = specifier.lastIndexOf('@');
      return [specifier.slice(0, atIndex), specifier.slice(atIndex + 1)];
    }),
  );
}

/**
 * Resolve `packageName`'s install root under `consumerDir`, trying (1) the direct
 * `node_modules/<pkg>`, (2) the hoisted `node_modules/.pnpm/node_modules/<pkg>`,
 * then (3) a scan of the `.pnpm` store for a `<pkg>@ver/node_modules/<pkg>` entry.
 * Returns `undefined` when none resolve.
 */
export function findConsumerDependencyRoot(consumerDir: string, packageName: string): string | undefined {
  const segments = packageName.split('/');
  const direct = join(consumerDir, 'node_modules', ...segments);
  if (existsSync(join(direct, 'package.json'))) {
    return direct;
  }

  const hoisted = join(consumerDir, 'node_modules', '.pnpm', 'node_modules', ...segments);
  if (existsSync(join(hoisted, 'package.json'))) {
    return hoisted;
  }

  const store = join(consumerDir, 'node_modules', '.pnpm');
  if (!existsSync(store)) {
    return undefined;
  }

  const folderPrefix = `${packageName.replace('/', '+')}@`;
  for (const entry of readdirSync(store)) {
    if (!entry.startsWith(folderPrefix)) {
      continue;
    }
    const candidate = join(store, entry, 'node_modules', ...segments);
    if (existsSync(join(candidate, 'package.json'))) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Assert `packageName` resolves under `consumerDir` after install; throws a tagged
 * {@link IntegrityError} naming the package + node_modules when it does not (the
 * import-smoke could not otherwise resolve it).
 */
export function assertConsumerDependencyInstalled(consumerDir: string, packageName: string): void {
  if (!findConsumerDependencyRoot(consumerDir, packageName)) {
    throw IntegrityError(
      'package-smoke',
      `${packageName} missing from ${join(consumerDir, 'node_modules')} after install — import-smoke cannot resolve it.`,
    );
  }
}

/** The export-map facts needed to decide which public module paths execute. */
export interface ClosureSubpath {
  readonly packageName: string;
  readonly specifier: string;
  readonly runtimeTarget: string | null;
}

/** The package-catalog classification projected into package-smoke. */
export interface ClosurePackageSurface {
  readonly name: string;
  readonly runtimeSurface: 'module' | 'types-only';
}

/** Runtime paths split into positive imports and deliberate type-only refusals. */
export interface RuntimeClosurePartition {
  readonly imports: readonly string[];
  readonly refusals: readonly string[];
}

/**
 * Partition export-map runtime targets by the package catalog's declared runtime
 * surface. A type-only package may ship a default refusal stub for a useful error;
 * that stub is a negative runtime contract, not a positive module import.
 */
export function partitionRuntimeClosureSpecifiers(
  subpaths: readonly ClosureSubpath[],
  packages: readonly ClosurePackageSurface[],
): RuntimeClosurePartition {
  const surfaces = new Map(packages.map((pkg) => [pkg.name, pkg.runtimeSurface] as const));
  const imports: string[] = [];
  const refusals: string[] = [];
  for (const entry of subpaths) {
    if (entry.runtimeTarget === null) continue;
    const surface = surfaces.get(entry.packageName);
    if (surface === undefined) {
      throw IntegrityError('package-smoke', `public subpath ${entry.specifier} has no package-catalog runtime surface`);
    }
    (surface === 'types-only' ? refusals : imports).push(entry.specifier);
  }
  return { imports, refusals };
}

/** One differing file in a pair of semantic tarball closures. */
export interface SemanticClosurePathDiff {
  readonly path: string;
  readonly firstHash: string | null;
  readonly secondHash: string | null;
}

/** Bounded but count-complete semantic closure differences. */
export interface SemanticClosureDiff {
  readonly total: number;
  readonly paths: readonly SemanticClosurePathDiff[];
  readonly truncated: boolean;
}

/**
 * Compare two `{relative path -> content hash}` closures. The count covers every
 * difference while `paths` is deterministically bounded for receipts and CI logs.
 */
export function diffSemanticClosures(
  first: ReadonlyMap<string, string>,
  second: ReadonlyMap<string, string>,
  limit = 12,
): SemanticClosureDiff {
  const boundedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  const differing = [...new Set([...first.keys(), ...second.keys()])]
    .sort((a, b) => a.localeCompare(b))
    .filter((path) => first.get(path) !== second.get(path));
  return {
    total: differing.length,
    paths: differing.slice(0, boundedLimit).map((path) => ({
      path,
      firstHash: first.get(path) ?? null,
      secondHash: second.get(path) ?? null,
    })),
    truncated: differing.length > boundedLimit,
  };
}
