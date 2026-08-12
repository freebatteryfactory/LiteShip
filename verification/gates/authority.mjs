// One authority per concept.
//
// TypeScript cannot distinguish an imported authority from a structurally
// identical local twin. `ResidualProgram` imports `SourceRelation` from the
// compiler today; a future edit could replace that import with an identical
// local algebra and every type law would still pass, because to the compiler
// the two are the same type. Provenance is not a property types can express, so
// it is checked on the source.
//
// Two rules, both fail-closed:
//
//   Distinct tags   -- a brand or reference tag may be declared in one home.
//                      Two homes sharing one tag are one type wearing two
//                      names, and unrelated concepts become interchangeable.
//
//   Distinct names  -- an exported name may appear in several homes only when
//                      each declaration carries its own nominal tag. Web and
//                      server may both declare `ListenerId` because the brands
//                      are realm-scoped and sibling exclusion means the two
//                      never meet. An untagged structural type declared twice
//                      has no such defence.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, governedFiles } from '../harness.mjs';

const TAG = /Brand<[^,>]+,\s*'([^']+)'|Reference<\s*'([^']+)'/g;

/**
 * Tags introduced by the declaration beginning at `line`, to its blank line.
 *
 * The span is joined before matching. A formatter may wrap a declaration so its
 * tag lands on its own line, and scanning line by line would find no tag there
 * and report a lawful realm-scoped alias as an untagged twin.
 */
function tagsOfDeclaration(lines, line) {
  const span = [];
  for (let i = line; i < lines.length; i++) {
    if (i > line && lines[i].trim() === '') break;
    span.push(lines[i]);
  }
  return new Set([...span.join('\n').matchAll(TAG)].map((m) => m[1] ?? m[2]));
}

export function checkAuthority(root = REPO) {
  const violations = [];
  const tagHomes = new Map();
  const nameHomes = new Map();

  for (const rel of governedFiles(root)) {
    const lines = readFileSync(join(root, rel), 'utf8').split('\n');
    for (const m of lines.join('\n').matchAll(/Brand<[^,>]+,\s*'([^']+)'|Reference<\s*'([^']+)'/g)) {
      const tag = m[1] ?? m[2];
      if (!tagHomes.has(tag)) tagHomes.set(tag, new Set());
      tagHomes.get(tag).add(rel);
    }
    lines.forEach((text, i) => {
      const d = text.match(/^export (?:type|interface) (\w+)/);
      if (!d) return;
      if (!nameHomes.has(d[1])) nameHomes.set(d[1], []);
      nameHomes.get(d[1]).push({ rel, tags: tagsOfDeclaration(lines, i) });
    });
  }

  for (const [tag, homes] of tagHomes) {
    if (homes.size > 1) {
      violations.push(`nominal tag '${tag}' is declared in ${homes.size} homes: ${[...homes].join(', ')}`);
    }
  }

  for (const [name, decls] of nameHomes) {
    if (decls.length < 2) continue;
    const everyoneTagged = decls.every((d) => d.tags.size > 0);
    const allTags = decls.flatMap((d) => [...d.tags]);
    const distinct = new Set(allTags).size === allTags.length;
    if (!everyoneTagged || !distinct) {
      violations.push(
        `'${name}' is declared in ${decls.length} homes without distinct nominal tags: ` +
          decls.map((d) => d.rel).join(', '),
      );
    }
  }

  return violations;
}

if (process.argv[1]?.endsWith('authority.mjs')) {
  const violations = checkAuthority();
  for (const v of violations) console.log(`  VIOLATION ${v}`);
  console.log(`${violations.length === 0 ? 'PASS' : 'FAIL'} authority: ${violations.length} violation(s)`);
  process.exit(violations.length === 0 ? 0 : 1);
}
