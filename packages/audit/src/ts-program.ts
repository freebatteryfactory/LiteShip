/**
 * The ONE type-directed `ts.Program` config — the shared parse substrate for the
 * checker-resolving passes (Slice B repo-IR builder + the capsule detector).
 *
 * This module is the SINGLE SOURCE of the `WORKSPACE_ALIASES` (`@liteship/* →
 * packages/*&#47;src/index.ts`) map and the `CompilerOptions` that make the checker
 * resolve cross-package imports to SOURCE `.ts` files rather than built
 * `.d.ts` — without which factory return types like `CapsuleDef<'cachedProjection',
 * ...>` collapse to `any` (the `.d.ts` re-imports a bare `@liteship/*` specifier the
 * checker has no resolver for). It was lifted out of `scripts/lib/capsule-detector.ts`
 * (which now imports it) so there is ONE config, never a silently-divergent fork —
 * the exact drift Slice B exists to fight.
 *
 * @module
 */
import ts from 'typescript';
import { resolve } from 'node:path';

/**
 * Workspace `@liteship/*` → source-tree path map. Mirrors `Config.toTestAliases` so
 * the type checker resolves cross-package imports to source `.ts` files, not
 * built `.d.ts` files (the ".ts source not .d.ts" trick). Drift against
 * `Config.toTestAliases` is pinned by `tests/unit/capsule-detector.test.ts`.
 *
 * This is one of the `@liteship/*` roster copies whose canonical membership owner is
 * `scripts/gen-roster.ts` (`CANONICAL_ROSTER`). Unlike the full-fleet mirrors it
 * is deliberately a SUBSET — only the packages whose SOURCE the checker must
 * resolve carry an entry, and each entry adds hand-authored subpath aliases — so
 * it is not regenerated verbatim from the roster; the `capsule-detector`
 * drift-guard keeps it in step with `Config.toTestAliases`.
 */
export const WORKSPACE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  '@liteship/canonical': ['packages/canonical/src/index.ts'],
  '@liteship/genui': ['packages/genui/src/index.ts'],
  '@liteship/core/testing': ['packages/core/src/testing.ts'],
  '@liteship/core/harness': ['packages/core/src/harness/index.ts'],
  '@liteship/core/simulation': ['packages/core/src/simulation/index.ts'],
  '@liteship/core/fs-walk': ['packages/core/src/fs-walk.ts'],
  '@liteship/core/authoring': ['packages/core/src/authoring/index.ts'],
  '@liteship/core': ['packages/core/src/index.ts'],
  '@liteship/quantizer/testing': ['packages/quantizer/src/testing.ts'],
  '@liteship/quantizer': ['packages/quantizer/src/index.ts'],
  '@liteship/compiler/migrate': ['packages/compiler/src/migrate/index.ts'],
  '@liteship/compiler/parse': ['packages/compiler/src/parse/index.ts'],
  '@liteship/compiler': ['packages/compiler/src/index.ts'],
  '@liteship/web/lite': ['packages/web/src/lite.ts'],
  '@liteship/web': ['packages/web/src/index.ts'],
  '@liteship/detect': ['packages/detect/src/index.ts'],
  '@liteship/vite/html-transform': ['packages/vite/src/html-transform.ts'],
  '@liteship/vite': ['packages/vite/src/index.ts'],
  '@liteship/astro/runtime': ['packages/astro/src/runtime/index.ts'],
  '@liteship/astro': ['packages/astro/src/index.ts'],
  '@liteship/stage/ffmpeg': ['packages/stage/src/ffmpeg.ts'],
  '@liteship/stage': ['packages/stage/src/index.ts'],
  '@liteship/remotion': ['packages/remotion/src/index.ts'],
  '@liteship/scene/dev': ['packages/scene/src/dev/server.ts'],
  '@liteship/scene': ['packages/scene/src/index.ts'],
  '@liteship/assets': ['packages/assets/src/index.ts'],
  '@liteship/audit': ['packages/audit/src/index.ts'],
  '@liteship/cli': ['packages/cli/src/index.ts'],
  '@liteship/mcp-server': ['packages/mcp-server/src/index.ts'],
  '@liteship/edge': ['packages/edge/src/index.ts'],
  '@liteship/cloudflare/testing': ['packages/cloudflare/src/testing.ts'],
  '@liteship/cloudflare': ['packages/cloudflare/src/index.ts'],
  '@liteship/worker': ['packages/worker/src/index.ts'],
  '@liteship/_spine': ['packages/_spine/index.ts'],
};

/**
 * Build the shared {@link ts.CompilerOptions} for a type-directed program rooted
 * at `baseUrl` (the repo root the `@liteship/*` aliases resolve against). The options
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
