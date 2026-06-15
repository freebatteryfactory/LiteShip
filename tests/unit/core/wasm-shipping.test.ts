/**
 * The czap-compute WASM kernel must SHIP — and stay shipped.
 *
 * `WASMDispatch` could always `load()` a `.wasm`, but until 0.2.1 no published
 * package CARRIED one, so an installed consumer's `czap({ wasm: { enabled:
 * true } })` resolved nothing and silently ran the f32 TS fallback forever (the
 * heyoub.dev dogfood finding). The fix is a chain of four facts that must move
 * together: `build:wasm` stages the binary → `@czap/core` exports it under
 * `./czap-compute.wasm` and includes `dist` in `files` → `release.yml` runs
 * `build:wasm` (with the wasm32 toolchain) BEFORE the ship loop packs the
 * tarball → `@czap/vite`'s resolver finds it in `node_modules`.
 *
 * This guard pins each link STATICALLY (no Rust toolchain needed) so a refactor
 * that drops any one of them fails loud here instead of shipping a hollow
 * escape hatch again. The functional half (the artifact actually builds and
 * resolves) self-skips unless `build:wasm` has run — it's exercised in the
 * `rust-wasm-parity` CI job, the one runner with cargo.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const corePkg = JSON.parse(readFileSync(join(REPO, 'packages/core/package.json'), 'utf8')) as {
  exports: Record<string, unknown>;
  files: string[];
};
const rootPkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

describe('@czap/core ships the czap-compute WASM kernel', () => {
  it('exports the artifact under a resolvable `./czap-compute.wasm` subpath', () => {
    // The exact specifier @czap/vite resolves from node_modules. A bare-string
    // export (not the `./*` JS wildcard) so `require.resolve` returns the raw
    // binary, not a `.js`.
    expect(corePkg.exports['./czap-compute.wasm']).toBe('./dist/czap-compute.wasm');
  });

  it('includes the dist directory in the published files allowlist', () => {
    // `build:wasm` stages into dist/; `files` is what npm pack actually ships.
    expect(corePkg.files).toContain('dist');
  });

  it('the root build:wasm script drives scripts/build-wasm.ts', () => {
    expect(rootPkg.scripts['build:wasm']).toContain('scripts/build-wasm.ts');
    expect(existsSync(join(REPO, 'scripts/build-wasm.ts'))).toBe(true);
  });

  it('build-wasm.ts stages into exactly the path the export points at', () => {
    const src = readFileSync(join(REPO, 'scripts/build-wasm.ts'), 'utf8');
    expect(src).toContain('packages/core/dist/czap-compute.wasm');
  });

  it('the @czap/vite resolver has a hermetic node_modules (@czap/core) branch', () => {
    const src = readFileSync(join(REPO, 'packages/vite/src/wasm-resolve.ts'), 'utf8');
    // Probes the project's OWN node_modules (not require.resolve, which would
    // leak a parent @czap/core) and yields the `'package'` source.
    expect(src).toContain('node_modules/@czap/core/dist/czap-compute.wasm');
    expect(src).toContain("source: 'package'");
  });

  it("release.yml builds the wasm (with the wasm32 toolchain) BEFORE the ship loop packs it", () => {
    const yml = readFileSync(join(REPO, '.github/workflows/release.yml'), 'utf8');
    const buildWasmAt = yml.indexOf('pnpm run build:wasm');
    const shipLoopAt = yml.indexOf('for pkg in');
    expect(buildWasmAt, 'release.yml must run `pnpm run build:wasm`').toBeGreaterThan(-1);
    expect(yml).toContain('wasm32-unknown-unknown');
    // Order matters: a tarball packed before the artifact is staged ships empty.
    expect(shipLoopAt, 'release.yml must have the per-package ship loop').toBeGreaterThan(-1);
    expect(buildWasmAt).toBeLessThan(shipLoopAt);
  });
});

// Functional: the export actually resolves to a real file. Self-skips until
// `build:wasm` has staged the binary (it has cargo only in rust-wasm-parity).
const staged = existsSync(join(REPO, 'packages/core/dist/czap-compute.wasm'));
describe.skipIf(!staged)('the shipped artifact resolves and exists on disk', () => {
  it('require.resolve(@czap/core/czap-compute.wasm) lands on the staged binary', () => {
    const require = createRequire(join(REPO, 'package.json'));
    const resolved = require.resolve('@czap/core/czap-compute.wasm');
    expect(resolved.endsWith('czap-compute.wasm')).toBe(true);
    expect(existsSync(resolved)).toBe(true);
  });
});
