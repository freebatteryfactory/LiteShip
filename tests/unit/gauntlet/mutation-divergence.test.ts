/**
 * The MUTATION-DIVERGENCE gate proof (Slice C, the avionics tier — the lean fold
 * half of mutation-as-divergence).
 *
 * The gate folds host-injected {@link MutationFacts} into self-explaining Findings:
 * a SURVIVED/NO-COVERAGE mutant → a Finding at the file's PROPAGATED assurance level,
 * the kill-floor by level deciding severity; a per-file score drop vs the committed
 * baseline → a ratchet regression. This suite proves:
 *   - the gate SELF-PROVES (verifyGate: red caught, green clean, mutation killed) →
 *     it earns blocking authority by the same ratchet every gate does;
 *   - the kill-floor calibration (L4/L3 survivor blocks, L1 is advisory; a
 *     no-coverage mutant is one step louder than a survivor at the same level);
 *   - the level is the PROPAGATED level (THE LAW: a helper imported by an L4 file
 *     inherits L4, computed from the live IR, never hardcoded);
 *   - the score ratchet fires on a drop and stays silent at/above the baseline;
 *   - the requireMutation / requireIR guards fail LOUD when the host did not inject.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import {
  mutationDivergenceGate,
  SURVIVOR_SEVERITY_BY_LEVEL,
  KILL_FLOOR_BY_LEVEL,
  verifyGate,
  makeRepoIR,
  memoryContext,
  PLACEHOLDER_DIGEST,
  type GateContext,
  type RepoIR,
  type MutationFacts,
  type MutantOutcome,
} from '@liteship/gauntlet';
import { isTaggedError } from '@liteship/error';

const L4_FILE = 'packages/core/src/schema/brands.ts'; // an L4 glob in the assurance map
const L1_FILE = 'packages/x/src/a.ts'; // an ordinary L1 file
const HELPER = 'packages/x/src/helper.ts'; // a helper imported by the L4 file

function outcome(over: Partial<MutantOutcome> & Pick<MutantOutcome, 'file' | 'verdict'>): MutantOutcome {
  return {
    mutantId: 'blake3:test',
    line: 10,
    column: 1,
    operator: 'equality',
    originalText: '===',
    mutatedText: '!==',
    coveringTests: ['tests/fixture.test.ts'],
    equivalentJustification: null,
    equivalentJustificationDigest: null,
    subsumedBy: [],
    ...over,
  };
}

type TestMutationFacts = Omit<MutationFacts, 'operatorApplicability'> &
  Partial<Pick<MutationFacts, 'operatorApplicability'>>;

function ctx(ir: RepoIR, mutation: TestMutationFacts): GateContext {
  return {
    ...memoryContext({}),
    ir,
    mutation: {
      ...mutation,
      operatorApplicability:
        mutation.operatorApplicability ??
        mutation.outcomes.map((item) => ({ file: item.file, operator: item.operator, applicableMutants: 1 })),
    },
  };
}

function simpleIR(files: readonly string[]): RepoIR {
  return makeRepoIR({
    files: files.map((id) => ({ id, contentDigest: PLACEHOLDER_DIGEST, packageName: null })),
  });
}

describe('mutationDivergenceGate — self-proof (the authority ratchet)', () => {
  it('self-proves: red caught, green clean, mutation killed → earns blocking authority', () => {
    const proof = verifyGate(mutationDivergenceGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });
});

describe('mutationDivergenceGate — kill-floor calibration by level', () => {
  it('an L4 survivor is severity error (BLOCKS — the trust spine)', () => {
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L4_FILE]), { outcomes: [outcome({ file: L4_FILE, verdict: 'survived' })], scoreBaseline: {} }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.level).toBe('L4');
    // The finding names the exact rewrite (so the reader sees what survived).
    expect(findings[0]!.detail).toContain('===');
    expect(findings[0]!.detail).toContain('!==');
  });

  it('an L1 survivor is advisory debt (calibrating, never blocks)', () => {
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L1_FILE]), { outcomes: [outcome({ file: L1_FILE, verdict: 'survived' })], scoreBaseline: {} }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('advisory');
    expect(findings[0]!.level).toBe('L1');
  });

  it('a no-coverage mutant is ONE step louder than a survivor at the same level', () => {
    // L1 survivor = advisory; L1 no-coverage = warning (one step louder).
    const noCov = mutationDivergenceGate.run(
      ctx(simpleIR([L1_FILE]), { outcomes: [outcome({ file: L1_FILE, verdict: 'no-coverage' })], scoreBaseline: {} }),
    );
    expect(noCov[0]!.severity).toBe('warning');
    expect(noCov[0]!.detail).toContain('NO covering test');
    // L4 no-coverage = error (already at the ceiling; louder clamps at error).
    const l4NoCov = mutationDivergenceGate.run(
      ctx(simpleIR([L4_FILE]), { outcomes: [outcome({ file: L4_FILE, verdict: 'no-coverage' })], scoreBaseline: {} }),
    );
    expect(l4NoCov[0]!.severity).toBe('error');
  });

  it('a KILLED mutant produces no finding (adequate coverage)', () => {
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L4_FILE]), { outcomes: [outcome({ file: L4_FILE, verdict: 'killed' })], scoreBaseline: {} }),
    );
    expect(findings).toHaveLength(0);
  });

  it('an EQUIVALENT mutant produces no finding AND is excluded from the score', () => {
    // A justified, registry-recorded equivalent is not a coverage gap → no survivor
    // finding. AND it is excluded from the score denominator: one killed + one
    // equivalent over the L4 file at a committed baseline of 1.0 must stay GREEN
    // (measured score = killed/non-equivalent = 1/1 = 1.0), never a ratchet regression.
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L4_FILE]), {
        outcomes: [
          outcome({ file: L4_FILE, verdict: 'killed', line: 10 }),
          outcome({ file: L4_FILE, verdict: 'equivalent', line: 20 }),
        ],
        scoreBaseline: { [L4_FILE]: 1.0 },
      }),
    );
    expect(findings).toHaveLength(0);
  });

  it('an EQUIVALENT mutant does NOT mask a real survivor regression', () => {
    // killed + survived + equivalent over the L4 file. The equivalent is excluded, so
    // the measured score is killed/(killed+survived) = 1/2 = 0.5 < the 1.0 baseline →
    // STILL a regression (the equivalent cannot launder away the real survivor).
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L4_FILE]), {
        outcomes: [
          outcome({ file: L4_FILE, verdict: 'killed', line: 10 }),
          outcome({ file: L4_FILE, verdict: 'survived', line: 20 }),
          outcome({ file: L4_FILE, verdict: 'equivalent', line: 30 }),
        ],
        scoreBaseline: { [L4_FILE]: 1.0 },
      }),
    );
    // The survivor finding + the ratchet regression finding (the equivalent is silent).
    expect(findings.some((f) => f.title.includes('survived'))).toBe(true);
    expect(findings.some((f) => f.title.includes('regressed'))).toBe(true);
  });

  it('the redlinable kill-floor data is the documented ladder', () => {
    expect(SURVIVOR_SEVERITY_BY_LEVEL.L4).toBe('error');
    expect(SURVIVOR_SEVERITY_BY_LEVEL.L3).toBe('error');
    expect(SURVIVOR_SEVERITY_BY_LEVEL.L2).toBe('warning');
    expect(SURVIVOR_SEVERITY_BY_LEVEL.L1).toBe('advisory');
    expect(KILL_FLOOR_BY_LEVEL.L4).toBe(1.0);
    expect(KILL_FLOOR_BY_LEVEL.L3).toBe(0.9);
    expect(KILL_FLOOR_BY_LEVEL.L2).toBe(0.75);
  });
});

describe('mutationDivergenceGate — THE LAW: the level is PROPAGATED from the live IR', () => {
  it('a helper IMPORTED by an L4 file inherits L4 (not its L1 glob level)', () => {
    // The helper's glob level is L1, but the L4 file imports it → it inherits L4.
    const ir = makeRepoIR({
      files: [
        { id: L4_FILE, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
        { id: HELPER, contentDigest: PLACEHOLDER_DIGEST, packageName: null },
      ],
      imports: [{ fromFile: L4_FILE, specifier: './helper.js', kind: 'relative', targetFile: HELPER }],
    });
    const findings = mutationDivergenceGate.run(
      ctx(ir, { outcomes: [outcome({ file: HELPER, verdict: 'survived' })], scoreBaseline: {} }),
    );
    expect(findings).toHaveLength(1);
    // Propagated to L4 → error, NOT the L1 advisory its glob alone would give.
    expect(findings[0]!.level).toBe('L4');
    expect(findings[0]!.severity).toBe('error');
  });
});

describe('mutationDivergenceGate — the score ratchet', () => {
  it('fires a regression when the measured score DROPS below the committed baseline', () => {
    // 1 killed + 1 survived over the L4 file → measured score 0.5; baseline 1.0 → drop.
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L4_FILE]), {
        outcomes: [
          outcome({ file: L4_FILE, verdict: 'killed', line: 10 }),
          outcome({ file: L4_FILE, verdict: 'survived', line: 20 }),
        ],
        scoreBaseline: { [L4_FILE]: 1.0 },
      }),
    );
    // 1 survivor finding + 1 ratchet finding.
    const ratchet = findings.filter((f) => f.title.includes('score regressed'));
    expect(ratchet).toHaveLength(1);
    expect(ratchet[0]!.detail).toContain('0.5000');
    expect(ratchet[0]!.detail).toContain('1.0000');
  });

  it('stays silent when the measured score is AT or ABOVE the baseline', () => {
    // All killed → score 1.0; baseline 1.0 → no regression (and no survivors).
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L4_FILE]), {
        outcomes: [outcome({ file: L4_FILE, verdict: 'killed' })],
        scoreBaseline: { [L4_FILE]: 1.0 },
      }),
    );
    expect(findings).toHaveLength(0);
  });

  it('a file with NO baseline is not a regression (its first measurement sets it)', () => {
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L4_FILE]), {
        outcomes: [outcome({ file: L4_FILE, verdict: 'killed' })],
        scoreBaseline: {}, // no baseline for L4_FILE
      }),
    );
    expect(findings.filter((f) => f.title.includes('score regressed'))).toHaveLength(0);
  });
});

describe('mutationDivergenceGate — the guards fail LOUD', () => {
  it('requireMutation throws a tagged error when no mutation facts were injected', () => {
    const noMutation: GateContext = { ...memoryContext({}), ir: simpleIR([L4_FILE]) };
    expect.assertions(2);
    try {
      mutationDivergenceGate.run(noMutation);
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
      expect((e as { message: string }).message).toContain('mutation facts');
    }
  });

  it('requireIR throws a tagged error when no IR was injected', () => {
    const noIR: GateContext = {
      ...memoryContext({}),
      mutation: { outcomes: [], operatorApplicability: [], scoreBaseline: {} },
    };
    expect.assertions(1);
    try {
      mutationDivergenceGate.run(noIR);
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });
});
