/**
 * THE DIFFERENTIAL GUARD for the `codeOnly` floor: the sound, parser-backed @czap/audit scanner
 * ({@link codeOnlyAST}) and the lean no-typescript char-machine ({@link codeOnly}) must agree, so the
 * host-injected scanner and its fallback never disagree on which characters are CODE. This is the
 * "pin the mirror" pattern: a real tokenizer is the oracle of record; the hand-rolled machine is held
 * equivalent to it on a corpus of the lexical hazards (regex-vs-division, nested templates, object
 * literals in substitutions, comments inside strings, escapes). The corpus that FOUND the original
 * nested-template bug stays here as a regression.
 */
import { describe, it, expect } from 'vitest';
import { codeOnlyAST } from '@czap/audit';
import { codeOnly } from '../../../packages/gauntlet/src/gates/code-only.ts';

/** Lexical-hazard corpus — every case both implementations must blank identically. */
const CORPUS: readonly string[] = [
  `const x = "a string with // not a comment and /regex/";`,
  `// a real comment with "quotes" and a throw\nthrow new Error();`,
  `const r = /ab+c/g; const y = a / b / c;`,
  `const re = /[/]/; const d = 10 / 2;`,
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
});
