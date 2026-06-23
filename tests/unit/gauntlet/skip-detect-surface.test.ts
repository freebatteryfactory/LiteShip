/**
 * THE FULL VITEST SKIP/DISABLE SURFACE — `detectSkips` covers every static spelling, and the
 * suspicious COMPUTED form, robustly.
 *
 * Codex round-3 PROVED the old flat-regex detector MISSED real skip forms (each returned `[]`):
 *  - `it.concurrent.skip(...)` — a chained-modifier skip,
 *  - `test.concurrent.skip(...)` — same on the `test` root,
 *  - `it.each([...]).skip(...)` — the data-driven `.each().skip` chain,
 *  - `it["skip"](...)` / `it['skip'](...)` — bracket-string member access,
 *  - `it.sequential.skip(...)`, `describe.concurrent.skip(...)`, `describe.each([...]).skip(...)`,
 *  - `it[cond ? "skip" : "only"](...)` — a COMPUTED member access on a runner root.
 * A regex cannot pair the chain / bracket / computed structure; the cure is a comprehensive
 * TOKEN-AWARE matcher (the lean `@czap/gauntlet` carries no `typescript` dep, so an injected
 * AST is unavailable to this dependency-free primitive — the token walk is the robust answer
 * within that contract). This suite pins the WHOLE surface so no spelling can regress.
 *
 * BOTH consumers — the always-blocking `no-skipped-test` gate AND `@czap/command`'s
 * plumb-scan over `tests/generated/` — delegate to this one `detectSkips`, so every form here
 * is caught in BOTH the governed corpus and the generated handoff.
 */

import { describe, it, expect } from 'vitest';
import { detectSkips } from '@czap/gauntlet';

/** Convenience: does `detectSkips` flag `src` at all? */
function detects(src: string): boolean {
  return detectSkips(src).length > 0;
}

describe('detectSkips — every Vitest skip/disable form is caught (codex round-3 proven misses)', () => {
  // Each tuple: a source line that MUST be detected. The label is the form name. These are the
  // EXACT spellings the old detector returned `[]` for (the RED-before misses) plus the rest of
  // the surface — all GREEN-after with the comprehensive token-aware detector.
  const MUST_DETECT: ReadonlyArray<readonly [string, string]> = [
    ['it.skip("x", () => {});', 'plain it.skip('],
    ['test.skip("x", () => {});', 'test.skip('],
    ['describe.skip("x", () => {});', 'describe.skip('],
    ['suite.skip("x", () => {});', 'suite.skip('],
    ['bench.skip("x", () => {});', 'bench.skip('],
    ['it.todo("later");', 'it.todo('],
    ['it.fails("inverts", () => {});', 'it.fails('],
    ['xit("x", () => {});', 'xit'],
    ['xtest("x", () => {});', 'xtest'],
    ['xdescribe("x", () => {});', 'xdescribe'],
    // The codex-proven CHAINED-MODIFIER misses:
    ['it.concurrent.skip("x", () => {});', 'it.concurrent.skip'],
    ['test.concurrent.skip("x", () => {});', 'test.concurrent.skip'],
    ['it.sequential.skip("x", () => {});', 'it.sequential.skip'],
    ['describe.concurrent.skip("x", () => {});', 'describe.concurrent.skip'],
    ['it.skip.each([1])("x", () => {});', 'it.skip.each'],
    ['it.each([1]).skip("x", () => {});', 'it.each([...]).skip'],
    ['describe.each([1, 2]).skip("x", () => {});', 'describe.each([...]).skip'],
    ['it.concurrent.skip.each([1])("x", () => {});', 'it.concurrent.skip.each'],
    // The codex-proven BRACKET misses:
    ['it["skip"]("x", () => {});', 'it["skip"]'],
    ["it['skip']('x', () => {});", "it['skip']"],
    ['test["todo"]("x");', 'test["todo"]'],
    // The codex-proven COMPUTED miss (suspicious — flagged, not silently passed):
    ['it[cond ? "skip" : "only"]("x", () => {});', 'computed it[cond?"skip":"only"]'],
    ['it[member]("x", () => {});', 'computed it[member]'],
    // Conditional skips:
    ['it.skipIf(!ready)("x", () => {});', 'it.skipIf'],
    ['describe.skipIf(!x)("b", () => {});', 'describe.skipIf'],
    ['it.runIf(cap)("z", () => {});', 'it.runIf'],
    // Alias (bare reference, no call paren) — both arms:
    ['const f = COND ? it : it.skip;', 'alias COND ? it : it.skip'],
    ['const g = underCoverage ? it.skip : it;', 'inverse alias'],
  ];

  for (const [src, label] of MUST_DETECT) {
    it(`DETECTS: ${label}`, () => {
      expect(detects(src), `${label} must be detected: ${src}`).toBe(true);
    });
  }

  // RED-BEFORE PROOF (documentary): the exact codex-proven misses, asserted detected. If any
  // of these regress to `[]` the detector has lost the comprehensive coverage this suite exists
  // to lock. (The historical `[]` outputs are recorded in the module docstring.)
  it('the codex round-3 [] misses are ALL now caught (RED-before → green-after)', () => {
    const proven = [
      'it.concurrent.skip("x", () => {});',
      'test.concurrent.skip("x", () => {});',
      'it.each([1]).skip("x", () => {});',
      'it["skip"]("x", () => {});',
      'it.skip.each([1])("x", () => {});',
      'describe.concurrent.skip("x", () => {});',
      'it[cond ? "skip" : "only"]("x", () => {});',
    ];
    for (const src of proven) {
      expect(detectSkips(src).length, `still missed: ${src}`).toBeGreaterThan(0);
    }
  });
});

describe('detectSkips — NO false positives (prose/strings/non-runner chains stay clean)', () => {
  const MUST_NOT_DETECT: ReadonlyArray<readonly [string, string]> = [
    ['it("a real running test", () => {});', 'plain it()'],
    ['describe("a real suite", () => {});', 'plain describe()'],
    ['it.only("focused, not skipped", () => {});', 'it.only (focus, not skip)'],
    ['it.each([1, 2])("runs every row", () => {});', 'it.each() with no skip'],
    ['it.concurrent("parallel, not skipped", () => {});', 'it.concurrent with no skip'],
    ["const s = 'a prose mention of it.skip and it[\"skip\"]';", 'skip mention inside a STRING'],
    ['// a comment about it.skip / it.concurrent.skip / it["skip"]', 'skip mention inside a COMMENT'],
    ['myObj.skip("not a runner", () => {});', 'a NON-runner .skip'],
    ['result.todo();', 'a NON-runner .todo'],
    ['foo.it.skip("it is a property here", () => {});', 'obj.it.skip — `it` is a member, not the root'],
    ['queue.fit("not focus", () => {});', 'array.fit — `fit` is a member, not the root'],
  ];

  for (const [src, label] of MUST_NOT_DETECT) {
    it(`CLEAN: ${label}`, () => {
      expect(detects(src), `${label} must NOT be detected: ${src}`).toBe(false);
    });
  }

  it('a multi-line block with prose AND a real test is clean', () => {
    const src = [
      '/** This suite never uses it.skip — describe.concurrent.skip is just mentioned in prose. */',
      'it("asserts a real fact", () => {',
      '  const note = "unlike an it.skip placeholder or it[\\"skip\\"], this asserts";',
      '  expect(note.length).toBeGreaterThan(0);',
      '});',
    ].join('\n');
    expect(detectSkips(src)).toEqual([]);
  });
});

describe('detectSkips — form discrimination (call vs alias vs conditional vs computed)', () => {
  it('a called skip is `call`; a bare reference is `alias`', () => {
    expect(detectSkips('it.skip("x", () => {});')[0]?.form).toBe('call');
    expect(detectSkips('const f = COND ? it : it.skip;')[0]?.form).toBe('alias');
  });

  it('a conditional is `conditional`; a computed member is `computed`', () => {
    expect(detectSkips('it.skipIf(!x)("y", () => {});')[0]?.form).toBe('conditional');
    expect(detectSkips('it[cond ? "skip" : "only"]("y", () => {});')[0]?.form).toBe('computed');
  });

  it('a bracket-string skip is `call` when invoked, `alias` when a bare value', () => {
    expect(detectSkips('it["skip"]("y", () => {});')[0]?.form).toBe('call');
    expect(detectSkips('const f = it["skip"];')[0]?.form).toBe('alias');
  });

  it('reports the right 1-based line for a skip on line 3', () => {
    const src = 'const a = 1;\nit("real", () => {});\nit.concurrent.skip("nope", () => {});\n';
    const hits = detectSkips(src);
    expect(hits.length).toBe(1);
    expect(hits[0]?.line).toBe(3);
  });
});
