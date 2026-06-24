/**
 * Slice B (B1, step 3) — the IR-fold gates + the oracle-divergence self-proof.
 *
 * Three deliverables proven here over in-memory `RepoIR`s (no parse):
 *  1. `noBareThrowIRGate` self-proves (red caught / green clean / mutation killed)
 *     and folds ONLY the AST `bare-throw` facts.
 *  2. `noDefaultExportDivergenceGate` self-proves AND fires on a real disagreement
 *     (regex present, AST absent) while staying silent when the oracles agree —
 *     the meta-gauntlet (the generalized head-probe-drift), with severity
 *     calibrated by the redlinable coverage-class matrix.
 *  3. The coverage-class severity matrix is symmetric + data-driven (same-class =
 *     error, cross-class = advisory).
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import {
  noBareThrowIRGate,
  noDefaultExportDivergenceGate,
  verifyGate,
  requireIR,
  makeRepoIR,
  memoryContext,
  coverageClassSeverity,
  strongerCoverageClass,
  COVERAGE_CLASS_SEVERITY,
  type Fact,
  type CoverageClass,
  type GateContext,
  type RepoIR,
} from '@czap/gauntlet';

const PLACEHOLDER = 'placeholder:no-content-address';
const FILE = 'packages/x/src/a.ts';

/** A GateContext carrying only an in-memory IR. */
function irContext(ir: RepoIR): GateContext {
  return { ...memoryContext({}), ir };
}

/** An `is-default-export` fact from `oracleId` with `coverageClass`. */
function defFact(line: number, oracleId: string, coverageClass: CoverageClass): Fact {
  return { file: FILE, line, property: 'is-default-export', value: true, oracleId, coverageClass };
}

function fileNode(id = FILE) {
  return { id, contentDigest: PLACEHOLDER, packageName: null };
}

describe('coverage-class severity matrix (the redlinable data knob)', () => {
  it('same-class disagreement is a real contradiction → error', () => {
    expect(coverageClassSeverity('text-only', 'text-only')).toBe('error');
    expect(coverageClassSeverity('file-proxy-only', 'file-proxy-only')).toBe('error');
    expect(coverageClassSeverity('symbol-evidenced', 'symbol-evidenced')).toBe('error');
    expect(COVERAGE_CLASS_SEVERITY.same).toBe('error');
  });

  it('cross-class disagreement is a coverage gap → advisory (and stays quiet)', () => {
    expect(coverageClassSeverity('text-only', 'file-proxy-only')).toBe('advisory');
    expect(coverageClassSeverity('text-only', 'symbol-evidenced')).toBe('advisory');
    expect(COVERAGE_CLASS_SEVERITY.cross).toBe('advisory');
  });

  it('is symmetric — argument order does not change the calibration', () => {
    const classes: CoverageClass[] = ['text-only', 'file-proxy-only', 'runtime-evidenced', 'symbol-evidenced'];
    for (const a of classes) {
      for (const b of classes) {
        expect(coverageClassSeverity(a, b)).toBe(coverageClassSeverity(b, a));
      }
    }
  });

  it('strongerCoverageClass picks the higher-confidence class', () => {
    expect(strongerCoverageClass('text-only', 'file-proxy-only')).toBe('file-proxy-only');
    expect(strongerCoverageClass('symbol-evidenced', 'text-only')).toBe('symbol-evidenced');
    expect(strongerCoverageClass('file-proxy-only', 'file-proxy-only')).toBe('file-proxy-only');
  });
});

describe('noBareThrowIRGate — the IR-fold twin of no-bare-throw', () => {
  it('self-proves (red caught, green clean, mutation killed) → earns blocking authority', () => {
    expect(verifyGate(noBareThrowIRGate).selfProven).toBe(true);
  });

  it('shares the regex gate ruleId (it IS the same rule, re-expressed)', () => {
    expect(noBareThrowIRGate.id).toBe('gauntlet/no-bare-throw');
  });

  it('folds ONLY bare-throw/ts-ast facts — ignores other facts', () => {
    const ir = makeRepoIR({
      files: [fileNode()],
      facts: [
        { file: FILE, line: 5, property: 'bare-throw', value: true, oracleId: 'ts-ast', coverageClass: 'file-proxy-only' },
        // Not a bare-throw fact — must NOT be folded.
        defFact(9, 'ts-ast', 'file-proxy-only'),
        // A bare-throw observed by a DIFFERENT oracle id — not this oracle's fact.
        { file: FILE, line: 7, property: 'bare-throw', value: true, oracleId: 'invariant-regex', coverageClass: 'text-only' },
      ],
    });
    const findings = noBareThrowIRGate.run(irContext(ir));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.location?.line).toBe(5);
    expect(findings[0]?.coverageClass).toBe('file-proxy-only');
  });

  it('throws a clear HostCapabilityError when no IR is injected (fails loud, never silent)', () => {
    expect(() => noBareThrowIRGate.run(memoryContext({ 'a.ts': '' }))).toThrow(/requires the injected repo-IR/);
  });
});

describe('noDefaultExportDivergenceGate — the meta-gauntlet (oracle-divergence self-proof)', () => {
  it('self-proves (red caught, green clean, mutation killed) → earns blocking authority', () => {
    expect(verifyGate(noDefaultExportDivergenceGate).selfProven).toBe(true);
  });

  it('FIRES on a real disagreement: regex flags a line the AST does not', () => {
    // The dogfood case: invariant-regex (text-only) fired on a COMMENT-occurrence
    // of the keyword pair at line 42; the AST oracle correctly did not.
    const ir = makeRepoIR({
      files: [fileNode()],
      facts: [defFact(42, 'invariant-regex', 'text-only')],
    });
    const findings = noDefaultExportDivergenceGate.run(irContext(ir));
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    // Names BOTH oracles + their coverage classes + the location.
    expect(f.detail).toContain('invariant-regex');
    expect(f.detail).toContain('text-only');
    expect(f.detail).toContain('ts-ast');
    expect(f.detail).toContain('file-proxy-only');
    expect(f.detail).toContain(`${FILE}:42`);
    expect(f.location).toEqual({ file: FILE, line: 42 });
    // Cross-class (text-only vs file-proxy-only) → advisory (retire-the-weak signal).
    expect(f.severity).toBe('advisory');
    // Carries the higher-confidence class.
    expect(f.coverageClass).toBe('file-proxy-only');
    // The engine picks no winner — the reader decides.
    expect(f.detail).toContain('picks no winner');
  });

  it('FIRES when the AST sees a default-export the regex missed (export = / { x as default })', () => {
    const ir = makeRepoIR({
      files: [fileNode()],
      facts: [defFact(3, 'ts-ast', 'file-proxy-only')],
    });
    const findings = noDefaultExportDivergenceGate.run(irContext(ir));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail).toContain('the AST oracle saw a real default-export form');
  });

  it('is SILENT when the two oracles agree (both present at the same site)', () => {
    const ir = makeRepoIR({
      files: [fileNode()],
      facts: [defFact(7, 'ts-ast', 'file-proxy-only'), defFact(7, 'invariant-regex', 'text-only')],
    });
    expect(noDefaultExportDivergenceGate.run(irContext(ir))).toEqual([]);
  });

  it('is SILENT when both oracles are absent (no facts at all)', () => {
    const ir = makeRepoIR({ files: [fileNode()] });
    expect(noDefaultExportDivergenceGate.run(irContext(ir))).toEqual([]);
  });

  it('the comparison is computed from LIVE facts (the head-probe LAW) — never hardcoded', () => {
    // Drift the facts: flip which oracle is present at the divergence site. If the
    // gate hardcoded an expected oracle/line it would not track this.
    const irA = makeRepoIR({ files: [fileNode()], facts: [defFact(11, 'invariant-regex', 'text-only')] });
    const irB = makeRepoIR({ files: [fileNode()], facts: [defFact(99, 'invariant-regex', 'text-only')] });
    expect(noDefaultExportDivergenceGate.run(irContext(irA))[0]?.location?.line).toBe(11);
    expect(noDefaultExportDivergenceGate.run(irContext(irB))[0]?.location?.line).toBe(99);
  });

  it('throws a clear HostCapabilityError when no IR is injected', () => {
    expect(() => noDefaultExportDivergenceGate.run(memoryContext({ 'a.ts': '' }))).toThrow(
      /requires the injected repo-IR/,
    );
  });
});

describe('exclude-vs-miss — a sanctioned POLICY EXCLUDE is not a divergence (B3 refinement)', () => {
  const EXCLUDED_FILE = 'packages/astro/src/client-directives/example.ts';

  /** The host's policy-exclude marker fact (the exclude-vs-miss seam). */
  function excludedMarker(file: string): Fact {
    return {
      file,
      line: 1,
      property: 'default-export-check-excluded',
      value: 'NO_DEFAULT_EXPORT',
      oracleId: 'invariant-regex',
      coverageClass: 'text-only',
    };
  }

  function excludedFileNode() {
    return { id: EXCLUDED_FILE, contentDigest: PLACEHOLDER, packageName: '@czap/astro' };
  }

  it('emits NO divergence when the AST sees a default export but the file is POLICY-EXCLUDED (the ~9 → 0)', () => {
    // The exact real-repo shape: the AST oracle saw a sanctioned default export, the
    // regex is silent BECAUSE the file is in the rule's exclude list (the live
    // marker records WHY). Both oracles AGREE — the regex's silence is by design.
    const ir = makeRepoIR({
      files: [excludedFileNode()],
      facts: [
        { file: EXCLUDED_FILE, line: 3, property: 'is-default-export', value: true, oracleId: 'ts-ast', coverageClass: 'file-proxy-only' },
        excludedMarker(EXCLUDED_FILE),
      ],
    });
    expect(noDefaultExportDivergenceGate.run(irContext(ir))).toEqual([]);
  });

  it('STILL emits the advisory divergence for a GENUINE coverage gap (AST present, regex absent, NOT excluded)', () => {
    // No exclude marker here — the regex looked and MISSED a real default export the
    // AST caught. The gate did NOT go blind: this is a real divergence.
    const ir = makeRepoIR({
      files: [fileNode()],
      facts: [defFact(3, 'ts-ast', 'file-proxy-only')],
    });
    const findings = noDefaultExportDivergenceGate.run(irContext(ir));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('advisory');
    expect(findings[0]?.detail).toContain('the AST oracle saw a real default-export form');
  });

  it('a regex-PRESENT/AST-absent site on an excluded file IS still a divergence (the regex should not have fired)', () => {
    // The exclude only sanctions the AST-present/regex-absent direction (a real
    // sanctioned default export). If the regex FIRES on an excluded file (it
    // shouldn't — it was told to skip it), that is still a real anomaly.
    const ir = makeRepoIR({
      files: [excludedFileNode()],
      facts: [
        { file: EXCLUDED_FILE, line: 9, property: 'is-default-export', value: true, oracleId: 'invariant-regex', coverageClass: 'text-only' },
        excludedMarker(EXCLUDED_FILE),
      ],
    });
    const findings = noDefaultExportDivergenceGate.run(irContext(ir));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.location?.line).toBe(9);
  });

  it('the exclude is read from the LIVE marker fact — drop the marker and the same site becomes a divergence (head-probe LAW)', () => {
    // With the marker → no divergence (policy exclude). WITHOUT it → a divergence
    // (coverage miss). The gate hardcodes no path list; it reads the fact.
    const astFact: Fact = { file: EXCLUDED_FILE, line: 3, property: 'is-default-export', value: true, oracleId: 'ts-ast', coverageClass: 'file-proxy-only' };
    const withMarker = makeRepoIR({ files: [excludedFileNode()], facts: [astFact, excludedMarker(EXCLUDED_FILE)] });
    const withoutMarker = makeRepoIR({ files: [excludedFileNode()], facts: [astFact] });
    expect(noDefaultExportDivergenceGate.run(irContext(withMarker))).toEqual([]);
    expect(noDefaultExportDivergenceGate.run(irContext(withoutMarker))).toHaveLength(1);
  });

  it('the exclude-IGNORING mutant (re-flags excluded files) is killed by green', () => {
    // The gate's own mutation: a mutant that ignores the policy-exclude marker
    // re-flags the sanctioned excluded file in green → green dirty → mutant killed.
    // This is the ~9-false-advisories regression, proven dead by the ratchet.
    const proof = verifyGate(noDefaultExportDivergenceGate);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.redCaught).toBe(true);
  });
});

describe('requireIR — the IR-fold gates fail loud without an IR', () => {
  it('returns the IR when present', () => {
    const ir = makeRepoIR({ files: [fileNode()] });
    expect(requireIR(irContext(ir), 'test')).toBe(ir);
  });
});
