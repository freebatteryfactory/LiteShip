/**
 * THE DIFFERENTIAL GUARD for the `codeOnly` floor: the sound, parser-backed @liteship/audit scanner
 * ({@link codeOnlyAST}) and the lean no-typescript char-machine ({@link codeOnly}) must agree, so the
 * host-injected scanner and its fallback never disagree on which characters are CODE. This is the
 * "pin the mirror" pattern: a real tokenizer is the oracle of record; the hand-rolled machine is held
 * equivalent to it on a corpus of the lexical hazards (regex-vs-division, nested templates, object
 * literals in substitutions, comments inside strings, escapes). The corpus that FOUND the original
 * nested-template bug stays here as a regression.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { codeOnlyAST, commentsBlankedAST } from '@liteship/audit';
import { codeOnly } from '../../../packages/gauntlet/src/gates/code-only.ts';

/**
 * The regex-POSITION keyword allowlist the lean char-machine carries
 * (`REGEX_KEYWORDS` in gates/code-only.ts). Every entry that can be written as
 * VALID code gets a corpus line below, so removing any single entry breaks the
 * differential rather than surviving as an untested allowlist member — the gap
 * that left `of` mutation-surviving.
 *
 * `new` is deliberately absent: `new /re/` is a syntax ERROR (a NewExpression
 * requires a MemberExpression), so no valid source can exercise that entry and a
 * fixture for it would be measuring the parser's error recovery, not the floor.
 */
const REGEX_KEYWORD_CORPUS: readonly string[] = [
  'function f(s) { return /re/.test(s); }', // return
  'const t = typeof /re/;', // typeof
  'const i = x instanceof /re/;', // instanceof
  "const has = 'k' in /re/;", // in
  'for (const x of /re/) { g(x); }', // of — the surviving mutant this corpus had no case for
  'delete /re/.source;', // delete
  'void /re/;', // void
  'function* g() { yield /re/; }', // yield
  'async function f() { await /re/; }', // await
  'switch (k) { case /re/: break; }', // case
  'do /re/.test(s); while (n--);', // do
  'if (a) b(); else /re/.test(s);', // else
  'throw /re/;', // throw
];

/** Lexical-hazard corpus — every case both implementations must blank identically. */
const CORPUS: readonly string[] = [
  `const x = "a string with // not a comment and /regex/";`,
  `// a real comment with "quotes" and a throw\nthrow new Error();`,
  `const r = /ab+c/g; const y = a / b / c;`,
  `const re = /[/]/; const d = 10 / 2;`,
  // A character class carrying `/*`. A machine with no regex state reads this as
  // the start of a block comment and blanks the rest of the file — the fail-OPEN
  // hole that erased a whole `effect` residue scan.
  `const re = /[/*]/; const d = 10 / 2;`,
  `/* block\n comment with 'quotes' and \`ticks\` */ const z = 1;`,
  `const s = 'it\\'s escaped \\" and /slashes/'; throw foo;`,
  `function f() { return "throw inside string"; } throw real;`,
  `const empty = ""; const e2 = ''; const e3 = \`\`;`,
  // — the cases that exposed the nested-template bug —
  'const t = `template ${x + 1} and // not comment ${ `nested ${y}` }`;',
  '`a` + `b ${ `c` }`',
  'const o = `a ${ {x:1} } b`;', // object literal inside a substitution
  'const lit = `a { b } c`;', // literal braces in template TEXT (not a substitution)
  'const triple = `x ${ `y ${ `z` } w` } v`;', // triple-nested templates
  'throw `${realCall()}`;',
  'const m = `${a}${b}${c}`;', // adjacent substitutions
  'const code = `class Foo { method() { return 1; } }`;', // a code snippet (unbalanced-looking braces, balanced)
  ...REGEX_KEYWORD_CORPUS,
];

describe('codeOnlyAST — sound parser-backed codeOnly floor', () => {
  it('blanks string / comment / template / regex spans, length-preserving, code untouched', () => {
    const src = `const a = "str"; // c\nthrow b; const r = /re/g;`;
    const out = codeOnlyAST(src);
    expect(out.length).toBe(src.length);
    expect(out).toContain('const a = '); // code survives
    expect(out).toContain('throw b;'); // real code survives
    expect(out).not.toContain('str'); // string content blanked
    expect(out).not.toContain('re/g'); // regex blanked
    // newlines preserved so line numbers still align
    expect(out.split('\n').length).toBe(src.split('\n').length);
  });

  it('blanks a NESTED template wholesale (the bug the differential guard caught)', () => {
    const out = codeOnlyAST('`a ${ `b` } c`');
    expect(out.trim()).toBe(''); // the entire template is one blanked span
  });

  it('keeps real code that merely NEIGHBOURS a template', () => {
    const out = codeOnlyAST('throw foo; const t = `x`;');
    expect(out).toContain('throw foo;');
    expect(out).toContain('const t =');
  });
});

describe('DIFFERENTIAL — the scanner and the lean char-machine agree (faithful fallback)', () => {
  for (const src of CORPUS) {
    it(`agree on: ${JSON.stringify(src).slice(0, 60)}`, () => {
      expect(codeOnlyAST(src)).toBe(codeOnly(src));
    });
  }

  it('the corpus exercises EVERY expressible regex-position keyword', () => {
    // Derivation, not a roster: the keyword set is read off the lean machine's
    // own allowlist source, so a keyword added there tomorrow reds this law
    // until the corpus carries a case for it.
    const machine = readFileSync(
      fileURLToPath(new URL('../../../packages/gauntlet/src/gates/code-only.ts', import.meta.url)),
      'utf8',
    );
    const block = /const REGEX_KEYWORDS = new Set\(\[([^\]]*)\]\)/u.exec(machine)?.[1];
    expect(block, 'REGEX_KEYWORDS must be readable from the lean machine').toBeTypeOf('string');
    const declared = [...block!.matchAll(/'([a-z]+)'/gu)].map((match) => match[1]!);
    expect(declared.length).toBeGreaterThan(10);
    const corpus = CORPUS.join('\n');
    const uncovered = declared.filter(
      (keyword) => keyword !== 'new' && !new RegExp(`\\b${keyword}\\s+/re/`, 'u').test(corpus),
    );
    expect(uncovered, 'every expressible regex-position keyword needs a differential case').toEqual([]);
  });
});

describe('commentsBlankedAST — sound COMMENTS-ONLY floor (strings and regex survive)', () => {
  it('blanks comments while keeping string VALUES and regex source verbatim', () => {
    const src = `const a = "keep me"; // drop me\nconst r = /[/*]/; /* drop */ const b = 'keep';`;
    const out = commentsBlankedAST(src);
    expect(out.length).toBe(src.length);
    expect(out).toContain('"keep me"');
    expect(out).toContain("'keep'");
    expect(out).toContain('/[/*]/'); // the regex is a VALUE for a pattern scanner, not noise
    expect(out).not.toContain('drop me');
    expect(out).not.toContain('drop */');
    expect(out.split('\n').length).toBe(src.split('\n').length);
  });

  it('a `/*` inside a regex character class does NOT open a block comment', () => {
    // The exact fail-OPEN shape: a char machine with no regex state enters
    // blockComment here and blanks every following line.
    const src = "const re = /[/*]/;\nimport { Thing } from 'some-lib';\nThing.run(program);\n";
    expect(commentsBlankedAST(src)).toBe(src);
  });

  it('is idempotent and length-preserving over the whole differential corpus', () => {
    for (const src of CORPUS) {
      const once = commentsBlankedAST(src);
      expect(once.length).toBe(src.length);
      expect(commentsBlankedAST(once)).toBe(once);
    }
  });
});
