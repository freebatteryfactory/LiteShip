/**
 * WASM binary resolution -- locates the liteship-compute .wasm file.
 *
 * Searches for the compiled WASM binary in conventional locations:
 * 1. Configured path (if provided)
 * 2. crates/liteship-compute/target/wasm32-unknown-unknown/release/liteship_compute.wasm
 *    (monorepo dev — a fresh `pnpm run build:wasm` output)
 * 3. The artifact shipped inside `@liteship/core`, located through the module graph
 *    (the default for an installed consumer, who has no Rust crate to build).
 *    See {@link resolvePackagedWasm}. This is the branch that makes
 *    `liteship({ wasm: { enabled: true } })` "just work" off a plain npm install
 *    (0.2.1: before this, an installed consumer had nothing to resolve and
 *    silently ran the TS fallback).
 * 4. public/liteship-compute.wasm (host pre-copied — explicit override of last resort)
 *
 * @module
 */

import { fileExists } from './resolve-fs.js';
import { resolvePackagedWasm } from './wasm-package-resolve.js';
import * as path from 'node:path';

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
 * Render the conventional WASM search locations for diagnostics.
 */
export function formatWasmSearchPaths(projectRoot: string, configPath?: string): string {
  const paths: string[] = [];
  if (configPath) {
    const resolved = path.isAbsolute(configPath) ? configPath : path.join(projectRoot, configPath);
    paths.push(resolved);
  }
  paths.push(
    path.join(projectRoot, 'crates/liteship-compute/target/wasm32-unknown-unknown/release/liteship_compute.wasm'),
  );
  paths.push(resolvePackagedWasm() ?? '@liteship/core/dist/liteship-compute.wasm (resolved via @liteship/vite)');
  paths.push(path.join(projectRoot, 'public/liteship-compute.wasm'));
  return paths
    .map((candidate) => {
      if (!path.isAbsolute(candidate)) return candidate;
      const rel = path.relative(projectRoot, candidate);
      return rel.startsWith('..') ? candidate : rel;
    })
    .join(', ');
}

/**
 * Resolve the liteship-compute WASM binary path.
 */
export function resolveWASM(projectRoot: string, configPath?: string): WASMResolution | null {
  // 1. Configured path
  if (configPath) {
    const resolved = path.isAbsolute(configPath) ? configPath : path.join(projectRoot, configPath);
    if (fileExists(resolved, 'liteship/vite.wasm-resolve')) {
      return { filePath: resolved, source: 'config' };
    }
  }

  // 2. Rust crate build output (monorepo dev: a fresh `build:wasm`)
  const crateOutput = path.join(
    projectRoot,
    'crates/liteship-compute/target/wasm32-unknown-unknown/release/liteship_compute.wasm',
  );
  if (fileExists(crateOutput, 'liteship/vite.wasm-resolve')) {
    return { filePath: crateOutput, source: 'crate' };
  }

  // 3. The artifact shipped inside @liteship/core — the installed-consumer default,
  //    resolved through the module graph (pnpm-nesting-safe).
  const packaged = resolvePackagedWasm();
  if (packaged !== null) {
    return { filePath: packaged, source: 'package' };
  }

  // 4. Public directory (pre-copied — explicit last-resort override)
  const publicPath = path.join(projectRoot, 'public/liteship-compute.wasm');
  if (fileExists(publicPath, 'liteship/vite.wasm-resolve')) {
    return { filePath: publicPath, source: 'public' };
  }

  return null;
}
