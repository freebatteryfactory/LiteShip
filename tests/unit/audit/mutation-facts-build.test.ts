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
  type MutantTestRunner,
} from '@czap/audit';
import ts from 'typescript';
import {
  mutationDivergenceGate,
  makeRepoIR,
  memoryContext,
  PLACEHOLDER_DIGEST,
  type GateContext,
} from '@czap/gauntlet';

// An L4 file (the `core/.../brands.ts` L4 glob) so a survivor is a blocking error.
const FILE = 'packages/core/src/brands.ts';
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
    ir: makeRepoIR({ files: [{ id: FILE, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' }] }),
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
