/**
 * THE SOUND AST SKIP DETECTOR — `detectSkipsAST` catches EVERY spelling the token scanner missed,
 * because it parses a REAL AST (`ts.createSourceFile`) and is therefore line-agnostic.
 *
 * This is the fix that ends the token-scanner whack-a-mole: each codex round (R4 single-line
 * aliases, R5 multi-line import/destructure/namespace/typed-rebind, R6 ASI rebind / multi-line
 * `.each` chain / concurrent-newline) found a new spelling a char/token scanner could not parse.
 * The AST has no line problem, no ASI problem, and walks INTO describe/test block bodies (the token
 * rewrite's fatal omission). Every case here is RUN — the unrun-parser scar is why.
 *
 * Each matrix case asserts: the skip is DETECTED at the correct 1-based LINE, with the correct
 * `conditional` classification ('skipIf'|'runIf'|'ternary'|'enclosing-if'|'unconditional').
 */

import { describe, it, expect } from 'vitest';
import { detectSkipsAST } from '@czap/audit';
import type { SkipMatch, SkipConditionality } from '@czap/gauntlet';

/**
 * Find the match whose token contains `needle` AT `line` (a single source can emit several matches —
 * e.g. `const skipIt = it.skip` flags BOTH the line-1 capture accessor AND the line-2 call, exactly
 * like the token detector; the matrix asserts the specific line it targets).
 */
function find(matches: readonly SkipMatch[], needle: string, line: number): SkipMatch | undefined {
  return matches.find((m) => m.token.includes(needle) && m.line === line) ?? matches.find((m) => m.token.includes(needle));
}

describe('detectSkipsAST — the full skip spelling surface (every R4/R5/R6 + inner-describe), RUN', () => {
  // Each tuple: [source, a token signature that MUST appear, the expected 1-based line, the expected
  // conditional classification]. All are UNCONDITIONAL unless the form itself is a gate.
  const MATRIX: ReadonlyArray<readonly [string, string, number, SkipConditionality]> = [
    // --- terminal skip/disable members ---
    ['it.skip("x", () => {});', 'it.skip', 1, 'unconditional'],
    ['test.skip("x", () => {});', 'test.skip', 1, 'unconditional'],
    ['describe.skip("x", () => {});', 'describe.skip', 1, 'unconditional'],
    ['suite.skip("x", () => {});', 'suite.skip', 1, 'unconditional'],
    ['bench.skip("x", () => {});', 'bench.skip', 1, 'unconditional'],
    ['it.todo("later");', 'it.todo', 1, 'unconditional'],
    ['it.fails("inverts", () => {});', 'it.fails', 1, 'unconditional'],
    ['it.skipIf(!CAP)("x", () => {});', 'it.skipIf', 1, 'skipIf'],
    ['it.runIf(CAP)("x", () => {});', 'it.runIf', 1, 'runIf'],
    // --- x-prefix aliases ---
    ['xit("x", () => {});', 'xit', 1, 'unconditional'],
    ['xtest("x", () => {});', 'xtest', 1, 'unconditional'],
    ['xdescribe("x", () => {});', 'xdescribe', 1, 'unconditional'],
    ['xspecify("x", () => {});', 'xspecify', 1, 'unconditional'],
    // --- chained modifiers in ANY position ---
    ['it.concurrent.skip("x", () => {});', 'it.concurrent.skip', 1, 'unconditional'],
    ['it.sequential.skip("x", () => {});', 'it.sequential.skip', 1, 'unconditional'],
    ['it.skip.each([1])("x", () => {});', 'it.skip', 1, 'unconditional'],
    ['it.each([1]).skip("x", () => {});', 'it.each', 1, 'unconditional'],
    ['describe.each([1, 2]).skip("x", () => {});', 'describe.each', 1, 'unconditional'],
    // R6: multi-line `.each([⏎…]).skip`
    ['it.each([\n  1,\n  2,\n]).skip("multiline each", () => {});', '.skip', 1, 'unconditional'],
    // R6: concurrent on a NEWLINE — `it.concurrent⏎.skip`
    ['it.concurrent\n  .skip("newline modifier", () => {});', 'it.concurrent.skip', 1, 'unconditional'],
    // --- bracket + computed ---
    ['it["skip"]("x", () => {});', 'it["skip"]', 1, 'unconditional'],
    ["it['skip']('x', () => {});", 'it["skip"]', 1, 'unconditional'],
    ['test["todo"]("x");', 'test["todo"]', 1, 'unconditional'],
    ['it[cond ? "skip" : "only"]("x", () => {});', 'it[', 1, 'unconditional'],
    ['it[member]("x", () => {});', 'it[', 1, 'unconditional'],
    // --- R4: single-line aliased roots ---
    ['import { it as spec } from "vitest";\nspec.skip("renamed", () => {});', 'spec.skip', 2, 'unconditional'],
    ['const t = it;\nt.skip("rebind", () => {});', 't.skip', 2, 'unconditional'],
    ['const { skip } = it;\nskip("destructured", () => {});', 'it.skip', 2, 'unconditional'],
    ['const skipIt = it.skip;\nskipIt("captured", () => {});', 'it.skip', 2, 'unconditional'],
    // --- R5: multi-line import / destructure / namespace / typed rebind ---
    ['import {\n  it as spec\n} from "vitest";\nspec.skip("ml import", () => {});', 'spec.skip', 4, 'unconditional'],
    ['import * as v from "vitest";\nv.it.skip("namespace", () => {});', 'v.it.skip', 2, 'unconditional'],
    ['const {\n  skip\n} = it;\nskip("ml destructure", () => {});', 'it.skip', 4, 'unconditional'],
    ['const t: typeof it = it;\nt.skip("typed rebind", () => {});', 't.skip', 2, 'unconditional'],
    // --- R6: the ASI rebind — no semicolon ---
    ['const t = it\nt.skip("asi rebind", () => {})', 't.skip', 2, 'unconditional'],
    // transitive rebind to a fixpoint
    ['const a = it;\nconst b = a;\nb.skip("transitive", () => {});', 'b.skip', 3, 'unconditional'],
    // --- INNER skips — walk INTO describe/test block bodies (the token rewrite's fatal bug) ---
    ['describe("outer", () => {\n  it.skip("inner skip", () => {});\n});', 'it.skip', 2, 'unconditional'],
    [
      'describe("a", () => {\n  describe("b", () => {\n    it.skip("deep", () => {});\n  });\n});',
      'it.skip',
      3,
      'unconditional',
    ],
    // --- ternary alias (bare accessor as a value) ---
    ['const f = COND ? it : it.skip;', 'it.skip', 1, 'ternary'],
    ['const f = COND ? it.skip : it;', 'it.skip', 1, 'ternary'],
    // --- enclosing-if (the AST ancestor walk the token CANNOT do) ---
    ['if (!FFMPEG) {\n  it.skip("ffmpeg gate", () => {});\n}', 'it.skip', 2, 'enclosing-if'],
  ];

  for (const [source, needle, line, conditional] of MATRIX) {
    it(`detects \`${needle}\` @ line ${line} (${conditional}) in: ${JSON.stringify(source).slice(0, 60)}`, () => {
      const matches = detectSkipsAST(source);
      const hit = find(matches, needle, line);
      expect(hit, `expected a match containing "${needle}" in ${JSON.stringify(matches)}`).toBeDefined();
      expect(hit!.line, `line for "${needle}"`).toBe(line);
      expect(hit!.conditional, `conditional for "${needle}"`).toBe(conditional);
    });
  }
});

describe('detectSkipsAST — NO false positives', () => {
  const CLEAN: ReadonlyArray<readonly [string, string]> = [
    ['it("x", () => { foo.bar(); });', 'a real running test'],
    ['myObj.skip();', 'a non-runner .skip()'],
    ['const x = { skip: 1 };', 'an object with a skip key'],
    ['// this mentions it.skip in prose', 'a comment mentioning it.skip'],
    ['const s = "use it.skip here";', 'a string literal mentioning it.skip'],
    ['const t = makeRunner();\nt.skip("opaque call result", () => {});', 'a call-result rebind (undecidable, not flagged)'],
    ['const t = myObj;\nt.skip();', 'a rebind to a non-runner (clean)'],
    ['describe("real", () => {\n  it("runs", () => { expect(1).toBe(1); });\n});', 'an inner running test'],
  ];
  for (const [source, label] of CLEAN) {
    it(`is clean for ${label}`, () => {
      expect(detectSkipsAST(source), `${label}: ${JSON.stringify(detectSkipsAST(source))}`).toEqual([]);
    });
  }
});

describe('detectSkipsAST — F2 conditionality is the structural sanctioning proof', () => {
  it('an UNCONDITIONAL it.skip("later") classifies unconditional (a placeholder)', () => {
    const [m] = detectSkipsAST('it.skip("later", () => {});');
    expect(m?.conditional).toBe('unconditional');
  });

  it('an UNCONDITIONAL it.skip("ffmpeg probe") still classifies unconditional (title is not a gate)', () => {
    const [m] = detectSkipsAST('it.skip("ffmpeg probe", () => {});');
    expect(m?.conditional).toBe('unconditional');
  });

  it('a CONDITIONAL if(!FFMPEG){ it.skip(...) } classifies enclosing-if (the ancestor walk sees the guard)', () => {
    const matches = detectSkipsAST('if (!FFMPEG) {\n  it.skip("inside guard", () => {});\n}');
    expect(matches).toHaveLength(1);
    expect(matches[0]!.conditional).toBe('enclosing-if');
  });

  it('a .skipIf gate classifies skipIf even with a string title arg', () => {
    const [m] = detectSkipsAST('describe.skipIf(!wasmPresent)("parity", () => {});');
    expect(m?.conditional).toBe('skipIf');
  });
});
