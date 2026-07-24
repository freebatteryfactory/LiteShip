import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import ts from 'typescript';
import {
  buildMcdcFacts,
  buildMutationFacts,
  generateConditionMutants,
  generateMutants,
  makeCoverageMap,
  makeEquivalentMutantRegistry,
  MUTATION_OPERATORS,
  type McdcTargetFile,
  type MutationTargetFile,
  type MutantTestRunner,
} from '@liteship/audit';

const ARITHMETIC: MutationTargetFile = {
  file: 'packages/core/src/schema/arithmetic-fixture.ts',
  text: 'export function calculate(a: number, b: number): number { return a + b; }',
};

const DECISION: MutationTargetFile = {
  file: 'packages/core/src/schema/decision-fixture.ts',
  text: 'export function decide(a: number, b: number): boolean { return a >= b && a !== 0; }',
};

const RANGE: McdcTargetFile = {
  file: 'packages/core/src/schema/range-fixture.ts',
  text: 'export function inRange(x: number, lo: number, hi: number): boolean { return x >= lo && x <= hi; }',
};

const CONSTANT: McdcTargetFile = {
  file: 'packages/core/src/schema/constant-fixture.ts',
  text: 'export const answer = 42;',
};

const killedRunner: MutantTestRunner = () => ({ failed: true });
const survivedRunner: MutantTestRunner = () => ({ failed: false });

function mutationCoverage(targets: readonly MutationTargetFile[], testIds: readonly string[]) {
  const records = targets.flatMap((target) => {
    const sourceFile = ts.createSourceFile(target.file, target.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    return generateMutants(sourceFile, { file: target.file }).flatMap((mutant) =>
      testIds.map((testId) => ({ file: target.file, line: mutant.line, testId })),
    );
  });
  return makeCoverageMap(records);
}

function mcdcCoverage(targets: readonly McdcTargetFile[], testIds: readonly string[]) {
  const records = targets.flatMap((target) => {
    const sourceFile = ts.createSourceFile(target.file, target.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    return generateConditionMutants(sourceFile, { file: target.file }).flatMap((mutant) =>
      testIds.map((testId) => ({ file: target.file, line: mutant.line, testId })),
    );
  });
  return makeCoverageMap(records);
}

const testIdArbitrary = fc
  .uniqueArray(fc.stringMatching(/^tests\/unit\/[a-z]{1,8}\.test\.ts$/u), { minLength: 1, maxLength: 6 })
  .map((ids) => [...ids]);

describe('mutation evidence properties', () => {
  it('is invariant to target and coverage-record ordering', () => {
    fc.assert(
      fc.property(testIdArbitrary, fc.boolean(), (testIds, reverse) => {
        const targets = reverse ? [DECISION, ARITHMETIC] : [ARITHMETIC, DECISION];
        const first = buildMutationFacts(targets, {
          runner: killedRunner,
          coverage: mutationCoverage(targets, testIds),
        });
        const reversedTargets = [...targets].reverse();
        const second = buildMutationFacts(reversedTargets, {
          runner: killedRunner,
          coverage: mutationCoverage(reversedTargets, [...testIds].reverse()),
        });
        expect(second).toEqual(first);
      }),
    );
  });

  it('records the full file/operator cartesian census, including zero counts', () => {
    const targets = [ARITHMETIC, DECISION];
    const facts = buildMutationFacts(targets, {
      runner: killedRunner,
      coverage: mutationCoverage(targets, ['tests/unit/provenance.test.ts']),
    });
    expect(facts.operatorApplicability).toHaveLength(targets.length * MUTATION_OPERATORS.length);
    for (const target of targets) {
      const rows = facts.operatorApplicability.filter((row) => row.file === target.file);
      expect(rows.map((row) => row.operator)).toEqual(
        [...MUTATION_OPERATORS].sort((left, right) => left.localeCompare(right)),
      );
      expect(rows.some((row) => row.applicableMutants === 0)).toBe(true);
      for (const row of rows) {
        expect(row.applicableMutants).toBe(
          facts.outcomes.filter((outcome) => outcome.file === row.file && outcome.operator === row.operator).length,
        );
      }
    }
  });

  it('binds every executable outcome to sorted covering tests and no subsumption claim', () => {
    fc.assert(
      fc.property(testIdArbitrary, (testIds) => {
        const facts = buildMutationFacts([DECISION], {
          runner: survivedRunner,
          coverage: mutationCoverage([DECISION], [...testIds].reverse()),
        });
        for (const outcome of facts.outcomes) {
          expect(outcome.coveringTests).toEqual([...testIds].sort((a, b) => a.localeCompare(b)));
          expect(outcome.verdict).toBe('survived');
          expect(outcome.equivalentJustification).toBeNull();
          expect(outcome.equivalentJustificationDigest).toBeNull();
          expect(outcome.subsumedBy).toEqual([]);
        }
      }),
    );
  });

  it('records no-coverage rather than inventing a survivor when no test reaches a site', () => {
    let runnerCalls = 0;
    const facts = buildMutationFacts([ARITHMETIC], {
      runner: () => {
        runnerCalls += 1;
        return { failed: false };
      },
      coverage: makeCoverageMap([]),
    });
    expect(facts.outcomes.length).toBeGreaterThan(0);
    expect(facts.outcomes.every((outcome) => outcome.verdict === 'no-coverage')).toBe(true);
    expect(facts.outcomes.every((outcome) => outcome.coveringTests.length === 0)).toBe(true);
    expect(runnerCalls).toBe(0);
  });

  it('content-addresses equivalent justification against both mutant identity and proof text', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(fc.string({ minLength: 1, maxLength: 80 }), fc.string({ minLength: 1, maxLength: 80 }))
          .filter(([left, right]) => left !== right),
        ([left, right]) => {
          const sourceFile = ts.createSourceFile(
            ARITHMETIC.file,
            ARITHMETIC.text,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TS,
          );
          const mutant = generateMutants(sourceFile, { file: ARITHMETIC.file })[0]!;
          const registryFor = (justification: string) =>
            makeEquivalentMutantRegistry([
              {
                mutantId: mutant.id,
                file: mutant.file,
                line: mutant.line,
                column: mutant.column,
                operator: mutant.operator,
                originalText: mutant.originalText,
                mutatedText: mutant.mutatedText,
                justification,
              },
            ]);
          const coverage = mutationCoverage([ARITHMETIC], ['tests/unit/equivalent.test.ts']);
          const first = buildMutationFacts([ARITHMETIC], {
            runner: killedRunner,
            coverage,
            equivalents: registryFor(left),
          }).outcomes.find((outcome) => outcome.mutantId === mutant.id)!;
          const second = buildMutationFacts([ARITHMETIC], {
            runner: killedRunner,
            coverage,
            equivalents: registryFor(right),
          }).outcomes.find((outcome) => outcome.mutantId === mutant.id)!;
          expect(first.verdict).toBe('equivalent');
          expect(second.verdict).toBe('equivalent');
          expect(first.equivalentJustification).toBe(left);
          expect(second.equivalentJustification).toBe(right);
          expect(first.equivalentJustificationDigest).toMatch(/^blake3:/u);
          expect(second.equivalentJustificationDigest).toMatch(/^blake3:/u);
          expect(first.equivalentJustificationDigest).not.toBe(second.equivalentJustificationDigest);
        },
      ),
    );
  });

  it('gives every emitted mutant a distinct stable identity', () => {
    const facts = buildMutationFacts([ARITHMETIC, DECISION], {
      runner: killedRunner,
      coverage: mutationCoverage([ARITHMETIC, DECISION], ['tests/unit/identity.test.ts']),
    });
    expect(new Set(facts.outcomes.map((outcome) => outcome.mutantId)).size).toBe(facts.outcomes.length);
    const repeated = buildMutationFacts([ARITHMETIC, DECISION], {
      runner: killedRunner,
      coverage: mutationCoverage([ARITHMETIC, DECISION], ['tests/unit/identity.test.ts']),
    });
    expect(repeated.outcomes.map((outcome) => outcome.mutantId)).toEqual(
      facts.outcomes.map((outcome) => outcome.mutantId),
    );
  });
});

describe('MC/DC evidence properties', () => {
  it('is invariant to target and coverage-record ordering', () => {
    fc.assert(
      fc.property(testIdArbitrary, fc.boolean(), (testIds, reverse) => {
        const targets = reverse ? [CONSTANT, RANGE] : [RANGE, CONSTANT];
        const first = buildMcdcFacts(targets, {
          runner: killedRunner,
          coverage: mcdcCoverage(targets, testIds),
        });
        const reversedTargets = [...targets].reverse();
        const second = buildMcdcFacts(reversedTargets, {
          runner: killedRunner,
          coverage: mcdcCoverage(reversedTargets, [...testIds].reverse()),
        });
        expect(second).toEqual(first);
      }),
    );
  });

  it('records every admitted target, including a zero-condition target', () => {
    const facts = buildMcdcFacts([RANGE, CONSTANT], {
      runner: killedRunner,
      coverage: mcdcCoverage([RANGE, CONSTANT], ['tests/unit/range.test.ts']),
    });
    expect(facts.targetCensus).toEqual([
      { file: CONSTANT.file, applicableConditions: 0 },
      { file: RANGE.file, applicableConditions: 2 },
    ]);
    for (const row of facts.targetCensus) {
      expect(row.applicableConditions).toBe(facts.conditions.filter((condition) => condition.file === row.file).length);
    }
  });

  it('binds each folded condition to sorted covering tests shared by both pins', () => {
    fc.assert(
      fc.property(testIdArbitrary, (testIds) => {
        const facts = buildMcdcFacts([RANGE], {
          runner: killedRunner,
          coverage: mcdcCoverage([RANGE], [...testIds].reverse()),
        });
        expect(facts.conditions).toHaveLength(2);
        for (const condition of facts.conditions) {
          expect(condition.coveringTests).toEqual([...testIds].sort((a, b) => a.localeCompare(b)));
          expect(condition.forceTrueVerdict).toBe('killed');
          expect(condition.forceFalseVerdict).toBe('killed');
        }
      }),
    );
  });

  it('records both pins as no-coverage and never calls the runner when the decision is unreachable', () => {
    let runnerCalls = 0;
    const facts = buildMcdcFacts([RANGE], {
      runner: () => {
        runnerCalls += 1;
        return { failed: true };
      },
      coverage: makeCoverageMap([]),
    });
    expect(facts.conditions).toHaveLength(2);
    expect(
      facts.conditions.every(
        (condition) =>
          condition.forceTrueVerdict === 'no-coverage' &&
          condition.forceFalseVerdict === 'no-coverage' &&
          condition.coveringTests.length === 0,
      ),
    ).toBe(true);
    expect(runnerCalls).toBe(0);
  });

  it('keeps condition identities stable across runner verdicts while verdict evidence changes', () => {
    const coverage = mcdcCoverage([RANGE], ['tests/unit/range.test.ts']);
    const killed = buildMcdcFacts([RANGE], { runner: killedRunner, coverage });
    const survived = buildMcdcFacts([RANGE], { runner: survivedRunner, coverage });
    expect(survived.conditions.map((condition) => condition.conditionId)).toEqual(
      killed.conditions.map((condition) => condition.conditionId),
    );
    expect(killed.conditions.every((condition) => condition.forceTrueVerdict === 'killed')).toBe(true);
    expect(survived.conditions.every((condition) => condition.forceTrueVerdict === 'survived')).toBe(true);
  });

  it('gives distinct atomic conditions distinct identities', () => {
    const facts = buildMcdcFacts([RANGE], {
      runner: killedRunner,
      coverage: mcdcCoverage([RANGE], ['tests/unit/range.test.ts']),
    });
    expect(new Set(facts.conditions.map((condition) => condition.conditionId)).size).toBe(facts.conditions.length);
    expect(facts.conditions.map((condition) => condition.condition)).toEqual(['x >= lo', 'x <= hi']);
  });
});
