/**
 * The performance-CONTRACT layer — the law that a benchmark result is INVALID
 * unless its input distribution is DECLARED, plus the complexity-class contract
 * (a hot path's measured complexity class must not regress).
 *
 * This is NOT a second bench harness. The measurement infrastructure
 * ({@link ../bench-gate.ts | bench-gate}, {@link ../bench-trend.ts | bench-trend},
 * {@link ../bench-reality.ts | bench-reality}, the tinybench/vitest `*.bench.ts`
 * files) is mature and stays the source of measured numbers. This module adds the
 * CONTRACT on TOP: the declared-distribution registry and the complexity-class
 * fit, each backed by a committed sibling artifact the gate folds over.
 *
 * Two latency contracts live here. Retained-allocation curves reuse the same
 * unit-agnostic growth fit from `scripts/bench/allocation-curves.ts`.
 *
 * 1. DECLARED INPUT DISTRIBUTION (the headline law). A benchmark's number is only
 *    comparable across runs when the SHAPE + SIZE of the input it drives the SUT
 *    with is fixed and DECLARED. {@link BenchDistribution} is that declaration; the
 *    committed `benchmarks/distributions.json` is the registry; the gate REJECTS a
 *    `tests/bench/*.bench.ts` bench that runs with no declared distribution and a
 *    declaration that no longer maps to a real bench (silent drift). A
 *    distribution that silently CHANGES (its `inputSize`/`shape`) makes the result
 *    incomparable — the declaration is the anchor the gate pins against.
 *
 * 2. COMPLEXITY CLASS. {@link fitComplexityClass} fits latency-vs-input-size to a
 *    complexity class via a log-log slope (slope ≈ 1 → linear, ≈ 2 → quadratic)
 *    with an R² sanity check. The fit is intentionally a CLASS verdict, never an
 *    absolute-ns pin — a perf test on shared hardware is load-sensitive, so the
 *    contract asserts the SHAPE of the curve (a ratio/slope), which is robust to
 *    machine load. The committed `benchmarks/complexity-map.json` records each hot
 *    path's accepted class; the gate fails if a path REGRESSES (was O(n), now
 *    O(n²)).
 *
 * Two-clock discipline: every duration measured here reads {@link systemClock}
 * (MONOTONIC `performance.now()` → durations), NEVER {@link wallClock} (epoch →
 * timestamps). A duration measured against the wall clock is the 1970-laundering
 * bug; the complexity curve is a duration, so it reads the system clock.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ValidationError } from '@liteship/error';
import { CanonicalCbor, addressedDigestOf, type IntegrityDigest } from '@liteship/canonical';
import { systemClock, type Clock } from '@liteship/core';
import {
  parseQualifiedBenchDistribution,
  type BenchExecution,
  type BenchSubject,
} from '../../packages/gauntlet/src/gates/bench-subjects.js';

export type { BenchExecution, BenchSubject };

/**
 * The DECLARED input distribution of a benchmark — the law's anchor. A bench
 * result is only comparable across runs when the size + shape of the SUT input it
 * drives is fixed; this records that contract so the gate can reject an
 * undeclared bench and detect a silently-changed declaration.
 */
export interface BenchDistribution {
  /**
   * The EXACT registered bench task name (the first string argument to
   * `bench(...)` / `bench.add(...)`). This is the key the gate matches against
   * the names it extracts from the bench source — they must correspond 1:1.
   */
  readonly name: string;
  /** Which `tests/bench/*.bench.ts` file registers this bench (repo-relative). */
  readonly file: string;
  /**
   * The SIZE of the SUT input this bench drives (e.g. 3 thresholds, 100 entities,
   * 300 frames). The dimension the result is implicitly O(·) in. `1` for a
   * fixed-shape single-item hot path (a single evaluate/parse call).
   */
  readonly inputSize: number;
  /**
   * The SHAPE of the input — the qualitative distribution the size measures
   * (e.g. 'boundary-thresholds', 'ecs-entities', 'video-frames', 'single-call').
   * Two runs are only comparable when BOTH `inputSize` and `shape` match.
   */
  readonly shape: string;
  /**
   * Replicates the declaring bench drives per measurement (the harness's
   * iteration/warmup regime is the measurement's own; this records the declared
   * intent so a reader knows the statistical weight behind the number).
   */
  readonly replicates: number;
  /** Exact implementation subjects the measured execution reaches. */
  readonly subjects: readonly BenchSubject[];
  /** Callback by default; collector for measurement harnesses such as allocation. */
  readonly execution?: BenchExecution;
}

/** The committed declared-distribution registry artifact. */
export interface DistributionRegistry {
  readonly schemaVersion: 2;
  readonly distributions: readonly BenchDistribution[];
}

export const DISTRIBUTIONS_ARTIFACT_PATH = 'benchmarks/distributions.json';
export const COMPLEXITY_MAP_ARTIFACT_PATH = 'benchmarks/complexity-map.json';

/**
 * The complexity classes the contract recognizes, ordered ascending by growth.
 * The fit produces a class; the gate compares the measured class to the committed
 * one by this ordering (a HIGHER index than committed = a regression).
 */
export const COMPLEXITY_CLASSES = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'] as const;

export type ComplexityClass = (typeof COMPLEXITY_CLASSES)[number];

/** Ordinal of a complexity class (0 = O(1) … 4 = O(n^2)) — the regression order. */
export function complexityRank(klass: ComplexityClass): number {
  return COMPLEXITY_CLASSES.indexOf(klass);
}

/**
 * A single complexity hot-path entry: the path, the SUT it measures, the fitted
 * class, and the evidence (slope + R²) the fit rests on. Committed to
 * `benchmarks/complexity-map.json`.
 */
export interface ComplexityMapEntry {
  /** Stable id of the hot path (e.g. 'boundary.evaluate', 'gauntlet.fold'). */
  readonly path: string;
  /** Human description of what is measured. */
  readonly describe: string;
  /** The input dimension the curve sweeps (the `shape`). */
  readonly shape: string;
  /** The input sizes swept (ascending). */
  readonly sizes: readonly number[];
  /** The ACCEPTED complexity class — the contract the gate pins against. */
  readonly class: ComplexityClass;
  /**
   * The log-log slope the accepted class was fitted from. Recorded as evidence,
   * not a pin — the gate compares the measured CLASS to {@link class}, never the
   * absolute slope (which is load-sensitive).
   */
  readonly fittedSlope: number;
  /** The fit's R² — recorded so a reader can see the linear fit's quality. */
  readonly fittedR2: number;
  /** Maximum coefficient of variation observed across the size sweep. */
  readonly coefficientOfVariation?: number;
  /** Measurement regime used to produce the curve. */
  readonly measurement?: {
    readonly innerIterations: number;
    readonly replicates: number;
    readonly warmupIterations: number;
  };
}

/** The committed complexity-map artifact. */
export interface ComplexityMap {
  readonly schemaVersion: 1;
  readonly entries: readonly ComplexityMapEntry[];
}

// ---------------------------------------------------------------------------
// Scientific benchmark evidence — one addressed admission record.
// ---------------------------------------------------------------------------

/** A benchmark result is admitted, rejected, or explicitly inconclusive. */
export type BenchmarkEvidenceDisposition = 'pass' | 'fail' | 'unknown';

/** Machine-readable reasons behind benchmark-evidence admission. */
export type BenchmarkEvidenceReason =
  | 'canary-failed'
  | 'complexity-regression'
  | 'allocation-budget-exceeded'
  | 'leak-slope-exceeded'
  | 'low-r2'
  | 'unstable-variance'
  | 'stale-source-sha'
  | 'stale-source-digest'
  | 'foreign-environment'
  | 'foreign-toolchain';

/** The package-owned implementation and registered benchmark being measured. */
export interface BenchmarkEvidenceSut {
  readonly id: string;
  readonly owner: string;
  readonly benchmark: string;
  readonly file: string;
}

/** One independently meaningful input dimension. */
export interface BenchmarkEvidenceDimension {
  readonly name: string;
  readonly unit: string;
  readonly distribution: string;
}

/** One canary proves the benchmark actually distinguishes good from bad work. */
export interface BenchmarkEvidenceCanary {
  readonly id: string;
  readonly verdict: 'pass' | 'fail';
}

/** Complexity evidence against the declared accepted class. */
export interface BenchmarkComplexityEvidence {
  readonly expected: ComplexityClass;
  readonly measured: ComplexityClass;
  readonly fittedSlope: number;
  readonly fittedR2: number;
}

/** Allocation evidence is optional only for subjects with no allocation contract. */
export interface BenchmarkAllocationEvidence {
  readonly observedBytes: number;
  readonly budgetBytes: number;
  readonly leakSlope: number;
  readonly maximumLeakSlope: number;
}

/** Inputs from which the immutable benchmark evidence is constructed. */
export interface BenchmarkEvidenceInput {
  readonly sut: BenchmarkEvidenceSut;
  readonly input: {
    readonly dimensions: readonly BenchmarkEvidenceDimension[];
    readonly sizes: readonly number[];
  };
  readonly measurement: {
    readonly mode: 'cold' | 'warm';
    readonly warmupIterations: number;
    readonly repetitions: number;
    readonly canaries: readonly BenchmarkEvidenceCanary[];
  };
  readonly environment: {
    readonly sourceSha: string;
    readonly sourceDigest: IntegrityDigest;
    readonly environmentDigest: IntegrityDigest;
    readonly platform: string;
    readonly arch: string;
    readonly runtime: string;
    readonly toolchain: string;
  };
  readonly complexity: BenchmarkComplexityEvidence | null;
  readonly allocation: BenchmarkAllocationEvidence | null;
  readonly confidence: {
    readonly minimumR2: number;
    readonly coefficientOfVariation: number;
    readonly maximumCoefficientOfVariation: number;
  };
}

/**
 * Complete scientific benchmark evidence. The integrity id addresses every
 * behavior-bearing fact except itself, including the derived admission. A
 * consumer must still call {@link admitBenchmarkEvidence} with the live source
 * and environment identities before using the verdict.
 */
export interface BenchmarkEvidence extends BenchmarkEvidenceInput {
  readonly schemaVersion: 1;
  readonly evidenceId: IntegrityDigest;
  readonly regressionDisposition: 'none' | 'blocking' | 'inconclusive';
  readonly admission: {
    readonly disposition: BenchmarkEvidenceDisposition;
    readonly reasons: readonly BenchmarkEvidenceReason[];
  };
}

/** Live identities required before committed or downloaded evidence is trusted. */
export interface BenchmarkEvidenceAuthority {
  readonly sourceSha: string;
  readonly sourceDigest: IntegrityDigest;
  readonly environmentDigest: IntegrityDigest;
  readonly toolchain: string;
}

/** Admission result after both evidence integrity and live freshness are checked. */
export interface BenchmarkEvidenceAdmission {
  readonly disposition: BenchmarkEvidenceDisposition;
  readonly reasons: readonly BenchmarkEvidenceReason[];
}

/** Addressed aggregate emitted by the existing benchmark-contract producer. */
export interface BenchmarkEvidenceArtifact {
  readonly schemaVersion: 1;
  readonly artifactId: IntegrityDigest;
  readonly evidence: readonly BenchmarkEvidence[];
}

export const BENCHMARK_EVIDENCE_ARTIFACT_PATH = 'benchmarks/benchmark-evidence.json';

const SHA_RE = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u;
const INTEGRITY_RE = /^(?:sha256|blake3):[0-9a-f]{64}$/u;

function evidenceValidation(message: string): never {
  throw ValidationError('BenchmarkEvidence', message);
}

function finite(value: number, field: string, minimum = 0): number {
  if (!Number.isFinite(value) || value < minimum) {
    evidenceValidation(`${field} must be a finite number >= ${minimum}`);
  }
  return value;
}

function finiteSigned(value: number, field: string): number {
  if (!Number.isFinite(value)) evidenceValidation(`${field} must be finite`);
  return value;
}

function positiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) evidenceValidation(`${field} must be a positive integer`);
  return value;
}

function nonNegativeInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) evidenceValidation(`${field} must be a non-negative integer`);
  return value;
}

function nonEmpty(value: string, field: string): string {
  if (value.trim().length === 0) evidenceValidation(`${field} must be non-empty`);
  return value;
}

function integrity(value: string, field: string): IntegrityDigest {
  if (!INTEGRITY_RE.test(value)) evidenceValidation(`${field} must be a canonical integrity digest`);
  return value as IntegrityDigest;
}

function exactObject(value: unknown, field: string, keys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    evidenceValidation(`${field} must be an object`);
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    evidenceValidation(`${field} has missing or foreign fields`);
  }
  return record;
}

function deepFreezeEvidence<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreezeEvidence(child);
    Object.freeze(value);
  }
  return value;
}

function deriveBenchmarkAdmission(input: BenchmarkEvidenceInput): BenchmarkEvidenceAdmission & {
  readonly regressionDisposition: BenchmarkEvidence['regressionDisposition'];
} {
  const failures: BenchmarkEvidenceReason[] = [];
  const unknowns: BenchmarkEvidenceReason[] = [];

  if (input.measurement.canaries.some((canary) => canary.verdict === 'fail')) failures.push('canary-failed');
  if (
    input.complexity !== null &&
    complexityRank(input.complexity.measured) > complexityRank(input.complexity.expected)
  ) {
    failures.push('complexity-regression');
  }
  if (input.allocation !== null && input.allocation.observedBytes > input.allocation.budgetBytes) {
    failures.push('allocation-budget-exceeded');
  }
  if (input.allocation !== null && input.allocation.leakSlope > input.allocation.maximumLeakSlope) {
    failures.push('leak-slope-exceeded');
  }
  if (input.complexity !== null && input.complexity.fittedR2 < input.confidence.minimumR2) {
    unknowns.push('low-r2');
  }
  if (input.confidence.coefficientOfVariation > input.confidence.maximumCoefficientOfVariation) {
    unknowns.push('unstable-variance');
  }

  if (failures.length > 0) {
    return { disposition: 'fail', reasons: failures, regressionDisposition: 'blocking' };
  }
  if (unknowns.length > 0) {
    return { disposition: 'unknown', reasons: unknowns, regressionDisposition: 'inconclusive' };
  }
  return { disposition: 'pass', reasons: [], regressionDisposition: 'none' };
}

function snapshotBenchmarkEvidenceInput(input: BenchmarkEvidenceInput): BenchmarkEvidenceInput {
  if (!SHA_RE.test(input.environment.sourceSha)) evidenceValidation('environment.sourceSha must be a 40/64 hex SHA');
  if (input.input.dimensions.length === 0) evidenceValidation('input.dimensions must be non-empty');
  if (input.input.sizes.length === 0) evidenceValidation('input.sizes must be non-empty');
  if (input.measurement.canaries.length === 0) evidenceValidation('measurement.canaries must be non-empty');

  const sizes = input.input.sizes.map((size, index) => finite(size, `input.sizes[${index}]`, Number.MIN_VALUE));
  if (sizes.some((size, index) => index > 0 && size <= (sizes[index - 1] ?? 0))) {
    evidenceValidation('input.sizes must be strictly ascending');
  }

  const complexity =
    input.complexity === null
      ? null
      : {
          expected: input.complexity.expected,
          measured: input.complexity.measured,
          fittedSlope: finiteSigned(input.complexity.fittedSlope, 'complexity.fittedSlope'),
          fittedR2: finite(input.complexity.fittedR2, 'complexity.fittedR2'),
        };
  if (
    complexity !== null &&
    (!COMPLEXITY_CLASSES.includes(complexity.expected) || !COMPLEXITY_CLASSES.includes(complexity.measured))
  ) {
    evidenceValidation('complexity class is not recognized');
  }
  if (complexity !== null && complexity.fittedR2 > 1) evidenceValidation('complexity.fittedR2 must be <= 1');

  const snapshot: BenchmarkEvidenceInput = {
    sut: {
      id: nonEmpty(input.sut.id, 'sut.id'),
      owner: nonEmpty(input.sut.owner, 'sut.owner'),
      benchmark: nonEmpty(input.sut.benchmark, 'sut.benchmark'),
      file: nonEmpty(input.sut.file, 'sut.file'),
    },
    input: {
      dimensions: input.input.dimensions.map((dimension, index) => ({
        name: nonEmpty(dimension.name, `input.dimensions[${index}].name`),
        unit: nonEmpty(dimension.unit, `input.dimensions[${index}].unit`),
        distribution: nonEmpty(dimension.distribution, `input.dimensions[${index}].distribution`),
      })),
      sizes,
    },
    measurement: {
      mode: input.measurement.mode,
      warmupIterations: nonNegativeInteger(input.measurement.warmupIterations, 'measurement.warmupIterations'),
      repetitions: positiveInteger(input.measurement.repetitions, 'measurement.repetitions'),
      canaries: input.measurement.canaries.map((canary, index) => ({
        id: nonEmpty(canary.id, `measurement.canaries[${index}].id`),
        verdict: canary.verdict,
      })),
    },
    environment: {
      sourceSha: input.environment.sourceSha,
      sourceDigest: integrity(input.environment.sourceDigest, 'environment.sourceDigest'),
      environmentDigest: integrity(input.environment.environmentDigest, 'environment.environmentDigest'),
      platform: nonEmpty(input.environment.platform, 'environment.platform'),
      arch: nonEmpty(input.environment.arch, 'environment.arch'),
      runtime: nonEmpty(input.environment.runtime, 'environment.runtime'),
      toolchain: nonEmpty(input.environment.toolchain, 'environment.toolchain'),
    },
    complexity,
    allocation:
      input.allocation === null
        ? null
        : {
            observedBytes: finite(input.allocation.observedBytes, 'allocation.observedBytes'),
            budgetBytes: finite(input.allocation.budgetBytes, 'allocation.budgetBytes'),
            leakSlope: finiteSigned(input.allocation.leakSlope, 'allocation.leakSlope'),
            maximumLeakSlope: finite(input.allocation.maximumLeakSlope, 'allocation.maximumLeakSlope'),
          },
    confidence: {
      minimumR2: finite(input.confidence.minimumR2, 'confidence.minimumR2'),
      coefficientOfVariation: finite(input.confidence.coefficientOfVariation, 'confidence.coefficientOfVariation'),
      maximumCoefficientOfVariation: finite(
        input.confidence.maximumCoefficientOfVariation,
        'confidence.maximumCoefficientOfVariation',
      ),
    },
  };

  if (snapshot.measurement.mode !== 'cold' && snapshot.measurement.mode !== 'warm') {
    evidenceValidation('measurement.mode must be cold or warm');
  }
  if (snapshot.measurement.canaries.some((canary) => canary.verdict !== 'pass' && canary.verdict !== 'fail')) {
    evidenceValidation('measurement.canary verdict must be pass or fail');
  }
  if (snapshot.confidence.minimumR2 > 1) evidenceValidation('confidence.minimumR2 must be <= 1');
  return snapshot;
}

/** Construct immutable, integrity-addressed benchmark evidence. */
export function createBenchmarkEvidence(input: BenchmarkEvidenceInput): BenchmarkEvidence {
  const snapshot = snapshotBenchmarkEvidenceInput(input);
  const derived = deriveBenchmarkAdmission(snapshot);
  const payload = {
    schemaVersion: 1 as const,
    ...snapshot,
    regressionDisposition: derived.regressionDisposition,
    admission: { disposition: derived.disposition, reasons: derived.reasons },
  };
  const evidenceId = addressedDigestOf(CanonicalCbor.encode(payload), 'sha256').integrity_digest;
  return deepFreezeEvidence({ ...payload, evidenceId });
}

/** Build one immutable aggregate from independently addressed evidence records. */
export function createBenchmarkEvidenceArtifact(records: readonly BenchmarkEvidence[]): BenchmarkEvidenceArtifact {
  if (records.length === 0) evidenceValidation('benchmark evidence artifact must be non-empty');
  const evidence = records
    .map((record) => parseBenchmarkEvidence(record))
    .sort((left, right) => left.sut.id.localeCompare(right.sut.id));
  const ids = evidence.map((record) => record.evidenceId);
  if (new Set(ids).size !== ids.length) evidenceValidation('benchmark evidence artifact ids must be unique');
  const paths = evidence.map((record) => record.sut.id);
  if (new Set(paths).size !== paths.length) evidenceValidation('benchmark evidence artifact SUT ids must be unique');
  const unsigned = { schemaVersion: 1 as const, evidence };
  const artifactId = addressedDigestOf(CanonicalCbor.encode(unsigned), 'sha256').integrity_digest;
  return deepFreezeEvidence({ ...unsigned, artifactId });
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string') evidenceValidation(`${field} must be a string`);
  return value;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') evidenceValidation(`${field} must be a number`);
  return value;
}

/** Strictly decode evidence, refusing missing/foreign fields and digest drift. */
export function parseBenchmarkEvidence(value: unknown): BenchmarkEvidence {
  const root = exactObject(value, 'evidence', [
    'schemaVersion',
    'evidenceId',
    'sut',
    'input',
    'measurement',
    'environment',
    'complexity',
    'allocation',
    'confidence',
    'regressionDisposition',
    'admission',
  ]);
  if (root['schemaVersion'] !== 1) evidenceValidation('schemaVersion must be 1');

  const sut = exactObject(root['sut'], 'sut', ['id', 'owner', 'benchmark', 'file']);
  const input = exactObject(root['input'], 'input', ['dimensions', 'sizes']);
  const measurement = exactObject(root['measurement'], 'measurement', [
    'mode',
    'warmupIterations',
    'repetitions',
    'canaries',
  ]);
  const environment = exactObject(root['environment'], 'environment', [
    'sourceSha',
    'sourceDigest',
    'environmentDigest',
    'platform',
    'arch',
    'runtime',
    'toolchain',
  ]);
  const confidence = exactObject(root['confidence'], 'confidence', [
    'minimumR2',
    'coefficientOfVariation',
    'maximumCoefficientOfVariation',
  ]);
  if (!Array.isArray(input['dimensions']) || !Array.isArray(input['sizes'])) {
    evidenceValidation('input dimensions and sizes must be arrays');
  }
  if (!Array.isArray(measurement['canaries'])) evidenceValidation('measurement.canaries must be an array');

  const complexity =
    root['complexity'] === null
      ? null
      : exactObject(root['complexity'], 'complexity', ['expected', 'measured', 'fittedSlope', 'fittedR2']);
  const allocation =
    root['allocation'] === null
      ? null
      : exactObject(root['allocation'], 'allocation', [
          'observedBytes',
          'budgetBytes',
          'leakSlope',
          'maximumLeakSlope',
        ]);

  const rebuilt = createBenchmarkEvidence({
    sut: {
      id: asString(sut['id'], 'sut.id'),
      owner: asString(sut['owner'], 'sut.owner'),
      benchmark: asString(sut['benchmark'], 'sut.benchmark'),
      file: asString(sut['file'], 'sut.file'),
    },
    input: {
      dimensions: input['dimensions'].map((item, index) => {
        const dimension = exactObject(item, `input.dimensions[${index}]`, ['name', 'unit', 'distribution']);
        return {
          name: asString(dimension['name'], `input.dimensions[${index}].name`),
          unit: asString(dimension['unit'], `input.dimensions[${index}].unit`),
          distribution: asString(dimension['distribution'], `input.dimensions[${index}].distribution`),
        };
      }),
      sizes: input['sizes'].map((item, index) => asNumber(item, `input.sizes[${index}]`)),
    },
    measurement: {
      mode: asString(measurement['mode'], 'measurement.mode') as 'cold' | 'warm',
      warmupIterations: asNumber(measurement['warmupIterations'], 'measurement.warmupIterations'),
      repetitions: asNumber(measurement['repetitions'], 'measurement.repetitions'),
      canaries: measurement['canaries'].map((item, index) => {
        const canary = exactObject(item, `measurement.canaries[${index}]`, ['id', 'verdict']);
        return {
          id: asString(canary['id'], `measurement.canaries[${index}].id`),
          verdict: asString(canary['verdict'], `measurement.canaries[${index}].verdict`) as 'pass' | 'fail',
        };
      }),
    },
    environment: {
      sourceSha: asString(environment['sourceSha'], 'environment.sourceSha'),
      sourceDigest: asString(environment['sourceDigest'], 'environment.sourceDigest') as IntegrityDigest,
      environmentDigest: asString(environment['environmentDigest'], 'environment.environmentDigest') as IntegrityDigest,
      platform: asString(environment['platform'], 'environment.platform'),
      arch: asString(environment['arch'], 'environment.arch'),
      runtime: asString(environment['runtime'], 'environment.runtime'),
      toolchain: asString(environment['toolchain'], 'environment.toolchain'),
    },
    complexity:
      complexity === null
        ? null
        : {
            expected: asString(complexity['expected'], 'complexity.expected') as ComplexityClass,
            measured: asString(complexity['measured'], 'complexity.measured') as ComplexityClass,
            fittedSlope: asNumber(complexity['fittedSlope'], 'complexity.fittedSlope'),
            fittedR2: asNumber(complexity['fittedR2'], 'complexity.fittedR2'),
          },
    allocation:
      allocation === null
        ? null
        : {
            observedBytes: asNumber(allocation['observedBytes'], 'allocation.observedBytes'),
            budgetBytes: asNumber(allocation['budgetBytes'], 'allocation.budgetBytes'),
            leakSlope: asNumber(allocation['leakSlope'], 'allocation.leakSlope'),
            maximumLeakSlope: asNumber(allocation['maximumLeakSlope'], 'allocation.maximumLeakSlope'),
          },
    confidence: {
      minimumR2: asNumber(confidence['minimumR2'], 'confidence.minimumR2'),
      coefficientOfVariation: asNumber(confidence['coefficientOfVariation'], 'confidence.coefficientOfVariation'),
      maximumCoefficientOfVariation: asNumber(
        confidence['maximumCoefficientOfVariation'],
        'confidence.maximumCoefficientOfVariation',
      ),
    },
  });

  if (root['evidenceId'] !== rebuilt.evidenceId) evidenceValidation('evidenceId does not match canonical evidence');
  if (root['regressionDisposition'] !== rebuilt.regressionDisposition) {
    evidenceValidation('regressionDisposition does not match measured evidence');
  }
  const admission = exactObject(root['admission'], 'admission', ['disposition', 'reasons']);
  if (
    admission['disposition'] !== rebuilt.admission.disposition ||
    JSON.stringify(admission['reasons']) !== JSON.stringify(rebuilt.admission.reasons)
  ) {
    evidenceValidation('admission does not match measured evidence');
  }
  return rebuilt;
}

/** Strict decoder for the aggregate emitted by `scripts/bench-contracts.ts`. */
export function parseBenchmarkEvidenceArtifact(value: unknown): BenchmarkEvidenceArtifact {
  const root = exactObject(value, 'benchmark evidence artifact', ['schemaVersion', 'artifactId', 'evidence']);
  if (root['schemaVersion'] !== 1) evidenceValidation('benchmark evidence artifact schemaVersion must be 1');
  if (!Array.isArray(root['evidence'])) evidenceValidation('benchmark evidence artifact evidence must be an array');
  const rebuilt = createBenchmarkEvidenceArtifact(root['evidence'].map(parseBenchmarkEvidence));
  if (root['artifactId'] !== rebuilt.artifactId) {
    evidenceValidation('benchmark evidence artifact id does not match its canonical evidence');
  }
  return rebuilt;
}

/**
 * Admit evidence against the live source/environment. Deterministic failures
 * outrank uncertainty; uncertainty can never be laundered into a pass.
 */
export function admitBenchmarkEvidence(
  evidence: BenchmarkEvidence,
  authority: BenchmarkEvidenceAuthority,
): BenchmarkEvidenceAdmission {
  const parsed = parseBenchmarkEvidence(evidence);
  const stale: BenchmarkEvidenceReason[] = [];
  if (parsed.environment.sourceSha !== authority.sourceSha) stale.push('stale-source-sha');
  if (parsed.environment.sourceDigest !== authority.sourceDigest) stale.push('stale-source-digest');
  if (parsed.environment.environmentDigest !== authority.environmentDigest) stale.push('foreign-environment');
  if (parsed.environment.toolchain !== authority.toolchain) stale.push('foreign-toolchain');

  if (parsed.admission.disposition === 'fail') return parsed.admission;
  if (stale.length > 0) return { disposition: 'unknown', reasons: stale };
  return parsed.admission;
}

// ---------------------------------------------------------------------------
// Declared-distribution extraction — the gate's text fold over bench source.
// ---------------------------------------------------------------------------

/**
 * A registered bench-task name + the 1-based line it was registered on. The
 * registration form is the variable literally named `bench`: either tinybench's
 * `const bench = new Bench(); bench.add('name', …)` or vitest's
 * `import { bench } from 'vitest'; bench('name', …)`. A nested helper call
 * (`tree.add('a', …)`, `store.set('id', …)`) is NOT a bench registration — only
 * the `bench` identifier counts — so the matcher is anchored to that identifier.
 */
export interface RegisteredBench {
  readonly name: string;
  readonly line: number;
}

/**
 * `bench(` or `bench.add(` as a CALL with a string-literal first argument. The
 * `\b` before `bench` and the optional `.add` pin it to the bench registrar
 * identifier — `tree.add(` / `store.set(` do not match because they are not the
 * `bench` identifier. Quote handling covers single + double + backtick literals.
 */
const BENCH_REGISTRATION = /\bbench(?:\.add)?\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

/**
 * Extract the registered bench-task names from ONE bench file's text. The caller
 * passes COMMENT-AND-STRING-SAFE text — a `// bench.add('defineConfig…')` comment
 * or a string literal that mentions a bench name must NOT be extracted (it is not
 * a real registration). The gate strips comments (via `codeOnly`) before calling
 * this, so a commented-out bench (the `defineConfig()` TODO in `core.bench.ts`) is
 * correctly absent.
 *
 * Pure: a fold over the text, no I/O, no clock.
 */
export function extractRegisteredBenches(codeOnlyText: string): readonly RegisteredBench[] {
  const benches: RegisteredBench[] = [];
  const lines = codeOnlyText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    BENCH_REGISTRATION.lastIndex = 0;
    let match: RegExpExecArray | null = BENCH_REGISTRATION.exec(line);
    while (match !== null) {
      const name = match[2];
      if (name !== undefined && name.length > 0) {
        benches.push({ name, line: i + 1 });
      }
      match = BENCH_REGISTRATION.exec(line);
    }
  }
  return benches;
}

// ---------------------------------------------------------------------------
// Complexity-class fit — log-log slope + R². A CLASS verdict, never an ns pin.
// ---------------------------------------------------------------------------

/** A measured (inputSize, latencyNs) sample for the complexity fit. */
export interface ComplexitySample {
  readonly size: number;
  readonly latencyNs: number;
}

/** A unit-agnostic growth sample used by latency and retained-allocation curves. */
export interface GrowthSample {
  readonly size: number;
  readonly cost: number;
}

/** The result of a log-log linear fit over complexity samples. */
export interface ComplexityFit {
  /** The slope of log(latency) vs log(size) — ≈0 → O(1), ≈1 → O(n), ≈2 → O(n²). */
  readonly slope: number;
  /** The fit's R² (coefficient of determination) — fit quality, 0..1. */
  readonly r2: number;
  /** The class the slope maps to, under the tolerance bands. */
  readonly class: ComplexityClass;
}

/**
 * Map a log-log slope to a complexity CLASS under tolerance bands. The bands are
 * deliberately WIDE so the verdict is load-ROBUST: a perf test on shared hardware
 * jitters the absolute slope, but the CLASS boundaries sit in the gaps between the
 * canonical slopes (0, 1, 2), so jitter inside a band never flips the class.
 *
 * - slope ≤ 0.30 → O(1)   (flat — no growth with n)
 * - 0.30 < slope ≤ 0.70 → O(log n)
 * - 0.70 < slope ≤ 1.40 → O(n)      (centred on 1, the linear law; wide on both sides)
 * - 1.40 < slope ≤ 1.70 → O(n log n)
 * - slope > 1.70 → O(n^2)
 *
 * A genuinely-linear path that jitters to slope 1.15 stays O(n); a path that
 * regresses to a real quadratic (slope ≈ 2) lands well past 1.70 → O(n²),
 * tripping the gate. The bands never let O(n) jitter into O(n²).
 */
export function classifySlope(slope: number): ComplexityClass {
  if (slope <= 0.3) return 'O(1)';
  if (slope <= 0.7) return 'O(log n)';
  if (slope <= 1.4) return 'O(n)';
  if (slope <= 1.7) return 'O(n log n)';
  return 'O(n^2)';
}

/**
 * Fit latency-vs-input-size samples to a complexity class via an
 * ordinary-least-squares line through (log size, log latency). The slope of that
 * line is the empirical exponent; {@link classifySlope} maps it to a class.
 *
 * Throws a tagged {@link ValidationError} for a degenerate input (fewer than two
 * distinct sizes, or a non-positive size/latency that has no logarithm) — a fit
 * with no signal must fail LOUD, never silently return a meaningless O(1).
 */
export function fitGrowthClass(samples: readonly GrowthSample[]): ComplexityFit {
  const usable = samples.filter((s) => s.size > 0 && s.cost > 0);
  const distinctSizes = new Set(usable.map((s) => s.size));
  if (usable.length < 2 || distinctSizes.size < 2) {
    throw ValidationError(
      'fitComplexityClass',
      `need >= 2 samples with distinct positive sizes and positive costs to fit a growth class; got ${usable.length} usable sample(s) across ${distinctSizes.size} distinct size(s)`,
    );
  }

  const xs = usable.map((s) => Math.log(s.size));
  const ys = usable.map((s) => Math.log(s.cost));
  const n = xs.length;
  const meanX = xs.reduce((sum, x) => sum + x, 0) / n;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / n;

  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - meanX;
    const dy = (ys[i] ?? 0) - meanY;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }

  if (sxx === 0) {
    throw ValidationError('fitComplexityClass', 'zero variance in log-size — cannot fit a slope');
  }

  const slope = sxy / sxx;
  // R²: how well the line explains the variance in log-latency. When syy is 0
  // (all latencies identical) the curve is perfectly flat → slope 0, R² 1.
  const r2 = syy === 0 ? 1 : Math.max(0, Math.min(1, (sxy * sxy) / (sxx * syy)));

  return { slope, r2, class: classifySlope(slope) };
}

/** Fit latency growth while preserving the established latency-shaped API. */
export function fitComplexityClass(samples: readonly ComplexitySample[]): ComplexityFit {
  return fitGrowthClass(samples.map((sample) => ({ size: sample.size, cost: sample.latencyNs })));
}

// ---------------------------------------------------------------------------
// Complexity-curve measurement — drives a SUT across sizes via systemClock.
// ---------------------------------------------------------------------------

/** A hot path to measure: an id, a description, the sizes, and the SUT driver. */
export interface ComplexityProbe {
  /** Stable id of the hot path. */
  readonly path: string;
  /** Canonical package-catalog owner of the measured implementation. */
  readonly owner: string;
  /** Human description. */
  readonly describe: string;
  /** The input dimension the curve sweeps (the `shape`). */
  readonly shape: string;
  /** The input sizes to sweep (ascending; >= 2 distinct positive sizes). */
  readonly sizes: readonly number[];
  readonly measurement?: {
    readonly innerIterations: number;
    readonly replicates: number;
    readonly warmupIterations: number;
  };
  /**
   * Build the workload for a given input size. Returns a thunk that performs ONE
   * unit of the hot path's work at that size — called repeatedly per measurement.
   * Setup (building the size-n input) happens in the builder, OUTSIDE the timed
   * thunk, so the curve measures the hot path, not its fixture construction.
   */
  readonly workloadFor: (size: number) => () => void;
}

/** A measured complexity curve: the probe, the per-size samples, and the fit. */
export interface ComplexityCurve {
  readonly path: string;
  readonly describe: string;
  readonly shape: string;
  readonly samples: readonly ComplexitySample[];
  readonly fit: ComplexityFit;
  /** Maximum coefficient of variation across replicate timings at one size. */
  readonly coefficientOfVariation: number;
}

/**
 * Measure a complexity curve: for each declared size, time `innerIterations`
 * calls of the size's workload, take the BEST (minimum) per-call latency across
 * `replicates` replicates, then fit the resulting (size, latency) samples.
 *
 * Why the MINIMUM across replicates: on shared hardware the noise is strictly
 * additive (a scheduler preemption only ever makes a sample SLOWER), so the
 * minimum is the cleanest estimate of the true cost and the most load-robust —
 * the standard "best-of-k" defence against measurement noise. Combined with the
 * CLASS verdict (not an absolute-ns pin), the curve's SHAPE is stable across
 * machine load.
 *
 * Durations read {@link systemClock} (monotonic `performance.now()`) — the
 * injectable clock defaults to it; a test passes a deterministic clock to make
 * the curve reproducible. NEVER {@link wallClock} (that would be the
 * 1970-laundering bug — a duration measured against epoch ms).
 */
export function measureComplexityCurve(
  probe: ComplexityProbe,
  options: {
    readonly innerIterations?: number;
    readonly replicates?: number;
    readonly warmupIterations?: number;
    readonly clock?: Clock;
  } = {},
): ComplexityCurve {
  const innerIterations = options.innerIterations ?? probe.measurement?.innerIterations ?? 200;
  const replicates = options.replicates ?? probe.measurement?.replicates ?? 7;
  const warmupIterations = options.warmupIterations ?? probe.measurement?.warmupIterations ?? 50;
  const clock = options.clock ?? systemClock;

  const samples: ComplexitySample[] = [];
  const coefficientsOfVariation: number[] = [];
  for (const size of probe.sizes) {
    const workload = probe.workloadFor(size);

    // Warm up the JIT for THIS size's workload outside the timed region.
    for (let w = 0; w < warmupIterations; w++) {
      workload();
    }

    let bestPerCallNs = Number.POSITIVE_INFINITY;
    const replicateSamples: number[] = [];
    for (let r = 0; r < replicates; r++) {
      const startMs = clock.now();
      for (let i = 0; i < innerIterations; i++) {
        workload();
      }
      const elapsedMs = clock.now() - startMs;
      const perCallNs = (elapsedMs * 1e6) / innerIterations;
      replicateSamples.push(perCallNs);
      if (perCallNs < bestPerCallNs) {
        bestPerCallNs = perCallNs;
      }
    }

    const mean = replicateSamples.reduce((sum, sample) => sum + sample, 0) / replicateSamples.length;
    const variance = replicateSamples.reduce((sum, sample) => sum + (sample - mean) ** 2, 0) / replicateSamples.length;
    coefficientsOfVariation.push(mean === 0 ? Number.POSITIVE_INFINITY : Math.sqrt(variance) / mean);

    samples.push({ size, latencyNs: bestPerCallNs });
  }

  return {
    path: probe.path,
    describe: probe.describe,
    shape: probe.shape,
    samples,
    fit: fitComplexityClass(samples),
    coefficientOfVariation: Math.max(...coefficientsOfVariation),
  };
}

// ---------------------------------------------------------------------------
// Committed-artifact IO — the source of truth the gate folds over.
// ---------------------------------------------------------------------------

/** Read + validate the committed distribution registry, or `null` if absent. */
export function readDistributionRegistry(root: string): DistributionRegistry | null {
  return readArtifact<DistributionRegistry>(
    resolve(root, DISTRIBUTIONS_ARTIFACT_PATH),
    (parsed): parsed is DistributionRegistry =>
      parsed.schemaVersion === 2 &&
      Array.isArray((parsed as DistributionRegistry).distributions) &&
      (parsed as DistributionRegistry).distributions.every(
        (distribution) => parseQualifiedBenchDistribution(distribution) !== null,
      ),
  );
}

/** Read + validate the committed complexity map, or `null` if absent. */
export function readComplexityMap(root: string): ComplexityMap | null {
  return readArtifact<ComplexityMap>(
    resolve(root, COMPLEXITY_MAP_ARTIFACT_PATH),
    (parsed): parsed is ComplexityMap => parsed.schemaVersion === 1 && Array.isArray((parsed as ComplexityMap).entries),
  );
}

function readArtifact<T extends { readonly schemaVersion: number }>(
  filePath: string,
  isValid: (parsed: { readonly schemaVersion: number }) => parsed is T,
): T | null {
  if (!existsSync(filePath)) {
    return null;
  }

  // A malformed committed artifact must fail LOUD (a tagged error the caller can
  // surface), not silently degrade to "no contract" — a swallowed parse error is
  // exactly the contract-is-broken lie the gate exists to prevent.
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (cause) {
    throw ValidationError('readArtifact', `unable to read committed contract artifact ${filePath}: ${String(cause)}`);
  }

  let parsed: { readonly schemaVersion: number };
  try {
    parsed = JSON.parse(raw) as { readonly schemaVersion: number };
  } catch (cause) {
    throw ValidationError(
      'readArtifact',
      `committed contract artifact ${filePath} is not valid JSON: ${String(cause)}`,
    );
  }

  if (!isValid(parsed)) {
    throw ValidationError(
      'readArtifact',
      `committed contract artifact ${filePath} failed schema validation (wrong schemaVersion or shape)`,
    );
  }

  return parsed;
}
