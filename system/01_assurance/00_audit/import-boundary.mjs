/**
 * Repository-control implementation: the import boundary.
 *
 * The compiler cannot decide this. TypeScript resolves every specifier in this
 * repository correctly and reports nothing, because direction, peerage, sibling
 * exclusion, and acyclicity are architectural claims about *where* a declaration
 * lives, not about what it means. One program, type-only imports, green build,
 * and a cycle sitting in it -- measured, not hypothetical.
 *
 * So this file acquires one repository fact: every relative import edge, and
 * whether it crosses a boundary the architecture forbids. It decides nothing
 * about severity and issues no authority. It prints what it found and exits
 * nonzero if it found anything, which is what a probe does.
 *
 * ## The bands are derived, never listed
 *
 * A top-level directory's ordinal prefix *is* its dependency band. `02_targets`
 * and `02_wires` are both band 2 and are therefore peers -- the root README says
 * so in as many words, and neither imports the other.
 *
 * An earlier scratchpad version of this audit carried a hand-written table
 * mapping each layer to a rank, and that table gave `02_targets` 3 and
 * `02_wires` 4. It had invented a dependency order the architecture denies, so
 * `02_wires -> 02_targets` passed as a lawful downstream import. A second model
 * of the repository, living inside the tool whose whole job is noticing second
 * models of the repository.
 *
 * Deriving the band from the directory name is not a tidier spelling of the same
 * thing. It made a rule class *expressible* that the table had made
 * unthinkable: with two roots at different ranks, "peer" was not a relationship
 * the audit could have.
 *
 * ## Four refusals
 *
 * - `DOWNSTREAM` -- an upstream band importing a lower one. Core may not reach
 *   for hosts.
 * - `PEER` -- one band-2 root importing the other. Targets and wires are peers
 *   and neither is authority for the other.
 * - `SIBLING` -- two children of one layer importing each other. Astro genuinely
 *   uses Vite; ecosystem usage is not semantic authority, and the predecessor's
 *   Cloudflare package lost its independent story to exactly this.
 * - `CYCLE` -- any cycle at all in the resolved graph.
 *
 * `CYCLE` is the one that needed no taxonomy. A shared-vocabulary umbrella
 * importing a child it supplies is a cycle; a topology file importing children
 * that never import it back is not; a compile-only fixture importing several
 * children is not, because nothing imports the fixture. Three cases, one rule,
 * no roles and no exception list -- which is what a rule needs to be before it is
 * allowed near this repository, since an exception list is how the previous
 * control plane justified itself.
 *
 * ## What it does not do
 *
 * No waivers. No severity. No baseline file of known-acceptable violations. A
 * violation is a violation and the exit code says so; if one is wrong, the rule
 * is wrong and the rule gets fixed.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, normalize, sep, resolve } from 'node:path';
import { LanguageVariant, SyntaxKind, createScanner } from 'typescript/unstable/ast';

/**
 * Every module specifier in one source text, read with the compiler's own lexer.
 *
 * This was a regular expression over source text, matching `from '...'`. It
 * therefore saw single-quoted `from` clauses and nothing else: a side-effect
 * `import './x.js'`, a dynamic `import("./x.js")`, a double-quoted specifier,
 * and `import x = require('./x.js')` were all invisible to the audit that
 * exists to see them. A side-effect import is the shape that matters most,
 * because it is how one home reaches another for effect alone.
 *
 * It was also a regex parser over source text, which this repository forbids
 * and which the previous control plane was deleted for. The rule was written
 * down and then broken by the tool enforcing the rules.
 *
 * A specifier is a string literal in module position: after `from`, directly
 * after `import`, or as the first argument of `import(` or `require(`. Comments
 * and template literals are tokens the scanner already classifies, so they
 * cannot be mistaken for specifiers the way a text match mistook them.
 *
 * The `require(` case reads the identifier's *text*. Accepting any identifier
 * before `(` was the first replacement's own defect: `ordinaryFunction('./x.js')`
 * became an import edge, trading a false-negative class for a false-positive
 * one. The canary that missed it used `require` as its only example, so it
 * proved the mechanism accepted the string and never that it discriminated —
 * a symmetric fixture, which is a failure mode this repository has a name for.
 *
 * A scanner reports tokens, not structure, and this is the boundary of what
 * that buys: `require` reached through a member expression is excluded by
 * checking the preceding token, but a local variable genuinely named `require`
 * would still be read as one. The remaining gap wants a parsed source file, and
 * the parse API in `typescript/unstable/sync` needs a `Program` this audit does
 * not yet build.
 */
export const moduleSpecifiers = (/** @type {string} */ text) => {
  const scanner = createScanner(true, LanguageVariant.Standard, text);
  const found = [];

  // The three most recent tokens, each as { kind, text }. Three, because
  // deciding `require(` needs the token before `require` to rule out a member
  // call: `fs.require('./x')` is not Node's require and must not become an edge.
  let one;
  let two;
  let three;

  for (;;) {
    const kind = scanner.scan();
    if (kind === SyntaxKind.EndOfFile) break;

    if (kind === SyntaxKind.StringLiteral) {
      const afterFrom = one?.kind === SyntaxKind.FromKeyword;
      const afterImport = one?.kind === SyntaxKind.ImportKeyword;
      const openParen = one?.kind === SyntaxKind.OpenParenToken;
      const afterImportCall = openParen && two?.kind === SyntaxKind.ImportKeyword;
      const afterRequireCall =
        openParen &&
        two?.kind === SyntaxKind.RequireKeyword &&
        three?.kind !== SyntaxKind.DotToken;

      if (afterFrom || afterImport || afterImportCall || afterRequireCall) {
        found.push(scanner.getTokenValue());
      }
    }

    three = two;
    two = one;
    one = { kind };
  }

  return found;
};

const posix = (/** @type {string} */ p) => p.split(sep).join('/');

/** @returns {string[]} */
const walk = (/** @type {string} */ dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.name === 'node_modules' || entry.name === '.git'
      ? []
      : entry.isDirectory()
        ? walk(join(dir, entry.name))
        : join(dir, entry.name),
  );

// `.mjs` as well as `.ts`. The two executable audits are `.mjs`, so a
// population of `.ts` alone left the code that enforces dependency direction
// outside the graph whose dependency direction is inspected.
const inventory = (/** @type {string} */ root) =>
  walk(root)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.mjs'))
    .map((f) => posix(f.slice(root.length + 1)));

/** The directory segments a file lives under. A root-level file has none. */
const dirsOf = (/** @type {string} */ file) => file.split('/').slice(0, -1);

/**
 * The band of one path segment, or `undefined` when the segment is unnumbered.
 *
 * `system` is the one named band: it observes the product architecture and no
 * product home may import it, so it sits downstream of every numbered layer.
 * Everything else numbered carries its band in its name.
 */
const bandOf = (/** @type {string} */ segment, /** @type {number} */ depth) => {
  if (depth === 0 && segment === 'system') return Number.MAX_SAFE_INTEGER;
  const match = /^(\d+)_/u.exec(segment);
  return match ? Number(match[1]) : undefined;
};

/**
 * Classify one edge by walking both paths until they diverge.
 *
 * The first draft of this had one flat rule per level and it was wrong in a way
 * the audit's own output made obvious: it reported `00_core/01_encoding ->
 * 00_core/00_error` as a sibling violation, which is the ordinary numbered
 * waterfall and the single most common lawful edge in the repository. Ninety-
 * eight of its hundred and four findings were that mistake.
 *
 * The distinction it was missing is that a layer's children come in two kinds.
 *
 * **Numbered** children are a waterfall. `00_error` through `18_inspection`,
 * `00_workspace` through `02_release`: a higher ordinal may import a lower one
 * and never the reverse. Equal is impossible -- it is the same directory.
 *
 * **Unnumbered** children are peers. `astro`, `vite`, `cloudflare`; `web`,
 * `worker`, `edge`, `server`. No order exists between them, so no import
 * between them is lawful in either direction.
 *
 * Two numbered segments at the *same* band are peers too, which is how
 * `02_targets` and `02_wires` are related and why the edge between them is
 * refused rather than permitted as a flat traversal.
 *
 * When one path is an ancestor of the other -- an umbrella importing into its
 * own child -- this rule says nothing. Direction is not the question there;
 * whether anything comes back is, and `CYCLE` answers it.
 */
export const classify = (/** @type {string} */ from, /** @type {string} */ to) => {
  const fromDirs = dirsOf(from);
  const toDirs = dirsOf(to);

  if (fromDirs.length === 0 && toDirs.length > 0) return 'DOWNSTREAM';

  for (let depth = 0; depth < Math.min(fromDirs.length, toDirs.length); depth += 1) {
    const fromSegment = fromDirs[depth];
    const toSegment = toDirs[depth];
    // The loop bound guarantees both, but the bound is arithmetic the compiler
    // does not read. Stating it costs one branch and makes the guarantee local.
    if (fromSegment === undefined || toSegment === undefined) break;
    if (fromSegment === toSegment) continue;

    const fromBand = bandOf(fromSegment, depth);
    const toBand = bandOf(toSegment, depth);

    if (fromBand === undefined || toBand === undefined) return 'SIBLING';
    if (toBand > fromBand) return 'DOWNSTREAM';
    if (toBand === fromBand) return 'PEER';
    return undefined;
  }

  return undefined;
};

// Only when run as a command. The three algorithms above are imported by the
// audit self-test, and importing a module must not walk a filesystem.
if (import.meta.main) {
const ROOT = resolve(process.argv[2] ?? '.');
const files = inventory(ROOT);
const known = new Set(files);

const edges = new Map();
const violations = [];

for (const file of files) {
  const source = readFileSync(join(ROOT, file), 'utf8');
  const resolved = [];

  for (const specifier of moduleSpecifiers(source)) {
    if (!specifier.startsWith('.')) continue;
    const base = posix(normalize(join(dirname(file), specifier)));
    const candidates = [base.replace(/\.js$/u, '.ts'), base.replace(/\.js$/u, '.d.ts'), base];
    const target = candidates.find((c) => known.has(c));

    if (!target) {
      violations.push(`UNRESOLVED ${file} -> ${specifier}`);
      continue;
    }
    resolved.push(target);

    const verdict = classify(file, target);
    if (verdict) violations.push(`${verdict.padEnd(10)} ${file} -> ${target}`);
  }

  edges.set(file, resolved);
}

// --- cycles ---------------------------------------------------------------
// Iterative depth-first colouring. Recursion would be shorter and would blow
// the stack on a graph this file is supposed to survive reporting on.
const WHITE = 0;
const GREY = 1;
const BLACK = 2;
const colour = new Map(files.map((f) => [f, WHITE]));
const seenCycle = new Set();

for (const start of files) {
  if (colour.get(start) !== WHITE) continue;
  const stack = [{ node: start, next: 0 }];
  colour.set(start, GREY);

  while (stack.length > 0) {
    const frame = stack.at(-1);
    // `stack.length > 0` is the loop condition; `at(-1)` is still typed as
    // possibly absent, so the invariant is stated rather than assumed.
    if (frame === undefined) break;
    const outgoing = edges.get(frame.node) ?? [];

    if (frame.next >= outgoing.length) {
      colour.set(frame.node, BLACK);
      stack.pop();
      continue;
    }

    const target = outgoing[frame.next];
    frame.next += 1;
    if (target === undefined) continue;

    if (colour.get(target) === GREY) {
      const at = stack.findIndex((f) => f.node === target);
      const ring = [...stack.slice(at).map((f) => f.node), target];
      const key = ring.join('|');
      if (!seenCycle.has(key)) {
        seenCycle.add(key);
        violations.push(`CYCLE      ${ring.join(' -> ')}`);
      }
    } else if (colour.get(target) === WHITE) {
      colour.set(target, GREY);
      stack.push({ node: target, next: 0 });
    }
  }
}

const edgeCount = [...edges.values()].reduce((n, list) => n + list.length, 0);
console.log(
  `import-boundary: ${files.length} files, ${edgeCount} relative edges, ${violations.length} violations`,
);
for (const violation of violations) console.log(`  ${violation}`);

// An empty population satisfies every rule above. Zero files means the walk
// found nothing, not that the tree is lawful — the same guard `zero-runtime`
// carries for the same reason, and the reason this one lacked it is that
// nobody had run it against a tree with no sources.
if (files.length === 0) {
  console.error('import-boundary: FAILED — nothing was inspected, so nothing was checked');
  process.exitCode = 1;
} else if (violations.length > 0) {
  process.exitCode = 1;
}
}
