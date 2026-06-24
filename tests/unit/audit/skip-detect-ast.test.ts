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

describe('detectSkipsAST — codex round-7 #1: the LOCAL alias closure (no Program needed)', () => {
  // Every case is a LOCAL binding the parser CAN resolve — the gap was that the binding collectors
  // checked the LITERAL root set / did not unwrap the initializer / did not propagate namespaces. The
  // cure consults the GROWING resolved sets + unwraps paren/`as`/`!` + propagates `const w = v`. These
  // were all MISSES before (the detector returned []); each MUST now detect.
  const DETECT: ReadonlyArray<readonly [string, string]> = [
    ['const { skip } = (it);\nskip("x", () => {});', 'a parenthesized destructure base'],
    ['const { skip } = it as typeof it;\nskip("x", () => {});', 'an `as`-asserted destructure base'],
    ['const { skip } = it!;\nskip("x", () => {});', 'a non-null-asserted destructure base'],
    ['const t = it;\nconst { skip } = t;\nskip("x", () => {});', 'a destructure off a RESOLVED alias'],
    ['import * as v from "vitest";\nconst w = v;\nw.it.skip("x", () => {});', 'a rebound namespace `const w = v`'],
    ['const skipIt = (it).skip;\nskipIt("x", () => {});', 'a capture off a parenthesized root'],
    ['const t = it;\nconst s = t.skip;\ns("x", () => {});', 'a capture off a RESOLVED alias'],
  ];
  for (const [source, label] of DETECT) {
    it(`detects ${label}`, () => {
      const matches = detectSkipsAST(source);
      expect(matches.length, `${label}: expected ≥1 match in ${JSON.stringify(matches)}`).toBeGreaterThanOrEqual(1);
    });
  }

  it('the documented CROSS-MODULE residual stays clean (a renamed import from an unknown module)', () => {
    // `import { it as x } from "./local"` is undecidable without the Program — left clean, not flagged
    // (flagging would flood a real repo with false positives), exactly as documented.
    expect(detectSkipsAST('import { it as x } from "./local.js";\nx.skip("y", () => {});')).toEqual([]);
  });
});

describe('detectSkipsAST — codex round-7 #2: VACUOUS guards fold to unconditional', () => {
  // A guard whose condition is a COMPILE-TIME CONSTANT is not a runtime gate — the branch is taken
  // (or not) unconditionally, so the skip is a placeholder dressed as a gate. It MUST classify
  // `unconditional` (non-sanctionable) regardless of a capability-naming title (the codex laundering).
  const VACUOUS: ReadonlyArray<readonly [string, string]> = [
    ['if (true) {\n  it.skip("ffmpeg unavailable", () => {});\n}', 'if (true) — the exact codex probe'],
    ['if (1) { it.skip("x", () => {}); }', 'if (1)'],
    ['if ("yes") { it.skip("x", () => {}); }', 'if (non-empty string)'],
    ['if (!false) { it.skip("x", () => {}); }', 'if (!false)'],
    ['if (true && true) { it.skip("x", () => {}); }', 'if (true && true)'],
    ['if (false) { foo(); } else { it.skip("x", () => {}); }', 'else of if(false)'],
    ['it.skipIf(true)("x", () => {});', 'skipIf(true)'],
    ['it.skip(true, "x", () => {});', 'skip(true, …) condition-arg'],
    ['const r = true ? it.skip : it;\nr("x", () => {});', 'true ? it.skip : it'],
  ];
  for (const [source, label] of VACUOUS) {
    it(`folds ${label} to unconditional`, () => {
      const matches = detectSkipsAST(source);
      expect(matches.length, `${label}: expected a detected skip`).toBeGreaterThanOrEqual(1);
      for (const m of matches) expect(m.conditional, `${label}: ${JSON.stringify(m)}`).toBe('unconditional');
    });
  }

  // The mirror law: a GENUINE runtime-valued condition MUST stay conditional (no over-strictness — the
  // fold only ever fires on a literal constant, never a real gate that references a runtime value).
  const GENUINE: ReadonlyArray<readonly [string, SkipConditionality]> = [
    ['if (!FFMPEG) {\n  it.skip("x", () => {});\n}', 'enclosing-if'],
    ['if (process.platform === "win32") { it.skip("x", () => {}); }', 'enclosing-if'],
    ['if (FFMPEG) { foo(); } else { it.skip("x", () => {}); }', 'enclosing-if'],
    ['it.skipIf(!built)("x", () => {});', 'skipIf'],
    ['it.skip(!built, "x", () => {});', 'skipIf'],
    ['it.runIf(canUseSAB)("x", () => {});', 'runIf'],
    ['const r = FFMPEG ? it : it.skip;\nr("x", () => {});', 'ternary'],
  ];
  for (const [source, want] of GENUINE) {
    it(`keeps a runtime gate conditional (${want}): ${JSON.stringify(source).slice(0, 48)}`, () => {
      const got = detectSkipsAST(source).map((m) => m.conditional);
      expect(got, `expected ${want} in ${JSON.stringify(got)}`).toContain(want);
    });
  }
});

describe('detectSkipsAST — codex round-8 residuals (#2 chain unwrap, #3 namespace extraction, #1a constant fold)', () => {
  // #2 — the CHAIN WALKER (not just the binding collectors) unwraps `as`/`satisfies`/`!`/parens.
  const CHAIN_WRAPPED: ReadonlyArray<readonly [string, string]> = [
    ['(it as typeof it).skip("x", () => {});', 'an `as`-asserted runner head'],
    ['(it satisfies typeof it).skip("x", () => {});', 'a `satisfies`-asserted runner head'],
    ['it!.skip("x", () => {});', 'a non-null-asserted runner head'],
    ['(it).skip("x", () => {});', 'a parenthesized runner head'],
  ];
  for (const [source, label] of CHAIN_WRAPPED) {
    it(`detects ${label}`, () => {
      expect(detectSkipsAST(source).length, JSON.stringify(detectSkipsAST(source))).toBeGreaterThanOrEqual(1);
    });
  }

  // #3 — extracting a runner ROOT from a NAMESPACE member into a local binding.
  const NS_EXTRACT: ReadonlyArray<readonly [string, string]> = [
    ['import * as v from "vitest";\nconst spec = v.it;\nspec.skip("x", () => {});', 'a namespace-member capture `const spec = v.it`'],
    ['import * as v from "vitest";\nconst { it: spec } = v;\nspec.skip("x", () => {});', 'a namespace destructure `const { it: spec } = v`'],
    ['import * as v from "vitest";\nconst spec = v["it"];\nspec.skip("x", () => {});', 'a bracket namespace-member capture'],
  ];
  for (const [source, label] of NS_EXTRACT) {
    it(`detects ${label}`, () => {
      expect(detectSkipsAST(source).length, JSON.stringify(detectSkipsAST(source))).toBeGreaterThanOrEqual(1);
    });
  }
  it('does NOT extract an ordinary (non-runner) namespace member', () => {
    expect(detectSkipsAST('import * as v from "vitest";\nconst x = v.expect;\nx(1);')).toEqual([]);
  });

  // #1a — constant comparisons / Boolean(...) fold to vacuous (unconditional); runtime ones do not.
  it('folds `if (1 === 1)` to unconditional', () => {
    const [m] = detectSkipsAST('if (1 === 1) { it.skip("x", () => {}); }');
    expect(m?.conditional).toBe('unconditional');
  });
  it('folds `if (Boolean(1))` to unconditional', () => {
    const [m] = detectSkipsAST('if (Boolean(1)) { it.skip("x", () => {}); }');
    expect(m?.conditional).toBe('unconditional');
  });
  it('folds `it.skipIf(2 > 1)` to unconditional', () => {
    const [m] = detectSkipsAST('it.skipIf(2 > 1)("x", () => {});');
    expect(m?.conditional).toBe('unconditional');
  });
  it('keeps a RUNTIME comparison `if (x === 1)` conditional', () => {
    const [m] = detectSkipsAST('if (x === 1) { it.skip("x", () => {}); }');
    expect(m?.conditional).toBe('enclosing-if');
  });
});
