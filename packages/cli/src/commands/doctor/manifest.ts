/**
 * doctor — manifest & filesystem readers. Read-only probes of the
 * environment's on-disk state: package manifests, installed versions,
 * declared dependencies, Astro/Wrangler config, engine minima, the
 * build-script package list, and the workspace-root walk.
 *
 * Every function here is a pure read — no spawn, no world-mutation. They
 * speak the {@link Readout} vocabulary so a corrupt file is reported, never
 * collapsed into "absent".
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { type EngineMinima, type Readout, parseEngineMajor, unreadable } from './types.js';

/**
 * Walk up from `start` until a workspace marker is found. Probes need
 * the workspace root, not the caller's cwd — running `liteship doctor` from
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

export function loadEngineMinima(cwd: string): EngineMinima {
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
 * Read the buildable package list out of root tsconfig.json's project
 * references so the doctor and the build never drift. The root `build`
 * script is now a bare `tsc --build`: build topology lives in the root
 * tsconfig's `references`, so that is the source of truth for which
 * per-package `tsbuildinfo` files the doctor must invalidate. No catch:
 * every caller is gated by `isLiteShipWorkspace(cwd)`, so a parse failure
 * here is a real bug and must surface, not silently skip tsbuildinfo
 * invalidation (which would let `pnpm run build` no-op against stale dist/).
 */
export function loadBuiltPackages(cwd: string): readonly string[] {
  const tsconfigPath = resolve(cwd, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) return [];
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8')) as {
    references?: ReadonlyArray<{ path: string }>;
  };
  return (tsconfig.references ?? []).flatMap((reference) => {
    const match = /^\.\/packages\/([\w-]+)$/.exec(reference.path);
    return match?.[1] ? [match[1]] : [];
  });
}

export function readCwdPackageJson(cwd: string): Readout<Record<string, unknown>> {
  const pkgPath = resolve(cwd, 'package.json');
  if (!existsSync(pkgPath)) return { kind: 'absent' };
  try {
    return { kind: 'ok', value: JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown> };
  } catch (e) {
    return unreadable(e);
  }
}

export function readInstalledVersion(cwd: string, pkgName: string): Readout<string> {
  const pkgPath = resolve(cwd, 'node_modules', pkgName, 'package.json');
  if (!existsSync(pkgPath)) return { kind: 'absent' };
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return typeof pkg.version === 'string' ? { kind: 'ok', value: pkg.version } : { kind: 'absent' };
  } catch (e) {
    return unreadable(e);
  }
}

export function hasDep(manifest: Record<string, unknown> | null, cwd: string, pkgName: string): boolean {
  const deps = manifest?.['dependencies'] as Record<string, string> | undefined;
  const devDeps = manifest?.['devDependencies'] as Record<string, string> | undefined;
  if (deps?.[pkgName] ?? devDeps?.[pkgName]) return true;
  return readInstalledVersion(cwd, pkgName).kind === 'ok';
}

export function findAstroConfig(cwd: string): string | null {
  for (const name of ['astro.config.mjs', 'astro.config.ts', 'astro.config.js', 'astro.config.cjs']) {
    const path = resolve(cwd, name);
    if (existsSync(path)) return path;
  }
  return null;
}

export function readWranglerConfig(cwd: string): Readout<string> {
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
