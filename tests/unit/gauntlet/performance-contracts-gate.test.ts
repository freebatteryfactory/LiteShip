/**
 * The performance-contracts gate (Slice C, avionics tier) — self-proof + the two
 * contract laws it enforces as a deterministic fold over committed data.
 *
 * The gate is NOT wired into the runner's default set (the avionics families
 * compose on separately), so it is imported via its source path — the same
 * pattern {@link ../gauntlet/symbol-orphan-divergence.test.ts} uses. These tests
 * pin: (1) it self-proves via the ratchet, (2) the declared-distribution law (a
 * bench with no declared distribution / an orphan declaration is caught), (3) the
 * complexity-class regression law (a path recorded worse than its ceiling is
 * caught), and (4) the gate is a DETERMINISTIC fold — same context, same findings,
 * no clock, no randomness.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { verifyGate, runGates, memoryContext } from '@liteship/gauntlet';
import {
  performanceContractsGate,
  PERFORMANCE_CONTRACTS_RULE_ID,
  ACCEPTED_COMPLEXITY_CEILINGS,
} from '../../../packages/gauntlet/src/gates/performance-contracts.js';

const DISTRIBUTIONS = JSON.stringify({
  schemaVersion: 1,
  distributions: [
    { name: 'Boundary.evaluate -- 3 thresholds', file: 'tests/bench/core.bench.ts', inputSize: 3, shape: 'boundary-thresholds', replicates: 1 },
  ],
});
const BENCH_FILE = "import { Bench } from 'tinybench';\nconst bench = new Bench();\nbench.add('Boundary.evaluate -- 3 thresholds', () => {});\n";
const HEALTHY_MAP = JSON.stringify({
  schemaVersion: 1,
  entries: [
    { path: 'boundary.evaluateBatch', class: 'O(n)', fittedR2: 0.98 },
    { path: 'contentAddress.of', class: 'O(n)', fittedR2: 0.97 },
  ],
});

/** A green context: every bench declared, every hot path within its ceiling. */
function greenContext() {
  return memoryContext({
    'benchmarks/distributions.json': DISTRIBUTIONS,
    'tests/bench/core.bench.ts': BENCH_FILE,
    'benchmarks/complexity-map.json': HEALTHY_MAP,
  });
}

describe('performance-contracts gate — self-proof (the authority ratchet)', () => {
  it('self-proves: red caught, green clean, mutation killed, blocking-eligible', () => {
    const proof = verifyGate(performanceContractsGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });

  it('is an L3 (deterministic runtime/projection) gate with the reserved rule id', () => {
    expect(performanceContractsGate.level).toBe('L3');
    expect(performanceContractsGate.id).toBe(PERFORMANCE_CONTRACTS_RULE_ID);
  });
});

describe('THE HEADLINE LAW — a bench is invalid unless its distribution is declared', () => {
  it('passes a fully-declared bench set with no orphans', () => {
    const findings = performanceContractsGate.run(greenContext());
    expect(findings).toHaveLength(0);
  });

  it('FLAGS a registered bench with no declared input distribution (UNDECLARED)', () => {
    const ctx = memoryContext({
      'benchmarks/distributions.json': DISTRIBUTIONS,
      'tests/bench/core.bench.ts':
        BENCH_FILE + "bench.add('Undeclared -- no distribution', () => {});\n",
      'benchmarks/complexity-map.json': HEALTHY_MAP,
    });
    const findings = performanceContractsGate.run(ctx);
    const undeclared = findings.filter((f) => f.title.includes('no declared input distribution'));
    expect(undeclared).toHaveLength(1);
    expect(undeclared[0]?.detail).toContain('Undeclared -- no distribution');
    expect(undeclared[0]?.severity).toBe('error');
  });

  it('FLAGS a declared distribution that maps to no bench (ORPHAN — drifted contract)', () => {
    const ctx = memoryContext({
      'benchmarks/distributions.json': JSON.stringify({
        schemaVersion: 1,
        distributions: [
          { name: 'Boundary.evaluate -- 3 thresholds', file: 'tests/bench/core.bench.ts', inputSize: 3, shape: 'boundary-thresholds', replicates: 1 },
          { name: 'Renamed.bench -- stale', file: 'tests/bench/core.bench.ts', inputSize: 1, shape: 'single-call', replicates: 1 },
        ],
      }),
      'tests/bench/core.bench.ts': BENCH_FILE,
      'benchmarks/complexity-map.json': HEALTHY_MAP,
    });
    const findings = performanceContractsGate.run(ctx);
    const orphans = findings.filter((f) => f.title.includes('Orphan'));
    expect(orphans).toHaveLength(1);
    expect(orphans[0]?.detail).toContain('Renamed.bench -- stale');
  });

  it('does NOT flag a commented-out bench registration (the name must survive only as code)', () => {
    const ctx = memoryContext({
      'benchmarks/distributions.json': DISTRIBUTIONS,
      // A commented-out bench MUST NOT count as a registered bench needing a
      // declaration — commentsBlanked erases it, so no UNDECLARED finding fires.
      'tests/bench/core.bench.ts':
        BENCH_FILE + "// bench.add('Disabled -- commented out', () => {});\n",
      'benchmarks/complexity-map.json': HEALTHY_MAP,
    });
    const findings = performanceContractsGate.run(ctx);
    expect(findings.filter((f) => f.detail.includes('Disabled -- commented out'))).toHaveLength(0);
  });

  it('FLAGS a missing distribution registry (the law cannot hold with no registry)', () => {
    const ctx = memoryContext({ 'benchmarks/complexity-map.json': HEALTHY_MAP });
    const findings = performanceContractsGate.run(ctx);
    expect(findings.some((f) => f.title.includes('registry is missing'))).toBe(true);
  });
});

describe('THE COMPLEXITY-CLASS LAW — a hot path must not regress its class', () => {
  it('FLAGS a hot path recorded WORSE than its accepted ceiling (O(n) → O(n^2))', () => {
    const ctx = memoryContext({
      'benchmarks/distributions.json': DISTRIBUTIONS,
      'tests/bench/core.bench.ts': BENCH_FILE,
      'benchmarks/complexity-map.json': JSON.stringify({
        schemaVersion: 1,
        entries: [
          { path: 'boundary.evaluateBatch', class: 'O(n^2)', fittedR2: 0.99 },
          { path: 'contentAddress.of', class: 'O(n)', fittedR2: 0.97 },
        ],
      }),
    });
    const findings = performanceContractsGate.run(ctx);
    const regressions = findings.filter((f) => f.title.includes('regressed past its accepted ceiling'));
    expect(regressions).toHaveLength(1);
    expect(regressions[0]?.detail).toContain('boundary.evaluateBatch');
    expect(regressions[0]?.detail).toContain('O(n^2)');
  });

  it('accepts a class STRICTER than the ceiling (O(1) is fine under an O(n) ceiling)', () => {
    const ctx = memoryContext({
      'benchmarks/distributions.json': DISTRIBUTIONS,
      'tests/bench/core.bench.ts': BENCH_FILE,
      'benchmarks/complexity-map.json': JSON.stringify({
        schemaVersion: 1,
        entries: [
          { path: 'boundary.evaluateBatch', class: 'O(1)', fittedR2: 0.9 },
          { path: 'contentAddress.of', class: 'O(n)', fittedR2: 0.97 },
        ],
      }),
    });
    expect(performanceContractsGate.run(ctx)).toHaveLength(0);
  });

  it('FLAGS a ceiling-pinned path silently dropped from the map (escapes its check)', () => {
    const ctx = memoryContext({
      'benchmarks/distributions.json': DISTRIBUTIONS,
      'tests/bench/core.bench.ts': BENCH_FILE,
      'benchmarks/complexity-map.json': JSON.stringify({
        schemaVersion: 1,
        entries: [{ path: 'contentAddress.of', class: 'O(n)', fittedR2: 0.97 }],
      }),
    });
    const findings = performanceContractsGate.run(ctx);
    expect(findings.some((f) => f.title.includes('missing from the complexity map'))).toBe(true);
  });

  it('FLAGS a fit too noisy to trust (R² below the floor)', () => {
    const ctx = memoryContext({
      'benchmarks/distributions.json': DISTRIBUTIONS,
      'tests/bench/core.bench.ts': BENCH_FILE,
      'benchmarks/complexity-map.json': JSON.stringify({
        schemaVersion: 1,
        entries: [
          { path: 'boundary.evaluateBatch', class: 'O(n)', fittedR2: 0.2 },
          { path: 'contentAddress.of', class: 'O(n)', fittedR2: 0.97 },
        ],
      }),
    });
    const findings = performanceContractsGate.run(ctx);
    expect(findings.some((f) => f.title.includes('too noisy'))).toBe(true);
  });

  it('FLAGS a missing complexity map entirely', () => {
    const ctx = memoryContext({
      'benchmarks/distributions.json': DISTRIBUTIONS,
      'tests/bench/core.bench.ts': BENCH_FILE,
    });
    const findings = performanceContractsGate.run(ctx);
    expect(findings.some((f) => f.title.includes('Complexity map is missing'))).toBe(true);
  });

  it('pins the accepted ceilings to the trust-spine hot paths', () => {
    expect(ACCEPTED_COMPLEXITY_CEILINGS['boundary.evaluateBatch']).toBe('O(n)');
    expect(ACCEPTED_COMPLEXITY_CEILINGS['contentAddress.of']).toBe('O(n)');
  });
});

describe('determinism — the gate is a pure fold over committed bytes', () => {
  it('produces identical findings on repeated runs (no clock, no randomness)', () => {
    const ctx = greenContext();
    const a = performanceContractsGate.run(ctx);
    const b = performanceContractsGate.run(ctx);
    expect(a).toEqual(b);
  });

  it('earns BLOCKING authority through the engine (self-proven → its errors block)', () => {
    const result = runGates([performanceContractsGate], greenContext());
    const outcome = result.outcomes.find((o) => o.gateId === PERFORMANCE_CONTRACTS_RULE_ID);
    expect(outcome?.authority).toBe('blocking');
    expect(result.blocked).toBe(false); // green context → blocking gate, but no errors
  });
});
