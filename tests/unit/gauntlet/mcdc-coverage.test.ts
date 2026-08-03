/**
 * The MC/DC-COVERAGE gate proof (the avionics tier — the lean fold half of DO-178B
 * Level A's Modified Condition/Decision Coverage via condition-level mutation).
 *
 * The gate folds host-injected {@link McdcFacts} into self-explaining Findings: a
 * condition whose independent effect is NOT observed (a surviving force-true/force-false
 * pin, or a no-coverage decision) → a Finding at the file's PROPAGATED assurance level,
 * the MC/DC floor by level deciding severity (L4 requires FULL MC/DC). This suite proves:
 *   - the gate SELF-PROVES (verifyGate: red caught, green clean, mutation killed) → it
 *     earns blocking authority by the same ratchet every gate does;
 *   - the floor calibration (an L4 uncovered condition blocks, L1 is advisory; a
 *     fully-no-coverage condition is one step louder than a partial gap at the same level);
 *   - the level is the PROPAGATED level (THE LAW: a helper imported by an L4 file inherits
 *     L4, computed from the live IR, never hardcoded);
 *   - a fully-covered condition (both pins killed) produces NO finding;
 *   - the requireMcdc / requireIR guards fail LOUD when the host did not inject.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import {
  mcdcCoverageGate,
  MCDC_SEVERITY_BY_LEVEL,
  MCDC_FLOOR_BY_LEVEL,
  isMcdcCovered,
  verifyGate,
  makeRepoIR,
  memoryContext,
  PLACEHOLDER_DIGEST,
  type GateContext,
  type RepoIR,
  type McdcFacts,
  type McdcConditionOutcome,
} from '@liteship/gauntlet';
import { isTaggedError } from '@liteship/error';

const L4_FILE = 'packages/core/src/schema/brands.ts'; // an L4 glob in the assurance map
const L3_FILE = 'packages/quantizer/src/quantizer.ts'; // an L3 glob in the assurance map
const L1_FILE = 'packages/x/src/a.ts'; // an ordinary L1 file
const HELPER = 'packages/x/src/helper.ts'; // a helper imported by the L4 file

function condition(
  over: Partial<McdcConditionOutcome> & Pick<McdcConditionOutcome, 'file' | 'forceTrueVerdict' | 'forceFalseVerdict'>,
): McdcConditionOutcome {
  return {
    conditionId: 'blake3:test',
    line: 10,
    column: 7,
    decision: 'a && b',
    condition: 'a',
    forceTrueInconclusiveReason: null,
    forceFalseInconclusiveReason: null,
    coveringTests: ['tests/fixture.test.ts'],
    ...over,
  };
}

type TestMcdcFacts = Omit<McdcFacts, 'targetCensus'> & Partial<Pick<McdcFacts, 'targetCensus'>>;

function ctx(ir: RepoIR, mcdc: TestMcdcFacts): GateContext {
  return {
    ...memoryContext({}),
    ir,
    mcdc: {
      ...mcdc,
      targetCensus:
        mcdc.targetCensus ??
        [...new Set(mcdc.conditions.map((item) => item.file))].map((file) => ({
          file,
          applicableConditions: mcdc.conditions.filter((item) => item.file === file).length,
          reasons: [],
        })),
    },
  };
}

function simpleIR(files: readonly string[]): RepoIR {
  return makeRepoIR({
    files: files.map((id) => ({ id, contentDigest: PLACEHOLDER_DIGEST, packageName: null })),
  });
}

describe('mcdcCoverageGate — self-proof (the authority ratchet)', () => {
  it('self-proves: red caught, green clean, mutation killed → earns blocking authority', () => {
    const proof = verifyGate(mcdcCoverageGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });
});

describe('isMcdcCovered — the ONE coverage rule (both pins killed)', () => {
  it('covered iff BOTH pins killed; any survived/no-coverage pin is a gap', () => {
    expect(isMcdcCovered(condition({ file: L4_FILE, forceTrueVerdict: 'killed', forceFalseVerdict: 'killed' }))).toBe(
      true,
    );
    expect(isMcdcCovered(condition({ file: L4_FILE, forceTrueVerdict: 'killed', forceFalseVerdict: 'survived' }))).toBe(
      false,
    );
    expect(isMcdcCovered(condition({ file: L4_FILE, forceTrueVerdict: 'survived', forceFalseVerdict: 'killed' }))).toBe(
      false,
    );
    expect(
      isMcdcCovered(condition({ file: L4_FILE, forceTrueVerdict: 'no-coverage', forceFalseVerdict: 'no-coverage' })),
    ).toBe(false);
  });
});

describe('mcdcCoverageGate — floor calibration by level', () => {
  it('a per-file covered-condition fraction below the L3 floor is a finding', () => {
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L3_FILE]), {
        conditions: [
          condition({
            conditionId: 'blake3:covered',
            file: L3_FILE,
            line: 10,
            forceTrueVerdict: 'killed',
            forceFalseVerdict: 'killed',
          }),
          condition({
            conditionId: 'blake3:gap',
            file: L3_FILE,
            line: 20,
            forceTrueVerdict: 'killed',
            forceFalseVerdict: 'survived',
          }),
        ],
        targetCensus: [{ file: L3_FILE, applicableConditions: 2, reasons: [] }],
      }),
    );

    const floorFindings = findings.filter((item) => item.title.includes('coverage below floor'));
    expect(floorFindings).toHaveLength(1);
    expect(floorFindings[0]!.severity).toBe('error');
    expect(floorFindings[0]!.detail).toContain('0.5000');
    expect(floorFindings[0]!.detail).toContain('0.9000');
  });

  it('the target census owns the denominator, so a missing outcome cannot inflate coverage', () => {
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L3_FILE]), {
        conditions: [condition({ file: L3_FILE, forceTrueVerdict: 'killed', forceFalseVerdict: 'killed' })],
        targetCensus: [{ file: L3_FILE, applicableConditions: 2, reasons: [] }],
      }),
    );

    const floorFinding = findings.find((item) => item.title.includes('coverage below floor'));
    expect(floorFinding?.detail).toContain('0.5000 (1/2)');
  });

  it('an undercounted target census is a blocking refusal, never an over-1 pass', () => {
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L3_FILE]), {
        conditions: [
          condition({
            conditionId: 'blake3:a',
            file: L3_FILE,
            forceTrueVerdict: 'killed',
            forceFalseVerdict: 'killed',
          }),
          condition({
            conditionId: 'blake3:b',
            file: L3_FILE,
            forceTrueVerdict: 'killed',
            forceFalseVerdict: 'killed',
          }),
        ],
        targetCensus: [{ file: L3_FILE, applicableConditions: 1, reasons: [] }],
      }),
    );

    const refusal = findings.filter((item) => item.title.includes('target census inconsistent'));
    expect(refusal).toHaveLength(1);
    expect(refusal[0]!.severity).toBe('error');
    expect(refusal[0]!.detail).toContain('admits 1 condition(s)');
    expect(refusal[0]!.detail).toContain('carry 2 outcome(s)');
  });

  it('an L4 uncovered condition is severity error (BLOCKS — DO-178B Level A full MC/DC)', () => {
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L4_FILE]), {
        conditions: [condition({ file: L4_FILE, forceTrueVerdict: 'killed', forceFalseVerdict: 'survived' })],
      }),
    );
    expect(findings).toHaveLength(2);
    expect(findings.some((item) => item.title.includes('coverage below floor'))).toBe(true);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.level).toBe('L4');
    // The finding names the condition + the decision (so the reader sees the branch).
    expect(findings[0]!.detail).toContain('a');
    expect(findings[0]!.detail).toContain('a && b');
    expect(findings[0]!.detail).toContain('force-FALSE');
  });

  it('an INCONCLUSIVE pin finding names the actual refusal reason, never a generic infra label (PR #192 review, round 4)', () => {
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L4_FILE]), {
        conditions: [
          condition({
            file: L4_FILE,
            forceTrueVerdict: 'inconclusive',
            forceFalseVerdict: 'killed',
            forceTrueInconclusiveReason: 'spawn timeout: the per-mutant budget (240000 ms) expired',
          }),
        ],
      }),
    );
    expect(findings).toHaveLength(2);
    // The reader must see WHICH infra fault refused the verdict — a timeout, a
    // spawn failure, and a zero-test run demand different responses.
    expect(findings[0]!.detail).toContain('per-mutant budget (240000 ms) expired');
  });

  it('an INCONCLUSIVE pin gets refusal prose and infra remediation — never gap-claims about a comparison that was refused (PR #192 review, round 5)', () => {
    // The sibling of the mutation-divergence round-4 fix, which I applied there
    // and NOT here: preserving the reason is not enough when the surrounding
    // sentence still claims the pin "did not flip any covering test" and the
    // remediation demands a distinguishing test pair — no comparison completed,
    // so both statements are lies that send the reader away from the runner.
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L4_FILE]), {
        conditions: [
          condition({
            file: L4_FILE,
            forceTrueVerdict: 'inconclusive',
            forceFalseVerdict: 'killed',
            forceTrueInconclusiveReason: 'spawn timeout: the per-mutant budget (240000 ms) expired',
          }),
        ],
      }),
    );
    expect(findings).toHaveLength(2);
    const f = findings[0]!;
    expect(f.title).toContain('inconclusive');
    expect(f.detail).toContain('per-mutant budget (240000 ms) expired');
    expect(f.detail).not.toMatch(/did not flip any covering test/u);
    const steps = (f.remediation?.kind === 'instruction' ? f.remediation.steps : []).join(' ');
    expect(steps).not.toMatch(/distinguishing test|test pair/iu);
    expect(`${f.remediation?.kind === 'instruction' ? f.remediation.description : ''} ${steps}`).toMatch(/re-run/iu);
  });

  it('an L1 uncovered condition is advisory debt (calibrating, never blocks)', () => {
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L1_FILE]), {
        conditions: [condition({ file: L1_FILE, forceTrueVerdict: 'survived', forceFalseVerdict: 'killed' })],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('advisory');
    expect(findings[0]!.level).toBe('L1');
  });

  it('a semantic-campaign L1 gap blocks while retaining its actual L1 level', () => {
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L1_FILE]), {
        conditions: [condition({ file: L1_FILE, forceTrueVerdict: 'survived', forceFalseVerdict: 'killed' })],
        targetCensus: [
          {
            file: L1_FILE,
            applicableConditions: 1,
            reasons: [
              {
                kind: 'semantic-campaign',
                campaignId: 'wave5/example',
                owner: '@liteship/x',
                class: 'semantic-l4',
                required: ['mcdc'],
              },
            ],
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.level).toBe('L1');
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.detail).toContain('wave5/example');
  });

  it('a fully-NO-COVERAGE condition is ONE step louder than a partial gap at the same level', () => {
    // L1 partial gap = advisory; L1 fully-no-coverage = warning (one step louder).
    const noCov = mcdcCoverageGate.run(
      ctx(simpleIR([L1_FILE]), {
        conditions: [condition({ file: L1_FILE, forceTrueVerdict: 'no-coverage', forceFalseVerdict: 'no-coverage' })],
      }),
    );
    expect(noCov[0]!.severity).toBe('warning');
    expect(noCov[0]!.detail).toContain('NO covering test');
    // L4 fully-no-coverage = error (already at the ceiling; louder clamps at error).
    const l4NoCov = mcdcCoverageGate.run(
      ctx(simpleIR([L4_FILE]), {
        conditions: [condition({ file: L4_FILE, forceTrueVerdict: 'no-coverage', forceFalseVerdict: 'no-coverage' })],
      }),
    );
    expect(l4NoCov[0]!.severity).toBe('error');
  });

  it('a fully-COVERED condition (both pins killed) produces no finding', () => {
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L4_FILE]), {
        conditions: [condition({ file: L4_FILE, forceTrueVerdict: 'killed', forceFalseVerdict: 'killed' })],
      }),
    );
    expect(findings).toHaveLength(0);
  });

  it('the redlinable floor data is the documented ladder (L4=1.0 full MC/DC)', () => {
    expect(MCDC_SEVERITY_BY_LEVEL.L4).toBe('error');
    expect(MCDC_SEVERITY_BY_LEVEL.L3).toBe('error');
    expect(MCDC_SEVERITY_BY_LEVEL.L2).toBe('warning');
    expect(MCDC_SEVERITY_BY_LEVEL.L1).toBe('advisory');
    expect(MCDC_FLOOR_BY_LEVEL.L4).toBe(1.0);
    expect(MCDC_FLOOR_BY_LEVEL.L3).toBe(0.9);
    expect(MCDC_FLOOR_BY_LEVEL.L2).toBe(0.75);
  });
});

describe('mcdcCoverageGate — THE LAW: the level is PROPAGATED from the live IR', () => {
  it('a helper IMPORTED by an L4 file inherits L4 (not its L1 glob level)', () => {
    const ir = makeRepoIR({
      files: [
        { id: L4_FILE, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
        { id: HELPER, contentDigest: PLACEHOLDER_DIGEST, packageName: null },
      ],
      imports: [{ fromFile: L4_FILE, specifier: './helper.js', kind: 'relative', targetFile: HELPER }],
    });
    const findings = mcdcCoverageGate.run(
      ctx(ir, { conditions: [condition({ file: HELPER, forceTrueVerdict: 'survived', forceFalseVerdict: 'killed' })] }),
    );
    expect(findings).toHaveLength(2);
    // Propagated to L4 → error, NOT the L1 advisory its glob alone would give.
    expect(findings.every((item) => item.level === 'L4')).toBe(true);
    expect(findings.every((item) => item.severity === 'error')).toBe(true);
  });
});

describe('mcdcCoverageGate — the guards fail LOUD', () => {
  it('requireMcdc throws a tagged error when no MC/DC facts were injected', () => {
    const noMcdc: GateContext = { ...memoryContext({}), ir: simpleIR([L4_FILE]) };
    expect.assertions(2);
    try {
      mcdcCoverageGate.run(noMcdc);
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
      expect((e as { message: string }).message).toContain('MC/DC facts');
    }
  });

  it('requireIR throws a tagged error when no IR was injected', () => {
    const noIR: GateContext = { ...memoryContext({}), mcdc: { conditions: [], targetCensus: [] } };
    expect.assertions(1);
    try {
      mcdcCoverageGate.run(noIR);
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });
});
