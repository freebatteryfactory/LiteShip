/**
 * The ONE type-directed `ts.Program` config — the shared parse substrate for the
 * checker-resolving passes (Slice B repo-IR builder + the capsule detector).
 *
 * This module is the SINGLE SOURCE of the `WORKSPACE_ALIASES` (`@czap/* →
 * packages/*&#47;src/index.ts`) map and the `CompilerOptions` that make the checker
 * resolve cross-package imports to SOURCE `.ts` files rather than built
 * `.d.ts` — without which factory return types like `CapsuleDef<'cachedProjection',
 * ...>` collapse to `any` (the `.d.ts` re-imports a bare `@czap/*` specifier the
 * checker has no resolver for). It was lifted out of `scripts/lib/capsule-detector.ts`
 * (which now imports it) so there is ONE config, never a silently-divergent fork —
 * the exact drift Slice B exists to fight.
 *
 * @module
 */
import ts from 'typescript';
import { resolve } from 'node:path';

/**
 * Workspace `@czap/*` → source-tree path map. Mirrors `Config.toTestAliases` so
 * the type checker resolves cross-package imports to source `.ts` files, not
 * built `.d.ts` files (the ".ts source not .d.ts" trick). Drift against
 * `Config.toTestAliases` is pinned by `tests/unit/capsule-detector.test.ts`.
 */
export const WORKSPACE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  '@czap/canonical': ['packages/canonical/src/index.ts'],
  '@czap/genui': ['packages/genui/src/index.ts'],
  '@czap/core/testing': ['packages/core/src/testing.ts'],
  '@czap/core/harness': ['packages/core/src/harness/index.ts'],
  '@czap/core': ['packages/core/src/index.ts'],
  '@czap/quantizer/testing': ['packages/quantizer/src/testing.ts'],
  '@czap/quantizer': ['packages/quantizer/src/index.ts'],
  '@czap/compiler': ['packages/compiler/src/index.ts'],
  '@czap/web/lite': ['packages/web/src/lite.ts'],
  '@czap/web': ['packages/web/src/index.ts'],
  '@czap/detect': ['packages/detect/src/index.ts'],
  '@czap/vite/html-transform': ['packages/vite/src/html-transform.ts'],
  '@czap/vite': ['packages/vite/src/index.ts'],
  '@czap/astro/runtime': ['packages/astro/src/runtime/index.ts'],
  '@czap/astro': ['packages/astro/src/index.ts'],
  '@czap/stage/ffmpeg': ['packages/stage/src/ffmpeg.ts'],
  '@czap/stage': ['packages/stage/src/index.ts'],
  '@czap/remotion': ['packages/remotion/src/index.ts'],
  '@czap/scene/dev': ['packages/scene/src/dev/server.ts'],
  '@czap/scene': ['packages/scene/src/index.ts'],
  '@czap/assets': ['packages/assets/src/index.ts'],
  '@czap/audit': ['packages/audit/src/index.ts'],
  '@czap/cli': ['packages/cli/src/index.ts'],
  '@czap/mcp-server': ['packages/mcp-server/src/index.ts'],
  '@czap/edge': ['packages/edge/src/index.ts'],
  '@czap/cloudflare/testing': ['packages/cloudflare/src/testing.ts'],
  '@czap/cloudflare': ['packages/cloudflare/src/index.ts'],
  '@czap/worker': ['packages/worker/src/index.ts'],
  '@czap/_spine': ['packages/_spine/index.ts'],
};

/**
 * Build the shared {@link ts.CompilerOptions} for a type-directed program rooted
 * at `baseUrl` (the repo root the `@czap/*` aliases resolve against). The options
 * are the proven capsule-detector configuration: strict, bundler resolution, the
 * `.ts`-source alias `paths`, and `noEmit` (the program is for the checker only).
 */
export function typeDirectedCompilerOptions(baseUrl: string): ts.CompilerOptions {
  // Materialize the relative-path alias map for the TS resolver, rooted at baseUrl.
  const paths: Record<string, string[]> = {};
  for (const [k, vs] of Object.entries(WORKSPACE_ALIASES)) {
    paths[k] = vs.map((v) => `./${v}`);
  }
  return {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    strict: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    esModuleInterop: true,
    isolatedModules: true,
    noEmit: true,
    allowJs: false,
    resolveJsonModule: true,
    noUncheckedIndexedAccess: true,
    types: ['node'],
    baseUrl,
    paths,
  };
}

/**
 * Build a type-directed {@link ts.Program} over `files`, rooted at `baseUrl`
 * (default: `process.cwd()`). `createProgram` resolves transitively imported
 * files automatically, so the checker sees enough of the repo to resolve
 * cross-package types + factory wrappers. The single creation site for BOTH the
 * capsule detector and the repo-IR builder — there is no second config.
 */
export function createTypeDirectedProgram(files: readonly string[], baseUrl: string = process.cwd()): ts.Program {
  return ts.createProgram({
    rootNames: files.map((f) => resolve(f)),
    options: typeDirectedCompilerOptions(baseUrl),
  });
}
