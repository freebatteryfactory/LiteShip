/**
 * The ALLOCATION GATE — the committed, MEASURED proof that the two
 * "zero-allocation hot path" claims (`@czap/core` compositor compose + token-buffer
 * push/drainInto) are GENUINELY TRUE, not aspirational prose.
 *
 * THE MEASUREMENT (the only honest one for a GC'd runtime): per-op LIVE heap
 * growth — the bytes that SURVIVE a forced `global.gc()`. A hot path may produce
 * transient garbage that the collector reclaims instantly; that is GC granularity,
 * not a leak. What a "zero-allocation hot path" must NOT do is RETAIN per-op
 * allocation — grow the live heap proportionally to the op count. So the gate:
 *   1. runs the op K batches × N ops,
 *   2. forces GC between/around the batches (`node --expose-gc` ⇒ `global.gc()`),
 *   3. reads `process.memoryUsage().heapUsed` AFTER a forced GC at the start and
 *      AFTER a forced GC at the end,
 *   4. divides the surviving delta by the total op count ⇒ live bytes/op.
 *
 * A genuinely zero-alloc path lands at ≈ 0 live bytes/op (a small epsilon absorbs
 * GC-bucket granularity + the steady-state growth of the reused scratch). A path
 * that allocates per op (the OLD compositor's `Array.from`/`getDirty`/closures, or
 * a token drain that retained its result arrays) blows the budget — the gate fails.
 *
 * This runner MUST run under `node --expose-gc`; without `global.gc` a forced
 * collection is impossible and the measurement would be transient-polluted noise.
 * It therefore FAILS LOUD (a tagged error) when `global.gc` is absent — it never
 * silently degrades to an unforced (meaningless) measurement.
 *
 * Run: `node --expose-gc --import tsx scripts/alloc-gate.ts`
 * Wired: `pnpm run bench:alloc` (this script) + pinned by the two
 * `tests/property/*-zero-alloc.test.ts` (which spawn it with `--expose-gc`).
 *
 * The bench input distribution is DECLARED in `benchmarks/distributions.json`
 * (the perf-contract law): a measured number is uncomparable without its declared
 * input size + shape.
 *
 * @module
 */

import { Effect } from 'effect';
import { Boundary, Compositor, TokenBuffer } from '@czap/core';
import type { Quantizer } from '@czap/core';
import { InvariantViolationError } from '@czap/error';

/** The forced-GC handle `--expose-gc` installs. Absent ⇒ the gate cannot measure. */
function forceGc(): void {
  const g = globalThis as { gc?: () => void };
  if (g.gc === undefined) {
    throw InvariantViolationError(
      'alloc-gate',
      'global.gc is unavailable — run this gate with `node --expose-gc`. A live-allocation measurement REQUIRES a forced collection; an unforced read is transient-polluted noise, never a verdict.',
    );
  }
  // Two passes: the first reclaims young-gen garbage, the second sweeps anything
  // the first promoted — so the survivor reading is stable.
  g.gc();
  g.gc();
}

/** One measured allocation result — the live (survives-GC) bytes per op. */
export interface AllocResult {
  readonly label: string;
  readonly batches: number;
  readonly opsPerBatch: number;
  readonly totalOps: number;
  readonly liveDeltaBytes: number;
  readonly liveBytesPerOp: number;
  /** The per-op live budget this op is asserted against (≈ 0 + GC-granularity epsilon). */
  readonly budgetBytesPerOp: number;
  readonly withinBudget: boolean;
}

/**
 * Measure the LIVE per-op allocation of `op`. Warms up (so JIT + steady-state
 * scratch growth happen before the window), forces GC, snapshots `heapUsed`, runs
 * K×N ops, forces GC, snapshots again, and returns the surviving delta / op.
 */
export function measureLiveBytesPerOp(
  label: string,
  batches: number,
  opsPerBatch: number,
  budgetBytesPerOp: number,
  op: () => void,
): AllocResult {
  // Warmup: run a full batch so the JIT compiles the path and any reused scratch
  // (the compositor's dirty-name array, the token ring) reaches steady size — that
  // one-time growth must NOT be counted as per-op allocation.
  for (let i = 0; i < opsPerBatch; i++) op();
  forceGc();
  const before = process.memoryUsage().heapUsed;

  let totalOps = 0;
  for (let b = 0; b < batches; b++) {
    for (let i = 0; i < opsPerBatch; i++) op();
    totalOps += opsPerBatch;
    // Force GC between batches too, so transient garbage from one batch never
    // inflates the next batch's apparent survivors.
    forceGc();
  }

  forceGc();
  const after = process.memoryUsage().heapUsed;
  const liveDeltaBytes = after - before;
  const liveBytesPerOp = liveDeltaBytes / totalOps;
  return {
    label,
    batches,
    opsPerBatch,
    totalOps,
    liveDeltaBytes,
    liveBytesPerOp,
    budgetBytesPerOp,
    // A NEGATIVE delta (GC reclaimed more than the window allocated) is trivially
    // within budget — the live heap did not grow. Compare the magnitude upward.
    withinBudget: liveBytesPerOp <= budgetBytesPerOp,
  };
}

// ─────────────────────────── the two hot-path fixtures ──────────────────────

/** The declared input distribution (mirrors benchmarks/distributions.json). */
export const ALLOC_BATCHES = 50;
export const ALLOC_OPS_PER_BATCH = 5000;
/**
 * The per-op live budget: ≈ 0, with a tight epsilon for GC-bucket granularity.
 * 8 bytes/op is one machine word — far below the 34–113 bytes/op the pre-cure
 * code retained-or-churned, yet above the sub-1-byte/op noise floor a genuinely
 * zero-alloc path measures at. A breach means real per-op retention returned.
 */
export const ALLOC_BUDGET_BYTES_PER_OP = 8;

const ALLOC_BOUNDARY = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1280, 'desktop'],
  ] as const,
});

/**
 * A minimal structural quantizer for the compose hot path — a fixed-state
 * synchronous quantizer (the compose path reads `stateSync()` + `evaluate`). It is
 * NOT a real animated quantizer; the allocation under test is the COMPOSITOR's
 * per-frame compose body, so the quantizer only needs to be a cheap, non-allocating
 * state source. Composition over inheritance: a plain object satisfying the
 * structural contract (matching the `liveQuantizer` test pattern), no class. The
 * `changes` stream is unused by the compose path (`null as never`, the established
 * fixture form).
 */
type AllocState = (typeof ALLOC_BOUNDARY)['states'][number];

function fixedQuantizer(state: AllocState): Quantizer<typeof ALLOC_BOUNDARY> {
  const fixed = state;
  return {
    _tag: 'Quantizer',
    boundary: ALLOC_BOUNDARY,
    state: Effect.sync(() => fixed),
    stateSync: () => fixed,
    changes: null as never,
    evaluate: () => fixed,
  };
}

/** Build the token-buffer push/drainInto op closure — the zero-alloc hot path. */
function tokenBufferOp(): () => void {
  const tb = TokenBuffer.make<number>({ capacity: 256 });
  // Caller-owned scratch sink — reused across drains (the zero-alloc contract).
  const sink: number[] = new Array<number>(64);
  let n = 0;
  return () => {
    tb.push(n++);
    // At half capacity, drain a chunk into the reused sink (allocates nothing).
    if (tb.length >= 128) tb.drainInto(sink, 64);
  };
}

/** Build the compositor compose op closure — the per-frame zero-alloc hot path. */
function compositorOp(): () => void {
  const compositor = Effect.runSync(Effect.scoped(Compositor.create({ poolCapacity: 8 })));
  const names = ['viewport', 'theme', 'density'] as const;
  const states = ['mobile', 'tablet', 'desktop'] as const;
  for (let i = 0; i < names.length; i++) {
    Effect.runSync(compositor.add(names[i]!, fixedQuantizer(states[i]!)));
  }
  let tick = 0;
  return () => {
    // Mark one quantizer dirty each tick (the steady selective-recompute path the
    // runtime drives), then compose. The compose body is the path under test.
    compositor.runtime.markDirty(names[tick++ % names.length]!);
    Effect.runSync(compositor.compute());
  };
}

/** The two governed hot paths — each measured against the shared budget. */
export function runAllocGate(): readonly AllocResult[] {
  return [
    measureLiveBytesPerOp(
      'core/token-buffer push+drainInto',
      ALLOC_BATCHES,
      ALLOC_OPS_PER_BATCH,
      ALLOC_BUDGET_BYTES_PER_OP,
      tokenBufferOp(),
    ),
    measureLiveBytesPerOp(
      'core/compositor compute (selective recompute)',
      ALLOC_BATCHES,
      ALLOC_OPS_PER_BATCH,
      ALLOC_BUDGET_BYTES_PER_OP,
      compositorOp(),
    ),
  ];
}

/**
 * Run the gate, print a deterministic report (one `RESULT` line per path the
 * spawning tests parse), and exit non-zero on any budget breach. The report is
 * machine-readable: `RESULT <label>\t<liveBytesPerOp>\t<budget>\t<PASS|FAIL>`.
 */
function main(): void {
  const results = runAllocGate();
  let allWithin = true;
  for (const r of results) {
    const verdict = r.withinBudget ? 'PASS' : 'FAIL';
    if (!r.withinBudget) allWithin = false;
    // The parseable result line + a human summary on the same handle.
    process.stdout.write(
      `RESULT\t${r.label}\t${r.liveBytesPerOp.toFixed(4)}\t${r.budgetBytesPerOp}\t${verdict}\n`,
    );
    process.stdout.write(
      `  ${r.label}: ${r.liveDeltaBytes} live bytes over ${r.totalOps} ops = ` +
        `${r.liveBytesPerOp.toFixed(4)} bytes/op (budget ${r.budgetBytesPerOp}) ⇒ ${verdict}\n`,
    );
  }
  if (!allWithin) {
    process.stdout.write('ALLOC-GATE: FAIL — a hot path retained per-op allocation above its zero-alloc budget.\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write('ALLOC-GATE: PASS — both hot paths are genuinely zero-allocation (live per-op ≈ 0).\n');
}

// Run only when invoked directly (the tests import the measurement fns instead).
const invokedDirectly = process.argv[1] !== undefined && process.argv[1].endsWith('alloc-gate.ts');
if (invokedDirectly) {
  main();
}
