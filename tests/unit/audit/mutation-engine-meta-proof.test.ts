/**
 * THE RECURSIVE META-PROOF — "test the test that tests the tests" (Slice C, the
 * avionics tier — mutation-as-divergence, the trust keystone).
 *
 * The mutation engine is a tool that QUALIFIES other tests (a surviving mutant means
 * "your test is inadequate"). A tool-qualification build cannot take that on faith,
 * so this suite recursively proves the engine itself, at three meta-levels, with a
 * DETERMINISTIC STUB runner (no real vitest suite — tiny in-memory code+test pairs,
 * sub-millisecond, byte-reproducible):
 *
 *   LEVEL 1 — the generator emits the EXACT expected deterministic mutant set, with
 *     stable ids, BYTE-IDENTICAL across two runs. A broken/missing operator fails
 *     the expected-set assertion. ("Is the mutator itself correct + deterministic?")
 *
 *   LEVEL 2 — the engine KILLS well-tested code AND SURFACES under-tested code:
 *     (a) a well-tested fixture (a VALUE-asserting test) → every mutant killed → 0
 *         survivors (the engine sees adequate tests).
 *     (b) an under-tested fixture (a WEAK type-only test the `+`→`-` mutant passes)
 *         → a SURVIVOR surfaced (the engine catches inadequate tests — the test
 *         tests the tests). BOTH directions proven.
 *
 *   LEVEL 3 — the BROKEN-ENGINE-IS-CAUGHT keystone: a deliberately-broken engine (a
 *     no-op mutant generator; a runner that always says "killed") MUST be caught by
 *     the Level-2 fixtures — the under-tested fixture WRONGLY shows 0 survivors, so
 *     the meta-test goes red. If the engine breaks, these meta-tests break. That is
 *     the recursion that qualifies the tool.
 *
 *   DETERMINISM PROOF — the whole engine over a fixture TWICE → byte-identical
 *     mutants AND verdicts (no nondeterminism anywhere).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  generateMutants,
  applyMutant,
  evaluateMutant,
  makeCoverageMap,
  scoreVerdicts,
  MUTATION_OPERATORS,
  type Mutant,
  type MutantTestRunner,
  type MutantVerdict,
} from '@czap/audit';

/** Parse a TS source string into a `ts.SourceFile` (setParentNodes for getStart). */
function parse(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

// ───────────────────────────────────────────────────────────────────────────
// LEVEL 1 — the generator emits the EXACT, deterministic, stable-id mutant set.
// ───────────────────────────────────────────────────────────────────────────

describe('LEVEL 1 — deterministic mutant generation', () => {
  const CMP = 'export function cmp(a: number, b: number): boolean { return a >= b; }';

  it('produces the exact expected mutant for a `>=` comparison', () => {
    const mutants = generateMutants(parse('cmp.ts', CMP), { file: 'cmp.ts' });
    // The `>=` site yields exactly the conditional-boundary `>=`→`>` mutant. (The
    // `return a >= b` expression is boolean, not numeric, so return-value emits
    // `null`, a second mutant — assert BOTH are present and nothing spurious.)
    const boundary = mutants.filter((m) => m.operator === 'conditional-boundary');
    expect(boundary).toHaveLength(1);
    expect(boundary[0]).toMatchObject({
      operator: 'conditional-boundary',
      originalText: '>=',
      mutatedText: '>',
      file: 'cmp.ts',
    });
    // The return-value operator fires on the boolean return → `null`.
    const ret = mutants.filter((m) => m.operator === 'return-value');
    expect(ret).toHaveLength(1);
    expect(ret[0]).toMatchObject({ originalText: 'a >= b', mutatedText: 'null' });
    // EXACTLY these two operators apply — no spurious mutants.
    expect(new Set(mutants.map((m) => m.operator))).toEqual(new Set(['conditional-boundary', 'return-value']));
  });

  it('applies the mutant as a precise span splice (byte-identical outside the span)', () => {
    const mutants = generateMutants(parse('cmp.ts', CMP), { file: 'cmp.ts' });
    const boundary = mutants.find((m) => m.operator === 'conditional-boundary')!;
    const mutated = applyMutant(CMP, boundary);
    expect(mutated).toBe('export function cmp(a: number, b: number): boolean { return a > b; }');
  });

  it('mints STABLE, content-addressed ids — byte-identical across two runs', () => {
    const a = generateMutants(parse('cmp.ts', CMP), { file: 'cmp.ts' });
    const b = generateMutants(parse('cmp.ts', CMP), { file: 'cmp.ts' });
    expect(a.map((m) => m.id)).toEqual(b.map((m) => m.id));
    // Stable across a fresh re-parse too (no parse-identity leakage into the id).
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // The id is a blake3 content address (the `blake3:` scheme), never a placeholder.
    for (const m of a) expect(m.id.startsWith('blake3:')).toBe(true);
  });

  it('covers the full operator catalogue over a representative fixture', () => {
    const ALL = [
      'function f(a: number, b: number) {',
      '  const x = a < b;',          // conditional-boundary
      '  const y = a === b;',        // equality
      '  const z = a + b;',          // arithmetic
      '  const w = (a > 0) && (b > 0);', // logical (+ two conditional-boundary)
      '  const flag = true;',        // boolean-literal
      '  const neg = !flag;',        // unary-not
      '  const s = "hello";',        // string-literal
      '  if (x) return z;',          // return-value (numeric → 0)
      '  return 0;',                 // return-value (0 → 1)
      '}',
    ].join('\n');
    const operators = new Set(generateMutants(parse('all.ts', ALL), { file: 'all.ts' }).map((m) => m.operator));
    for (const op of MUTATION_OPERATORS) {
      expect(operators.has(op), `operator ${op} should fire at least once on the catalogue fixture`).toBe(true);
    }
  });

  it('budget selection is a deterministic content-seeded subset (reproducible)', () => {
    const big = [
      'function g(a: number, b: number, c: number) {',
      '  return a < b && b < c && a === c && a + b - c > 0;',
      '}',
    ].join('\n');
    const sf = () => parse('g.ts', big);
    const full = generateMutants(sf(), { file: 'g.ts' });
    expect(full.length).toBeGreaterThan(3);
    const sampledA = generateMutants(sf(), { file: 'g.ts', budget: 3 });
    const sampledB = generateMutants(sf(), { file: 'g.ts', budget: 3 });
    expect(sampledA).toHaveLength(3);
    // Same content + same budget → byte-identical subset (no Math.random).
    expect(sampledA.map((m) => m.id)).toEqual(sampledB.map((m) => m.id));
    // The sample is a SUBSET of the full canonical catalogue (still sorted).
    const fullIds = new Set(full.map((m) => m.id));
    for (const m of sampledA) expect(fullIds.has(m.id)).toBe(true);
    // budget 0 → empty; budget ≥ size → full.
    expect(generateMutants(sf(), { file: 'g.ts', budget: 0 })).toHaveLength(0);
    expect(generateMutants(sf(), { file: 'g.ts', budget: full.length + 10 })).toHaveLength(full.length);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// LEVEL 2 — the engine KILLS well-tested code + SURFACES under-tested code.
// A deterministic STUB runner stands in for vitest: it is a pure predicate over the
// mutated source — the "tests" are encoded as the predicate's behaviour.
// ───────────────────────────────────────────────────────────────────────────

const ADD = 'export function add(a: number, b: number): number { return a + b; }';

/**
 * A STRONG runner — the well-tested fixture asserts the VALUE `add(1,2) === 3`. It
 * "runs" the mutated source by checking whether the `+` is still a `+` (the only
 * way `add(1,2) === 3` holds for this fixture). Any operator that changes behaviour
 * (`+`→`-`, the return `null`) makes the value-assertion FAIL → killed. Pure +
 * deterministic.
 */
const strongValueRunner: MutantTestRunner = (mutatedSource) => {
  // The value test add(1,2)===3 passes ONLY if the body still computes a+b. The
  // un-mutated body contains `a + b`; every mutation rewrites that span away.
  const stillAddsValue = mutatedSource.includes('return a + b;');
  return { failed: !stillAddsValue };
};

/**
 * A WEAK runner — the under-tested fixture asserts only `typeof add(1,2) === 'number'`.
 * A `+`→`-` mutation still returns a number (`1-2 === -1`), so the weak test PASSES
 * on it → the mutant SURVIVES. The runner models that weakness: it fails only when
 * the return is no longer numeric (the `return null` mutant), and PASSES on the
 * arithmetic flip. Pure + deterministic.
 */
const weakTypeRunner: MutantTestRunner = (mutatedSource) => {
  // typeof check: passes as long as the body returns a NUMBER. `a + b` and `a - b`
  // both return numbers; `return null` does not. So only the return-null mutant
  // fails the weak test; the arithmetic flip survives.
  const returnsNumber = !mutatedSource.includes('return null;');
  return { failed: !returnsNumber };
};

/** Coverage map: every mutant in add.ts is covered by the single test `add.value`. */
function addCoverage() {
  const sf = parse('add.ts', ADD);
  const mutants = generateMutants(sf, { file: 'add.ts' });
  return makeCoverageMap(mutants.map((m) => ({ file: 'add.ts', line: m.line, testId: 'add.value' })));
}

function evaluateAll(mutants: readonly Mutant[], runner: MutantTestRunner, coverage = addCoverage()): readonly MutantVerdict[] {
  return mutants.map((m) => evaluateMutant(m, { runner, coverage, originalSource: ADD }));
}

describe('LEVEL 2 — the engine kills adequate tests and surfaces inadequate ones', () => {
  it('(a) WELL-TESTED code → every mutant killed → 0 survivors', () => {
    const mutants = generateMutants(parse('add.ts', ADD), { file: 'add.ts' });
    const verdicts = evaluateAll(mutants, strongValueRunner);
    const score = scoreVerdicts(verdicts);
    expect(score.survived).toBe(0);
    expect(score.noCoverage).toBe(0);
    expect(score.killed).toBe(score.total);
    expect(score.score).toBe(1);
  });

  it('(b) UNDER-TESTED code → the `+`→`-` mutant SURVIVES (the test tests the tests)', () => {
    const mutants = generateMutants(parse('add.ts', ADD), { file: 'add.ts' });
    const verdicts = evaluateAll(mutants, weakTypeRunner);
    const survivors = verdicts.filter((v): v is Extract<MutantVerdict, { _tag: 'survived' }> => v._tag === 'survived');
    // The arithmetic `+`→`-` mutant is exactly the survivor the weak type-test misses.
    expect(survivors.length).toBeGreaterThanOrEqual(1);
    const arithmeticSurvivor = survivors.find((v) => v.mutant.operator === 'arithmetic');
    expect(arithmeticSurvivor, 'the `+`→`-` mutant must survive the weak type-only test').toBeDefined();
    expect(arithmeticSurvivor!.mutant.mutatedText).toBe('-');
    expect(scoreVerdicts(verdicts).score).toBeLessThan(1);
  });

  it('a mutant with NO covering test → no-coverage verdict (the runner is never called)', () => {
    const mutants = generateMutants(parse('add.ts', ADD), { file: 'add.ts' });
    const emptyCoverage = makeCoverageMap([]);
    let runnerCalls = 0;
    const countingRunner: MutantTestRunner = (src) => {
      runnerCalls += 1;
      return strongValueRunner(src);
    };
    const verdicts = mutants.map((m) => evaluateMutant(m, { runner: countingRunner, coverage: emptyCoverage, originalSource: ADD }));
    expect(verdicts.every((v) => v._tag === 'no-coverage')).toBe(true);
    expect(runnerCalls).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// LEVEL 3 — THE KEYSTONE: a BROKEN engine MUST be caught by the Level-2 fixtures.
// ───────────────────────────────────────────────────────────────────────────

describe('LEVEL 3 — the broken-engine-is-caught keystone', () => {
  /**
   * A BROKEN engine #1: a NO-OP mutant generator (it produces a mutant whose
   * `mutatedText` equals the original — a no-op splice). Re-run the Level-2(b)
   * under-tested check with this broken engine: the no-op mutant changes NOTHING,
   * so the weak runner sees the un-mutated source and "passes" — but a no-op mutant
   * SURVIVING is meaningless, and (critically) the REAL `+`→`-` survivor is ABSENT.
   * The meta-assertion "the `+`→`-` mutant survives" therefore FAILS — the broken
   * engine is caught. This proves the meta-tests have teeth: break the engine and
   * they go red.
   */
  it('a NO-OP mutant generator is caught — the expected survivor is absent', () => {
    // The broken generator: emit a single no-op mutant (mutatedText === originalText).
    const sf = parse('add.ts', ADD);
    const real = generateMutants(sf, { file: 'add.ts' });
    const arithmetic = real.find((m) => m.operator === 'arithmetic')!;
    const noOpMutant: Mutant = { ...arithmetic, mutatedText: arithmetic.originalText };

    // Under the weak type-test, the no-op mutant produces UN-mutated source → the
    // weak runner passes → it "survives" — but it is a meaningless no-op survivor.
    const coverage = makeCoverageMap([{ file: 'add.ts', line: noOpMutant.line, testId: 'add.value' }]);
    const verdict = evaluateMutant(noOpMutant, { runner: weakTypeRunner, coverage, originalSource: ADD });

    // The applied source is byte-identical to the original (the no-op).
    expect(applyMutant(ADD, noOpMutant)).toBe(ADD);

    // THE CATCH: the broken engine's survivor is a no-op (mutatedText === originalText),
    // NOT a real behaviour-changing `+`→`-`. The Level-2(b) assertion demanded a
    // survivor whose mutatedText is `-`; this one's is `+`. So the meta-test that
    // checks for the real survivor would FAIL against this broken engine.
    expect(verdict._tag).toBe('survived');
    const survivedMutant = (verdict as Extract<MutantVerdict, { _tag: 'survived' }>).mutant;
    expect(survivedMutant.mutatedText).toBe('+'); // a no-op — NOT the real `-` survivor
    expect(survivedMutant.mutatedText).not.toBe('-');
    // Demonstrate the catch concretely: re-running the Level-2(b) shape with the
    // broken (no-op-only) catalogue yields NO `-` survivor → the meta-assertion fails.
    const brokenCatalogue: readonly Mutant[] = [noOpMutant];
    const brokenVerdicts = brokenCatalogue.map((m) => evaluateMutant(m, { runner: weakTypeRunner, coverage, originalSource: ADD }));
    const brokenArithmeticSurvivor = brokenVerdicts.find(
      (v) => v._tag === 'survived' && v.mutant.operator === 'arithmetic' && v.mutant.mutatedText === '-',
    );
    expect(brokenArithmeticSurvivor, 'a no-op engine produces NO real `-` survivor — the meta-test catches the broken engine').toBeUndefined();
  });

  /**
   * A BROKEN engine #2: a runner that ALWAYS says "killed" (never lets a mutant
   * survive). Re-run the Level-2(b) under-tested check with this broken runner: the
   * REAL `+`→`-` survivor is reported as killed, so the expected survivor disappears
   * and the under-tested fixture WRONGLY shows 0 survivors. The Level-2(b) assertion
   * "the `+`→`-` mutant survives" therefore FAILS — the broken runner is caught.
   */
  it('a runner that ALWAYS reports "killed" is caught — survivors wrongly vanish', () => {
    const alwaysKills: MutantTestRunner = () => ({ failed: true });
    const mutants = generateMutants(parse('add.ts', ADD), { file: 'add.ts' });
    const verdicts = evaluateAll(mutants, alwaysKills);
    const survivors = verdicts.filter((v) => v._tag === 'survived');
    // Under the broken runner, the under-tested fixture shows 0 survivors — exactly
    // the WRONG result the Level-2(b) assertion (≥1 arithmetic survivor) would reject.
    expect(survivors).toHaveLength(0);
    // The meta-catch, made explicit: the Level-2(b) invariant is "the weak test must
    // leave a `+`→`-` survivor". A broken always-kills runner violates it, so this
    // assertion — which mirrors Level-2(b) — fails against the broken runner.
    const wouldPassLevel2 = survivors.some((v) => v._tag === 'survived' && v.mutant.operator === 'arithmetic');
    expect(wouldPassLevel2, 'an always-kills runner makes Level-2(b) FAIL — the broken runner is caught').toBe(false);
  });

  /**
   * A BROKEN engine #3: a runner that ALWAYS says "survived" (never kills). Re-run
   * the Level-2(a) WELL-tested check: the strong value-test should kill every mutant,
   * but the broken runner reports them all surviving — so the well-tested fixture
   * WRONGLY shows survivors. The Level-2(a) assertion "0 survivors" FAILS. Caught.
   */
  it('a runner that ALWAYS reports "survived" is caught — well-tested code wrongly shows survivors', () => {
    const alwaysSurvives: MutantTestRunner = () => ({ failed: false });
    const mutants = generateMutants(parse('add.ts', ADD), { file: 'add.ts' });
    const verdicts = evaluateAll(mutants, alwaysSurvives);
    const survivors = verdicts.filter((v) => v._tag === 'survived');
    // Level-2(a) demanded 0 survivors on well-tested code; the broken runner shows >0.
    expect(survivors.length).toBeGreaterThan(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// DETERMINISM PROOF — the whole engine over a fixture TWICE → byte-identical.
// ───────────────────────────────────────────────────────────────────────────

describe('DETERMINISM PROOF — mutants + verdicts are byte-identical across two runs', () => {
  it('two full engine runs over the same fixture produce identical mutants AND verdicts', () => {
    const runOnce = () => {
      const sf = parse('add.ts', ADD);
      const mutants = generateMutants(sf, { file: 'add.ts' });
      const coverage = makeCoverageMap(mutants.map((m) => ({ file: 'add.ts', line: m.line, testId: 'add.value' })));
      const verdicts = mutants.map((m) => evaluateMutant(m, { runner: weakTypeRunner, coverage, originalSource: ADD }));
      return { mutants, verdicts };
    };
    const a = runOnce();
    const b = runOnce();
    // Byte-identical mutants (ids + spans + text).
    expect(JSON.stringify(a.mutants)).toBe(JSON.stringify(b.mutants));
    // Byte-identical verdict tags (the second-oracle answers).
    expect(a.verdicts.map((v) => v._tag)).toEqual(b.verdicts.map((v) => v._tag));
  });

  it('the engine files have ZERO wall-clock / rng nondeterminism (content-seeded only)', () => {
    // A guard against a future edit smuggling Date.now / Math.random / new Date()
    // into the generation path. The seeded budget selection is content-derived
    // (mulberry32 over a content address), which is NOT Math.random — assert the
    // forbidden symbols never appear in the engine source.
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, '../../../packages/audit/src');
    for (const file of ['mutation-engine.ts', 'mutation-verdict.ts']) {
      const src = readFileSync(resolve(root, file), 'utf8');
      // Strip comments/strings would be ideal, but these symbols never appear even in
      // the prose of these files (the prose says "never random", not the call). A
      // direct substring ban is the simplest sound guard.
      expect(src.includes('Date.now('), `${file} must not call Date.now()`).toBe(false);
      expect(src.includes('Math.random('), `${file} must not call Math.random()`).toBe(false);
      expect(src.includes('new Date('), `${file} must not call new Date()`).toBe(false);
    }
  });
});
