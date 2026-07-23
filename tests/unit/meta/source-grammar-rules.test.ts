/**
 * Source-grammar enforcement — proof harness for the ADR-0045 structural rules.
 *
 * ADR-0045 (docs/adr/0045-source-grammar.md) makes a package's directory layout
 * carry its specification: package boundary vs domain directory, the facade law
 * (a barrel is a pure named-re-export surface — no behavior, no wildcards),
 * types.ts purity (type-space only, erasable), and the grab-bag-filename ban.
 * Five ast-grep rules in sgrules/ enforce it in the gauntlet `lint:structural`
 * phase:
 *   - facade-only-reexports      (a) facades hold only re-exports/imports/comments
 *   - no-wildcard-facade-export  (b) no `export * from` in a facade
 *   - no-utils-file              (c) no utils.ts / helpers.ts / *-utils / *-helpers
 *   - types-file-purity          (d) no value declarations in a types.ts
 *   - no-shape-namespace-type    (e) the retired ADR-0001 `.Shape` convention stays dead (ADR-0046)
 *
 * The same harness also proves the testing-hygiene backstop from the runtime-seams
 * hotspot:
 *   - no-internal-vi-mock        (f) no direct `vi.mock` / `vi.doMock` of an internal
 *                                    @liteship/* package or relative reach; no alias,
 *                                    destructure, or computed-call bypass; node builtins
 *                                    + third-party specifiers stay legal (scope: `tests/**`)
 *   - no-reactive-make-factory   (g) the retired reactive `.make` factory spellings
 *                                    stay dead — the create* verb sweep (ADR-0051)
 *
 * Every other sgrule is backstopped by a vitest meta-test that pins the SCARS
 * (float-determinism.test.ts, a1-seam-integrity.test.ts). Those rules ported an
 * existing hand-rolled guard, so their meta-test asserts the byte-level budget
 * and leaves the AST match to `lint:structural`. These rules are NEW law
 * with no prior regex guard, so this harness proves the rules themselves fire:
 * for each rule it runs the REAL rule file (via ast-grep `scan --rule`) against a
 * RED fixture (must fire) and a GREEN fixture (must pass), plus a scope fixture
 * where scoping matters. Fixtures live under a temp tree whose paths mirror the
 * rule `files:` globs — ast-grep applies a rule only to paths its glob matches,
 * so the fixtures sit at `.../packages/<pkg>/src/<domain>/<file>` (or, for the
 * vi.mock ban, `.../tests/<...>.test.ts`) to be in scope.
 *
 * @module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnArgvCapture } from '@liteship/command/host';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import ts from 'typescript';
import { scaledTimeout } from '../../../vitest.shared.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const SGRULES = resolve(REPO, 'sgrules');
const SGCONFIG = resolve(REPO, 'sgconfig.yml');
const AST_GREP = resolve(REPO, 'node_modules', '.bin', 'ast-grep');

/**
 * Run ONE sgrule against ONE fixture file and return its match array. ast-grep
 * exits non-zero when it finds error-severity diagnostics; the JSON is still on
 * stdout, so we read the array off stdout regardless of exit code (spawnArgvCapture
 * resolves — never rejects — on a nonzero exit).
 */
async function scan(ruleFile: string, fixture: string): Promise<unknown[]> {
  const rule = resolve(SGRULES, ruleFile);
  const { stdout } = await spawnArgvCapture(AST_GREP, ['scan', '--rule', rule, fixture, '--json=compact'], {
    cwd: REPO,
  });
  return JSON.parse(stdout) as unknown[];
}

/** Write a fixture at a repo-relative-shaped path under the temp tree. */
let ROOT = '';
function fixture(relPath: string, source: string): string {
  const full = join(ROOT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, source, 'utf8');
  return full;
}

const TEST_TS_EXTENSION = /\.(?:ts|tsx|mts|cts)$/;
const VITEST_MODULE_METHODS = new Set(['mock', 'doMock']);
// Exact lexical families recognized by `vitestMockIndirections`: import alias,
// variable/destructuring assignment of `vi` or its module-mock methods, and a
// computed `vi[...]` call. Direct `vi.mock(...)` / `vi.doMock(...)` calls belong
// to ast-grep. Keeping this prefilter aligned with the AST detector avoids parsing
// every ordinary `vi.fn`/`vi.spyOn` test while preserving the full hidden-authority
// guard.
const POSSIBLE_VITEST_MOCK_INDIRECTION = /\bvi\s+as\b|=\s*vi\s*(?:[;,\)\r\n]|\.\s*(?:mock|doMock)\b)|\bvi\s*\[/;

function propertyText(name: ts.PropertyName | ts.BindingName | undefined): string | undefined {
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function isViIdentifier(node: ts.Node | undefined): node is ts.Identifier {
  return node !== undefined && ts.isIdentifier(node) && node.text === 'vi';
}

function viModuleMethod(expression: ts.Expression): string | undefined {
  if (ts.isPropertyAccessExpression(expression) && isViIdentifier(expression.expression)) {
    return VITEST_MODULE_METHODS.has(expression.name.text) ? expression.name.text : undefined;
  }
  if (ts.isElementAccessExpression(expression) && isViIdentifier(expression.expression)) {
    const method = expression.argumentExpression;
    return ts.isStringLiteral(method) && VITEST_MODULE_METHODS.has(method.text) ? method.text : undefined;
  }
  return undefined;
}

/**
 * Find syntax that hides Vitest's module-mock authority from the direct
 * ast-grep rule. These spellings are banned regardless of target: external
 * capabilities remain mockable through the explicit `vi.mock` / `vi.doMock`
 * forms, while aliases cannot launder an internal module reach.
 */
function vitestMockIndirections(source: string, fileName = 'fixture.test.ts'): readonly string[] {
  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  // Parent links are unnecessary when import aliases are inspected at the
  // ImportDeclaration owner below. Avoiding them keeps the repository-wide guard
  // cheap enough to run inside the concurrent unit lane without weakening it.
  const tree = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, false, scriptKind);
  const findings: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === 'vitest' &&
      node.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      for (const specifier of node.importClause.namedBindings.elements) {
        if (specifier.propertyName?.text === 'vi' && specifier.name.text !== 'vi') {
          findings.push(`aliased vi import:${specifier.getStart(tree)}`);
        }
      }
    }

    if (ts.isVariableDeclaration(node) && node.initializer) {
      if (ts.isIdentifier(node.name) && isViIdentifier(node.initializer)) {
        findings.push(`aliased vi object:${node.getStart(tree)}`);
      } else if (ts.isIdentifier(node.name) && viModuleMethod(node.initializer)) {
        findings.push(`aliased vi module method:${node.getStart(tree)}`);
      } else if (ts.isObjectBindingPattern(node.name) && isViIdentifier(node.initializer)) {
        const extractsModuleMethod = node.name.elements.some((element) => {
          const importedName = propertyText(element.propertyName) ?? propertyText(element.name);
          return importedName !== undefined && VITEST_MODULE_METHODS.has(importedName);
        });
        if (extractsModuleMethod) findings.push(`destructured vi module method:${node.getStart(tree)}`);
      }
    }

    if (ts.isCallExpression(node) && ts.isElementAccessExpression(node.expression) && viModuleMethod(node.expression)) {
      findings.push(`computed vi module call:${node.getStart(tree)}`);
    }

    ts.forEachChild(node, visit);
  }

  visit(tree);
  return findings;
}

async function repositoryTestTypeScriptFiles(): Promise<readonly string[]> {
  const tracked = await spawnArgvCapture('git', ['grep', '-l', '-E', '\\bvi\\b', '--', 'tests'], {
    cwd: REPO,
    captureBytes: 1024 * 1024,
  });
  if (tracked.exitCode !== 0 && tracked.exitCode !== 1) {
    throw new Error(`git grep failed while enumerating Vitest-mock candidates: ${tracked.stderr}`);
  }
  const untracked = await spawnArgvCapture('git', ['ls-files', '--others', '--exclude-standard', '--', 'tests'], {
    cwd: REPO,
    captureBytes: 1024 * 1024,
  });
  if (untracked.exitCode !== 0) {
    throw new Error(`git ls-files failed while enumerating untracked test candidates: ${untracked.stderr}`);
  }

  const candidates = new Set(tracked.stdout.split(/\r?\n/).filter((relative) => TEST_TS_EXTENSION.test(relative)));
  for (const relative of untracked.stdout.split(/\r?\n/).filter((path) => TEST_TS_EXTENSION.test(path))) {
    const source = readFileSync(resolve(REPO, relative), 'utf8');
    if (/\bvi\b/.test(source)) candidates.add(relative);
  }
  return [...candidates].map((relative) => resolve(REPO, relative));
}

beforeAll(() => {
  ROOT = mkdtempSync(join(tmpdir(), 'sgrules-fixtures-'));
});
afterAll(() => {
  if (ROOT) rmSync(ROOT, { recursive: true, force: true });
});

describe('source-grammar rules are registered with ast-grep', () => {
  it('sgconfig points ast-grep at the sgrules/ directory (so lint:structural runs them)', () => {
    // The rules only run if sgconfig lists `sgrules` under ruleDirs; the
    // float-determinism meta-test pins the same registration invariant.
    const cfg = readFileSync(SGCONFIG, 'utf8');
    expect(cfg).toMatch(/ruleDirs:\s*[\s\S]*-\s*sgrules/);
  });

  it('every source-grammar rule file exists under sgrules/', () => {
    for (const r of [
      'facade-only-reexports.yml',
      'no-wildcard-facade-export.yml',
      'no-utils-file.yml',
      'types-file-purity.yml',
      'no-shape-namespace-type.yml',
      'no-internal-vi-mock.yml',
      'no-internal-vi-mock-tsx.yml',
      'no-reactive-make-factory.yml',
    ]) {
      expect(existsSync(resolve(SGRULES, r)), r).toBe(true);
    }
  });
});

describe('no-reactive-make-factory (g) — the retired reactive `.make` spellings stay dead (ADR-0051)', () => {
  const RULE = 'no-reactive-make-factory.yml';

  it('RED: each retired reactive `.make` / `.makeBoundary` factory spelling fires (incl. generic-parameterized)', async () => {
    const f = fixture(
      'packages/faux/src/reactive/regress.ts',
      [
        'const a = Signal.make({ type: "viewport" });',
        'const b = LiveCell.make("state", 0);',
        'const c = LiveCell.makeBoundary(bnd, 0);',
        'const d = World.make();',
        'const e = BlendTree.make<{ x: number }>();',
        'const g = TokenBuffer.make<string>();',
        'const h = Component.make({ name: "x", styles: s });',
        'const i = Composable.make<Bag>({ a });',
        'const j = DirtyFlags.make(["x"]);',
        'const k = FrameBudget.make({ targetFps: 60 });',
        'const l = CompositorStatePool.make(4);',
        '',
      ].join('\n'),
    );
    // 11 retired spellings, one per line.
    expect((await scan(RULE, f)).length).toBe(11);
  });

  it('GREEN: the standalone `create*` verbs AND honest surviving `.make` factories pass', async () => {
    const f = fixture(
      'packages/faux/src/reactive/ok.ts',
      [
        'const a = createSignal({ type: "viewport" });',
        'const b = createLiveCell("state", 0);',
        'const c = createLiveCellBoundary(bnd, 0);',
        'const d = createWorld();',
        'const e = createBlendTree<{ x: number }>();',
        // Kept namespace members + honest surviving `.make` factories elsewhere in the fleet.
        'const s = Signal.controllable();',
        'const au = Signal.audio(bridge);',
        'const cmp = Composable.compose(x, y);',
        'const z = Zap.make<number>();',
        'const p = Plan.make("pipeline");',
        'const hlc = HLC.makeClock("node");',
        'const cw = ComposableWorld.make(w);',
        '',
      ].join('\n'),
    );
    expect((await scan(RULE, f)).length).toBe(0);
  });
});

describe('facade-only-reexports (a) — facades are pure re-export surfaces', () => {
  const RULE = 'facade-only-reexports.yml';

  it('RED: a domain facade with declarations + a side effect fires on each', async () => {
    const f = fixture(
      'packages/faux/src/domain/index.ts',
      [
        '/** @module */',
        "export { ok } from './ok.js';",
        'export const value = 1;',
        'function behavior() {}',
        'class Thing {}',
        'enum Color { Red }',
        'type LocalAlias = string;',
        'interface LocalShape { x: number }',
        'behavior();',
        '',
      ].join('\n'),
    );
    const hits = await scan(RULE, f);
    // const, function, class, enum, type-alias, interface, expression-statement = 7.
    expect(hits.length).toBe(7);
  });

  it('RED: the core ROOT facade (packages/core/src/index.ts) is also in scope', async () => {
    const f = fixture('packages/core/src/index.ts', 'export const localGuard = () => true;\n');
    expect((await scan(RULE, f)).length).toBe(1);
  });

  it('GREEN: named re-exports, type re-exports, and import-for-composition pass', async () => {
    const f = fixture(
      'packages/faux/src/greendomain/index.ts',
      [
        '/**',
        ' * `@faux/greendomain` — curated named re-exports only.',
        ' * @module',
        ' */',
        "import { Local } from './local.js';",
        'export { Local };',
        "export { alpha, beta } from './members.js';",
        "export type { Shape, Kind } from './members.js';",
        "export { gamma as renamed } from './other.js';",
        '',
      ].join('\n'),
    );
    expect((await scan(RULE, f)).length).toBe(0);
  });

  it('GREEN: nested liteship domain modules remain implementation owners, not facade entries', async () => {
    const f = fixture(
      'packages/liteship/src/authoring/adaptive.ts',
      'export function defineAdaptive() { return { kind: "adaptive" }; }\n',
    );
    expect((await scan(RULE, f)).length).toBe(0);
  });

  it('RED: top-level liteship subpath entries remain facade-only', async () => {
    const f = fixture('packages/liteship/src/schema.ts', 'export const localSchema = {} as const;\n');
    expect((await scan(RULE, f)).length).toBe(1);
  });

  it('RED: nested liteship index files remain facade-only', async () => {
    const f = fixture('packages/liteship/src/authoring/index.ts', 'export function localLowering() {}\n');
    expect((await scan(RULE, f)).length).toBe(1);
  });
});

describe('no-wildcard-facade-export (b) — a facade re-exports by name, never a star', () => {
  const RULE = 'no-wildcard-facade-export.yml';

  it('RED: `export * from` in a facade fires', async () => {
    const f = fixture('packages/faux/src/wild/index.ts', "export * from './everything.js';\n");
    expect((await scan(RULE, f)).length).toBe(1);
  });

  it('GREEN: explicit named + type re-exports pass', async () => {
    const f = fixture(
      'packages/faux/src/named/index.ts',
      ["export { one, two } from './members.js';", "export type { Three } from './members.js';", ''].join('\n'),
    );
    expect((await scan(RULE, f)).length).toBe(0);
  });
});

describe('no-utils-file (c) — no grab-bag filenames (core-scoped ratchet)', () => {
  const RULE = 'no-utils-file.yml';

  it('RED: utils.ts / helpers.ts / *-utils.ts / *-helpers.ts under core fire', async () => {
    for (const name of ['utils.ts', 'helpers.ts', 'string-utils.ts', 'dom-helpers.ts']) {
      const f = fixture(`packages/core/src/domain/${name}`, 'export const x = 1;\n');
      expect((await scan(RULE, f)).length, name).toBe(1);
    }
  });

  it('GREEN: a domain-named file under core passes', async () => {
    const f = fixture('packages/core/src/motion/clamp.ts', 'export const clamp = (n: number) => n;\n');
    expect((await scan(RULE, f)).length).toBe(0);
  });

  it('SCOPE: a grab-bag file in a NON-core package is out of scope (ratchet not yet widened)', async () => {
    const f = fixture('packages/compiler/src/css-utils.ts', 'export const x = 1;\n');
    expect((await scan(RULE, f)).length).toBe(0);
  });
});

describe('types-file-purity (d) — a types.ts is type-space only (core-scoped guard)', () => {
  const RULE = 'types-file-purity.yml';

  it('RED: value declarations in a core types.ts fire on each', async () => {
    const f = fixture(
      'packages/core/src/domain/types.ts',
      [
        'export const CONSTANT = 1;',
        'let mutable = 2;',
        'var legacy = 3;',
        'function build() {}',
        'class Impl {}',
        'enum E { A }',
        '',
      ].join('\n'),
    );
    // const, let, var, function, class, enum = 6.
    expect((await scan(RULE, f)).length).toBe(6);
  });

  it('GREEN: a core types.ts of only interfaces, type aliases, and type re-exports passes', async () => {
    const f = fixture(
      'packages/core/src/domain2/types.ts',
      [
        'export interface Shape { x: number }',
        'export type Alias = string | number;',
        "export type { Imported } from './elsewhere.js';",
        '',
      ].join('\n'),
    );
    expect((await scan(RULE, f)).length).toBe(0);
  });

  it('SCOPE: a value-bearing types.ts in a NON-core package is out of scope', async () => {
    const f = fixture('packages/mcp-server/src/lsp/types.ts', 'export const SEVERITY = { Error: 1 } as const;\n');
    expect((await scan(RULE, f)).length).toBe(0);
  });
});

describe('no-shape-namespace-type (e) — the ADR-0001 .Shape convention stays dead (ADR-0046)', () => {
  const RULE = 'no-shape-namespace-type.yml';

  it('RED: a namespace Shape member plus two qualified .Shape references fire on each', async () => {
    const f = fixture(
      'packages/faux/src/domain/boundary.ts',
      [
        'export declare namespace Faux {',
        '  export type Shape<T> = { readonly x: T };',
        '  export type Spec = string;',
        '}',
        'export function use(v: Faux.Shape<number>): void { void v; }',
        'type Alias = Faux.Shape;',
        '',
      ].join('\n'),
    );
    // namespace member `Shape` + 2 qualified `Faux.Shape` references = 3.
    expect((await scan(RULE, f)).length).toBe(3);
  });

  it('GREEN: a value-merged namespace carrying only non-Shape aux type members passes', async () => {
    const f = fixture(
      'packages/faux/src/domain/lifetime.ts',
      [
        'export const Lifetime = { make: () => ({}) };',
        'export declare namespace Lifetime {',
        '  export type Finalizer = () => void;',
        '}',
        'export interface LifetimeState { open: boolean }',
        '',
      ].join('\n'),
    );
    expect((await scan(RULE, f)).length).toBe(0);
  });

  it('GREEN: a top-level interface incidentally named Shape (outside any namespace) is not the retired pattern', async () => {
    const f = fixture('packages/faux/src/domain/geometry.ts', 'export interface Shape { readonly sides: number }\n');
    expect((await scan(RULE, f)).length).toBe(0);
  });
});

describe('no-internal-vi-mock (f) — internal module mocks are banned (tests-scoped)', () => {
  const RULE = 'no-internal-vi-mock.yml';

  // Assemble each `vi.mock(...)` fixture LINE by interpolating the specifier, so the
  // banned call+specifier pair (the mock verb immediately followed by a quoted
  // `@liteship/…` or a `../…` reach) never appears CONTIGUOUSLY in this meta-test's
  // own source — otherwise the fixture text would itself trip the reconcile grep
  // (and the very rule) it exists to prove. ast-grep still parses the WRITTEN
  // fixture file as a real `vi.mock` call.
  const q = "'";
  const mockCall = (method: 'mock' | 'doMock', spec: string, factory?: string): string =>
    factory === undefined ? `vi.${method}(${q}${spec}${q});` : `vi.${method}(${q}${spec}${q}, ${factory});`;

  it('RED: direct vi.mock and vi.doMock catch internal packages and relative reaches', async () => {
    const f = fixture(
      'tests/unit/faux/internal-mock.test.ts',
      [
        "import { vi } from 'vitest';",
        // A first-party package, auto-mock (1-arg) form.
        mockCall('mock', '@liteship/core'),
        // A relative reach into another module's src, factory (2-arg) form.
        mockCall('doMock', '../../packages/x/src/y.js', '() => ({ y: 1 })'),
        // A scoped subpath + importOriginal factory (multiline 2-arg) — still internal.
        `vi.mock(${q}@liteship/command/host${q}, async (importOriginal) => {`,
        '  const orig = await importOriginal();',
        '  return { ...orig };',
        '});',
        // A `./` relative reach.
        mockCall('doMock', './local.js', '() => ({})'),
        '',
      ].join('\n'),
    );
    // @liteship/core + ../../packages/x + @liteship/command/host + ./local = 4.
    expect((await scan(RULE, f)).length).toBe(4);
  });

  it('SCOPE: all supported TypeScript test extensions are governed', async () => {
    for (const extension of ['ts', 'tsx', 'mts', 'cts'] as const) {
      const f = fixture(
        `tests/unit/faux/internal-mock-${extension}.test.${extension}`,
        ["import { vi } from 'vitest';", mockCall('doMock', '@liteship/core'), ''].join('\n'),
      );
      const rule = extension === 'tsx' ? 'no-internal-vi-mock-tsx.yml' : RULE;
      expect((await scan(rule, f)).length, extension).toBe(1);
    }
  });

  it('GREEN: direct module mocks of node builtins and third-party capabilities pass', async () => {
    const f = fixture(
      'tests/unit/faux/external-mock.test.ts',
      [
        "import { vi } from 'vitest';",
        "vi.mock('node:fs');",
        "vi.doMock('vite');",
        // A node builtin with an importOriginal factory is legal too.
        "vi.mock('node:child_process', async (importOriginal) => {",
        '  const orig = await importOriginal();',
        '  return { ...orig };',
        '});',
        "vi.mock('node:dns/promises', () => ({}));",
        '',
      ].join('\n'),
    );
    expect((await scan(RULE, f)).length).toBe(0);
  });

  it('SCOPE: an internal vi.mock OUTSIDE tests/ (e.g. under a package src) is out of scope', async () => {
    const f = fixture(
      'packages/faux/src/domain/not-a-test.ts',
      ["import { vi } from 'vitest';", mockCall('mock', '@liteship/core'), ''].join('\n'),
    );
    expect((await scan(RULE, f)).length).toBe(0);
  });

  it('AST RED: alias, destructure, and computed-call spellings cannot bypass the direct rule', () => {
    const source = [
      "import { vi as mockAuthority } from 'vitest';",
      'const mockFacade = vi;',
      'const moduleMock = vi.mock;',
      'const { doMock: deferredModuleMock } = vi;',
      "vi['doMock']('@liteship/core');",
      '',
    ].join('\n');

    expect(POSSIBLE_VITEST_MOCK_INDIRECTION.test(source)).toBe(true);
    expect(vitestMockIndirections(source)).toHaveLength(5);
  });

  it('AST GREEN: explicit external capability mocks and unrelated Vitest APIs remain legal', () => {
    const source = [
      "import { vi } from 'vitest';",
      "vi.mock('node:fs');",
      "vi.doMock('vite');",
      'vi.spyOn(console, "warn");',
      'vi.useFakeTimers();',
      '',
    ].join('\n');

    expect(vitestMockIndirections(source)).toEqual([]);
  });

  it(
    'AST REPOSITORY GUARD: test sources contain no hidden Vitest module-mock authority',
    async () => {
      const findings = (await repositoryTestTypeScriptFiles()).flatMap((file) => {
        const source = readFileSync(file, 'utf8');
        if (!POSSIBLE_VITEST_MOCK_INDIRECTION.test(source)) return [];
        return vitestMockIndirections(source, file).map((finding) => `${file.slice(REPO.length + 1)}:${finding}`);
      });

      expect(findings).toEqual([]);
    },
    scaledTimeout(30_000),
  );
});
