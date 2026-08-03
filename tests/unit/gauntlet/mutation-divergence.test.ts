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
const L3_FILE = 'packages/quantizer/src/quantizer.ts'; // an L3 glob in the assurance map
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
    inconclusiveReason: null,
    subsumedBy: [],
    ...over,
  };
}

type TestMutationFacts = Omit<MutationFacts, 'operatorApplicability' | 'targetCensus'> &
  Partial<Pick<MutationFacts, 'operatorApplicability' | 'targetCensus'>>;

function ctx(ir: RepoIR, mutation: TestMutationFacts): GateContext {
  return {
    ...memoryContext({}),
    ir,
    mutation: {
      ...mutation,
      targetCensus:
        mutation.targetCensus ??
        [...new Set(mutation.outcomes.map((item) => item.file))].map((file) => ({
          file,
          applicableMutants: mutation.outcomes.filter((item) => item.file === file).length,
          reasons: [],
        })),
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
  it('a per-file kill fraction below the L3 floor is a finding', () => {
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L3_FILE]), {
        outcomes: [
          outcome({ file: L3_FILE, verdict: 'killed', mutantId: 'blake3:killed', line: 10 }),
          outcome({ file: L3_FILE, verdict: 'survived', mutantId: 'blake3:survived', line: 20 }),
        ],
        targetCensus: [{ file: L3_FILE, applicableMutants: 2, reasons: [] }],
        scoreBaseline: {},
      }),
    );

    const floorFindings = findings.filter((item) => item.title.includes('kill score below floor'));
    expect(floorFindings).toHaveLength(1);
    expect(floorFindings[0]!.severity).toBe('error');
    expect(floorFindings[0]!.detail).toContain('0.5000');
    expect(floorFindings[0]!.detail).toContain('0.9000');
  });

  it('the target census owns the denominator, so a missing outcome cannot inflate the kill score', () => {
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L3_FILE]), {
        outcomes: [outcome({ file: L3_FILE, verdict: 'killed' })],
        targetCensus: [{ file: L3_FILE, applicableMutants: 2, reasons: [] }],
        scoreBaseline: {},
      }),
    );

    const floorFinding = findings.find((item) => item.title.includes('kill score below floor'));
    expect(floorFinding?.detail).toContain('0.5000 (1/2)');
  });

  it('equivalent outcomes cannot undercut the census denominator into an over-1 pass', () => {
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L3_FILE]), {
        outcomes: [
          outcome({ file: L3_FILE, verdict: 'equivalent', mutantId: 'blake3:eq-a' }),
          outcome({ file: L3_FILE, verdict: 'equivalent', mutantId: 'blake3:eq-b' }),
        ],
        targetCensus: [{ file: L3_FILE, applicableMutants: 1, reasons: [] }],
        scoreBaseline: {},
      }),
    );

    const refusal = findings.filter((item) => item.title.includes('target census inconsistent'));
    expect(refusal).toHaveLength(1);
    expect(refusal[0]!.severity).toBe('error');
    expect(refusal[0]!.detail).toContain('including 2 justified-equivalent outcome(s)');
  });

  it('an L4 survivor is severity error (BLOCKS — the trust spine)', () => {
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L4_FILE]), { outcomes: [outcome({ file: L4_FILE, verdict: 'survived' })], scoreBaseline: {} }),
    );
    expect(findings).toHaveLength(2);
    expect(findings.some((item) => item.title.includes('kill score below floor'))).toBe(true);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.level).toBe('L4');
    // The finding names the exact rewrite (so the reader sees what survived).
    expect(findings[0]!.detail).toContain('===');
    expect(findings[0]!.detail).toContain('!==');
  });

  it('an INCONCLUSIVE mutant gets refusal prose — never the survivor claim of a comparison that was refused (PR #192 review, round 4)', () => {
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L4_FILE]), {
        outcomes: [
          outcome({
            file: L4_FILE,
            verdict: 'inconclusive',
            inconclusiveReason: 'spawn timeout: the per-mutant budget (240000 ms) expired',
          }),
        ],
        scoreBaseline: {},
      }),
    );
    expect(findings).toHaveLength(2);
    const f = findings[0]!;
    expect(f.title).toContain('inconclusive');
    expect(f.detail).toContain('per-mutant budget (240000 ms) expired');
    // NO comparison was completed — claiming the original and mutant "produced
    // identical test results" would be a lie, and telling the reader to
    // strengthen assertions chases a phantom test gap instead of the runner.
    expect(f.detail).not.toMatch(/identical test results/u);
    const steps = (f.remediation?.kind === 'instruction' ? f.remediation.steps : []).join(' ');
    expect(steps).not.toMatch(/strengthen/iu);
    expect(`${f.remediation?.kind === 'instruction' ? f.remediation.description : ''} ${steps}`).toMatch(/re-run/iu);
  });

  it('an L1 survivor is advisory debt (calibrating, never blocks)', () => {
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L1_FILE]), { outcomes: [outcome({ file: L1_FILE, verdict: 'survived' })], scoreBaseline: {} }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('advisory');
    expect(findings[0]!.level).toBe('L1');
  });

  it('a semantic-campaign L1 survivor blocks while retaining its actual L1 level', () => {
    const findings = mutationDivergenceGate.run(
      ctx(simpleIR([L1_FILE]), {
        outcomes: [outcome({ file: L1_FILE, verdict: 'survived' })],
        targetCensus: [
          {
            file: L1_FILE,
            applicableMutants: 1,
            reasons: [
              {
                kind: 'semantic-campaign',
                campaignId: 'wave5/example',
                owner: '@liteship/x',
                class: 'semantic-l4',
                required: ['mutation'],
              },
            ],
          },
        ],
        scoreBaseline: {},
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.level).toBe('L1');
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.detail).toContain('wave5/example');
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
    expect(findings).toHaveLength(2);
    // Propagated to L4 → error, NOT the L1 advisory its glob alone would give.
    expect(findings.every((item) => item.level === 'L4')).toBe(true);
    expect(findings.every((item) => item.severity === 'error')).toBe(true);
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
      mutation: { outcomes: [], targetCensus: [], operatorApplicability: [], scoreBaseline: {} },
    };
    expect.assertions(1);
    try {
      mutationDivergenceGate.run(noIR);
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });
});
