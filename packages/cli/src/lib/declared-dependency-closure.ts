/**
 * Declared-dependency closure — the package law minted from the Wave-8 fast-check
 * scar (issue #157).
 *
 * A package's SHIPPED LOAD-TIME import graph — the STATIC imports that execute when
 * a consumer does `import '@czap/X'`, walked from its MAIN entrypoint — may only
 * reach modules the package DECLARES (its own `dependencies`,
 * `optionalDependencies`, or `peerDependencies`) — plus Node builtins and its own
 * subpaths. A STATIC bare import satisfied SILENTLY by a root/hoisted dev
 * dependency, never declared by the package itself, is a leak: a fresh consumer
 * that installs only the package + its declared deps CRASHES on import. The monorepo
 * can conceal exactly this through root-level pnpm hoisting — `@czap/core` eagerly
 * imported `fast-check` (via `withArbitrary`) while declaring it nowhere, and only a
 * from-tarball consumer install surfaced it.
 *
 * SCOPE: static (load-time) imports only. A GUARDED dynamic `import()` is the
 * sanctioned optional-integration seam — e.g. `@czap/cli` lazily imports the
 * `@czap/mcp-server` sibling behind a try/catch + "not installed" teaching error,
 * deliberately undeclared to break the cli↔mcp dependency cycle. It never crashes a
 * fresh install (it degrades), so it is outside this load-time closure by design.
 *
 * This module owns the PURE decision (specifier classification + the violation
 * check). The sweep that walks each real package's emitted `dist` main-surface
 * graph and drives this check lives in
 * `tests/unit/devops/declared-dependency-closure.test.ts`. The check runs over the
 * EMITTED `.js` (never source): `tsc` erases type-only imports (`import type`,
 * `typeof import('x')`), so the shipped `.js` carries exactly the runtime imports —
 * a `typeof import('fast-check')` cast is NOT a runtime dependency and must never red.
 *
 * @module
 */

/** The Node builtins the closure treats as always-available (bare or `node:`-prefixed). */
const NODE_BUILTINS: ReadonlySet<string> = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
]);

/** True for a Node builtin specifier (`node:fs`, or the bare builtin name / a subpath of one). */
export function isNodeBuiltin(specifier: string): boolean {
  if (specifier.startsWith('node:')) return true;
  return NODE_BUILTINS.has(specifier.split('/')[0]!);
}

/**
 * True for a non-npm specifier resolved by a bundler/build-tool plugin rather than
 * `node_modules` — a scheme like `virtual:czap/…`, `astro:…`, `vite:…`. npm package
 * names never contain `:`, so a `:` in the specifier HEAD marks a build-tool
 * virtual (excluding `node:`, handled by {@link isNodeBuiltin}). These carry no
 * declared-dependency obligation.
 */
export function isBuildToolVirtual(specifier: string): boolean {
  if (specifier.startsWith('node:')) return false;
  return specifier.split('/')[0]!.includes(':');
}

/**
 * The installable package NAME of a bare specifier — the identifier a consumer
 * would declare: `@scope/name/sub` → `@scope/name`, `name/sub` → `name`.
 */
export function packageNameOfSpecifier(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? `${parts[0]}/${parts[1] ?? ''}` : parts[0]!;
}

/**
 * Extract bare (external) STATIC module specifiers from EMITTED `.js`:
 * `import`/`export … from` and side-effect `import 'x'` — the load-time imports.
 * Dynamic `import('x')` is deliberately EXCLUDED (the guarded optional-integration
 * seam). Relative (`./`, `../`, `/`) specifiers are the package's own graph, not deps.
 *
 * This is a lightweight regex helper for controlled input; the closure gate's sweep
 * over real emitted `.js` uses the TypeScript parser so import-like text inside
 * string literals is never miscounted (see the devops closure test).
 */
export function extractBareImportSpecifiers(js: string): readonly string[] {
  const specs: string[] = [];
  const patterns = [
    /(?:^|[^.\w])(?:import|export)\b[^;\n]*?\bfrom\s*['"]([^'"]+)['"]/g, // import/export … from 'x'
    /(?:^|[^.\w])import\s*['"]([^'"]+)['"]/g, // side-effect import 'x'
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(js)) !== null) {
      const spec = m[1]!;
      if (!spec.startsWith('.') && !spec.startsWith('/')) specs.push(spec);
    }
  }
  return specs;
}

/** One bare runtime import reached from a package's main entrypoint. */
export interface BareImport {
  readonly specifier: string;
  readonly file: string;
}

/** Inputs for the closure check of a single published package. */
export interface ClosureInput {
  readonly packageName: string;
  /** `dependencies` ∪ `optionalDependencies` ∪ `peerDependencies` package NAMES. */
  readonly declared: ReadonlySet<string>;
  /** Every bare runtime import reached from the package's main entrypoint. */
  readonly bareImports: readonly BareImport[];
}

/**
 * The bare runtime imports NOT satisfied by the package itself, a Node builtin, or
 * a DECLARED dependency — each a closure violation (a fresh consumer install would
 * fail to resolve it). Empty ⇒ the package's main surface is dependency-closed.
 */
export function declaredDependencyClosureViolations(input: ClosureInput): readonly string[] {
  const violations: string[] = [];
  const seen = new Set<string>();
  for (const { specifier, file } of input.bareImports) {
    if (isNodeBuiltin(specifier)) continue;
    if (isBuildToolVirtual(specifier)) continue; // virtual:/astro:/vite: — bundler-resolved, not npm
    const pkg = packageNameOfSpecifier(specifier);
    if (pkg === input.packageName) continue; // the package's own subpath
    if (input.declared.has(pkg)) continue;
    const key = `${pkg}@${file}`;
    if (seen.has(key)) continue;
    seen.add(key);
    violations.push(
      `${input.packageName}: ${file} imports "${specifier}" → package "${pkg}" is not a declared ` +
        `dependency / optionalDependency / peerDependency (a fresh consumer install would fail to resolve it)`,
    );
  }
  return violations;
}
