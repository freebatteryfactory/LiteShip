/**
 * WASM binary resolution -- locates the czap-compute .wasm file.
 *
 * Searches for the compiled WASM binary in conventional locations:
 * 1. Configured path (if provided)
 * 2. crates/czap-compute/target/wasm32-unknown-unknown/release/czap_compute.wasm
 *    (monorepo dev — a fresh `pnpm run build:wasm` output)
 * 3. The artifact shipped inside `@czap/core` in `node_modules`
 *    (`@czap/core/czap-compute.wasm`) — the default for an installed consumer,
 *    who has no Rust crate to build. This is the branch that makes
 *    `czap({ wasm: { enabled: true } })` "just work" off a plain npm install
 *    (0.2.1: before this, an installed consumer had nothing to resolve and
 *    silently ran the TS fallback).
 * 4. public/czap-compute.wasm (host pre-copied — explicit override of last resort)
 *
 * @module
 */

import { fileExists } from './resolve-fs.js';
import * as path from 'node:path';

/**
 * In-package location of the shipped artifact: the `./czap-compute.wasm` export
 * maps to `./dist/czap-compute.wasm`, so the file sits here under `@czap/core`.
 */
const CORE_WASM_PACKAGE_PATH = 'node_modules/@czap/core/dist/czap-compute.wasm';

/**
 * Resolve the artifact shipped inside `@czap/core` from `projectRoot`'s OWN
 * `node_modules`. A direct path probe (not `require.resolve`) so it stays
 * hermetic to `projectRoot` — `require.resolve` walks UP the directory tree and
 * would leak a parent/monorepo `@czap/core` into a project that doesn't have
 * one installed. pnpm's symlinked `@czap/core` resolves through transparently.
 * Returns `null` when `@czap/core` is absent or predates the shipped artifact
 * (a 0.2.0 install) so resolution falls through to the public/ override.
 */
function resolvePackagedWASM(projectRoot: string): string | null {
  const packaged = path.join(projectRoot, CORE_WASM_PACKAGE_PATH);
  return fileExists(packaged, 'czap/vite.wasm-resolve') ? packaged : null;
}

/**
 * Successful WASM-resolution result: the absolute binary path plus the
 * search step that found it (useful for diagnostics).
 */
export interface WASMResolution {
  /** Absolute filesystem path to the WASM binary. */
  readonly filePath: string;
  /** Which search step matched (`'config'`, `'crate'`, `'package'`, or `'public'`). */
  readonly source: 'config' | 'crate' | 'package' | 'public';
}

/**
 * Render the three conventional WASM search locations for diagnostics.
 */
export function formatWasmSearchPaths(projectRoot: string, configPath?: string): string {
  const paths: string[] = [];
  if (configPath) {
    const resolved = path.isAbsolute(configPath) ? configPath : path.join(projectRoot, configPath);
    paths.push(resolved);
  }
  paths.push(
    path.join(projectRoot, 'crates/czap-compute/target/wasm32-unknown-unknown/release/czap_compute.wasm'),
    path.join(projectRoot, CORE_WASM_PACKAGE_PATH),
    path.join(projectRoot, 'public/czap-compute.wasm'),
  );
  return paths
    .map((candidate) => {
      const rel = path.relative(projectRoot, candidate);
      return rel.startsWith('..') ? candidate : rel;
    })
    .join(', ');
}

/**
 * Resolve the czap-compute WASM binary path.
 */
export function resolveWASM(projectRoot: string, configPath?: string): WASMResolution | null {
  // 1. Configured path
  if (configPath) {
    const resolved = path.isAbsolute(configPath) ? configPath : path.join(projectRoot, configPath);
    if (fileExists(resolved, 'czap/vite.wasm-resolve')) {
      return { filePath: resolved, source: 'config' };
    }
  }

  // 2. Rust crate build output (monorepo dev: a fresh `build:wasm`)
  const crateOutput = path.join(
    projectRoot,
    'crates/czap-compute/target/wasm32-unknown-unknown/release/czap_compute.wasm',
  );
  if (fileExists(crateOutput, 'czap/vite.wasm-resolve')) {
    return { filePath: crateOutput, source: 'crate' };
  }

  // 3. The artifact shipped inside @czap/core (node_modules) — the installed
  //    consumer default. `require.resolve` already proves the file exists.
  const packaged = resolvePackagedWASM(projectRoot);
  if (packaged !== null) {
    return { filePath: packaged, source: 'package' };
  }

  // 4. Public directory (pre-copied — explicit last-resort override)
  const publicPath = path.join(projectRoot, 'public/czap-compute.wasm');
  if (fileExists(publicPath, 'czap/vite.wasm-resolve')) {
    return { filePath: publicPath, source: 'public' };
  }

  return null;
}
