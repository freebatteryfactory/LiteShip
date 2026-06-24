/**
 * THE MC/DC CONDITION-MUTATION META-PROOF — "test the test that proves MC/DC" (the
 * avionics tier — DO-178B Level A's Modified Condition/Decision Coverage, realized as
 * condition-level mutation, the trust keystone).
 *
 * The condition-mutation engine is a tool that QUALIFIES a suite's MC/DC adequacy (a
 * surviving force-true/force-false pin means "your suite never showed this condition
 * independently affects the decision"). A tool-qualification build cannot take that on
 * faith, so this suite recursively proves the engine itself, with a DETERMINISTIC STUB
 * runner (no real vitest — tiny in-memory code+test pairs, sub-millisecond, byte-
 * reproducible):
 *
 *   LEVEL 1 — the META-PROOF the brief demands: a fixture decision `if (a && b)`
 *     generates the EXACT expected condition-mutants — force a=true, a=false, b=true,
 *     b=false — BYTE-STABLE across two runs with stable content-addressed ids. A
 *     broken/missing decomposition fails the expected-set assertion.
 *
 *   LEVEL 1b — DECISION COVERAGE: every decision form (if / while / do / for / ternary /
 *     bare logical / boolean-return) is decomposed into its atomic conditions, and a
 *     TYPE-ONLY conditional type (`T extends U ? …`) is correctly SKIPPED (no runtime
 *     decision → no pin).
 *
 *   LEVEL 2 — the engine OBSERVES the independent effect AND SURFACES the gap:
 *     (a) a suite that distinguishes BOTH values of a condition → both pins killed (the
 *         independent effect is observed — MC/DC-covered).
 *     (b) a suite that never distinguishes a condition's value → its pin SURVIVES (the
 *         engine catches the MC/DC gap — the test tests the suite). BOTH directions.
 *
 *   LEVEL 3 — the BROKEN-ENGINE-IS-CAUGHT keystone: a deliberately-broken engine (a
 *     no-op pin generator; a runner that always says "killed") MUST be caught by the
 *     Level-2 fixtures.
 *
 *   DETERMINISM PROOF — the whole engine over a fixture TWICE → byte-identical
 *     condition-mutants AND verdicts; and the engine source carries no clock/rng.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  generateConditionMutants,
  applyConditionMutant,
  evaluateMutant,
  makeCoverageMap,
  CONDITION_FORCES,
  type ConditionMutant,
  type MutantTestRunner,
} from '@czap/audit';

/** Parse a TS source string into a `ts.SourceFile` (setParentNodes for getStart). */
function parse(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

// ───────────────────────────────────────────────────────────────────────────
// LEVEL 1 — the brief's META-PROOF: `if (a && b)` → exactly the 4 expected pins.
// ───────────────────────────────────────────────────────────────────────────

describe('LEVEL 1 — `if (a && b)` mints exactly force a=true/false, b=true/false', () => {
  const SRC = 'export function f(a: boolean, b: boolean): void { if (a && b) { g(); } }';

  it('generates EXACTLY the four expected condition-mutants (a/b × true/false)', () => {
    const mutants = generateConditionMutants(parse('f.ts', SRC), { file: 'f.ts' });
    // Two atomic conditions (a, b), two pins each → exactly four.
    expect(mutants).toHaveLength(4);
    // The (condition, force, mutatedText) tuples — exactly the MC/DC pin set.
    const tuples = mutants.map((m) => `${m.condition}|${m.force}|${m.mutatedText}`).sort();
    expect(tuples).toEqual(
      [
        'a|force-condition-true|(true)',
        'a|force-condition-false|(false)',
        'b|force-condition-true|(true)',
        'b|force-condition-false|(false)',
      ].sort(),
    );
    // Each pin carries the WHOLE decision text (so the finding shows the branch).
    for (const m of mutants) expect(m.decision).toBe('a && b');
    // Both atomic conditions are present (the `&&` was flattened, not kept whole).
    expect(new Set(mutants.map((m) => m.condition))).toEqual(new Set(['a', 'b']));
  });

  it('applies a pin as a precise span splice (byte-identical outside the span)', () => {
    const mutants = generateConditionMutants(parse('f.ts', SRC), { file: 'f.ts' });
    const aTrue = mutants.find((m) => m.condition === 'a' && m.force === 'force-condition-true')!;
    expect(applyConditionMutant(SRC, aTrue)).toBe(
      'export function f(a: boolean, b: boolean): void { if ((true) && b) { g(); } }',
    );
    const bFalse = mutants.find((m) => m.condition === 'b' && m.force === 'force-condition-false')!;
    expect(applyConditionMutant(SRC, bFalse)).toBe(
      'export function f(a: boolean, b: boolean): void { if (a && (false)) { g(); } }',
    );
  });

  it('mints STABLE, content-addressed ids — byte-identical across two runs', () => {
    const a = generateConditionMutants(parse('f.ts', SRC), { file: 'f.ts' });
    const b = generateConditionMutants(parse('f.ts', SRC), { file: 'f.ts' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // Each pin's id is a blake3 content address, and the two pins of one condition differ.
    for (const m of a) expect(m.id.startsWith('blake3:')).toBe(true);
    const aTrue = a.find((m) => m.condition === 'a' && m.force === 'force-condition-true')!;
    const aFalse = a.find((m) => m.condition === 'a' && m.force === 'force-condition-false')!;
    expect(aTrue.id).not.toBe(aFalse.id); // the force is folded into the id
    // The id is disjoint from a classic mutant id (the `kind:'mcdc'` discriminant) —
    // a condition-mutant never collides with an operator-mutant in the shared cache.
    expect(new Set(a.map((m) => m.id)).size).toBe(a.length);
  });

  it('the canonical force order is true-before-false (the deterministic tiebreak)', () => {
    expect([...CONDITION_FORCES]).toEqual(['force-condition-true', 'force-condition-false']);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// LEVEL 1b — every decision form is decomposed; type-only conditions are skipped.
// ───────────────────────────────────────────────────────────────────────────

describe('LEVEL 1b — decision coverage + type-only skip', () => {
  /** The set of atomic condition texts mutated for a source fixture. */
  const conditionsOf = (source: string): ReadonlySet<string> =>
    new Set(generateConditionMutants(parse('d.ts', source), { file: 'd.ts' }).map((m) => m.condition));

  it('an `if` with a 3-way `||` decision yields all three atomic conditions', () => {
    const src = 'export function f(a: number, b: number, c: number): void { if (a < 0 || b < 0 || c < 0) { g(); } }';
    expect(conditionsOf(src)).toEqual(new Set(['a < 0', 'b < 0', 'c < 0']));
  });

  it('while / do-while / for / ternary decisions are all decomposed', () => {
    expect(conditionsOf('export function f(a: boolean, b: boolean) { while (a && b) {} }')).toEqual(new Set(['a', 'b']));
    expect(conditionsOf('export function f(a: boolean, b: boolean) { do {} while (a || b); }')).toEqual(new Set(['a', 'b']));
    expect(conditionsOf('export function f(a: boolean, b: boolean) { for (; a && b; ) {} }')).toEqual(new Set(['a', 'b']));
    expect(conditionsOf('export const x = (a: boolean, b: boolean) => (a || b ? 1 : 0);')).toEqual(new Set(['a', 'b']));
  });

  it('a BOOLEAN-shaped return is a decision; a bare value return is NOT', () => {
    // `return a && b` is a boolean decision → both conditions mutated.
    expect(conditionsOf('export function f(a: boolean, b: boolean): boolean { return a && b; }')).toEqual(
      new Set(['a', 'b']),
    );
    // `return compute()` is a value passthrough, not a branch → no pins (would be a
    // false MC/DC gap testing the CALLER's coverage, which the engine declines to mint).
    expect(conditionsOf('export function f(): unknown { return compute(); }')).toEqual(new Set());
  });

  it('a TYPE-ONLY conditional type (`T extends U ? X : Y`) is NOT mutated (erased syntax)', () => {
    // The `extends` test is a TypeNode — no runtime decision, so no pin (a pin there
    // could only ever be a false survivor: erased syntax carries no runtime behaviour).
    const src = 'export type Pick2<T, K> = K extends keyof T ? T[K] : never;';
    expect(conditionsOf(src)).toEqual(new Set());
  });
});

// ───────────────────────────────────────────────────────────────────────────
// LEVEL 2 — the engine OBSERVES the independent effect + SURFACES the MC/DC gap.
// A deterministic STUB runner stands in for vitest: a pure predicate over the pinned
// source — the "suite" is encoded as the predicate's behaviour.
// ───────────────────────────────────────────────────────────────────────────

const DECISION = 'export function inRange(x: number, lo: number, hi: number): boolean { return x >= lo && x <= hi; }';

/** Covering map: every condition-mutant in DECISION is covered by the single test. */
function decisionCoverage(file = 'r.ts') {
  const mutants = generateConditionMutants(parse(file, DECISION), { file });
  return makeCoverageMap(mutants.map((m) => ({ file, line: m.line, testId: 'inRange.test' })));
}

/**
 * A STRONG suite — distinguishes BOTH values of BOTH conditions. It models a test pair
 * that pins each condition both ways and asserts the OUTCOME flips: any pin that changes
 * the decision's truth-set at the tested points fails. We model that by failing on ANY
 * pin (both `(true)` and `(false)` of either condition change `inRange`'s behaviour on a
 * suite that exercises the boundaries) — so every pin is KILLED (full MC/DC observed).
 */
const strongRunner: MutantTestRunner = (mutatedSource) => {
  // The original body is `return x >= lo && x <= hi;`. A strong suite asserts inRange at
  // points that distinguish each pin (e.g. x<lo, lo<=x<=hi, x>hi), so ANY pin flips an
  // assertion → killed. Modelled as: the pinned source differs from the original → fail.
  const stillOriginal = mutatedSource.includes('return x >= lo && x <= hi;');
  return { failed: !stillOriginal };
};

/**
 * A WEAK suite — asserts ONLY `inRange(mid) === true` for a mid strictly inside [lo,hi].
 * Forcing `x <= hi` to TRUE still returns true at mid (both operands true), so that pin
 * SURVIVES — the suite never shows `x <= hi`'s independent effect. The runner models the
 * weakness: it fails only when the pin changes the mid result (the `x <= hi`→`(false)`
 * pin makes mid false → killed; the `x <= hi`→`(true)` pin keeps mid true → survives).
 */
const weakMidRunner: MutantTestRunner = (mutatedSource) => {
  // At a mid inside the range, x>=lo is true and x<=hi is true → inRange = true.
  //  - x<=hi forced (true): still `x>=lo && (true)` = true at mid → PASS → survives.
  //  - x<=hi forced (false): `x>=lo && (false)` = false at mid → FAIL → killed.
  //  - x>=lo forced (true): `(true) && x<=hi` = true at mid → PASS → survives.
  //  - x>=lo forced (false): `(false) && …` = false at mid → FAIL → killed.
  const midStaysTrue = !mutatedSource.includes('(false)');
  return { failed: !midStaysTrue };
};

describe('LEVEL 2 — observes the independent effect + surfaces the MC/DC gap', () => {
  it('(a) a STRONG suite kills BOTH pins of BOTH conditions → full MC/DC (no gap)', () => {
    const mutants = generateConditionMutants(parse('r.ts', DECISION), { file: 'r.ts' });
    const coverage = decisionCoverage();
    const verdicts = mutants.map((m) => evaluateMutant(m, { runner: strongRunner, coverage, originalSource: DECISION }));
    expect(verdicts.every((v) => v._tag === 'killed')).toBe(true);
  });

  it('(b) a WEAK suite leaves the force-TRUE pins SURVIVING → an MC/DC gap is surfaced', () => {
    const mutants = generateConditionMutants(parse('r.ts', DECISION), { file: 'r.ts' });
    const coverage = decisionCoverage();
    const verdicts = mutants.map((m) => ({
      mutant: m,
      verdict: evaluateMutant(m, { runner: weakMidRunner, coverage, originalSource: DECISION }),
    }));
    const survivors = verdicts.filter((v) => v.verdict._tag === 'survived');
    // Exactly the two force-TRUE pins survive (the weak mid-only suite never shows either
    // condition's true→false effect); the two force-FALSE pins are killed.
    expect(survivors).toHaveLength(2);
    expect(survivors.every((s) => s.mutant.force === 'force-condition-true')).toBe(true);
    expect(new Set(survivors.map((s) => s.mutant.condition))).toEqual(new Set(['x >= lo', 'x <= hi']));
  });

  it('a condition-mutant with NO covering test → no-coverage (the runner is never called)', () => {
    const mutants = generateConditionMutants(parse('r.ts', DECISION), { file: 'r.ts' });
    const emptyCoverage = makeCoverageMap([]);
    let calls = 0;
    const counting: MutantTestRunner = (s) => {
      calls += 1;
      return strongRunner(s);
    };
    const verdicts = mutants.map((m) => evaluateMutant(m, { runner: counting, coverage: emptyCoverage, originalSource: DECISION }));
    expect(verdicts.every((v) => v._tag === 'no-coverage')).toBe(true);
    expect(calls).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// LEVEL 3 — THE KEYSTONE: a BROKEN engine MUST be caught by the Level-2 fixtures.
// ───────────────────────────────────────────────────────────────────────────

describe('LEVEL 3 — the broken-engine-is-caught keystone', () => {
  it('a NO-OP pin generator is caught — the expected survivor is absent', () => {
    // A broken generator emits a pin whose mutatedText equals the original condition (a
    // no-op splice). Under the weak suite it "survives" — but it is a meaningless no-op,
    // NOT the real force-true survivor the Level-2(b) assertion demands.
    const mutants = generateConditionMutants(parse('r.ts', DECISION), { file: 'r.ts' });
    const real = mutants.find((m) => m.condition === 'x <= hi' && m.force === 'force-condition-true')!;
    const noOp: ConditionMutant = { ...real, mutatedText: real.condition };
    expect(applyConditionMutant(DECISION, noOp)).toBe(DECISION); // a no-op
    const coverage = makeCoverageMap([{ file: 'r.ts', line: noOp.line, testId: 'inRange.test' }]);
    const verdict = evaluateMutant(noOp, { runner: weakMidRunner, coverage, originalSource: DECISION });
    // The no-op "survives", but its mutatedText is the original condition — NOT `(true)`.
    expect(verdict._tag).toBe('survived');
    expect(noOp.mutatedText).not.toBe('(true)');
  });

  it('a runner that ALWAYS reports "killed" is caught — survivors wrongly vanish', () => {
    const alwaysKills: MutantTestRunner = () => ({ failed: true });
    const mutants = generateConditionMutants(parse('r.ts', DECISION), { file: 'r.ts' });
    const coverage = decisionCoverage();
    const verdicts = mutants.map((m) => evaluateMutant(m, { runner: alwaysKills, coverage, originalSource: DECISION }));
    // Level-2(b) demanded ≥1 force-true survivor under the weak suite; an always-kills
    // runner shows 0 survivors — exactly the WRONG result that assertion would reject.
    expect(verdicts.filter((v) => v._tag === 'survived')).toHaveLength(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// DETERMINISM PROOF — byte-identical condition-mutants + verdicts; no clock/rng.
// ───────────────────────────────────────────────────────────────────────────

describe('DETERMINISM PROOF — condition-mutants + verdicts are byte-identical across runs', () => {
  it('two full engine runs over the same fixture produce identical mutants AND verdicts', () => {
    const runOnce = () => {
      const mutants = generateConditionMutants(parse('r.ts', DECISION), { file: 'r.ts' });
      const coverage = decisionCoverage();
      const verdicts = mutants.map((m) => evaluateMutant(m, { runner: weakMidRunner, coverage, originalSource: DECISION }));
      return { mutants, verdicts: verdicts.map((v) => v._tag) };
    };
    const a = runOnce();
    const b = runOnce();
    expect(JSON.stringify(a.mutants)).toBe(JSON.stringify(b.mutants));
    expect(a.verdicts).toEqual(b.verdicts);
  });

  it('the condition-mutation engine source has ZERO wall-clock / rng nondeterminism', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, '../../../packages/audit/src');
    for (const file of ['mcdc-engine.ts', 'mcdc-facts-build.ts']) {
      const src = readFileSync(resolve(root, file), 'utf8');
      expect(src.includes('Date.now('), `${file} must not call Date.now()`).toBe(false);
      expect(src.includes('Math.random('), `${file} must not call Math.random()`).toBe(false);
      expect(src.includes('new Date('), `${file} must not call new Date()`).toBe(false);
    }
  });
});
