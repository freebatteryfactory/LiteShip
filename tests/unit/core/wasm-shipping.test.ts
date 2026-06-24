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
import { resolve, join } from 'node:path';
import { resolvePackagedWasm } from '../../../packages/vite/src/wasm-package-resolve.js';
import { wasmDistStaged } from '../../helpers/capabilities.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const corePkg = JSON.parse(readFileSync(join(REPO, 'packages/core/package.json'), 'utf8')) as {
  files: string[];
};
const rootPkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

describe('@czap/core ships the czap-compute WASM kernel', () => {
  it('ships the binary via the dist files allowlist (no export — it is a data file, not a module)', () => {
    // The wasm is located by the @czap/vite resolver as a filesystem path, not
    // imported as a module — so it must NOT be an `exports` subpath (a dangling
    // export of a build-on-demand artifact fails the package-export audit), but
    // it MUST be in `files` so `npm pack` includes dist/czap-compute.wasm.
    expect(corePkg.files).toContain('dist');
    const exportsMap = (JSON.parse(readFileSync(join(REPO, 'packages/core/package.json'), 'utf8')) as {
      exports: Record<string, unknown>;
    }).exports;
    expect('./czap-compute.wasm' in exportsMap).toBe(false);
  });

  it('the root build:wasm script drives scripts/build-wasm.ts', () => {
    expect(rootPkg.scripts['build:wasm']).toContain('scripts/build-wasm.ts');
    expect(existsSync(join(REPO, 'scripts/build-wasm.ts'))).toBe(true);
  });

  it('build-wasm.ts stages into @czap/core dist where the resolver expects it', () => {
    const src = readFileSync(join(REPO, 'scripts/build-wasm.ts'), 'utf8');
    expect(src).toContain('packages/core/dist/czap-compute.wasm');
  });

  it('the @czap/vite resolver finds @czap/core through the module graph (pnpm-nesting-safe)', () => {
    // Resolution lives in its own module (so tests can mock it). It resolves
    // @czap/core via THIS plugin's dep edge (import.meta.url) — NOT a top-level
    // node_modules/@czap/core probe, which a nested pnpm install would miss.
    const pkgResolve = readFileSync(join(REPO, 'packages/vite/src/wasm-package-resolve.ts'), 'utf8');
    expect(pkgResolve).toContain('import.meta.url');
    expect(pkgResolve).toContain("resolve('@czap/core')");
    const resolver = readFileSync(join(REPO, 'packages/vite/src/wasm-resolve.ts'), 'utf8');
    expect(resolver).toContain('resolvePackagedWasm');
    expect(resolver).toContain("source: 'package'");
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

// Functional: the resolver lands on the staged binary through the module graph.
// Self-skips until `build:wasm` has staged it (cargo runs only in rust-wasm-parity).
// The "absent → null" fall-through is exercised by the mocked plugin tests
// (vite-dx-wave3 / vite-runtime), since in-workspace @czap/core is always
// resolvable and can't be made genuinely absent here.
// Single-sourced in the canonical capability symbol table (same dist artifact) so the
// capability-gate linker can prove this guard derives from the `wasm-dist-staged` probe.
const staged = wasmDistStaged;
describe('resolvePackagedWasm', () => {
  it.skipIf(!staged)('resolves @czap/core dist/czap-compute.wasm via the module graph', () => {
    const resolved = resolvePackagedWasm();
    expect(resolved).not.toBeNull();
    expect(resolved!.endsWith(join('dist', 'czap-compute.wasm'))).toBe(true);
    expect(existsSync(resolved!)).toBe(true);
  });
});
