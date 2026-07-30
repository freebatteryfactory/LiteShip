/**
 * The host mutation-facts builder + the END-TO-END loop (Slice C — engine →
 * builder → the lean gate). Proves the host bridge folds the deterministic engine +
 * an injected stub runner into {@link MutationFacts} the `mutationDivergenceGate`
 * then reports over, with NO real vitest suite (tiny in-memory code+test pairs).
 *
 * @module
 */
// PROVES: INV-MUTATION-FACTS-DETERMINISTIC
import { describe, it, expect } from 'vitest';
import {
  buildMutationFacts,
  makeCoverageMap,
  generateMutants,
  makeEquivalentMutantRegistry,
  scoreVerdicts,
  MUTATION_OPERATORS,
  type MutantTestRunner,
} from '@liteship/audit';
import ts from 'typescript';
import {
  mutationDivergenceGate,
  makeRepoIR,
  memoryContext,
  PLACEHOLDER_DIGEST,
  type GateContext,
} from '@liteship/gauntlet';

// An L4 file (the `core/.../schema/brands.ts` L4 glob) so a survivor is a blocking error.
const FILE = 'packages/core/src/schema/brands.ts';
const SRC = 'export function add(a: number, b: number): number { return a + b; }';

/** The weak type-only runner — lets the `+`→`-` arithmetic mutant survive. */
const weakTypeRunner: MutantTestRunner = (mutatedSource) => ({ failed: mutatedSource.includes('return null;') });

function coverageFor() {
  const sf = ts.createSourceFile(FILE, SRC, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const mutants = generateMutants(sf, { file: FILE });
  return makeCoverageMap(mutants.map((m) => ({ file: FILE, line: m.line, testId: 't' })));
}

function irFor(): GateContext {
  return {
    ...memoryContext({}),
    ir: makeRepoIR({ files: [{ id: FILE, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' }] }),
  };
}

describe('buildMutationFacts — host bridge folds engine + runner into facts', () => {
  it('produces flat outcomes with the verdict + the original→mutated rewrite', () => {
    const facts = buildMutationFacts([{ file: FILE, text: SRC }], { runner: weakTypeRunner, coverage: coverageFor() });
    expect(facts.outcomes.length).toBeGreaterThan(0);
    const arithmetic = facts.outcomes.find((o) => o.operator === 'arithmetic');
    expect(arithmetic).toBeDefined();
    expect(arithmetic!.verdict).toBe('survived'); // the weak test misses the `+`→`-`
    expect(arithmetic!.originalText).toBe('+');
    expect(arithmetic!.mutatedText).toBe('-');
    expect(arithmetic!.coveringTests).toEqual(['t']);
    expect(arithmetic!.equivalentJustification).toBeNull();
    expect(arithmetic!.equivalentJustificationDigest).toBeNull();
    expect(arithmetic!.subsumedBy).toEqual([]);
  });

  it('records every operator for every target, including zero-applicability rows', () => {
    const facts = buildMutationFacts([{ file: FILE, text: SRC }], { runner: weakTypeRunner, coverage: coverageFor() });
    expect(facts.targetCensus).toEqual([{ file: FILE, applicableMutants: facts.outcomes.length, reasons: [] }]);
    expect(facts.operatorApplicability).toHaveLength(MUTATION_OPERATORS.length);
    expect(facts.operatorApplicability?.map((row) => row.operator)).toEqual(
      [...MUTATION_OPERATORS].sort((a, b) => a.localeCompare(b)),
    );
    expect(facts.operatorApplicability?.every((row) => row.file === FILE)).toBe(true);
    expect(
      facts.operatorApplicability?.find((row) => row.operator === 'arithmetic')?.applicableMutants,
    ).toBeGreaterThan(0);
    expect(facts.operatorApplicability?.some((row) => row.applicableMutants === 0)).toBe(true);
  });

  it('binds an equivalent verdict to its human justification with a cryptographic digest', () => {
    const sf = ts.createSourceFile(FILE, SRC, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const mutant = generateMutants(sf, { file: FILE }).find((candidate) => candidate.operator === 'arithmetic');
    expect(mutant).toBeDefined();
    const justification = 'the fixture declares this rewrite equivalent for provenance testing';
    const equivalents = makeEquivalentMutantRegistry([
      {
        mutantId: mutant!.id,
        file: mutant!.file,
        line: mutant!.line,
        column: mutant!.column,
        operator: mutant!.operator,
        originalText: mutant!.originalText,
        mutatedText: mutant!.mutatedText,
        justification,
      },
    ]);
    const facts = buildMutationFacts([{ file: FILE, text: SRC }], {
      runner: weakTypeRunner,
      coverage: coverageFor(),
      equivalents,
    });
    const outcome = facts.outcomes.find((candidate) => candidate.mutantId === mutant!.id);
    expect(outcome?.verdict).toBe('equivalent');
    expect(outcome?.coveringTests).toEqual(['t']);
    expect(outcome?.equivalentJustification).toBe(justification);
    expect(outcome?.equivalentJustificationDigest).toMatch(/^blake3:/u);
    expect(outcome?.subsumedBy).toEqual([]);
  });

  it('is deterministic — same source + runner → byte-identical facts', () => {
    const a = buildMutationFacts([{ file: FILE, text: SRC }], { runner: weakTypeRunner, coverage: coverageFor() });
    const b = buildMutationFacts([{ file: FILE, text: SRC }], { runner: weakTypeRunner, coverage: coverageFor() });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('END-TO-END: the lean gate reports the survivor the host built as a blocking L4 finding', () => {
    const facts = buildMutationFacts([{ file: FILE, text: SRC }], { runner: weakTypeRunner, coverage: coverageFor() });
    const findings = mutationDivergenceGate.run({ ...irFor(), mutation: facts });
    const survivorFinding = findings.find((f) => f.detail.includes('`+`') && f.detail.includes('`-`'));
    expect(survivorFinding).toBeDefined();
    expect(survivorFinding!.severity).toBe('error'); // L4 survivor blocks
    expect(survivorFinding!.level).toBe('L4');
  });
});

describe('inconclusive verdicts — one unmintable verdict must not abort the campaign (crons 30342905791 + 30526718746)', () => {
  /** A runner that REFUSES the first mutant it sees (a per-mutant infra fault) and kills the rest. */
  const faultOnceRunner = (): MutantTestRunner => {
    let first = true;
    return () => {
      if (first) {
        first = false;
        throw new Error(
          'the vitest subprocess for "x" exited 1 but its JSON report says 0/29 tests failed — exit code and report disagree',
        );
      }
      return { failed: true };
    };
  };

  it('records the refusal as an inconclusive outcome WITH its reason and still evaluates every other mutant', () => {
    const facts = buildMutationFacts([{ file: FILE, text: SRC }], {
      runner: faultOnceRunner(),
      coverage: coverageFor(),
    });
    const inconclusive = facts.outcomes.filter((o) => o.verdict === 'inconclusive');
    expect(inconclusive).toHaveLength(1);
    expect(inconclusive[0]!.inconclusiveReason).toMatch(/exit code and report disagree/u);
    // The campaign CONTINUED past the fault: the remaining mutants earned real verdicts.
    expect(facts.outcomes.filter((o) => o.verdict === 'killed').length).toBeGreaterThan(0);
    // Conclusive outcomes never carry a reason.
    for (const outcome of facts.outcomes) {
      if (outcome.verdict !== 'inconclusive') expect(outcome.inconclusiveReason).toBeNull();
    }
  });

  it('a campaignFatal runner throw still ABORTS — a failed restore must never be continued over', () => {
    const runner: MutantTestRunner = () => {
      const error = new Error('FAILED to restore the original bytes');
      (error as Error & { campaignFatal?: boolean }).campaignFatal = true;
      throw error;
    };
    expect(() => buildMutationFacts([{ file: FILE, text: SRC }], { runner, coverage: coverageFor() })).toThrow(
      /FAILED to restore/u,
    );
  });

  it('an inconclusive verdict is never cached — transient infrastructure is not a property of the mutant', () => {
    const writes: string[] = [];
    const cache = {
      read: () => null,
      write: (_key: string, tag: string) => {
        writes.push(tag);
      },
    };
    buildMutationFacts([{ file: FILE, text: SRC }], {
      runner: faultOnceRunner(),
      coverage: coverageFor(),
      cache,
      toolchainDigest: 'blake3:test-toolchain',
    });
    expect(writes.length).toBeGreaterThan(0); // conclusive verdicts DID cache
    expect(writes).not.toContain('inconclusive');
  });

  it('an inconclusive verdict counts AGAINST the score — an infra fault can only lower it, never launder it', () => {
    const mutant = { id: 'blake3:x', file: FILE, line: 1, column: 1, originalText: '+', mutatedText: '-' };
    const score = scoreVerdicts([
      { _tag: 'killed', mutant: mutant as never, coveringTests: ['t'] },
      { _tag: 'inconclusive', mutant: mutant as never, coveringTests: ['t'], reason: 'spawn fault' },
    ] as never);
    expect(score.total).toBe(2);
    expect(score.inconclusive).toBe(1);
    expect(score.score).toBe(0.5);
  });

  it('END-TO-END: the gate reports the inconclusive site as a blocking L4 finding by name, reason included', () => {
    const facts = buildMutationFacts([{ file: FILE, text: SRC }], {
      runner: faultOnceRunner(),
      coverage: coverageFor(),
    });
    const findings = mutationDivergenceGate.run({ ...irFor(), mutation: facts });
    const inconclusiveFinding = findings.find((f) => f.title.includes('Mutant verdict inconclusive'));
    expect(inconclusiveFinding).toBeDefined();
    expect(inconclusiveFinding!.severity).toBe('error'); // L4: fail-closed, blocks
    expect(inconclusiveFinding!.detail).toContain('exit code and report disagree');
  });
});
