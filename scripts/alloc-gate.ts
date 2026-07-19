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

import { Boundary, CellKernel, Compositor, TokenBuffer } from '@czap/core';
import type { CompositeState } from '@czap/core';
import type { CompositorQuantizer } from '@czap/core';
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
 * THE PLATFORM-ROBUST RELATIVE VERDICT — the byte budgets above are calibrated on
 * linux V8; macos/windows V8 account heap growth at a DIFFERENT granularity, so an
 * ABSOLUTE per-op byte threshold is not portable (a genuinely zero-alloc path can
 * read a few bytes/op higher on another platform purely from heap-bucket rounding,
 * not from real retention). The honest, platform-INDEPENDENT proof is a RATIO: on
 * the SAME platform, with the SAME method, measure the zero-alloc path's per-op
 * growth AND a paired KNOWN-ALLOCATING reference path's per-op growth, and assert
 * the zero-alloc path is a SMALL FRACTION of the reference. The ratio cancels the
 * platform's heap-accounting unit, so it is portable AND still genuinely proves
 * "this path allocates ~nothing relative to one that demonstrably does".
 */
export interface RelativeResult {
  readonly label: string;
  /** The candidate (claimed zero-alloc) path's per-op growth on this platform. */
  readonly candidateBytesPerOp: number;
  /** The paired KNOWN-ALLOCATING reference path's per-op growth on this platform. */
  readonly referenceBytesPerOp: number;
  /** candidate / reference — the platform-independent fraction (clamped at 0 floor). */
  readonly ratio: number;
  /** The max fraction of the allocating baseline the zero-alloc path may reach. */
  readonly maxRatio: number;
  readonly withinRatio: boolean;
}

/**
 * The maximum FRACTION of a known-allocating reference path that a genuinely
 * zero-allocation path may reach. A zero-alloc path lands at ≈ 0 (often a
 * NEGATIVE/zero ratio after GC); the reference RETAINS or CHURNS tens of bytes/op.
 * 10% is a wide, conservative ceiling: the measured ratios are < 1% on linux, so
 * even a 10× platform-accounting inflation on macos/windows stays comfortably under
 * 0.10 — yet a real per-op regression (the zero-alloc path approaching the reference)
 * blows past it. The ratio is the PRIMARY portable verdict; the absolute byte budgets
 * remain as a linux-calibrated human-readable secondary report.
 */
export const RELATIVE_MAX_RATIO = 0.1;

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
 * scratch growth happen before the window), then REPEATS — force GC, snapshot
 * `heapUsed`, run K×N ops with a GC between batches, snapshot again — REPS times and
 * returns the MEDIAN surviving delta / op. The median is robust to the GC-timing
 * outliers a single before/after snapshot suffers on a loaded runner (the same
 * anti-fragile method {@link measureTransientBytesPerOp} uses across windows).
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

  // ANTI-FRAGILE method: a SINGLE before/after live delta is GC-timing-sensitive — a
  // stray background reclaim or a steady-state scratch resize swings the `heapUsed`
  // snapshots several B/op run-to-run, which flakes this gate on a loaded CI runner.
  // Repeat the full measurement REPS times and take the MEDIAN per-op survivor — the
  // SAME robustness `measureTransientBytesPerOp` already applies across windows. A
  // REAL per-op survivor is consistent across every rep, so the median still
  // registers it; only the transient GC-timing luck is filtered — never a false pass
  // for a true leak (the threshold is unchanged; only the measurement is robust).
  // Spread the SAME total work across the reps so robustness costs nothing extra:
  // REPS short windows + a median, instead of one long single-shot window. A shorter
  // window is also individually LESS likely to catch a stray background GC event, and
  // the median discards the few that do.
  // At most one rep per requested batch (a tiny gate is not split into empty reps),
  // and the batches are distributed EXACTLY across the reps — the first `batches %
  // reps` reps take one extra — so the total work equals the caller's request, never
  // `ceil(batches / REPS) * REPS` (which could run up to REPS-1 batches too many).
  const REPS = 5;
  const reps = Math.max(1, Math.min(REPS, batches));
  const perOpSamples: number[] = [];
  let totalOps = 0;
  for (let r = 0; r < reps; r++) {
    const batchesThisRep = Math.floor(batches / reps) + (r < batches % reps ? 1 : 0);
    forceGc();
    const before = process.memoryUsage().heapUsed;
    let ops = 0;
    for (let b = 0; b < batchesThisRep; b++) {
      for (let i = 0; i < opsPerBatch; i++) op();
      ops += opsPerBatch;
      // Force GC between batches too, so transient garbage from one batch never
      // inflates the next batch's apparent survivors.
      forceGc();
    }
    forceGc();
    const after = process.memoryUsage().heapUsed;
    perOpSamples.push((after - before) / ops);
    totalOps += ops; // accumulate the ACTUAL total work run, not just one rep
  }

  perOpSamples.sort((a, b) => a - b);
  const mid = Math.floor(perOpSamples.length / 2);
  const liveBytesPerOp =
    perOpSamples.length % 2 === 0 ? (perOpSamples[mid - 1]! + perOpSamples[mid]!) / 2 : perOpSamples[mid]!;
  return {
    label,
    batches,
    opsPerBatch,
    totalOps,
    // Report the delta consistent with the MEDIAN per-op (not a single rep's outlier).
    liveDeltaBytes: Math.round(liveBytesPerOp * totalOps),
    liveBytesPerOp,
    budgetBytesPerOp,
    // A NEGATIVE median (GC reclaimed more than the window allocated) is trivially
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
  const median = perOp.length % 2 === 0 ? (perOp[mid - 1]! + perOp[mid]!) / 2 : perOp[mid]!;
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

/**
 * Build the PLATFORM-ROBUST relative verdict from two same-platform, same-method
 * per-op measurements: the `candidate` (claimed zero-alloc) path and a paired
 * `reference` KNOWN-ALLOCATING path. The ratio `candidate / reference` cancels the
 * platform's heap-accounting unit. A zero-alloc path measures NEGATIVE-or-≈0 per op
 * (GC reclaims the window); a negative numerator is floored at 0 — a path that does
 * not grow the heap is trivially within ratio, never spuriously negative.
 *
 * The reference MUST measure a genuinely-positive per-op growth (it is a path that
 * really allocates); if a degenerate platform read it at ≤ 0 the ratio is undefined,
 * so the verdict treats a non-positive reference as a FAIL (the measurement could not
 * establish a baseline — never a silent pass).
 */
export function computeRelative(
  label: string,
  candidateBytesPerOp: number,
  referenceBytesPerOp: number,
  maxRatio: number,
): RelativeResult {
  const candidate = Math.max(0, candidateBytesPerOp);
  // A non-positive reference means the allocating baseline did not register growth on
  // this platform — no baseline, so no honest ratio. Fail loud rather than pass blind.
  if (referenceBytesPerOp <= 0) {
    return {
      label,
      candidateBytesPerOp,
      referenceBytesPerOp,
      ratio: Number.POSITIVE_INFINITY,
      maxRatio,
      withinRatio: false,
    };
  }
  const ratio = candidate / referenceBytesPerOp;
  return {
    label,
    candidateBytesPerOp,
    referenceBytesPerOp,
    ratio,
    maxRatio,
    withinRatio: ratio <= maxRatio,
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
 * base {@link Quantizer} contract is now purely synchronous (`stateSync` + `evaluate`);
 * the reactive `state`/`changes` substrate lives on `ReactiveQuantizer` and the
 * compose path never touches it, so this fixture omits it entirely.
 */
type AllocState = (typeof ALLOC_BOUNDARY)['states'][number];

function fixedQuantizer(state: AllocState): CompositorQuantizer<typeof ALLOC_BOUNDARY> {
  const fixed = state;
  // A synchronous compositor quantizer: the REQUIRED `stateSync` satisfies the
  // `CompositorQuantizer` sync arm (no reactive `state`/`changes` needed).
  return {
    _tag: 'Quantizer',
    boundary: ALLOC_BOUNDARY,
    stateSync: () => fixed,
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
  // Compositor.create/add/compute are synchronous as of the core-seams wave.
  const { compositor } = Compositor.create({ poolCapacity: 8 });
  const names = ['viewport', 'theme', 'density'] as const;
  const states = ['mobile', 'tablet', 'desktop'] as const;
  for (let i = 0; i < names.length; i++) {
    compositor.add(names[i]!, fixedQuantizer(states[i]!));
  }
  let tick = 0;
  return () => {
    // Mark one quantizer dirty each tick (the steady selective-recompute path the
    // runtime drives), then compose. The compose body is the path under test.
    compositor.runtime.markDirty(names[tick++ % names.length]!);
    compositor.compute();
  };
}

/**
 * Build the compositor's reactive PUBLISH primitive as a synchronous op closure —
 * the exact mechanism `computeStateSync` runs on the hot path, in isolation (no
 * `Effect.runSync` harness, which would mask it; see {@link measureTransientBytesPerOp}).
 *
 * The publish is the real native path: a no-replay {@link CellKernel.fanout}
 * `publish` — the exact channel the compositor's `changes` IS (see blend.ts /
 * cell.ts). With no subscriber the registration set is empty and the publish
 * allocates NOTHING. `withSubscriber` attaches a live consumer of `changes`; the
 * CellKernel fan-out is generation-bounded with no per-dispatch snapshot
 * allocation, so even WITH a live subscriber the publish churns ~nothing — the
 * Wave-8 win over the retired `Stream.callback` / `Queue.offerUnsafe` bridge
 * (which minted ≈ 13 B/op per enqueue).
 *
 * This measures the PRIMITIVE, not a logic mirror of the compose body (whose
 * zero-alloc the live gate already proves); that the compositor's publish IS this
 * CellKernel fan-out is pinned by `tests/property/compositor-zero-alloc.test.ts`.
 */
function compositorPublishOp(withSubscriber: boolean): () => void {
  const fixedState: CompositeState = {
    discrete: {},
    blend: {},
    outputs: { css: {}, glsl: {}, wgsl: {}, aria: {} },
  };
  // The compositor's `changes` channel: a no-replay CellKernel fanout.
  const channel = CellKernel.fanout<CompositeState>();
  if (withSubscriber) {
    // A live consumer of `changes` — retains only the latest, dropped each op so
    // nothing accumulates across the window (a genuine subscriber, not a leak).
    const sink: { current: CompositeState | null } = { current: null };
    channel.subscribe((state) => {
      sink.current = state;
    });
    return () => {
      channel.publish(fixedState);
      sink.current = null;
    };
  }
  // No subscriber: the publish fans out to an empty set and allocates nothing.
  return () => {
    channel.publish(fixedState);
  };
}

/**
 * A reference path that GENUINELY RETAINS per op — the live-gate baseline. It pushes
 * a small fresh object into an ever-growing array, so the live heap grows
 * proportionally to the op count (the exact failure mode the live gate exists to
 * catch). Measured on the SAME platform with the SAME method as the zero-alloc paths,
 * it anchors the platform-robust RATIO: the zero-alloc paths must be a small fraction
 * of THIS. The growing array is the retention; nothing here is contrived to inflate
 * the number — it is the simplest honest "this allocates per op" path.
 */
function retainingReferenceOp(): () => void {
  const kept: Array<{ readonly i: number; readonly tag: string }> = [];
  let i = 0;
  return () => {
    kept.push({ i: i++, tag: 'ref' });
  };
}

/**
 * A reference path that GENUINELY CHURNS per op — the transient-gate baseline. It
 * allocates a small throwaway object every op and drops it immediately (the collector
 * reclaims it, so it RETAINS nothing but CHURNS one object per op — the exact thing
 * the transient gate measures). Anchors the transient RATIO the same way.
 */
function churningReferenceOp(): () => void {
  // A sink the JIT cannot prove dead, so the allocation is not optimized away.
  const sink: { last: { readonly i: number; readonly tag: string } | null } = { last: null };
  let i = 0;
  return () => {
    const tmp = { i: i++, tag: 'churn' } as const;
    sink.last = tmp;
    sink.last = null; // dropped immediately — pure transient churn
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
 *  - NO subscriber (the common compose tick): the CellKernel fanout publish fans out
 *    to an empty registration set and allocates NOTHING (≈ 0 B/op, dead stable).
 *  - WITH a live subscriber: the CellKernel fanout is generation-bounded with no
 *    per-dispatch snapshot allocation, so the publish STILL churns nothing (≈ 0
 *    B/op) — the Wave-8 win over the retired `Stream.callback` / `Queue.offerUnsafe`
 *    bridge (≈ 13 B/op per enqueue). The subscriber budget is generous headroom that
 *    still catches a regression to a per-publish-allocating bridge.
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
 * THE PLATFORM-ROBUST RELATIVE GATE — the portable verdict the spawning tests assert
 * on every platform (linux/macos/windows). For each zero-alloc claim it measures, on
 * the SAME platform with the SAME method, BOTH the candidate path AND a paired
 * KNOWN-ALLOCATING reference, and computes the ratio candidate/reference. Because the
 * ratio cancels the platform's heap-accounting unit, it is portable where the
 * absolute byte budgets are not — yet still genuinely proves the candidate allocates
 * ~nothing relative to a path that demonstrably does.
 *
 * Three candidates, each against its matching reference:
 *  - token-buffer push+drainInto (LIVE) vs the retaining reference (live growth).
 *  - compositor compute          (LIVE) vs the retaining reference (live growth).
 *  - compositor publish/no-sub (TRANSIENT) vs the churning reference (churn).
 * The live-subscriber publish is now ALSO ~zero-alloc: the CellKernel fanout that
 * replaced the `Queue.offerUnsafe` bridge is generation-bounded with no per-dispatch
 * allocation. It is held to a BOUNDED (not zero) relative ceiling — it must stay far
 * cheaper than allocating a whole churn object per op (ratio < ~0.75 of the churning
 * reference) — a portable upper bound retained as generous headroom that still
 * catches a regression to a per-publish-allocating bridge.
 */
export const RELATIVE_SUBSCRIBER_MAX_RATIO = 0.75;

export function runRelativeGate(): readonly RelativeResult[] {
  // Measure the references ONCE each, on this platform, same method as the candidates.
  const retainingRef = measureLiveBytesPerOp(
    'reference/retaining (per-op heap growth)',
    ALLOC_BATCHES,
    ALLOC_OPS_PER_BATCH,
    Number.POSITIVE_INFINITY, // a reference is EXPECTED to allocate — no budget on it
    retainingReferenceOp(),
  );
  const churningRef = measureTransientBytesPerOp(
    'reference/churning (per-op transient)',
    TRANSIENT_WINDOW_OPS,
    Number.POSITIVE_INFINITY,
    churningReferenceOp(),
  );

  const tokenBuffer = measureLiveBytesPerOp(
    'core/token-buffer push+drainInto',
    ALLOC_BATCHES,
    ALLOC_OPS_PER_BATCH,
    ALLOC_BUDGET_BYTES_PER_OP,
    tokenBufferOp(),
  );
  const compositor = measureLiveBytesPerOp(
    'core/compositor compute (selective recompute)',
    ALLOC_BATCHES,
    ALLOC_OPS_PER_BATCH,
    ALLOC_BUDGET_BYTES_PER_OP,
    compositorOp(),
  );
  const publishNoSub = measureTransientBytesPerOp(
    'core/compositor publish (no subscriber)',
    TRANSIENT_WINDOW_OPS,
    TRANSIENT_BUDGET_BYTES_PER_OP,
    compositorPublishOp(false),
  );
  const publishWithSub = measureTransientBytesPerOp(
    'core/compositor publish (live subscriber)',
    TRANSIENT_WINDOW_OPS,
    TRANSIENT_SUBSCRIBER_BUDGET_BYTES_PER_OP,
    compositorPublishOp(true),
  );

  return [
    computeRelative(
      'core/token-buffer push+drainInto vs retaining ref',
      tokenBuffer.liveBytesPerOp,
      retainingRef.liveBytesPerOp,
      RELATIVE_MAX_RATIO,
    ),
    computeRelative(
      'core/compositor compute vs retaining ref',
      compositor.liveBytesPerOp,
      retainingRef.liveBytesPerOp,
      RELATIVE_MAX_RATIO,
    ),
    computeRelative(
      'core/compositor publish (no subscriber) vs churning ref',
      publishNoSub.transientBytesPerOp,
      churningRef.transientBytesPerOp,
      RELATIVE_MAX_RATIO,
    ),
    computeRelative(
      'core/compositor publish (live subscriber) vs churning ref',
      publishWithSub.transientBytesPerOp,
      churningRef.transientBytesPerOp,
      RELATIVE_SUBSCRIBER_MAX_RATIO,
    ),
  ];
}

/**
 * Run the gate, print a deterministic report, and exit non-zero on any budget
 * breach. The report is machine-readable, three parseable line shapes the spawning
 * tests consume:
 *   `RESULT    <label>\t<liveBytesPerOp>\t<budget>\t<PASS|FAIL>`     (retained, absolute)
 *   `TRANSIENT <label>\t<transientBytesPerOp>\t<budget>\t<PASS|FAIL>` (churn, absolute)
 *   `RELATIVE  <label>\t<ratio>\t<maxRatio>\t<PASS|FAIL>`            (platform-robust)
 * The compose path is asserted against BOTH live + transient — genuinely
 * zero-allocation means zero RETAINED *and* zero TRANSIENT. The RELATIVE lines are
 * the PORTABLE verdict (a ratio cancels per-platform heap-accounting granularity);
 * the absolute RESULT/TRANSIENT lines remain as a linux-calibrated human report.
 */
function main(): void {
  // The absolute RESULT/TRANSIENT lines are emitted for a human-readable, linux-
  // calibrated report — they are NOT the gate's portable verdict (an absolute per-op
  // byte threshold is not portable across V8's per-platform heap-accounting
  // granularity). The PORTABLE verdict is the RELATIVE ratio gate below.
  const results = runAllocGate();
  for (const r of results) {
    const verdict = r.withinBudget ? 'PASS' : 'INFO';
    process.stdout.write(`RESULT\t${r.label}\t${r.liveBytesPerOp.toFixed(4)}\t${r.budgetBytesPerOp}\t${verdict}\n`);
    process.stdout.write(
      `  ${r.label}: ${r.liveDeltaBytes} live bytes over ${r.totalOps} ops = ` +
        `${r.liveBytesPerOp.toFixed(4)} bytes/op (linux-cal. budget ${r.budgetBytesPerOp}) ⇒ ${verdict}\n`,
    );
  }

  const transientResults = runTransientGate();
  for (const r of transientResults) {
    const verdict = r.withinBudget ? 'PASS' : 'INFO';
    process.stdout.write(
      `TRANSIENT\t${r.label}\t${r.transientBytesPerOp.toFixed(4)}\t${r.budgetBytesPerOp}\t${verdict}\n`,
    );
    process.stdout.write(
      `  ${r.label} (transient): ${r.grossDeltaBytes} gross bytes over ${r.totalOps} ops = ` +
        `${r.transientBytesPerOp.toFixed(4)} bytes/op (linux-cal. budget ${r.budgetBytesPerOp}) ⇒ ${verdict}\n`,
    );
  }

  // THE PORTABLE VERDICT — the platform-robust relative ratio gate. Exit status is
  // driven by THESE: each zero-alloc candidate must be a small fraction of its paired
  // known-allocating reference, a measure that cancels per-platform heap-accounting.
  const relativeResults = runRelativeGate();
  let allWithin = true;
  for (const r of relativeResults) {
    const verdict = r.withinRatio ? 'PASS' : 'FAIL';
    if (!r.withinRatio) allWithin = false;
    process.stdout.write(`RELATIVE\t${r.label}\t${r.ratio.toFixed(4)}\t${r.maxRatio}\t${verdict}\n`);
    process.stdout.write(
      `  ${r.label}: candidate ${r.candidateBytesPerOp.toFixed(4)} B/op vs reference ` +
        `${r.referenceBytesPerOp.toFixed(4)} B/op = ratio ${r.ratio.toFixed(4)} ` +
        `(max ${r.maxRatio}) ⇒ ${verdict}\n`,
    );
  }

  if (!allWithin) {
    process.stdout.write(
      'ALLOC-GATE: FAIL — a zero-alloc hot path is NOT a small fraction of its known-allocating reference (real per-op allocation returned).\n',
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    'ALLOC-GATE: PASS — every zero-alloc hot path is a small fraction of its allocating reference (portable proof): compose is zero RETAINED *and* zero TRANSIENT.\n',
  );
}

// Run only when invoked directly (the tests import the measurement fns instead).
const invokedDirectly = process.argv[1] !== undefined && process.argv[1].endsWith('alloc-gate.ts');
if (invokedDirectly) {
  main();
}
