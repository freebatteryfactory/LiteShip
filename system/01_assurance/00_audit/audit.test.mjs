/**
 * Self-tests for the two repository-control algorithms.
 *
 * The relevant count is not how many executable files exist. It is how many
 * hand-written algorithms are allowed to decide whether the repository passes
 * without permanent evidence that they reject the intended defect and accept a
 * lawful neighbour. There are two, both in the root `check`, and both have
 * already shipped a defect that turned a bad tree green:
 *
 * - the import audit read specifiers with a regular expression and could not
 *   see a side-effect import, so a planted sibling violation reported clean;
 * - its replacement accepted any identifier before `(`, so
 *   `ordinaryFunction('./x.js')` became an import edge.
 *
 * The second was found by review rather than by the canary that was supposed to
 * cover it, because that canary used `require` as its only call example and so
 * proved the mechanism accepted the string rather than that it discriminated.
 * Every test below therefore carries both directions: the defect it must reject
 * and the lawful neighbour it must admit.
 *
 * No manifest, registry, mutation bank, score, or waiver table. Two functions
 * and an end-to-end run, in one file, on the standard runner.
 */

import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { classify, moduleSpecifiers } from './import-boundary.mjs';
import { carriesExecutableContent } from './zero-runtime.mjs';

const AUDIT = join(import.meta.dirname, 'import-boundary.mjs');

// --- specifier extraction --------------------------------------------------

test('every import form is found', () => {
  const source = [
    "import type { A } from './type-only.js';",
    "import './side-effect.js';",
    'import D from "./double-quoted.js";',
    "const dyn = await import('./dynamic.js');",
    "export { B } from './reexport.js';",
    "export * from './star.js';",
    "import E = require('./eq-require.js');",
    "const r = require('./plain-require.js');",
  ].join('\n');

  assert.deepEqual(moduleSpecifiers(source), [
    './type-only.js',
    './side-effect.js',
    './double-quoted.js',
    './dynamic.js',
    './reexport.js',
    './star.js',
    './eq-require.js',
    './plain-require.js',
  ]);
});

test('a lawful call with a path-shaped argument is not an import', () => {
  const source = [
    "const label = ordinaryFunction('./relative-looking-value.js');",
    "const p = join('./not-an-import.js');",
    "const q = fs.require('./member-call.js');",
    "const s = `./template.js`;",
    "// import './commented.js';",
    "/* import './block-commented.js'; */",
    "const bare = './bare-string.js';",
  ].join('\n');

  assert.deepEqual(moduleSpecifiers(source), []);
});

// --- classification --------------------------------------------------------

test('the four refusals are classified, and lawful edges are not', () => {
  assert.equal(classify('00_core/01_encoding/types.ts', '01_hosts/web/types.ts'), 'DOWNSTREAM');
  assert.equal(classify('02_wires/types.ts', '02_targets/types.ts'), 'PEER');
  assert.equal(classify('02_targets/astro/types.ts', '02_targets/vite/types.ts'), 'SIBLING');
  assert.equal(classify('types.ts', '00_core/types.ts'), 'DOWNSTREAM');

  // The lawful neighbours. A numbered waterfall inside one layer is the most
  // common edge in the repository; an umbrella reaching into its own child is
  // direction-neutral and answered by cycle detection instead.
  assert.equal(classify('00_core/01_encoding/types.ts', '00_core/00_error/types.ts'), undefined);
  assert.equal(classify('01_hosts/web/types.ts', '00_core/00_error/types.ts'), undefined);
  assert.equal(classify('02_wires/types.ts', '02_wires/cli/types.ts'), undefined);
  assert.equal(classify('system/types.ts', '00_core/types.ts'), undefined);
});

// --- emitted content -------------------------------------------------------

test('an empty module is not executable content, and anything else is', () => {
  assert.equal(carriesExecutableContent('export {};\n'), false);
  assert.equal(carriesExecutableContent('export{};'), false);
  assert.equal(carriesExecutableContent('export const x = 1;\n'), true);
  assert.equal(carriesExecutableContent('console.log(1);\n'), true);
  assert.equal(carriesExecutableContent(''), true);
});

// --- end to end ------------------------------------------------------------

const withTree = (files, run) => {
  const root = mkdtempSync(join(tmpdir(), 'liteship-audit-test-'));
  try {
    for (const [path, text] of Object.entries(files)) {
      const full = join(root, path);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, text);
    }
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const audit = (root) => {
  try {
    return { code: 0, out: execFileSync(process.execPath, [AUDIT, root], { encoding: 'utf8' }) };
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
};

test('a lawful tree passes', () => {
  const result = withTree(
    {
      '00_core/00_error/types.ts': 'export type E = string;\n',
      '00_core/01_encoding/types.ts': "import type { E } from '../00_error/types.js';\nexport type X = E;\n",
    },
    audit,
  );

  assert.equal(result.code, 0);
  assert.match(result.out, /0 violations/u);
});

test('a side-effect sibling import is refused', () => {
  const result = withTree(
    {
      '02_targets/astro/types.ts': "import '../vite/types.js';\nexport type A = string;\n",
      '02_targets/vite/types.ts': 'export type V = string;\n',
    },
    audit,
  );

  assert.equal(result.code, 1);
  assert.match(result.out, /SIBLING/u);
});

test('an upstream band importing a downstream one is refused', () => {
  const result = withTree(
    {
      '00_core/types.ts': "import type { H } from '../01_hosts/types.js';\nexport type C = H;\n",
      '01_hosts/types.ts': 'export type H = string;\n',
    },
    audit,
  );

  assert.equal(result.code, 1);
  assert.match(result.out, /DOWNSTREAM/u);
});

test('two band-2 peers importing each other are refused', () => {
  const result = withTree(
    {
      '02_wires/types.ts': "import type { T } from '../02_targets/types.js';\nexport type W = T;\n",
      '02_targets/types.ts': 'export type T = string;\n',
    },
    audit,
  );

  assert.equal(result.code, 1);
  assert.match(result.out, /PEER/u);
});

test('a cycle is refused', () => {
  const result = withTree(
    {
      '02_wires/types.ts': "import type { D } from './direct/types.js';\nexport type W = D;\n",
      '02_wires/direct/types.ts': "import type { W } from '../types.js';\nexport type D = W;\n",
    },
    audit,
  );

  assert.equal(result.code, 1);
  assert.match(result.out, /CYCLE/u);
});

test('an unresolvable specifier is refused', () => {
  const result = withTree(
    { '00_core/types.ts': "import type { N } from './nowhere/types.js';\nexport type C = N;\n" },
    audit,
  );

  assert.equal(result.code, 1);
  assert.match(result.out, /UNRESOLVED/u);
});

test('the audit refuses an empty population rather than reporting it clean', () => {
  const result = withTree({ 'README.md': 'no sources here\n' }, audit);

  assert.equal(result.code, 1);
  assert.match(result.out, /nothing was inspected/u);
});
