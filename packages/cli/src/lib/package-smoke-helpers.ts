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
 * (`pnpm pack` ×N → `pnpm install` → `node smoke.mjs` → `czap describe`) plus
 * `tar`-spawning manifest reads, so that file stays coverage-excluded.
 *
 * @module
 */
import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { IntegrityError } from '@czap/error';

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
