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

/**
 * Lawful architecture whose comments quote the very things the rules look for.
 *
 * Stripping comments has to run in both directions. A gate that stopped reading
 * prose as code but started reading it as a violation would be no better: this
 * tree declares one authority, imports it, and uses it at the governed member,
 * while its comments contain a block-quoted declaration and a brand tag
 * belonging to another home. Before the strip, the block quote invented a
 * private twin and the quoted tag claimed a second home for `listener-id`.
 */
const LAWFUL_COMMENTED = {
  ...GRAMMAR,
  '01_hosts/web/03_event/types.ts':
    `export type ListenerId<Name extends string = string> = Brand<Name, 'liteship.web.listener-id'>;\n`,
  '00_core/14_compiler/types.ts': `export type SourceRelation = { readonly source: string };\n`,
  '00_core/15_program/types.ts':
    `import type { SourceRelation } from '../14_compiler/types.js';\n` +
    `/*\n` +
    `An earlier draft wrote the shape locally:\n` +
    `export type SourceRelation = { readonly source: string };\n` +
    `and web's listener brand is Brand<Name, 'liteship.web.listener-id'>.\n` +
    `Both are described here, and neither is declared here.\n` +
    `*/\n` +
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
  // Comments are prose about the code, never the code. Before the source was
  // stripped, each of these two passed: the rules matched raw characters, so a
  // comment quoting the governed relationship answered a question about it.
  ['a comment decoy standing in for the governed member', /does not use it at the governed relationship/, {
    ...GRAMMAR,
    '00_core/14_compiler/types.ts': `export type SourceRelation = { readonly source: string };\n`,
    // Import lawful, authority referenced, and a comment that quotes the exact
    // member the rule looks for -- while the member itself is a twin.
    '00_core/15_program/types.ts':
      `import type { SourceRelation } from '../14_compiler/types.js';\n` +
      `/** The residual program: \`readonly relation: SourceRelation;\` */\n` +
      `export type ResidualProgram = { readonly relation: { readonly source: string } };\n` +
      `export type ItIsStillReferenced = SourceRelation;\n`,
  }],
  ['a commented-out import standing in for a real one', /does not import 'SourceRelation'/, {
    ...GRAMMAR,
    '00_core/14_compiler/types.ts': `export type SourceRelation = { readonly source: string };\n`,
    // The specifier scan read this and resolved it to the correct owner.
    '00_core/15_program/types.ts':
      `// import type { SourceRelation } from '../14_compiler/types.js';\n` +
      `export type ResidualProgram = { readonly relation: { readonly source: string } };\n`,
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

const LAWFUL_CASES = [
  ['lawful tree passes (realm-scoped brands share a name; one owner is imported)', LAWFUL],
  ['lawful tree with comments quoting a twin declaration and a foreign tag passes', LAWFUL_COMMENTED],
];

for (const [label, files] of LAWFUL_CASES) {
  const root = build(files);
  const lawful = checkAuthority(root);
  rmSync(root, { recursive: true, force: true });
  if (lawful.length === 0) console.log(`  [ok] ${label}`);
  else {
    console.log(`  [!!] REJECTED -- ${label}`);
    for (const v of lawful) console.log(`       ${v}`);
    failures++;
  }
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

const total = FORBIDDEN.length + LAWFUL_CASES.length;
console.log(`${failures === 0 ? 'PASS' : 'FAIL'} authority self-test: ${total - failures}/${total} fixtures behaved`);
process.exit(failures === 0 ? 0 : 1);
