/**
 * Source-grammar enforcement — proof harness for the ADR-0045 structural rules.
 *
 * ADR-0045 (docs/adr/0045-source-grammar.md) makes a package's directory layout
 * carry its specification: package boundary vs domain directory, the facade law
 * (a barrel is a pure named-re-export surface — no behavior, no wildcards),
 * types.ts purity (type-space only, erasable), and the grab-bag-filename ban.
 * Four ast-grep rules in sgrules/ enforce it in the gauntlet `lint:structural`
 * phase:
 *   - facade-only-reexports      (a) facades hold only re-exports/imports/comments
 *   - no-wildcard-facade-export  (b) no `export * from` in a facade
 *   - no-utils-file              (c) no utils.ts / helpers.ts / *-utils / *-helpers
 *   - types-file-purity          (d) no value declarations in a types.ts
 *
 * Every other sgrule is backstopped by a vitest meta-test that pins the SCARS
 * (float-determinism.test.ts, a1-seam-integrity.test.ts). Those rules ported an
 * existing hand-rolled guard, so their meta-test asserts the byte-level budget
 * and leaves the AST match to `lint:structural`. These four rules are NEW law
 * with no prior regex guard, so this harness proves the rules themselves fire:
 * for each rule it runs the REAL rule file (via ast-grep `scan --rule`) against a
 * RED fixture (must fire) and a GREEN fixture (must pass), plus a scope fixture
 * where scoping matters. Fixtures live under a temp tree whose paths mirror the
 * rule `files:` globs — ast-grep applies a rule only to paths its glob matches,
 * so the fixtures sit at `.../packages/<pkg>/src/<domain>/<file>` to be in scope.
 *
 * @module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnArgvCapture } from '@liteship/command/host';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

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
    ]) {
      expect(existsSync(resolve(SGRULES, r)), r).toBe(true);
    }
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
    const f = fixture('packages/core/src/internal/numeric.ts', 'export const clamp = (n: number) => n;\n');
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
