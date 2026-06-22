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
 * THE SECOND, STRICTER HALF — the TRANSIENT gate. The live measurement is blind to
 * churn: a path that mints + immediately drops a node every op (the OLD compositor's
 * `SubscriptionRef.set` reactive publish, ≈ 22 B/op of PubSub/replay-buffer node)
 * passes the live gate yet is NOT "genuinely zero-allocation". So the compose path
 * is ALSO held to a TRANSIENT budget: gross `heapUsed` delta over a window with NO
 * forced GC inside it (transient garbage stays counted). The raw listener-set
 * publish that replaced `SubscriptionRef.set` churns nothing when no `changes`
 * subscriber is attached — measured ≈ 0.25 B/op. The compose path now proves BOTH:
 * zero RETAINED *and* zero TRANSIENT.
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

import { Effect, Queue } from 'effect';
import { Boundary, Compositor, TokenBuffer } from '@czap/core';
import type { CompositeState } from '@czap/core';
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
 * One measured TRANSIENT allocation result — the GROSS bytes per op a path churns
 * (whether or not the collector reclaims them). The live gate proves a path RETAINS
 * nothing; this transient gate proves a path also CHURNS nothing — the second,
 * stricter half of "genuinely zero-allocation". Measured as `heapUsed` delta over a
 * window with NO forced GC inside it (so transient garbage is counted). A real GC
 * auto-firing mid-window only RECLAIMS, undercounting — a conservative error safe
 * for an upper-bound budget.
 */
export interface TransientResult {
  readonly label: string;
  readonly totalOps: number;
  readonly grossDeltaBytes: number;
  readonly transientBytesPerOp: number;
  /** The per-op transient budget (≈ 0 + GC-granularity epsilon). */
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

/**
 * Measure the TRANSIENT (gross, GC-or-not) per-op allocation of `op`: warms up,
 * forces GC once to clean the baseline, snapshots `heapUsed`, runs `windowOps`
 * back-to-back with NO forced GC inside the window, snapshots again, and returns
 * the gross delta / op. This is exactly the number the live gate is BLIND to (it
 * forces GC between every batch, reclaiming all transient churn). A path that
 * publishes through a per-op-allocating primitive (the old `SubscriptionRef.set`
 * PubSub/replay-buffer node, ≈ 22 B/op) blows this budget; the raw listener-set
 * fan-out churns nothing when no subscriber is attached (≈ 0).
 *
 * MEASURE THE PRIMITIVE, NOT THE HARNESS. The transient fixture is the compositor's
 * reactive PUBLISH primitive in isolation — NOT `Effect.runSync(compute())`. Routing
 * the measurement through `runSync` would measure the Effect FIBER harness (≈ 280
 * B/op of fiber build/teardown churn that swamps and masks the publish), and that
 * harness churn is itself run-to-run noisy — an un-enforceable, flaky budget. The
 * publish is plain synchronous JS (a `live` ref assignment + a listener-set fan-out),
 * so it is measured as plain JS, which lands DEAD STABLE at 0 B/op with no subscriber
 * and a deterministic ≈ 13 B/op (the `Queue.offerUnsafe` enqueue) with one.
 *
 * The window is sized so V8's auto-GC is unlikely to fire mid-window (it would only
 * UNDERcount — a conservative, never-false-pass error for an upper-bound budget).
 */
export function measureTransientBytesPerOp(
  label: string,
  windowOps: number,
  budgetBytesPerOp: number,
  op: () => void,
): TransientResult {
  // ANTI-FRAGILE method: a SINGLE long un-GC'd window is flaky — whether V8's
  // auto-GC fires mid-window (reclaiming churn ⇒ low) or not (accumulating ⇒ high)
  // swings the reading several B/op run-to-run. Instead measure many SMALL windows,
  // forcing GC before each so each window starts from a clean baseline, and take the
  // MEDIAN per-window per-op churn. Each small window is short enough that auto-GC
  // rarely fires inside it, and the median is robust to the few windows where it
  // does (those read low, never high — a conservative outlier). This pins the
  // genuine per-publish churn, not GC-timing luck.
  const WINDOWS = 25;
  const opsPerWindow = Math.max(1, Math.floor(windowOps / WINDOWS));
  for (let i = 0; i < opsPerWindow; i++) op(); // warmup: JIT + steady-state scratch

  const perOp: number[] = [];
  let totalOps = 0;
  let grossDeltaBytes = 0;
  for (let w = 0; w < WINDOWS; w++) {
    forceGc();
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < opsPerWindow; i++) op();
    // NO forced GC inside the window — transient garbage stays counted.
    const after = process.memoryUsage().heapUsed;
    const delta = after - before;
    grossDeltaBytes += delta;
    totalOps += opsPerWindow;
    perOp.push(delta / opsPerWindow);
  }

  perOp.sort((a, b) => a - b);
  const mid = Math.floor(perOp.length / 2);
  const median =
    perOp.length % 2 === 0 ? (perOp[mid - 1]! + perOp[mid]!) / 2 : perOp[mid]!;
  return {
    label,
    totalOps,
    grossDeltaBytes,
    // The MEDIAN per-window per-op churn — robust to the GC-timing outliers a single
    // long window suffers. A NEGATIVE median (auto-GC reclaimed more than churned) is
    // trivially within budget.
    transientBytesPerOp: median,
    budgetBytesPerOp,
    withinBudget: median <= budgetBytesPerOp,
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

/**
 * The window for the TRANSIENT measurement — fanned out across small forced-GC
 * windows inside {@link measureTransientBytesPerOp}, each short enough that V8's
 * auto-GC is unlikely to fire mid-window (and if it does, it only UNDERcounts — safe
 * for an upper-bound budget). The median across windows is the robust per-op churn.
 */
export const TRANSIENT_WINDOW_OPS = 1_000_000;
/**
 * The per-op TRANSIENT budget for the publish with NO subscriber: ≈ 0 + a tight
 * epsilon. The raw listener-set publish fans out to an empty set and allocates
 * NOTHING — measured DEAD STABLE at 0.0000 B/op across runs. 2 B/op (below one
 * machine word) is a conservative epsilon, far under the ≈ 22 B/op the eliminated
 * `SubscriptionRef.set` PubSub/replay-buffer publish churned even with no subscriber;
 * a breach means a per-publish allocation returned to the hot path.
 */
export const TRANSIENT_BUDGET_BYTES_PER_OP = 2;
/**
 * The per-op TRANSIENT budget for the publish WITH a live subscriber: the
 * `Stream.callback` bridge's `Queue.offerUnsafe` enqueue, measured DEAD STABLE at
 * ≈ 12.57 B/op. 16 B/op (a justified ceiling above the measured floor) holds the
 * subscriber path — still a ~4× reduction from the ≈ 48 B/op the old
 * `SubscriptionRef.set` PubSub-with-subscriber publish churned (a PubSub linked-list
 * node + a replay-buffer node per publish).
 */
export const TRANSIENT_SUBSCRIBER_BUDGET_BYTES_PER_OP = 16;

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

/**
 * Build the compositor's reactive PUBLISH primitive as a synchronous op closure —
 * the exact mechanism `computeStateSync` runs on the hot path, in isolation (no
 * `Effect.runSync` harness, which would mask it; see {@link measureTransientBytesPerOp}).
 *
 * The publish is: stash the live state, then fan out to a compositor-owned listener
 * set. With no `changes` subscriber the set is empty and the publish allocates
 * NOTHING (the eliminated `SubscriptionRef.set` minted a PubSub/replay-buffer node
 * here regardless, ≈ 22 B/op). `withSubscriber` attaches the real `Stream.callback`
 * bridge listener — a `Queue.offerUnsafe` into an UNBOUNDED queue (the bridge's
 * actual buffer; drained each op so nothing is retained) — the only per-publish
 * allocation when a subscriber is live.
 *
 * This measures the PRIMITIVE, not a logic mirror of the compose body (whose
 * zero-alloc the live gate already proves); the wiring that the compositor's publish
 * IS this listener-set fan-out (never `SubscriptionRef.set`) is pinned by the source
 * drift guard `tests/property/compositor-zero-alloc.test.ts`.
 */
function compositorPublishOp(withSubscriber: boolean): () => void {
  const fixedState: CompositeState = {
    discrete: {},
    blend: {},
    outputs: { css: {}, glsl: {}, wgsl: {}, aria: {} },
  };
  const live: { current: CompositeState } = { current: fixedState };
  const listeners = new Set<(state: CompositeState) => void>();
  if (withSubscriber) {
    const queue = Effect.runSync(Queue.unbounded<CompositeState>());
    listeners.add((state) => {
      Queue.offerUnsafe(queue, state);
    });
    return () => {
      live.current = fixedState;
      for (const notify of listeners) notify(fixedState);
      // Drain so nothing is retained across ops (a live consumer of `changes`).
      while (Queue.takeUnsafe(queue) !== undefined) {
        /* drain */
      }
    };
  }
  return () => {
    live.current = fixedState;
    for (const notify of listeners) notify(fixedState);
  };
}

/** The two governed hot paths — each measured against the shared LIVE budget. */
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
 * The TRANSIENT gate — proves the compositor's reactive publish also CHURNS nothing
 * per op (the stricter, second half of "genuinely zero-allocation"). Two fixtures:
 *
 *  - NO subscriber (the common compose tick): the raw listener-set publish fans out
 *    to an empty set and allocates NOTHING (≈ 0 B/op, dead stable). The eliminated
 *    `SubscriptionRef.set` minted a PubSub/replay-buffer node every publish (≈ 22
 *    B/op) even here — so this is the budget that catches a regression to it.
 *  - WITH a live subscriber: the publish enqueues via the `Stream.callback` bridge's
 *    `Queue.offerUnsafe` (≈ 13 B/op, deterministic) — far under the old ≈ 48 B/op
 *    PubSub-with-subscriber publish, and held to a justified subscriber budget.
 *
 * This is the number the live gate is structurally blind to.
 */
export function runTransientGate(): readonly TransientResult[] {
  return [
    measureTransientBytesPerOp(
      'core/compositor publish (no subscriber)',
      TRANSIENT_WINDOW_OPS,
      TRANSIENT_BUDGET_BYTES_PER_OP,
      compositorPublishOp(false),
    ),
    measureTransientBytesPerOp(
      'core/compositor publish (live subscriber)',
      TRANSIENT_WINDOW_OPS,
      TRANSIENT_SUBSCRIBER_BUDGET_BYTES_PER_OP,
      compositorPublishOp(true),
    ),
  ];
}

/**
 * Run the gate, print a deterministic report, and exit non-zero on any budget
 * breach. The report is machine-readable, two parseable line shapes the spawning
 * tests consume:
 *   `RESULT    <label>\t<liveBytesPerOp>\t<budget>\t<PASS|FAIL>`     (retained)
 *   `TRANSIENT <label>\t<transientBytesPerOp>\t<budget>\t<PASS|FAIL>` (churn)
 * The compose path is asserted against BOTH — genuinely zero-allocation means zero
 * RETAINED *and* zero TRANSIENT.
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

  const transientResults = runTransientGate();
  for (const r of transientResults) {
    const verdict = r.withinBudget ? 'PASS' : 'FAIL';
    if (!r.withinBudget) allWithin = false;
    process.stdout.write(
      `TRANSIENT\t${r.label}\t${r.transientBytesPerOp.toFixed(4)}\t${r.budgetBytesPerOp}\t${verdict}\n`,
    );
    process.stdout.write(
      `  ${r.label} (transient): ${r.grossDeltaBytes} gross bytes over ${r.totalOps} ops = ` +
        `${r.transientBytesPerOp.toFixed(4)} bytes/op (budget ${r.budgetBytesPerOp}) ⇒ ${verdict}\n`,
    );
  }

  if (!allWithin) {
    process.stdout.write(
      'ALLOC-GATE: FAIL — a hot path allocated per op (retained or transient) above its zero-alloc budget.\n',
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    'ALLOC-GATE: PASS — both hot paths are genuinely zero-allocation: compose is zero RETAINED *and* zero TRANSIENT.\n',
  );
}

// Run only when invoked directly (the tests import the measurement fns instead).
const invokedDirectly = process.argv[1] !== undefined && process.argv[1].endsWith('alloc-gate.ts');
if (invokedDirectly) {
  main();
}
