/**
 * Locate the `czap-compute.wasm` artifact shipped inside `@czap/core`.
 *
 * Resolved through THIS plugin's own dependency edge — `@czap/vite` depends on
 * `@czap/core` — via `import.meta.url`, NOT the consumer's project root. That is
 * the canonical pnpm-nesting-safe "a package finds its dependency's asset"
 * pattern: it works even when the app installs only `@czap/astro`/`liteship` and
 * pnpm's strict linker keeps `@czap/core` out of top-level `node_modules`, and it
 * resolves the EXACT `@czap/core` this `@czap/vite` was built against (so the
 * kernel matches the plugin, not whatever version the app may also pin).
 *
 * Split into its own module so tests can `vi.mock` it to simulate a consumer
 * with no resolvable binary (a same-module internal call would be unmockable).
 *
 * @module
 */

import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileExists } from './resolve-fs.js';

/** Where the artifact sits inside a built/installed `@czap/core`. */
const CORE_WASM_DIST_PATH = 'dist/czap-compute.wasm';

/**
 * Walk up from a resolved module entry to the package root whose manifest
 * carries `pkgName` — condition-robust (works whether the entry resolved to
 * `dist/index.js` or the monorepo `src/index.ts` dev condition), so we always
 * land on the package directory rather than guessing a fixed depth.
 */
function packageRootFrom(entryPath: string, pkgName: string): string | null {
  let dir = path.dirname(entryPath);
  for (let depth = 0; depth < 10; depth++) {
    const manifest = path.join(dir, 'package.json');
    if (fileExists(manifest, 'czap/vite.wasm-resolve')) {
      try {
        if ((JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string }).name === pkgName) return dir;
      } catch {
        // Unreadable/!json manifest — keep walking.
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/**
 * Resolve `@czap/core`'s shipped `dist/czap-compute.wasm`, or `null` when
 * `@czap/core` (or its wasm) is absent — a 0.2.0 install, or none — so callers
 * fall through to the next WASM source.
 */
export function resolvePackagedWasm(): string | null {
  let coreEntry: string;
  try {
    // ESM resolution (import.meta.resolve), NOT createRequire: @czap/core's
    // exports are import-only (no `require`/`default` condition), so the CJS
    // resolver throws "No exports main defined". A build-time resolver must
    // NEVER throw — any resolution failure (not installed, predates the
    // artifact, unexpected) degrades to null so the build proceeds on the TS
    // fallback. The silent null is the designed contract, not laundering
    // (allowlisted in @czap/audit policy).
    coreEntry = fileURLToPath(import.meta.resolve('@czap/core'));
  } catch {
    return null;
  }
  const coreRoot = packageRootFrom(coreEntry, '@czap/core');
  if (coreRoot === null) return null;
  const wasm = path.join(coreRoot, CORE_WASM_DIST_PATH);
  return fileExists(wasm, 'czap/vite.wasm-resolve') ? wasm : null;
}
