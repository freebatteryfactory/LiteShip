/**
 * The ONE type-directed `ts.Program` config — the shared parse substrate for the
 * checker-resolving passes (Slice B repo-IR builder + the capsule detector).
 *
 * This module is the single generic constructor for the `CompilerOptions` that
 * make a checker resolve host-supplied package imports to SOURCE `.ts` files rather than built
 * `.d.ts` — without which factory return types like `CapsuleDef<'cachedProjection',
 * ...>` collapse to `any` (the `.d.ts` re-imports a bare `@liteship/*` specifier the
 * checker has no resolver for). Hosts inject their path aliases so there is ONE
 * program constructor, never a silently-divergent configuration fork —
 * the exact drift Slice B exists to fight.
 *
 * @module
 */
import ts from 'typescript';
import { resolve } from 'node:path';

/** Host-supplied module specifier to source-path projection. */
export type TypeScriptPathAliases = Readonly<Record<string, readonly string[]>>;

/**
 * Build the shared {@link ts.CompilerOptions} for a type-directed program rooted
 * at `baseUrl` (the repo root the `@liteship/*` aliases resolve against). The options
 * are the proven capsule-detector configuration: strict, bundler resolution, the
 * `.ts`-source alias `paths`, and `noEmit` (the program is for the checker only).
 */
export function typeDirectedCompilerOptions(baseUrl: string, aliases: TypeScriptPathAliases = {}): ts.CompilerOptions {
  // Materialize the relative-path alias map for the TS resolver, rooted at baseUrl.
  const paths: Record<string, string[]> = {};
  for (const [k, vs] of Object.entries(aliases)) {
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
export function createTypeDirectedProgram(
  files: readonly string[],
  baseUrl: string = process.cwd(),
  aliases: TypeScriptPathAliases = {},
): ts.Program {
  return ts.createProgram({
    rootNames: files.map((f) => resolve(f)),
    options: typeDirectedCompilerOptions(baseUrl, aliases),
  });
}
