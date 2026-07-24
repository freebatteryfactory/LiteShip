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
