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
} from '@czap/gauntlet';
import { isTaggedError } from '@czap/error';

const L4_FILE = 'packages/core/src/brands.ts'; // an L4 glob in the assurance map
const L1_FILE = 'packages/x/src/a.ts'; // an ordinary L1 file
const HELPER = 'packages/x/src/helper.ts'; // a helper imported by the L4 file

function condition(over: Partial<McdcConditionOutcome> & Pick<McdcConditionOutcome, 'file' | 'forceTrueVerdict' | 'forceFalseVerdict'>): McdcConditionOutcome {
  return {
    conditionId: 'blake3:test',
    line: 10,
    column: 7,
    decision: 'a && b',
    condition: 'a',
    ...over,
  };
}

function ctx(ir: RepoIR, mcdc: McdcFacts): GateContext {
  return { ...memoryContext({}), ir, mcdc };
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
    expect(isMcdcCovered(condition({ file: L4_FILE, forceTrueVerdict: 'killed', forceFalseVerdict: 'killed' }))).toBe(true);
    expect(isMcdcCovered(condition({ file: L4_FILE, forceTrueVerdict: 'killed', forceFalseVerdict: 'survived' }))).toBe(false);
    expect(isMcdcCovered(condition({ file: L4_FILE, forceTrueVerdict: 'survived', forceFalseVerdict: 'killed' }))).toBe(false);
    expect(isMcdcCovered(condition({ file: L4_FILE, forceTrueVerdict: 'no-coverage', forceFalseVerdict: 'no-coverage' }))).toBe(false);
  });
});

describe('mcdcCoverageGate — floor calibration by level', () => {
  it('an L4 uncovered condition is severity error (BLOCKS — DO-178B Level A full MC/DC)', () => {
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L4_FILE]), { conditions: [condition({ file: L4_FILE, forceTrueVerdict: 'killed', forceFalseVerdict: 'survived' })] }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.level).toBe('L4');
    // The finding names the condition + the decision (so the reader sees the branch).
    expect(findings[0]!.detail).toContain('a');
    expect(findings[0]!.detail).toContain('a && b');
    expect(findings[0]!.detail).toContain('force-FALSE');
  });

  it('an L1 uncovered condition is advisory debt (calibrating, never blocks)', () => {
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L1_FILE]), { conditions: [condition({ file: L1_FILE, forceTrueVerdict: 'survived', forceFalseVerdict: 'killed' })] }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('advisory');
    expect(findings[0]!.level).toBe('L1');
  });

  it('a fully-NO-COVERAGE condition is ONE step louder than a partial gap at the same level', () => {
    // L1 partial gap = advisory; L1 fully-no-coverage = warning (one step louder).
    const noCov = mcdcCoverageGate.run(
      ctx(simpleIR([L1_FILE]), { conditions: [condition({ file: L1_FILE, forceTrueVerdict: 'no-coverage', forceFalseVerdict: 'no-coverage' })] }),
    );
    expect(noCov[0]!.severity).toBe('warning');
    expect(noCov[0]!.detail).toContain('NO covering test');
    // L4 fully-no-coverage = error (already at the ceiling; louder clamps at error).
    const l4NoCov = mcdcCoverageGate.run(
      ctx(simpleIR([L4_FILE]), { conditions: [condition({ file: L4_FILE, forceTrueVerdict: 'no-coverage', forceFalseVerdict: 'no-coverage' })] }),
    );
    expect(l4NoCov[0]!.severity).toBe('error');
  });

  it('a fully-COVERED condition (both pins killed) produces no finding', () => {
    const findings = mcdcCoverageGate.run(
      ctx(simpleIR([L4_FILE]), { conditions: [condition({ file: L4_FILE, forceTrueVerdict: 'killed', forceFalseVerdict: 'killed' })] }),
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
        { id: L4_FILE, contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/core' },
        { id: HELPER, contentDigest: PLACEHOLDER_DIGEST, packageName: null },
      ],
      imports: [{ fromFile: L4_FILE, specifier: './helper.js', kind: 'relative', targetFile: HELPER }],
    });
    const findings = mcdcCoverageGate.run(
      ctx(ir, { conditions: [condition({ file: HELPER, forceTrueVerdict: 'survived', forceFalseVerdict: 'killed' })] }),
    );
    expect(findings).toHaveLength(1);
    // Propagated to L4 → error, NOT the L1 advisory its glob alone would give.
    expect(findings[0]!.level).toBe('L4');
    expect(findings[0]!.severity).toBe('error');
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
    const noIR: GateContext = { ...memoryContext({}), mcdc: { conditions: [] } };
    expect.assertions(1);
    try {
      mcdcCoverageGate.run(noIR);
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });
});
