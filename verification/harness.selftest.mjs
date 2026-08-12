// Anti-vacuity fixtures for the mutation harness itself.
//
// Every mutation total this repository reports rests on one assumption: that
// the unmutated tree compiles. If it does not, every mutation "dies" for a
// reason unrelated to the mutation and the bank awards a perfect score to a
// broken tree. That happened once, silently, and the guard was added in
// response. A guard demonstrated once by accident is not a guard; this proves
// it mechanically, and proves it does not simply reject everything.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import os from 'node:os';
import { runBank } from './harness.mjs';

const build = (files) => {
  const root = mkdtempSync(join(os.tmpdir(), 'liteship-harness-'));
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return root;
};

const GRAMMAR = `export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export type Assert<Value extends true> = Value;
`;

const LAWFUL = {
  'types.d.ts': GRAMMAR,
  '00_core/00_thing/types.ts':
    `import type { Assert, Equal } from '../../types.js';\n` +
    `export type Thing = 'a';\n` +
    `export type AThingIsA = Assert<Equal<Thing, 'a'>>;\n`,
};

const BROKEN = {
  ...LAWFUL,
  '00_core/01_broken/types.ts':
    `import type { Assert, Equal } from '../../types.js';\n` +
    `export type AlreadyRed = Assert<Equal<'x', 'y'>>;\n`,
};

const MUTATION = [
  ['the thing stops being a', '00_core/00_thing/types.ts', `export type Thing = 'a';`, `export type Thing = 'b';`],
];

let failures = 0;

console.log('  -- lawful baseline should score normally');
const lawfulRoot = build(LAWFUL);
const lawful = runBank('selftest-lawful', MUTATION, { laws: false, root: lawfulRoot });
rmSync(lawfulRoot, { recursive: true, force: true });
if (lawful.clean && lawful.caught === 1) {
  console.log('  [ok] a compiling baseline proceeds to scoring, and the mutation is caught');
} else {
  console.log(`  [!!] lawful baseline did not score: caught ${lawful.caught}/${lawful.total}, clean=${lawful.clean}`);
  failures++;
}

console.log('  -- broken baseline should refuse to score at all');
const brokenRoot = build(BROKEN);
const broken = runBank('selftest-broken', MUTATION, { laws: false, root: brokenRoot });
rmSync(brokenRoot, { recursive: true, force: true });
if (!broken.clean && broken.caught === 0 && broken.rows.length === 0) {
  console.log('  [ok] a red baseline refuses scoring instead of crediting the mutation');
} else {
  console.log(`  [!!] broken baseline still scored: caught ${broken.caught}/${broken.total}, clean=${broken.clean}`);
  failures++;
}

console.log(`${failures === 0 ? 'PASS' : 'FAIL'} harness self-test: ${2 - failures}/2 fixtures behaved`);
process.exit(failures === 0 ? 0 : 1);
