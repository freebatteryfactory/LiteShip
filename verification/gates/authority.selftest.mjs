// Anti-vacuity fixtures for the authority gate.
//
// The gate reports zero violations against the real tree. That is only evidence
// if it can also report one. In particular the `SourceRelation` twin must fail
// here, because no type law can see it -- the whole reason this gate exists.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import os from 'node:os';
import { checkAuthority } from './authority.mjs';

const build = (files) => {
  const root = mkdtempSync(join(os.tmpdir(), 'liteship-authority-'));
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return root;
};

const GRAMMAR = { 'types.d.ts': 'export type X = string;\n' };

const LAWFUL = {
  ...GRAMMAR,
  // The real pattern: one name, two realms, distinct brands. Sibling exclusion
  // means these types can never meet.
  '01_hosts/web/03_event/types.ts':
    `export type ListenerId<Name extends string = string> = Brand<Name, 'liteship.web.listener-id'>;\n`,
  '01_hosts/server/04_network/types.ts':
    `export type ListenerId<Name extends string = string> = Brand<Name, 'liteship.server.listener-id'>;\n`,
  // One owner, imported downstream.
  '00_core/14_compiler/types.ts': `export type SourceRelation = { readonly source: string };\n`,
  '00_core/15_program/types.ts':
    `import type { SourceRelation } from '../14_compiler/types.js';\n` +
    `export interface ResidualProgram {\n  readonly relation: SourceRelation;\n}\n`,
};

const FORBIDDEN = [
  ['a private local twin the name rule cannot see', /declares its own 'SourceRelation'/, {
    ...GRAMMAR,
    '00_core/14_compiler/types.ts': `export type SourceRelation = { readonly source: string };\n`,
    // Not exported, so the duplicate-name rule never sees it.
    '00_core/15_program/types.ts':
      `type SourceRelation = { readonly source: string };\nexport type ResidualProgram = { readonly relation: SourceRelation };\n`,
  }],
  ['the shape written inline instead of imported', /does not import 'SourceRelation'/, {
    ...GRAMMAR,
    '00_core/14_compiler/types.ts': `export type SourceRelation = { readonly source: string };\n`,
    '00_core/15_program/types.ts':
      `export type ResidualProgram = { readonly relation: { readonly source: string } };\n`,
  }],
  ['an import of the same name from the wrong owner', /imports 'SourceRelation' from 02_targets\/types.ts/, {
    ...GRAMMAR,
    '00_core/14_compiler/types.ts': `export type SourceRelation = { readonly source: string };\n`,
    // Every governed file is called types.ts, so a filename comparison accepts
    // this import happily.
    '02_targets/types.ts': `export type Unrelated = string;\n`,
    '00_core/15_program/types.ts':
      `import type { SourceRelation } from '../../02_targets/types.js';\nexport type ResidualProgram = { readonly relation: SourceRelation };\n`,
  }],
  ['a lawful import kept while the member goes inline', /does not use it at the governed relationship/, {
    ...GRAMMAR,
    '00_core/14_compiler/types.ts': `export type SourceRelation = { readonly source: string };\n`,
    // The import is real and the law below still references it, so both the
    // name rule and the import rule are satisfied while the member that
    // actually carries the contract has become a structural twin.
    '00_core/15_program/types.ts':
      `import type { SourceRelation } from '../14_compiler/types.js';\n` +
      `export type ResidualProgram = { readonly relation: { readonly source: string } };\n` +
      `export type ItIsStillReferenced = SourceRelation;\n`,
  }],
  ['a structurally identical exported twin', /'SourceRelation' is declared in 2 homes/, {
    ...GRAMMAR,
    '00_core/14_compiler/types.ts': `export type SourceRelation = { readonly source: string };\n`,
    '00_core/15_program/types.ts':
      `export type SourceRelation = { readonly source: string };\nexport type ResidualProgram = { readonly relation: SourceRelation };\n`,
  }],
  ['a divergent local twin of an imported authority', /'SourceRelation' is declared in 2 homes/, {
    ...GRAMMAR,
    '00_core/14_compiler/types.ts': `export type SourceRelation = { readonly source: string };\n`,
    '00_core/15_program/types.ts': `export type SourceRelation = { readonly other: number };\n`,
  }],
  ['one brand tag declared in two homes', /nominal tag 'liteship.component-id' is declared in 2 homes/, {
    ...GRAMMAR,
    '00_core/08_state/types.ts':
      `export type ComponentId<Name extends string = string> = Brand<Name, 'liteship.component-id'>;\n`,
    '00_core/13_stream/types.ts':
      `export type CatalogComponentId<Name extends string = string> = Brand<Name, 'liteship.component-id'>;\n`,
  }],
  ['one reference kind declared in two homes', /nominal tag 'artifact' is declared in 2 homes/, {
    ...GRAMMAR,
    '00_core/14_compiler/types.ts': `export type ArtifactReference = Reference<'artifact', string>;\n`,
    '02_targets/types.ts': `export type OtherArtifactReference = Reference<'artifact', string>;\n`,
  }],
];

let failures = 0;

const lawfulRoot = build(LAWFUL);
const lawful = checkAuthority(lawfulRoot);
rmSync(lawfulRoot, { recursive: true, force: true });
if (lawful.length === 0) {
  console.log('  [ok] lawful tree passes (realm-scoped brands share a name; one owner is imported)');
} else {
  console.log('  [!!] lawful tree REJECTED -- the gate refuses legal architecture');
  for (const v of lawful) console.log(`       ${v}`);
  failures++;
}

for (const [name, expected, files] of FORBIDDEN) {
  const root = build(files);
  const violations = checkAuthority(root);
  rmSync(root, { recursive: true, force: true });
  if (violations.some((v) => expected.test(v))) console.log(`  [ok] refused -- ${name}`);
  else {
    console.log(`  [!!] NOT REFUSED -- ${name}`);
    console.log(`       expected /${expected.source}/, got: ${violations.join(' | ') || '(none)'}`);
    failures++;
  }
}

const total = FORBIDDEN.length + 1;
console.log(`${failures === 0 ? 'PASS' : 'FAIL'} authority self-test: ${total - failures}/${total} fixtures behaved`);
process.exit(failures === 0 ? 0 : 1);
