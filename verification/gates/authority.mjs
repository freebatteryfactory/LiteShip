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
//
//   Canonical use   -- a declared authority is owned by one home and reached by
//                      its consumers through an import from that home. This
//                      catches the private and inline twins the name rule
//                      cannot see.
//
// What this gate does NOT catch: a structurally identical authority copied
// under a different name. Finding those needs normalised structural comparison
// across the whole tree, which belongs to the derived authority index in system
// assurance. The rules here are narrow and should be described as narrow.

import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { REPO, governedFiles, posix } from '../harness.mjs';

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

/**
 * Authorities whose single ownership is a stated architectural claim.
 *
 * `SourceRelation` is here because `00_core/15_program` says in its own law that
 * TypeScript cannot distinguish the imported authority from a local twin, and
 * that the check belongs in the harness. This is that check.
 */
const CANONICAL = [
  {
    name: 'SourceRelation',
    owner: '00_core/14_compiler/types.ts',
    // Each consumer must import the authority from the owner AND use it at the
    // named relationship. Importing alone is not enough: a consumer can keep a
    // lawful import that its compile-time law still references while writing
    // the shape inline at the member that matters. TypeScript sees the inline
    // product as equal, the import looks canonical, and the production contract
    // has quietly become a twin.
    consumers: [{ path: '00_core/15_program/types.ts', use: /readonly relation: SourceRelation;/ }],
  },
];

/** The specifier a file imports `name` from, or null. */
function importSpecifier(src, name) {
  for (const [, names, from] of src.matchAll(/import type \{([^}]*)\} from '([^']+)'/g)) {
    if (names.split(',').some((n) => n.trim() === name)) return from;
  }
  return null;
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

  const present = new Set(governedFiles(root));
  for (const { name, owner, consumers } of CANONICAL) {
    if (!present.has(owner)) continue;
    const declaredIn = (nameHomes.get(name) ?? []).map((d) => d.rel);
    if (!declaredIn.includes(owner)) {
      violations.push(`'${name}' is not exported by its owner ${owner}`);
      continue;
    }
    for (const { path: consumer, use } of consumers.filter((c) => present.has(c.path))) {
      const src = readFileSync(join(root, consumer), 'utf8');
      // A local declaration of any visibility, exported or not.
      if (new RegExp(`^(?:export )?(?:type|interface) ${name}\\b`, 'm').test(src)) {
        violations.push(`${consumer} declares its own '${name}' instead of importing the one in ${owner}`);
        continue;
      }

      const specifier = importSpecifier(src, name);
      if (specifier === null) {
        violations.push(`${consumer} does not import '${name}' at all`);
        continue;
      }
      // Resolve the specifier to a repository path and compare it exactly.
      // Matching on the trailing filename would accept any file called
      // `types.js`, which is every governed file in the tree.
      const resolved = posix(
        relative(root, resolve(dirname(join(root, consumer)), specifier.replace(/\.js$/, '.ts'))),
      );
      if (resolved !== owner) {
        violations.push(`${consumer} imports '${name}' from ${resolved}, not from its owner ${owner}`);
        continue;
      }
      if (use && !use.test(src)) {
        violations.push(`${consumer} imports '${name}' but does not use it at the governed relationship`);
      }
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
