/**
 * Slice B (B3.2) — the PARAMETRIC oracle-divergence LAYER proof.
 *
 * The B3.1 `no-default-export-divergence` gate is now ONE instance of the shared
 * {@link makeOracleDivergenceGate} factory. This suite proves the SAME factory
 * yields self-proving, correctly-behaving gates for two MORE LiteShip
 * check-invariants — `var-declaration` (NO_VAR) and `require-call` (NO_REQUIRE) —
 * over in-memory `RepoIR`s (no parse). That a single fold self-proves green across
 * three distinct properties is the parametric proof: the triangulated-oracle layer
 * is a reusable LAYER, not a one-off.
 *
 * Each gate is exercised over the shared fixture SHAPE the factory builds:
 * policy-excluded → 0, genuine gap → fires, comment-occurrence → fires, mutant
 * killed — the same dogfood the headline default-export gate proves.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import {
  noVarDivergenceGate,
  noRequireDivergenceGate,
  noDefaultExportDivergenceGate,
  makeOracleDivergenceGate,
  verifyGate,
  makeRepoIR,
  memoryContext,
  type Fact,
  type CoverageClass,
  type GateContext,
  type RepoIR,
  type Gate,
} from '@liteship/gauntlet';

const PLACEHOLDER = 'placeholder:no-content-address';
const FILE = 'packages/x/src/a.ts';
const EXCLUDED_FILE = 'packages/x/src/excluded.ts';

function irContext(ir: RepoIR): GateContext {
  return { ...memoryContext({}), ir };
}

function fileNode(id = FILE) {
  return { id, contentDigest: PLACEHOLDER, packageName: null };
}

/** A `(file, line)` fact under `property` from `oracleId` with `coverageClass`. */
function propFact(file: string, line: number, property: string, oracleId: string, coverageClass: CoverageClass): Fact {
  return { file, line, property, value: true, oracleId, coverageClass };
}

/** The marker fact a policy-excluded file emits (the exclude-vs-miss seam). */
function marker(file: string, markerProperty: string, ruleName: string): Fact {
  return { file, line: 1, property: markerProperty, value: ruleName, oracleId: 'invariant-regex', coverageClass: 'text-only' };
}

/**
 * The two B3.2 gates + their per-property data. Each case is run through the SAME
 * battery of behavioural assertions — the proof the layer is parametric.
 */
const CASES = [
  {
    gate: noVarDivergenceGate,
    gateId: 'gauntlet/no-var-divergence',
    property: 'var-declaration',
    markerProperty: 'var-check-excluded',
    ruleName: 'NO_VAR',
    astSawSubstring: 'legacy variable statement',
  },
  {
    gate: noRequireDivergenceGate,
    gateId: 'gauntlet/no-require-divergence',
    property: 'require-call',
    markerProperty: 'require-check-excluded',
    ruleName: 'NO_REQUIRE',
    astSawSubstring: 'CommonJS-loader call',
  },
] as const;

describe.each(CASES)('the parametric oracle-divergence gate for $property', (c) => {
  it('self-proves (red caught, green clean, mutation killed) → earns blocking authority', () => {
    expect(verifyGate(c.gate).selfProven).toBe(true);
  });

  it('carries its own stable ruleId', () => {
    expect(c.gate.id).toBe(c.gateId);
  });

  it('FIRES on a comment-occurrence: regex flags a line the AST does not (advisory cross-class)', () => {
    const ir = makeRepoIR({
      files: [fileNode()],
      facts: [propFact(FILE, 42, c.property, 'invariant-regex', 'text-only')],
    });
    const findings = c.gate.run(irContext(ir));
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.detail).toContain('invariant-regex');
    expect(f.detail).toContain('text-only');
    expect(f.detail).toContain('ts-ast');
    expect(f.detail).toContain('file-proxy-only');
    expect(f.detail).toContain(`${FILE}:42`);
    expect(f.detail).toContain('RETIRE');
    expect(f.detail).toContain('picks no winner');
    expect(f.location).toEqual({ file: FILE, line: 42 });
    expect(f.severity).toBe('advisory'); // text-only vs file-proxy-only
    expect(f.coverageClass).toBe('file-proxy-only');
  });

  it('FIRES on a genuine coverage gap: AST present, regex absent, NOT excluded', () => {
    const ir = makeRepoIR({
      files: [fileNode()],
      facts: [propFact(FILE, 3, c.property, 'ts-ast', 'file-proxy-only')],
    });
    const findings = c.gate.run(irContext(ir));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('advisory');
    expect(findings[0]?.detail).toContain(c.astSawSubstring);
  });

  it('is SILENT on a sanctioned POLICY EXCLUDE (AST present, regex silent, live marker says WHY)', () => {
    const ir = makeRepoIR({
      files: [{ id: EXCLUDED_FILE, contentDigest: PLACEHOLDER, packageName: '@liteship/x' }],
      facts: [
        propFact(EXCLUDED_FILE, 3, c.property, 'ts-ast', 'file-proxy-only'),
        marker(EXCLUDED_FILE, c.markerProperty, c.ruleName),
      ],
    });
    expect(c.gate.run(irContext(ir))).toEqual([]);
  });

  it('is SILENT when the two oracles agree (both present at the same site)', () => {
    const ir = makeRepoIR({
      files: [fileNode()],
      facts: [
        propFact(FILE, 7, c.property, 'ts-ast', 'file-proxy-only'),
        propFact(FILE, 7, c.property, 'invariant-regex', 'text-only'),
      ],
    });
    expect(c.gate.run(irContext(ir))).toEqual([]);
  });

  it('the exclude is read from the LIVE marker (head-probe LAW) — drop it and the same site fires', () => {
    const astFact = propFact(EXCLUDED_FILE, 3, c.property, 'ts-ast', 'file-proxy-only');
    const withMarker = makeRepoIR({
      files: [{ id: EXCLUDED_FILE, contentDigest: PLACEHOLDER, packageName: '@liteship/x' }],
      facts: [astFact, marker(EXCLUDED_FILE, c.markerProperty, c.ruleName)],
    });
    const withoutMarker = makeRepoIR({
      files: [{ id: EXCLUDED_FILE, contentDigest: PLACEHOLDER, packageName: '@liteship/x' }],
      facts: [astFact],
    });
    expect(c.gate.run(irContext(withMarker))).toEqual([]);
    expect(c.gate.run(irContext(withoutMarker))).toHaveLength(1);
  });

  it('a regex-PRESENT/AST-absent site on an excluded file IS still a divergence (the regex should not have fired)', () => {
    const ir = makeRepoIR({
      files: [{ id: EXCLUDED_FILE, contentDigest: PLACEHOLDER, packageName: '@liteship/x' }],
      facts: [
        propFact(EXCLUDED_FILE, 9, c.property, 'invariant-regex', 'text-only'),
        marker(EXCLUDED_FILE, c.markerProperty, c.ruleName),
      ],
    });
    const findings = c.gate.run(irContext(ir));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.location?.line).toBe(9);
  });

  it('folds ONLY its own property — ignores facts of a sibling property', () => {
    const ir = makeRepoIR({
      files: [fileNode()],
      facts: [
        propFact(FILE, 42, c.property, 'invariant-regex', 'text-only'),
        // A DIFFERENT property's divergence — must NOT be folded by this gate.
        propFact(FILE, 50, 'some-other-property', 'invariant-regex', 'text-only'),
      ],
    });
    const findings = c.gate.run(irContext(ir));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.location?.line).toBe(42);
  });

  it('throws a clear HostCapabilityError when no IR is injected (fails loud, never silent)', () => {
    expect(() => c.gate.run(memoryContext({ 'a.ts': '' }))).toThrow(/requires the injected repo-IR/);
  });
});

describe('the factory is generic — an ad-hoc instance over an arbitrary property self-proves', () => {
  it('a brand-new property gate built from the factory self-proves (the LAYER, not a one-off)', () => {
    const gate: Gate = makeOracleDivergenceGate({
      gateId: 'test/synthetic-divergence',
      property: 'synthetic-property',
      excludedMarkerProperty: 'synthetic-check-excluded',
      level: 'L1',
      subject: 'synthetic thing',
      describe: 'A synthetic divergence gate for the parametric proof.',
      astSawWhy: 'the AST oracle saw a real synthetic thing the regex missed',
      astSawStep: 'Prefer the AST oracle for this synthetic property.',
    });
    expect(verifyGate(gate).selfProven).toBe(true);
  });
});

describe('all three divergence gates share the one factory (the parametric layer)', () => {
  it('each is self-proven and distinct-ruleId', () => {
    const gates = [noDefaultExportDivergenceGate, noVarDivergenceGate, noRequireDivergenceGate];
    for (const g of gates) expect(verifyGate(g).selfProven).toBe(true);
    expect(new Set(gates.map((g) => g.id)).size).toBe(3);
  });
});
