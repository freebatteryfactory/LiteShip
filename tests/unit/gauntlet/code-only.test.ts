/**
 * The shared "is this CODE?" floor — {@link codeOnly} / {@link stringsBlanked} /
 * {@link commentsBlanked} — proven directly, with a focus on the REGEX-LITERAL
 * soundness gap this suite closes.
 *
 * Before this fix the three char state machines had no awareness of regex
 * literals: a regex carrying a quote char in a character class (`/(['"`])/`) made
 * the machine read those quotes as string delimiters and DESYNC the stripping for
 * the REST of the file — so an `it.skip` in a following comment, or a following
 * string literal, would be mis-classified. That is the exact F2 /
 * claim-property / perf-claim-bench / spawn shape. These tests pin:
 *
 *  - DESYNC CURED: a quote-bearing regex does not corrupt the following lines.
 *  - DIVISION NOT MIS-READ: `a / b`, `foo(x) / 2`, `arr[i] / n` stay as code.
 *  - regex bodies recognized + blanked (char-class with `/`, escapes, flags,
 *    `return /re/`, `!/re/.test()`, `.replace(/"/g, …)`).
 *  - regex containing comment markers does not trigger comment state.
 *  - the existing comment/string behavior is byte-for-byte preserved.
 *
 * A regex literal is an OPAQUE value for every dependent gate: all three machines
 * blank it to spaces (1:1, newlines preserved), which both cures the desync AND
 * stops a `/TODO/` regex being read as a placeholder directive. No dependent gate
 * reads a regex-literal body — they scan the stripped text for declarations /
 * tokens, so a blanked regex is correct.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { codeOnly, stringsBlanked, commentsBlanked } from '@czap/gauntlet';

describe('codeOnly — regex-literal soundness (the desync gap)', () => {
  it('DESYNC CURED: a quote-bearing regex does not corrupt the following lines', () => {
    // The exact F2 / claim-property shape: a character class holding ' " ` — the
    // chars that, un-recognized, the machine would read as string delimiters.
    const src = "const RE = /(['\"`])x\\1/;\nconst y = 'str';\n// it.skip prose\n";
    const out = codeOnly(src);
    const lines = out.split('\n');

    // Line 0: the regex body is blanked, but the declaration head survives.
    expect(lines[0]).toContain('const RE =');
    expect(lines[0]).not.toContain("'");
    expect(lines[0]).not.toContain('"');
    expect(lines[0]).not.toContain('`');

    // Line 1 — the FOLLOWING string: its CONTENT is blanked (not surviving as a
    // dangling open string from a desync), and the `const y =` code survives.
    expect(lines[1]).toContain('const y =');
    expect(lines[1]).not.toContain('str');

    // Line 2 — the FOLLOWING comment: blanked to whitespace. If the regex had
    // desynced the machine, `it.skip` prose would survive here (a false skip).
    expect(lines[2]!.trim()).toBe('');
    expect(out).not.toContain('it.skip');

    // 1:1 char map preserved (newlines + length align — skip-detect relies on it).
    expect(out.length).toBe(src.length);
    expect(out.split('\n').length).toBe(src.split('\n').length);
  });

  it('DESYNC CURED: the perf-claim-bench shape (regex preceded by a word boundary)', () => {
    const src = "const m = name.match(/\\bbench[^'\"`]*(['\"`])/);\nthrow new Error('boom');\n";
    const out = codeOnly(src);
    const lines = out.split('\n');
    expect(lines[0]).toContain('const m = name.match(');
    expect(lines[0]).not.toContain("'");
    expect(lines[0]).not.toContain('"');
    // The following throw + string stay correctly classified (string blanked).
    expect(lines[1]).toContain('throw new Error(');
    expect(lines[1]).not.toContain('boom');
    expect(out.length).toBe(src.length);
  });

  it('DESYNC CURED: spawn.ts shapes — /["&|<>]/ and /"/g', () => {
    const a = codeOnly('if (/["&|<>]/.test(arg)) ok();\nconst s = "after";\n');
    expect(a.split('\n')[0]).toContain('.test(arg))');
    expect(a.split('\n')[0]).not.toContain('"');
    expect(a.split('\n')[1]).not.toContain('after');

    const b = codeOnly('const q = s.replace(/"/g, "\\\\\\"");\nconst t = "tail";\n');
    expect(b.split('\n')[0]).toContain('s.replace(');
    expect(b.split('\n')[1]).not.toContain('tail');
    expect(b.split('\n')[1]).toContain('const t =');
  });
});

describe('codeOnly — division is NOT mis-read as a regex', () => {
  it('a / b / c stays code; nothing blanked between the slashes', () => {
    const src = 'const r = a / b / c;';
    const out = codeOnly(src);
    expect(out).toBe(src); // pure code, no strings/comments → identity
  });

  it('foo(x) / 2 — `)` is a value-ender, the `/` is division', () => {
    const src = 'const r = foo(x) / 2;';
    expect(codeOnly(src)).toBe(src);
  });

  it('arr[i] / n — `]` is a value-ender, the `/` is division', () => {
    const src = 'const r = arr[i] / n;';
    expect(codeOnly(src)).toBe(src);
  });

  it('obj.prop / 2 — identifier end is a value-ender', () => {
    const src = 'const r = obj.prop / 2;';
    expect(codeOnly(src)).toBe(src);
  });

  it('a bare division on a line with a following string does not swallow it', () => {
    const src = "const r = a / b;\nconst s = 'kept';\n";
    const out = codeOnly(src);
    expect(out.split('\n')[0]).toBe('const r = a / b;');
    // the next-line string CONTENT is blanked (machine in sync) but code survives
    expect(out.split('\n')[1]).toContain('const s =');
    expect(out.split('\n')[1]).not.toContain('kept');
  });
});

describe('codeOnly — regex bodies are recognized + blanked', () => {
  const blanked = (src: string): string => codeOnly(src);

  it('char class containing a slash: /[\\/]/', () => {
    const src = 'const re = /[\\/]/;\nfoo();';
    const out = blanked(src);
    expect(out.split('\n')[0]).toContain('const re =');
    expect(out.split('\n')[1]).toBe('foo();');
  });

  it('escaped slash in the body: /a\\/b/', () => {
    const src = 'const re = /a\\/b/;\nbar();';
    const out = blanked(src);
    expect(out.split('\n')[0]).toContain('const re =');
    expect(out.split('\n')[1]).toBe('bar();');
  });

  it('trailing flags: /x/gi', () => {
    const src = 'const re = /x/gi;\nbaz();';
    const out = blanked(src);
    expect(out.split('\n')[0]).toContain('const re =');
    // the `gi` flags are consumed as part of the literal (blanked)
    expect(out.split('\n')[0]).not.toContain('gi');
    expect(out.split('\n')[1]).toBe('baz();');
  });

  it('return /re/ — keyword regex position', () => {
    const src = 'function f() { return /re/; }';
    const out = blanked(src);
    expect(out).toContain('return');
    expect(out).not.toContain('/re/');
  });

  it('!/re/.test() — prefix operator regex position', () => {
    const src = 'const ok = !/re/.test(s);';
    const out = blanked(src);
    expect(out).toContain('const ok = !');
    expect(out).toContain('.test(s);');
    expect(out).not.toContain('/re/');
  });

  it('.replace(/"/g, …) — the quote is inside the regex, not a string', () => {
    const src = "const x = s.replace(/\"/g, '');\nconst y = 'tail';\n";
    const out = blanked(src);
    expect(out.split('\n')[0]).not.toContain('"');
    expect(out.split('\n')[1]).toContain('const y =');
    expect(out.split('\n')[1]).not.toContain('tail');
  });

  it('a /TODO/ regex is blanked — NOT read as a placeholder directive', () => {
    const src = 'const re = /TODO/;\n';
    expect(blanked(src)).not.toContain('TODO');
  });
});

describe('codeOnly — regex bodies do not trigger comment state', () => {
  it('/\\/\\*/ — a regex matching "/*" does not open a block comment', () => {
    const src = 'const re = /\\/\\*/;\nafter();';
    const out = codeOnly(src);
    expect(out.split('\n')[1]).toBe('after();');
  });

  it('/a*\\// — a regex with `*` and an escaped slash stays single-line', () => {
    const src = 'const re = /a*\\//;\nafter();';
    const out = codeOnly(src);
    expect(out.split('\n')[1]).toBe('after();');
  });
});

describe('codeOnly — comments are still handled FIRST (unchanged)', () => {
  it('an empty // is a line comment, not a regex', () => {
    const src = 'a // c\nb';
    const out = codeOnly(src);
    expect(out).toBe('a     \nb'); // ` // c` (5 chars) blanked to spaces
    expect(out.length).toBe(src.length);
  });

  it('a /* */ block comment is handled before regex detection', () => {
    const src = 'a /* c */ b';
    const out = codeOnly(src);
    expect(out).toBe('a         b');
  });

  it('// at start of line is a comment even though it is a regex position', () => {
    const src = '// just a comment\ncode();';
    const out = codeOnly(src);
    expect(out.split('\n')[0]!.trim()).toBe('');
    expect(out.split('\n')[1]).toBe('code();');
  });
});

describe('existing comment/string behavior preserved across all three machines', () => {
  // A sample exercising comments + strings + code together.
  const SAMPLE = [
    "const a = 'hello';",
    'const b = `tmpl ${x}`;',
    '// a line comment',
    '/* a block comment */',
    'const c = "world"; // trailing',
    'function f() { return 1; }',
  ].join('\n');

  it('codeOnly blanks both comments and strings, keeps code + line count', () => {
    const out = codeOnly(SAMPLE);
    expect(out.split('\n').length).toBe(SAMPLE.split('\n').length);
    expect(out).not.toContain('hello');
    expect(out).not.toContain('world');
    expect(out).not.toContain('a line comment');
    expect(out).not.toContain('a block comment');
    expect(out).not.toContain('trailing');
    expect(out).toContain('const a =');
    expect(out).toContain('return 1;');
  });

  it('stringsBlanked blanks strings, keeps comments verbatim', () => {
    const out = stringsBlanked(SAMPLE);
    expect(out).not.toContain('hello');
    expect(out).not.toContain('world');
    // comments survive verbatim
    expect(out).toContain('// a line comment');
    expect(out).toContain('/* a block comment */');
    expect(out).toContain('// trailing');
    expect(out).toContain('const a =');
  });

  it('commentsBlanked blanks comments, keeps strings verbatim', () => {
    const out = commentsBlanked(SAMPLE);
    // strings survive verbatim
    expect(out).toContain("'hello'");
    expect(out).toContain('"world"');
    // comments blanked
    expect(out).not.toContain('a line comment');
    expect(out).not.toContain('a block comment');
    expect(out).not.toContain('trailing');
    expect(out).toContain('const a =');
  });

  it('all three preserve length (1:1 char map, newlines aligned)', () => {
    expect(codeOnly(SAMPLE).length).toBe(SAMPLE.length);
    expect(stringsBlanked(SAMPLE).length).toBe(SAMPLE.length);
    expect(commentsBlanked(SAMPLE).length).toBe(SAMPLE.length);
  });

  it('escape inside a string does not prematurely close it (regression)', () => {
    // The `\'` must NOT close the single-quoted literal early; the whole
    // `'a\'b'` is one string, so its content (a, ', b) is blanked, and the
    // following `const t = 'c'` is correctly classified (its `c` blanked too).
    const src = "const s = 'xyz\\'qrs'; const t = 'jkl';";
    const out = codeOnly(src);
    expect(out).toContain('const s =');
    expect(out).toContain('const t =');
    expect(out).not.toContain('xyz');
    expect(out).not.toContain('qrs');
    expect(out).not.toContain('jkl');
    expect(out.length).toBe(src.length);
  });
});

describe('stringsBlanked / commentsBlanked — regex desync cured', () => {
  it('stringsBlanked: a quote-bearing regex does not desync following strings', () => {
    const src = "const RE = /(['\"`])/;\nconst y = 'secret';\n";
    const out = stringsBlanked(src);
    // following string content blanked (not a dangling desync), code survives
    expect(out.split('\n')[1]).toContain('const y =');
    expect(out.split('\n')[1]).not.toContain('secret');
    expect(out.length).toBe(src.length);
  });

  it('commentsBlanked: a quote-bearing regex does not desync following comments', () => {
    const src = "const RE = /(['\"`])/;\n// disabled bench prose\nbench('real', () => {});\n";
    const out = commentsBlanked(src);
    // the following comment is blanked; the real bench string survives
    expect(out.split('\n')[1]!.trim()).toBe('');
    expect(out).toContain("'real'");
    expect(out).not.toContain('disabled bench prose');
    expect(out.length).toBe(src.length);
  });
});
