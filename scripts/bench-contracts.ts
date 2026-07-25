/**
 * The performance-CONTRACT measurement + emission script — fits the complexity
 * curves and (re)writes the committed contract artifacts the gate folds over.
 *
 * This is the producer side of the contract layer. It does NOT replace the bench
 * harness (bench-gate / bench-trend / bench-reality stay the measured-number
 * source); it measures the two things the bench harness does not capture:
 *
 * 1. The complexity CURVE of each {@link COMPLEXITY_PROBES | hot path} — swept
 *    across input sizes via {@link measureComplexityCurve} (systemClock, best-of-k
 *    replicates), fitted to a complexity class, written to
 *    `benchmarks/complexity-map.json`.
 *
 * 2. The cold-start + hot-path BUDGET contracts for a representative path,
 *    asserted as a CLASS/ratio (cold-start is bounded vs the per-call hot-path
 *    cost), never a brittle absolute-ns pin — the bench:gate machine-load lesson.
 *
 * The declared-distribution registry (`benchmarks/distributions.json`) is the
 * committed SOURCE OF TRUTH for the headline law and is hand-authored +
 * gate-pinned, not regenerated here — regenerating it from the source would let a
 * silently-renamed bench drift the declaration along with it (the gate would
 * never see the divergence). This script VERIFIES it instead: it cross-checks the
 * committed registry against the benches it can see and reports drift.
 *
 * Durations read {@link systemClock} (monotonic) — never the wall clock.
 *
 * @module
 */

import { resolve } from 'node:path';
import { IntegrityDigest } from '@liteship/canonical';
import { systemClock } from '@liteship/core';
import { ValidationError } from '@liteship/error';
import {
  ACCEPTED_COMPLEXITY_CEILINGS,
  MIN_COMPLEXITY_FIT_R2,
} from '../packages/gauntlet/src/gates/performance-contracts.js';
import { repoRoot } from '../vitest.shared.js';
import { PACKAGE_CATALOG } from './package-catalog.js';
import { buildCurrentArtifactContext } from './artifact-context.js';
import { readGitSha } from './affected-plan.js';
import { isDirectExecution, writeTextFile } from './audit/shared.js';
import {
  BENCHMARK_EVIDENCE_ARTIFACT_PATH,
  type ComplexityMap,
  type ComplexityMapEntry,
  type BenchmarkEvidence,
  type BenchmarkEvidenceAdmission,
  type BenchmarkEvidenceArtifact,
  type BenchmarkEvidenceAuthority,
  type ComplexityProbe,
  COMPLEXITY_MAP_ARTIFACT_PATH,
  admitBenchmarkEvidence,
  complexityRank,
  createBenchmarkEvidence,
  createBenchmarkEvidenceArtifact,
  measureComplexityCurve,
  parseBenchmarkEvidenceArtifact,
  readDistributionRegistry,
} from './bench/contracts.ts';
import { COMPLEXITY_PROBES } from './bench/contract-probes.ts';
import { projectBenchmarkOwnerCoverage, verifyDeclaredDistributions } from './bench/contract-coverage.ts';

export const BENCHMARK_OWNER_COVERAGE_ARTIFACT_PATH = 'benchmarks/benchmark-owner-coverage.json';

/** One deterministic violation in a measured complexity map. */
export interface MeasuredComplexityIssue {
  readonly path: string;
  readonly reason: 'missing' | 'unrecognized-class' | 'class-regression' | 'noisy-fit';
  readonly detail: string;
}

export const MAX_COMPLEXITY_COEFFICIENT_OF_VARIATION = 0.25;

export interface BenchmarkProducerIdentity extends BenchmarkEvidenceAuthority {
  readonly platform: string;
  readonly arch: string;
  readonly runtime: string;
}

export interface BenchmarkEvidenceIssue {
  readonly path: string;
  readonly disposition: Exclude<BenchmarkEvidenceAdmission['disposition'], 'pass'> | 'missing';
  readonly reasons: readonly string[];
}

/** Project measured complexity entries through the one strict evidence contract. */
export function projectComplexityBenchmarkEvidence(
  map: ComplexityMap,
  probes: readonly ComplexityProbe[],
  identity: BenchmarkProducerIdentity,
  subjectCanary: 'pass' | 'fail',
): readonly BenchmarkEvidence[] {
  const byPath = new Map(probes.map((probe) => [probe.path, probe] as const));
  return map.entries.map((entry) => {
    const probe = byPath.get(entry.path);
    if (probe === undefined) throw new TypeError(`complexity evidence has no probe for ${entry.path}`);
    if (entry.coefficientOfVariation === undefined) {
      throw new TypeError(`complexity evidence has no variance measurement for ${entry.path}`);
    }
    const measurement = entry.measurement ?? {
      innerIterations: 200,
      replicates: 7,
      warmupIterations: 50,
    };
    const expected = ACCEPTED_COMPLEXITY_CEILINGS[entry.path];
    if (expected === undefined) throw new TypeError(`complexity evidence has no accepted ceiling for ${entry.path}`);
    return createBenchmarkEvidence({
      sut: {
        id: entry.path,
        owner: probe.owner,
        benchmark: entry.path,
        file: 'scripts/bench/contract-probes.ts',
      },
      input: {
        dimensions: [{ name: entry.shape, unit: 'items', distribution: 'declared-size-sweep' }],
        sizes: entry.sizes,
      },
      measurement: {
        mode: 'warm',
        warmupIterations: measurement.warmupIterations,
        repetitions: measurement.replicates,
        canaries: [{ id: 'benchmark-subject-invoked', verdict: subjectCanary }],
      },
      environment: {
        sourceSha: identity.sourceSha,
        sourceDigest: identity.sourceDigest,
        environmentDigest: identity.environmentDigest,
        platform: identity.platform,
        arch: identity.arch,
        runtime: identity.runtime,
        toolchain: identity.toolchain,
      },
      complexity: {
        expected,
        measured: entry.class,
        fittedSlope: entry.fittedSlope,
        fittedR2: entry.fittedR2,
      },
      allocation: null,
      confidence: {
        minimumR2: MIN_COMPLEXITY_FIT_R2,
        coefficientOfVariation: entry.coefficientOfVariation,
        maximumCoefficientOfVariation: MAX_COMPLEXITY_COEFFICIENT_OF_VARIATION,
      },
    });
  });
}

/** Existing producer-side gate: strict decode, freshness, and complete path admission. */
export function verifyBenchmarkEvidenceArtifact(
  artifact: BenchmarkEvidenceArtifact,
  authority: BenchmarkEvidenceAuthority,
  expectedPaths: readonly string[],
): readonly BenchmarkEvidenceIssue[] {
  const parsed = parseBenchmarkEvidenceArtifact(artifact);
  const issues: BenchmarkEvidenceIssue[] = [];
  const byPath = new Map(parsed.evidence.map((record) => [record.sut.id, record] as const));
  const expected = new Set(expectedPaths);
  for (const record of parsed.evidence) {
    if (!expected.has(record.sut.id)) {
      issues.push({
        path: record.sut.id,
        disposition: 'fail',
        reasons: ['unexpected addressed benchmark evidence'],
      });
    }
  }
  for (const path of expectedPaths) {
    const record = byPath.get(path);
    if (record === undefined) {
      issues.push({ path, disposition: 'missing', reasons: ['missing addressed benchmark evidence'] });
      continue;
    }
    const admission = admitBenchmarkEvidence(record, authority);
    if (admission.disposition !== 'pass') {
      issues.push({ path, disposition: admission.disposition, reasons: admission.reasons });
    }
  }
  return issues;
}

/**
 * Verify live measured complexity evidence against the independent gauntlet-owned
 * ceilings. Pure and clock-free so planted regressions prove the producer has
 * teeth without turning a timing benchmark into a unit-test dependency.
 */
export function verifyMeasuredComplexityMap(map: ComplexityMap): readonly MeasuredComplexityIssue[] {
  const issues: MeasuredComplexityIssue[] = [];
  const byPath = new Map(map.entries.map((entry) => [entry.path, entry] as const));
  for (const [path, ceiling] of Object.entries(ACCEPTED_COMPLEXITY_CEILINGS)) {
    const entry = byPath.get(path);
    if (entry === undefined) {
      issues.push({ path, reason: 'missing', detail: `${path} has no live complexity measurement` });
      continue;
    }
    const measuredRank = complexityRank(entry.class);
    if (measuredRank < 0) {
      issues.push({ path, reason: 'unrecognized-class', detail: `${path} measured ${entry.class}` });
    } else if (measuredRank > complexityRank(ceiling)) {
      issues.push({
        path,
        reason: 'class-regression',
        detail: `${path} measured ${entry.class}, above its ${ceiling} ceiling`,
      });
    }
    if (entry.fittedR2 < MIN_COMPLEXITY_FIT_R2) {
      issues.push({
        path,
        reason: 'noisy-fit',
        detail: `${path} fit R² ${entry.fittedR2} is below ${MIN_COMPLEXITY_FIT_R2}`,
      });
    }
  }
  return issues;
}

/**
 * A cold-start vs hot-path budget verdict for one path. Asserted as a RATIO
 * (cold-start / steady per-call), not an absolute-ns pin: a perf test on shared
 * hardware is load-sensitive, so the budget is the SHAPE (cold-start is within a
 * bounded multiple of steady-state), which is robust to machine load.
 */
interface BudgetVerdict {
  readonly path: string;
  readonly coldStartNs: number;
  readonly steadyPerCallNs: number;
  /** cold-start / steady — the ratio the contract bounds. */
  readonly ratio: number;
  /** The accepted ceiling on the ratio (a class assertion, not an ns pin). */
  readonly ratioCeiling: number;
  readonly withinBudget: boolean;
}

/** The 60fps frame budget — the hot-path budget any per-frame path must fit. */
const FRAME_BUDGET_MS = 16.67;

/**
 * The warmed best-of-k per-call latency of a single workload, measured directly
 * through {@link systemClock} (monotonic). The minimum across replicates is the
 * load-robust estimate (scheduler noise is strictly additive). Used by the
 * cold-start budget, which needs a single-size steady measurement (not a fit).
 */
function measureSteadyPerCallNs(workload: () => void): number {
  const warmup = 50;
  const inner = 200;
  const replicates = 7;
  for (let w = 0; w < warmup; w++) {
    workload();
  }
  let bestPerCallNs = Number.POSITIVE_INFINITY;
  for (let r = 0; r < replicates; r++) {
    const startMs = systemClock.now();
    for (let i = 0; i < inner; i++) {
      workload();
    }
    const perCallNs = ((systemClock.now() - startMs) * 1e6) / inner;
    if (perCallNs < bestPerCallNs) {
      bestPerCallNs = perCallNs;
    }
  }
  return bestPerCallNs;
}

/**
 * Measure the cold-start (FIRST construct + evaluate, JIT-cold) vs steady-state
 * (warmed, best-of-k per-call) cost of the boundary path, and bound their ratio.
 * The ratio is the budget contract: a cold start may be slower than steady-state
 * (JIT warmup, allocation), but only within a bounded multiple — a regression
 * that blew cold-start out (e.g. eager work moved into construction) trips it.
 */
function measureColdStartBudget(): BudgetVerdict {
  const probe = COMPLEXITY_PROBES[0];
  if (probe === undefined) {
    throw ValidationError('measureColdStartBudget', 'no complexity probe available for the cold-start budget');
  }

  const size = probe.sizes[0] ?? 4;

  // COLD: build + run the workload once, timed, with no prior warmup — captures
  // construction + first-call JIT cost. systemClock (monotonic) for the duration.
  const coldStartMs = systemClock.now();
  const coldWorkload = probe.workloadFor(size);
  coldWorkload();
  const coldStartNs = (systemClock.now() - coldStartMs) * 1e6;

  // STEADY: the warmed best-of-k per-call latency at the same size. Measured
  // directly (not via the curve fit, which needs >= 2 sizes) so the budget is a
  // single-size cold-vs-steady ratio.
  const steadyPerCallNs = measureSteadyPerCallNs(probe.workloadFor(size));

  const ratio = steadyPerCallNs > 0 ? coldStartNs / steadyPerCallNs : Number.POSITIVE_INFINITY;
  // Cold start includes construction + one-shot JIT; a wide ceiling keeps the
  // contract load-robust while still failing if cold-start blows out by orders.
  const ratioCeiling = 5000;

  return {
    path: probe.path,
    coldStartNs,
    steadyPerCallNs,
    ratio: Number(ratio.toFixed(2)),
    ratioCeiling,
    withinBudget: ratio <= ratioCeiling,
  };
}

function buildComplexityMap(): { readonly map: ComplexityMap; readonly hotPathBudgetOk: boolean } {
  const entries: ComplexityMapEntry[] = [];
  let hotPathBudgetOk = true;

  for (const probe of COMPLEXITY_PROBES) {
    const curve = measureComplexityCurve(probe);
    entries.push({
      path: curve.path,
      describe: curve.describe,
      shape: curve.shape,
      sizes: [...probe.sizes],
      class: curve.fit.class,
      fittedSlope: Number(curve.fit.slope.toFixed(4)),
      fittedR2: Number(curve.fit.r2.toFixed(4)),
      coefficientOfVariation: Number(curve.coefficientOfVariation.toFixed(4)),
      measurement: {
        innerIterations: probe.measurement?.innerIterations ?? 200,
        replicates: probe.measurement?.replicates ?? 7,
        warmupIterations: probe.measurement?.warmupIterations ?? 50,
      },
    });

    // HOT-PATH/FRAME BUDGET: the per-call cost of the smallest-size workload must
    // sit far under the 60fps frame budget (a single evaluate / address mint is a
    // micro-op, not a frame). Asserted as the class "per-call << frame budget",
    // not an absolute pin — the headroom is enormous, so it is load-robust.
    const smallestSampleNs = curve.samples[0]?.latencyNs ?? 0;
    const frameBudgetNs = FRAME_BUDGET_MS * 1e6;
    if (smallestSampleNs >= frameBudgetNs) {
      hotPathBudgetOk = false;
      console.error(
        `[bench-contracts] HOT-PATH BUDGET FAIL: ${curve.path} per-call ${smallestSampleNs.toFixed(1)}ns exceeds the ${FRAME_BUDGET_MS}ms frame budget`,
      );
    }
  }

  return { map: { schemaVersion: 1, entries }, hotPathBudgetOk };
}

function main(): void {
  console.log('\n=== PERFORMANCE CONTRACTS: complexity fit + budgets ===\n');

  // 1. DECLARED-DISTRIBUTION law — verify the committed registry covers every
  //    bench and carries no orphan. This is a READ-ONLY cross-check (the registry
  //    is hand-authored + gate-pinned, never regenerated here).
  const registry = readDistributionRegistry(repoRoot);
  if (registry === null) {
    console.error(
      `[bench-contracts] DISTRIBUTION FAIL: ${resolve(repoRoot, 'benchmarks/distributions.json')} is missing — every bench must declare its input distribution.`,
    );
    process.exitCode = 1;
    return;
  }
  const coverage = verifyDeclaredDistributions(repoRoot, registry.distributions);
  for (const issue of coverage.issues) {
    console.error(`[bench-contracts] DISTRIBUTION ${issue.kind.toUpperCase()}: ${issue.detail}`);
  }
  console.log(
    `Declared distributions: ${registry.distributions.length} | benches discovered: ${coverage.discoveredBenchCount} | issues: ${coverage.issues.length}`,
  );

  // 2. COMPLEXITY CLASS fit → committed map, with the hot-path/frame budget.
  const { map, hotPathBudgetOk } = buildComplexityMap();
  writeTextFile(resolve(repoRoot, COMPLEXITY_MAP_ARTIFACT_PATH), `${JSON.stringify(map, null, 2)}\n`);
  console.log(`\nWrote ${COMPLEXITY_MAP_ARTIFACT_PATH}:`);
  for (const entry of map.entries) {
    console.log(
      `  ${entry.path.padEnd(22)} ${entry.class.padEnd(10)} (slope ${entry.fittedSlope.toFixed(3)}, R² ${entry.fittedR2.toFixed(3)})`,
    );
  }
  const complexityIssues = verifyMeasuredComplexityMap(map);
  for (const issue of complexityIssues) {
    console.error(`[bench-contracts] COMPLEXITY ${issue.reason.toUpperCase()}: ${issue.detail}`);
  }

  // 2b. Project the SAME measured map into strict, addressed scientific
  // evidence and immediately re-admit it against the live checkout. This is a
  // consumer of the existing runner, never a second measurement path.
  const context = buildCurrentArtifactContext(repoRoot);
  const identity: BenchmarkProducerIdentity = {
    sourceSha: readGitSha(repoRoot, 'HEAD'),
    sourceDigest: IntegrityDigest(context.sourceFingerprint),
    environmentDigest: IntegrityDigest(context.environmentFingerprint),
    platform: process.platform,
    arch: process.arch,
    runtime: process.version,
    toolchain: `node:${process.version}`,
  };
  const evidenceArtifact = createBenchmarkEvidenceArtifact(
    projectComplexityBenchmarkEvidence(
      map,
      COMPLEXITY_PROBES,
      identity,
      coverage.issues.length === 0 ? 'pass' : 'fail',
    ),
  );
  writeTextFile(resolve(repoRoot, BENCHMARK_EVIDENCE_ARTIFACT_PATH), `${JSON.stringify(evidenceArtifact, null, 2)}\n`);
  const evidenceIssues = verifyBenchmarkEvidenceArtifact(
    evidenceArtifact,
    identity,
    Object.keys(ACCEPTED_COMPLEXITY_CEILINGS),
  );
  const ownerCoverage = projectBenchmarkOwnerCoverage(
    PACKAGE_CATALOG,
    registry.distributions,
    evidenceArtifact.evidence,
  );
  writeTextFile(
    resolve(repoRoot, BENCHMARK_OWNER_COVERAGE_ARTIFACT_PATH),
    `${JSON.stringify({ schemaVersion: 1, owners: ownerCoverage }, null, 2)}\n`,
  );
  for (const issue of evidenceIssues) {
    console.error(
      `[bench-contracts] EVIDENCE ${issue.disposition.toUpperCase()}: ${issue.path}: ${issue.reasons.join(', ')}`,
    );
  }

  // 3. COLD-START budget (ratio, not absolute ns).
  const budget = measureColdStartBudget();
  console.log(
    `\nCold-start budget: ${budget.path} cold ${budget.coldStartNs.toFixed(1)}ns / steady ${budget.steadyPerCallNs.toFixed(1)}ns = ${budget.ratio}x (ceiling ${budget.ratioCeiling}x) → ${budget.withinBudget ? 'OK' : 'FAIL'}`,
  );

  if (
    coverage.issues.length > 0 ||
    complexityIssues.length > 0 ||
    evidenceIssues.length > 0 ||
    !hotPathBudgetOk ||
    !budget.withinBudget
  ) {
    console.error('\n[bench-contracts] CONTRACT VERIFICATION FAILED.');
    process.exitCode = 1;
    return;
  }
  console.log('\n[bench-contracts] All performance contracts satisfied.');
}

if (isDirectExecution(import.meta.url)) {
  main();
}
