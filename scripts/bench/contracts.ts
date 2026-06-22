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
 * Two contracts live here:
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
import { ValidationError } from '@czap/error';
import { systemClock, type Clock } from '@czap/core';

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
}

/** The committed declared-distribution registry artifact. */
export interface DistributionRegistry {
  readonly schemaVersion: 1;
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
}

/** The committed complexity-map artifact. */
export interface ComplexityMap {
  readonly schemaVersion: 1;
  readonly entries: readonly ComplexityMapEntry[];
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
const BENCH_REGISTRATION =
  /\bbench(?:\.add)?\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

/**
 * Extract the registered bench-task names from ONE bench file's text. The caller
 * passes COMMENT-AND-STRING-SAFE text — a `// bench.add('Config.make…')` comment
 * or a string literal that mentions a bench name must NOT be extracted (it is not
 * a real registration). The gate strips comments (via `codeOnly`) before calling
 * this, so a commented-out bench (the `Config.make()` TODO in `core.bench.ts`) is
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
export function fitComplexityClass(samples: readonly ComplexitySample[]): ComplexityFit {
  const usable = samples.filter((s) => s.size > 0 && s.latencyNs > 0);
  const distinctSizes = new Set(usable.map((s) => s.size));
  if (usable.length < 2 || distinctSizes.size < 2) {
    throw ValidationError(
      'fitComplexityClass',
      `need >= 2 samples with distinct positive sizes and positive latencies to fit a complexity class; got ${usable.length} usable sample(s) across ${distinctSizes.size} distinct size(s)`,
    );
  }

  const xs = usable.map((s) => Math.log(s.size));
  const ys = usable.map((s) => Math.log(s.latencyNs));
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

// ---------------------------------------------------------------------------
// Complexity-curve measurement — drives a SUT across sizes via systemClock.
// ---------------------------------------------------------------------------

/** A hot path to measure: an id, a description, the sizes, and the SUT driver. */
export interface ComplexityProbe {
  /** Stable id of the hot path. */
  readonly path: string;
  /** Human description. */
  readonly describe: string;
  /** The input dimension the curve sweeps (the `shape`). */
  readonly shape: string;
  /** The input sizes to sweep (ascending; >= 2 distinct positive sizes). */
  readonly sizes: readonly number[];
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
  const innerIterations = options.innerIterations ?? 200;
  const replicates = options.replicates ?? 7;
  const warmupIterations = options.warmupIterations ?? 50;
  const clock = options.clock ?? systemClock;

  const samples: ComplexitySample[] = [];
  for (const size of probe.sizes) {
    const workload = probe.workloadFor(size);

    // Warm up the JIT for THIS size's workload outside the timed region.
    for (let w = 0; w < warmupIterations; w++) {
      workload();
    }

    let bestPerCallNs = Number.POSITIVE_INFINITY;
    for (let r = 0; r < replicates; r++) {
      const startMs = clock.now();
      for (let i = 0; i < innerIterations; i++) {
        workload();
      }
      const elapsedMs = clock.now() - startMs;
      const perCallNs = (elapsedMs * 1e6) / innerIterations;
      if (perCallNs < bestPerCallNs) {
        bestPerCallNs = perCallNs;
      }
    }

    samples.push({ size, latencyNs: bestPerCallNs });
  }

  return {
    path: probe.path,
    describe: probe.describe,
    shape: probe.shape,
    samples,
    fit: fitComplexityClass(samples),
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
      parsed.schemaVersion === 1 && Array.isArray((parsed as DistributionRegistry).distributions),
  );
}

/** Read + validate the committed complexity map, or `null` if absent. */
export function readComplexityMap(root: string): ComplexityMap | null {
  return readArtifact<ComplexityMap>(
    resolve(root, COMPLEXITY_MAP_ARTIFACT_PATH),
    (parsed): parsed is ComplexityMap =>
      parsed.schemaVersion === 1 && Array.isArray((parsed as ComplexityMap).entries),
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
    throw ValidationError('readArtifact', `committed contract artifact ${filePath} is not valid JSON: ${String(cause)}`);
  }

  if (!isValid(parsed)) {
    throw ValidationError(
      'readArtifact',
      `committed contract artifact ${filePath} failed schema validation (wrong schemaVersion or shape)`,
    );
  }

  return parsed;
}
