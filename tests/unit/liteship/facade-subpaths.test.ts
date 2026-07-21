// @vitest-environment node
/**
 * The `liteship` curated-facade RESOLUTION + TYPE-CHECK gate (P13).
 *
 * The umbrella became a REAL curated facade: a budgeted root `.` authoring surface
 * plus twelve domain SUBPATHS (`liteship/schema`, `liteship/reactive`, …), each a
 * `src/<name>.ts` file of explicit named re-exports. This gate proves the promise a
 * consumer actually depends on:
 *
 *  1. RESOLVES — every declared subpath resolves through the package's `exports`
 *     map to its built `dist/<name>.d.ts`, under BOTH `node16` and `bundler` module
 *     resolution (the two a real downstream project uses). Resolution runs against a
 *     temp consumer whose `node_modules/liteship` symlinks the real package, so the
 *     `exports` map — not a `paths` alias — is what is exercised.
 *  2. TYPE-CHECKS — a tiny consumer that imports a real symbol from each subpath
 *     type-checks clean (no `Cannot find module` / `has no exported member`) under
 *     both resolutions, proving the re-export facade actually surfaces the symbol.
 *  3. BUDGET — the root's runtime value surface is a SUBSET of `ROOT_VALUE_BUDGET`
 *     (the allowlist the `gauntlet/facade-export-budget` gate enforces on the built
 *     d.ts), and neither budget kind exceeds its cap.
 *  4. HOST-FREE ROOT — importing the root `.` pulls NO host integration: the built
 *     `dist/index.js` imports only the host-free runtime scopes (`@liteship/core`,
 *     `@liteship/quantizer`, `@liteship/error`), never `@liteship/astro` /
 *     `@liteship/vite` / `@liteship/web` / `@liteship/compiler`.
 *
 * READS-DIST: the exports map's `types`/`import` conditions point at `dist`, so this
 * gate needs `liteship` (and its `@liteship/*` deps) built. The full-gate flow builds
 * before `pnpm test`; a stale/unbuilt tree fails the precondition with a build hint
 * rather than a cryptic resolution error.
 *
 * @module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ts from 'typescript';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT_VALUE_BUDGET, ROOT_TYPE_BUDGET } from '../../../packages/liteship/src/export-budget.js';
import * as Root from '../../../packages/liteship/src/index.js';
import { scaledTimeout } from '../../../vitest.shared.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const LITESHIP_PKG = resolve(REPO_ROOT, 'packages/liteship');
const ROOT_DTS = resolve(LITESHIP_PKG, 'dist/index.d.ts');
const ROOT_JS = resolve(LITESHIP_PKG, 'dist/index.js');

/**
 * One declared facade entry: the `exports` key, the bare specifier a consumer
 * writes, the `dist/<file>` its `types` condition must resolve to, and a real
 * exported symbol used to prove the re-export actually surfaces it.
 */
interface FacadeEntry {
  readonly subpath: string;
  readonly specifier: string;
  readonly dist: string;
  readonly symbol: string;
}

/** The thirteen declared facade entries — the root plus the twelve domain subpaths. */
const FACADE: readonly FacadeEntry[] = [
  { subpath: '.', specifier: 'liteship', dist: 'index.d.ts', symbol: 'defineBoundary' },
  { subpath: './schema', specifier: 'liteship/schema', dist: 'schema.d.ts', symbol: 'schema' },
  { subpath: './reactive', specifier: 'liteship/reactive', dist: 'reactive.d.ts', symbol: 'createCell' },
  { subpath: './motion', specifier: 'liteship/motion', dist: 'motion.d.ts', symbol: 'createTimeline' },
  { subpath: './graph', specifier: 'liteship/graph', dist: 'graph.d.ts', symbol: 'DAG' },
  { subpath: './media', specifier: 'liteship/media', dist: 'media.d.ts', symbol: 'Compositor' },
  { subpath: './evidence', specifier: 'liteship/evidence', dist: 'evidence.d.ts', symbol: 'chooseTier' },
  { subpath: './compiler', specifier: 'liteship/compiler', dist: 'compiler.d.ts', symbol: 'CSSCompiler' },
  { subpath: './runtime', specifier: 'liteship/runtime', dist: 'runtime.d.ts', symbol: 'Morph' },
  { subpath: './astro', specifier: 'liteship/astro', dist: 'astro.d.ts', symbol: 'adaptiveAttrs' },
  { subpath: './vite', specifier: 'liteship/vite', dist: 'vite.d.ts', symbol: 'plugin' },
  { subpath: './testing', specifier: 'liteship/testing', dist: 'testing.d.ts', symbol: 'resetCapsuleCatalog' },
  { subpath: './migrate', specifier: 'liteship/migrate', dist: 'migrate.d.ts', symbol: 'fromMediaQueries' },
];

/** Host-integration scopes the root `.` must NEVER pull into its module graph. */
const HOST_SCOPES = ['@liteship/astro', '@liteship/vite', '@liteship/web', '@liteship/compiler'] as const;

/** The host-free runtime scopes the root `.` is allowed to evaluate. */
const ROOT_RUNTIME_SCOPES = ['@liteship/core', '@liteship/quantizer', '@liteship/error'] as const;

/** Shared compiler options; only the module/resolution pair differs per mode. */
function optionsFor(mode: 'node16' | 'bundler'): ts.CompilerOptions {
  const resolution =
    mode === 'node16'
      ? { module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16 }
      : { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler };
  return {
    ...resolution,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    strict: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    esModuleInterop: true,
    noEmit: true,
    // The deps are consumed as built `.d.ts` (skipLibCheck'd); the consumer needs no
    // ambient @types, so keep the ambient set empty for a hermetic, fast program.
    types: [],
  };
}

/** The temp consumer sandbox: an empty ESM project whose only dep is `liteship`. */
let sandbox: string;

beforeAll(() => {
  if (!existsSync(ROOT_DTS)) {
    throw new Error(
      `packages/liteship/dist is not built — this gate resolves the exports map's built \`types\` condition. ` +
        `Run \`pnpm build\` (the full-gate flow builds before \`pnpm test\`).`,
    );
  }
  sandbox = mkdtempSync(join(tmpdir(), 'liteship-facade-'));
  // An ESM project (`type: module`) so node16 resolution treats the consumer files as
  // ESM — matching how a real downstream `liteship` app is authored.
  writeFileSync(join(sandbox, 'package.json'), `${JSON.stringify({ name: 'facade-consumer', type: 'module' }, null, 2)}\n`);
  const nm = join(sandbox, 'node_modules');
  mkdirSync(nm, { recursive: true });
  // The load-bearing setup: `liteship` is resolved as a real installed dep through its
  // `exports` map (a symlink to the workspace package), NOT a `paths` alias — so the
  // map itself is what the resolver + checker exercise.
  symlinkSync(LITESHIP_PKG, join(nm, 'liteship'), 'dir');
});

afterAll(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

/** Absolute path of the per-subpath consumer file inside the sandbox. */
function consumerPath(entry: FacadeEntry): string {
  const slug = entry.subpath === '.' ? 'root' : entry.subpath.replace(/[^a-z]/gi, '');
  return join(sandbox, `use-${slug}.ts`);
}

/** Consumer source: import a real symbol and bind it, so a missing export reds. */
function consumerSource(entry: FacadeEntry): string {
  return [
    `import { ${entry.symbol} } from '${entry.specifier}';`,
    // `: unknown =` proves the binding EXISTS + resolves without demanding its full
    // (skipLibCheck'd) declared type resolve error-free in a host-typed subpath.
    `const _used: unknown = ${entry.symbol};`,
    `export { _used };`,
    '',
  ].join('\n');
}

describe('liteship facade — subpath resolution (node16 + bundler)', () => {
  it('every declared subpath equals the package.json exports keys (no silent drift)', () => {
    const manifest = JSON.parse(readFileSync(join(LITESHIP_PKG, 'package.json'), 'utf8')) as {
      exports: Record<string, unknown>;
    };
    expect(Object.keys(manifest.exports).sort()).toEqual([...FACADE.map((e) => e.subpath)].sort());
  });

  for (const mode of ['node16', 'bundler'] as const) {
    it(`resolves every subpath to its built dist/*.d.ts under ${mode}`, () => {
      const options = optionsFor(mode);
      const host = ts.createCompilerHost(options);
      for (const entry of FACADE) {
        const containing = consumerPath(entry);
        const resolved = ts.resolveModuleName(entry.specifier, containing, options, host).resolvedModule;
        expect(resolved, `${entry.specifier} must resolve under ${mode}`).toBeDefined();
        const file = resolved!.resolvedFileName.replace(/\\/g, '/');
        expect(file, `${entry.specifier} (${mode}) should resolve to dist/${entry.dist}`).toContain(
          `/packages/liteship/dist/${entry.dist}`,
        );
      }
    });
  }
});

describe('liteship facade — consumer type-checks (node16 + bundler)', () => {
  for (const mode of ['node16', 'bundler'] as const) {
    it(
      `a consumer importing a symbol from every subpath type-checks under ${mode}`,
      { timeout: scaledTimeout(60_000) },
      () => {
        const files: string[] = [];
        for (const entry of FACADE) {
          const p = consumerPath(entry);
          writeFileSync(p, consumerSource(entry));
          files.push(p);
        }
        const program = ts.createProgram({ rootNames: files, options: optionsFor(mode) });
        // Only the consumer files are our concern; dep `.d.ts` are skipLibCheck'd.
        const consumerSet = new Set(files.map((f) => f.replace(/\\/g, '/')));
        const diagnostics = ts
          .getPreEmitDiagnostics(program)
          .filter((d) => d.file !== undefined && consumerSet.has(d.file.fileName.replace(/\\/g, '/')));
        const report = diagnostics.map((d) => {
          const where = d.file ? `${d.file.fileName}` : '<no file>';
          return `${where}: TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
        });
        expect(report, `consumer type-check diagnostics under ${mode}:\n${report.join('\n')}`).toEqual([]);
      },
    );
  }
});

describe('liteship facade — root export budget (subset + caps)', () => {
  it('every runtime value the root exports is listed in ROOT_VALUE_BUDGET', () => {
    const budget = new Set<string>(ROOT_VALUE_BUDGET);
    const unlisted = Object.keys(Root).filter((name) => !budget.has(name));
    expect(unlisted, `root value exports outside the budget allowlist: [${unlisted.join(', ')}]`).toEqual([]);
  });

  it('neither budget kind exceeds its 30-symbol cap', () => {
    expect(ROOT_VALUE_BUDGET.length).toBeLessThanOrEqual(30);
    expect(ROOT_TYPE_BUDGET.length).toBeLessThanOrEqual(30);
  });

  it('the budget allowlists carry no duplicate entries', () => {
    expect(new Set(ROOT_VALUE_BUDGET).size).toBe(ROOT_VALUE_BUDGET.length);
    expect(new Set(ROOT_TYPE_BUDGET).size).toBe(ROOT_TYPE_BUDGET.length);
  });
});

describe('liteship facade — the root is host-free', () => {
  it('the built dist/index.js pulls no host integration (astro/vite/web/compiler)', () => {
    const js = readFileSync(ROOT_JS, 'utf8');
    // Every `from '@liteship/…'` module specifier the emitted root evaluates.
    const scopes = new Set<string>();
    const re = /from\s*['"](@liteship\/[^'"]+)['"]/g;
    for (let m = re.exec(js); m !== null; m = re.exec(js)) scopes.add(m[1]!);

    for (const host of HOST_SCOPES) {
      expect([...scopes], `importing the root must not evaluate ${host}`).not.toContain(host);
    }
    // And what it DOES evaluate is a subset of the host-free runtime scopes — so the
    // astro-free property cannot be defeated by a NEW host dep the deny-list forgot.
    const allowed = new Set<string>(ROOT_RUNTIME_SCOPES);
    const rogue = [...scopes].filter((s) => !allowed.has(s));
    expect(rogue, `root evaluates unexpected scopes (only ${ROOT_RUNTIME_SCOPES.join(', ')} allowed): [${rogue.join(', ')}]`).toEqual([]);
  });

  it('the root d.ts type-only host re-exports are erased from the runtime graph', () => {
    // `@liteship/gauntlet` (Finding) is a TYPE-only root re-export: it must be erased
    // from the emitted JS, proving type-only host links never become runtime edges.
    // (The name still appears as DATA inside the `LITESHIP_PACKAGES` roster array — so
    // assert the absence of the module-EDGE form `from '@liteship/gauntlet'`, not the
    // bare substring.)
    const js = readFileSync(ROOT_JS, 'utf8');
    expect(js).not.toMatch(/from\s*['"]@liteship\/gauntlet['"]/);
  });
});
