/**
 * The HOST-side MC/DC-facts builder proof — `buildMcdcFacts` folds the two pins per
 * atomic condition into one {@link McdcConditionOutcome} (MC/DC-covered iff BOTH killed),
 * deterministically, via the SAME injected runner path the mutation builder uses.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import {
  buildMcdcFacts,
  generateConditionMutants,
  makeCoverageMap,
  type McdcTargetFile,
  type MutantTestRunner,
} from '@liteship/audit';

const FILE = 'r.ts';
const SRC = 'export function inRange(x: number, lo: number, hi: number): boolean { return x >= lo && x <= hi; }';
const TARGET: McdcTargetFile = { file: FILE, text: SRC };

/** A coverage map covering every condition-mutant line of the fixture with one test. */
function coverage() {
  const sf = ts.createSourceFile(FILE, SRC, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const mutants = generateConditionMutants(sf, { file: FILE });
  return makeCoverageMap(mutants.map((m) => ({ file: FILE, line: m.line, testId: 'inRange.test' })));
}

/** Kills every pin (the strong suite) → all conditions MC/DC-covered. */
const strongRunner: MutantTestRunner = () => ({ failed: true });

/** Kills only the force-FALSE pins (the weak mid-only suite) → force-TRUE survives. */
const weakRunner: MutantTestRunner = (mutated) => ({ failed: mutated.includes('(false)') });

describe('buildMcdcFacts — folds two pins per condition into one outcome', () => {
  it('a strong suite → every condition MC/DC-covered (both pins killed)', () => {
    const facts = buildMcdcFacts([TARGET], { runner: strongRunner, coverage: coverage() });
    // Two atomic conditions (x >= lo, x <= hi), each folded from its two pins.
    expect(facts.conditions).toHaveLength(2);
    expect(new Set(facts.conditions.map((c) => c.condition))).toEqual(new Set(['x >= lo', 'x <= hi']));
    for (const c of facts.conditions) {
      expect(c.forceTrueVerdict).toBe('killed');
      expect(c.forceFalseVerdict).toBe('killed');
    }
  });

  it('a weak mid-only suite → each condition has a SURVIVING force-TRUE pin (an MC/DC gap)', () => {
    const facts = buildMcdcFacts([TARGET], { runner: weakRunner, coverage: coverage() });
    expect(facts.conditions).toHaveLength(2);
    for (const c of facts.conditions) {
      expect(c.forceTrueVerdict).toBe('survived'); // the unobserved independent effect
      expect(c.forceFalseVerdict).toBe('killed');
    }
  });

  it('no covering test → both pins no-coverage (the whole decision is untested)', () => {
    const facts = buildMcdcFacts([TARGET], { runner: strongRunner, coverage: makeCoverageMap([]) });
    for (const c of facts.conditions) {
      expect(c.forceTrueVerdict).toBe('no-coverage');
      expect(c.forceFalseVerdict).toBe('no-coverage');
    }
  });

  it('is deterministic — two runs produce byte-identical facts', () => {
    const a = buildMcdcFacts([TARGET], { runner: weakRunner, coverage: coverage() });
    const b = buildMcdcFacts([TARGET], { runner: weakRunner, coverage: coverage() });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // Each condition carries a stable, force-INDEPENDENT content address.
    for (const c of a.conditions) expect(c.conditionId.startsWith('blake3:')).toBe(true);
    // The two conditions have distinct ids (different (line,column,condition)).
    expect(new Set(a.conditions.map((c) => c.conditionId)).size).toBe(a.conditions.length);
  });
});
