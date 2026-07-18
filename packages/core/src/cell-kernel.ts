/**
 * CellKernel — the shared replay-current / fan-out substrate.
 *
 * Two constructors extracted from the compositor's reactive notification seam
 * (compositor.ts:231-246, the source of truth): a current-value slot plus a
 * synchronous listener set — publish assigns the slot, then notifies each
 * listener in one synchronous pass, with no `Effect`/PubSub node per publish.
 *
 *  - {@link replay1}: current-value slot + synchronous fan-out. A new subscriber
 *    is replayed the current value on subscribe (the `SubscriptionRef.changes`
 *    replay-1 contract Compositor.changes and Cell preserve).
 *  - {@link fanout}: the strictly-simpler no-replay channel (Zap / crossings /
 *    BlendTree.changes). Fire-and-forget publish; a late subscriber misses every
 *    prior value; close completes subscribers and never blocks.
 *
 * Pinned laws (tests/unit/core/cell-kernel.test.ts), holding for BOTH:
 *  - subscriber ordering: subscribers are notified in subscription order.
 *  - duplicate-value policy: every publish is delivered; equal consecutive
 *    values are NOT suppressed (no dedup — the raw compositor fan-out).
 *  - reentrancy: a publish issued from within a subscriber runs a full nested
 *    synchronous fan-out before the outer fan-out resumes.
 *  - disposer idempotence: the returned {@link Disposer} removes exactly one
 *    subscription — identical sink objects get distinct registrations, and a
 *    repeat call is a no-op.
 *  - close-completes: `close()` completes every subscriber's optional
 *    `complete` sink exactly once, synchronously (never blocks); afterwards
 *    publish is inert and subscribe completes immediately without registering.
 *
 * MEMBERSHIP LAW + REPLAY LAW (uniform across BOTH constructors; S6.1a ruling).
 * A cell is a sequence of committed states C0→C1→C2…, and each subscription has a
 * position in that sequence. Two orthogonal laws define delivery:
 *  - MEMBERSHIP: dispatch membership is bounded at the START of each committed
 *    emission. A subscriber ADDED mid-fan-out (from within a sink) is OUTSIDE that
 *    commit's dispatch and does NOT receive the in-flight value — it participates
 *    only in FUTURE commits. One REMOVED mid-fan-out before the cursor reaches it
 *    is skipped. This holds identically for {@link replay1} and {@link fanout}.
 *  - REPLAY: {@link replay1} replays the current committed slot exactly ONCE on
 *    subscribe (the `SubscriptionRef.changes` replay-1 contract); {@link fanout}
 *    does not replay. This is the SOLE difference between the two constructors.
 * Together they guarantee each subscription observes each committed emission AT
 * MOST ONCE. The earlier "replay1 fans out over the LIVE set" law was a
 * law-composition DEFECT: replay-on-subscribe and live-set iteration observed one
 * committed state TWICE for a mid-fan-out subscriber (a `[5,5,6]` double-spend the
 * Effect fibers' snapshot delivery had masked). The membership law retires it; the
 * compositor never depended on mid-fan-out in-flight delivery (no compositor test
 * subscribes during a publish), so its extraction is byte-faithful under this law.
 *
 * Realized by GENERATION-BOUNDED dispatch (no per-fan-out allocation): the fan-out
 * captures the registration-array length ONCE at the commit's start and iterates
 * `[0, limit)`, skipping inactive records; a subscribe appends BEYOND the limit
 * (unreached this commit), a dispose flips an `active` flag (skipped), and inactive
 * records are COMPACTED only after the outermost dispatch/drain unwinds — so the
 * compositor hot path stays ≈ 0 B/op.
 *
 * Effect-free by construction — the extraction that lets compositor/zap/blend/
 * live-cell shed their `effect` imports.
 *
 * TWO ADDITIVE POLICY AXES (Wave 6), orthogonal to the replay1/fanout mode axis.
 * Both default to the pinned laws above, so every existing caller — the Wave-2
 * compositor `replay1`, zap/blend/crossings `fanout` — is byte-for-byte unchanged:
 *  - {@link EmissionPolicy} `{all}` (default) | `{distinct, equals}` — whether a
 *    publish whose value equals the previous EMITTED value is suppressed. `{all}`
 *    is the pinned no-dedup law; `{distinct}` is Timeline's hand-rolled state
 *    dedup made a first-class, testable capability. A suppressed publish STILL
 *    advances the current slot (read consistency) — only the fan-out is skipped.
 *  - {@link ReentrancyPolicy} `'synchronous'` (default) | `'deferred'` — how a
 *    publish issued from WITHIN a fan-out is ordered. `'synchronous'` is the
 *    pinned I5 depth-first nested fan-out (compositor parity). `'deferred'` is
 *    the async-append (breadth-first / glitch-free) law Cell/Store adopt (Wave 6
 *    nested-write RULING — PRESERVE the captured Effect behavior): the nested
 *    publish is enqueued and fanned out after the active fan-out unwinds, so
 *    every subscriber observes the same total order and every live subscriber's
 *    terminal delivery equals `read()` (no stale-terminal glitch). It is realized
 *    SYNCHRONOUSLY (a re-entrancy guard + FIFO drain) — no microtask, no Effect —
 *    so the deferral is observable only in delivery ORDER, never in timing.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A teardown handle returned by `subscribe`. Idempotent — a repeat call is a no-op. */
export type Disposer = () => void;

/**
 * The emission policy — the third axis (dedup vs no-dedup), orthogonal to the
 * replay1/fanout mode. Mirrors the reference model's `EmissionPolicy`
 * (`tests/support/reactive-model.ts`) so the kernel and the differential oracle
 * speak the same axis.
 *  - `all`: deliver every publish (the pinned no-dedup law — compositor/zap).
 *  - `distinct`: suppress a publish whose value equals the previous EMITTED value
 *    under `equals`. The current slot still advances; only the fan-out is skipped.
 */
export type EmissionPolicy<T> =
  { readonly kind: 'all' } | { readonly kind: 'distinct'; readonly equals: (a: T, b: T) => boolean };

/**
 * How a publish issued from WITHIN a fan-out (a nested/re-entrant write) is
 * ordered relative to the outer fan-out.
 *  - `synchronous` (default): a full nested fan-out runs depth-first before the
 *    outer resumes — the pinned I5 law (compositor byte-parity).
 *  - `deferred`: the nested publish is enqueued and fanned out breadth-first
 *    after the active fan-out unwinds — the async-append / glitch-free law
 *    Cell/Store adopt (Wave 6 nested-write ruling). Realized synchronously.
 */
export type ReentrancyPolicy = 'synchronous' | 'deferred';

/** The default emission policy — no dedup. Shared so `replay1`/`fanout` allocate none per call. */
const EMIT_ALL = { kind: 'all' } as const;

/**
 * A subscription sink: a `next` value listener and an optional `complete`
 * callback invoked once when the kernel is closed.
 */
export interface CellSink<T> {
  readonly next: (value: T) => void;
  readonly complete?: () => void;
}

/** What `subscribe` accepts — a full {@link CellSink} or a bare value listener. */
export type CellSubscriber<T> = CellSink<T> | ((value: T) => void);

/** Live replay-1 kernel: a current-value slot with synchronous replay-on-subscribe. */
export interface CellReplayShape<T> {
  readonly _tag: 'CellReplay';
  /** The current value — the initial value until the first publish. Readable after close. */
  read(): T;
  /** Set the current value and fan it out to every subscriber. Inert after close. */
  publish(value: T): void;
  /** Replay the current value to `subscriber`, then register it. Returns its {@link Disposer}. */
  subscribe(subscriber: CellSubscriber<T>): Disposer;
  /** Complete every subscriber exactly once and mark the kernel closed. Idempotent. */
  close(): void;
  /** True once {@link close} has run. */
  readonly closed: boolean;
  /** Current subscriber count. */
  readonly size: number;
}

/** Live no-replay fan-out kernel: fire-and-forget publish, no current-value slot. */
export interface CellFanoutShape<T> {
  readonly _tag: 'CellFanout';
  /** Fan `value` out to every current subscriber. Late subscribers miss it. Inert after close. */
  publish(value: T): void;
  /** Register `subscriber` (no replay). Returns its {@link Disposer}. */
  subscribe(subscriber: CellSubscriber<T>): Disposer;
  /** Complete every subscriber exactly once and mark the kernel closed. Idempotent. */
  close(): void;
  /** True once {@link close} has run. */
  readonly closed: boolean;
  /** Current subscriber count. */
  readonly size: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * A distinct registration per subscribe call — so one sink object can subscribe
 * twice. `active` is the dispatch-snapshot liveness flag: a disposer flips it
 * false (never splicing the array mid-dispatch), and the fan-out + compaction skip
 * inactive records.
 */
interface Registration<T> {
  readonly sink: CellSink<T>;
  active: boolean;
}

const normalize = <T>(subscriber: CellSubscriber<T>): CellSink<T> =>
  typeof subscriber === 'function' ? { next: subscriber } : subscriber;

/**
 * The listener substrate both constructors share: an insertion-ordered
 * registration ARRAY, a complete-once close, and ONE generation-bounded fan-out
 * (the uniform DISPATCH-SNAPSHOT membership law — see the module doc). Replaces
 * the former per-constructor live/snapshot split: membership is now identical for
 * replay1 and fanout, differing only in the replay-on-subscribe the constructors
 * layer above this core.
 */
function createCore<T>() {
  // Insertion-ordered registrations. Append-only during a dispatch (a mid-fan-out
  // subscribe lands BEYOND the captured limit); a disposer flips `active` false;
  // inactive records are physically COMPACTED only when no dispatch is in flight.
  const registrations: Registration<T>[] = [];
  let activeCount = 0;
  // Depth of fan-out currently on the stack (nested/reentrant fan-outs stack it),
  // plus the deferred-drain bracket ({@link runBatch}). Compaction runs ONLY when
  // it returns to 0 — never mid-pass, which would shift indices under a live cursor.
  let dispatchDepth = 0;
  let needsCompaction = false;
  let closed = false;

  // Physically drop inactive records, preserving the order of the active ones.
  // Called only at dispatchDepth 0 (outside every fan-out and the deferred drain),
  // so no live cursor is indexing `registrations`.
  const compact = (): void => {
    needsCompaction = false;
    let w = 0;
    for (let r = 0; r < registrations.length; r++) {
      const reg = registrations[r];
      if (reg !== undefined && reg.active) registrations[w++] = reg;
    }
    registrations.length = w;
  };

  const maybeCompact = (): void => {
    if (dispatchDepth === 0 && needsCompaction) compact();
  };

  // GENERATION-BOUNDED fan-out (the uniform dispatch-snapshot membership law).
  // Capture the membership limit ONCE at the commit's start: a subscribe issued
  // from within a sink appends beyond `limit` and is NOT reached by this commit
  // (it joins future commits); a record deactivated before the cursor reaches it
  // is skipped. Zero per-fan-out allocation — no membership array copy.
  const fanOut = (value: T): void => {
    dispatchDepth++;
    const limit = registrations.length;
    // EXCEPTION-SAFE: a sink whose `next` throws must NOT leak `dispatchDepth` — a
    // leaked depth wedges compaction forever (and, in the replay1 deferred wrapper,
    // the `inFanOut` latch). The throw still PROPAGATES to the publisher (fail-fast:
    // the kernel does not swallow a sink fault or isolate it per-subscriber — that is
    // a deliberate delivery-semantics choice left to a follow-up); the invariants are
    // simply restored so ONE faulty listener cannot corrupt the channel.
    try {
      for (let i = 0; i < limit; i++) {
        const registration = registrations[i];
        if (registration !== undefined && registration.active) registration.sink.next(value);
      }
    } finally {
      dispatchDepth--;
      maybeCompact();
    }
  };

  // Run a multi-emit batch (the replay1 deferred-drain) as ONE outermost dispatch
  // so compaction is deferred until the whole drain unwinds ("after the outermost
  // deferred drain, not inside publication" — S6.1a).
  const runBatch = (fn: () => void): void => {
    dispatchDepth++;
    try {
      fn();
    } finally {
      dispatchDepth--;
      maybeCompact();
    }
  };

  const register = (sink: CellSink<T>): Disposer => {
    const registration: Registration<T> = { sink, active: true };
    registrations.push(registration);
    activeCount += 1;
    return () => {
      if (!registration.active) return;
      registration.active = false;
      activeCount -= 1;
      // Defer physical removal until no fan-out is in flight; outside a dispatch,
      // reclaim now. The closure holds the record object (not an index), so it stays
      // correct across a compaction that shifts the array.
      if (dispatchDepth === 0) compact();
      else needsCompaction = true;
    };
  };

  const close = (): void => {
    if (closed) return;
    closed = true;
    // Detach before completing so a reentrant publish/subscribe from within a
    // complete callback sees the closed, empty state.
    const live = registrations.filter((r) => r.active);
    registrations.length = 0;
    activeCount = 0;
    // SINK-ERROR LAW (terminal completeness). Unlike `fanOut` (value delivery,
    // fail-fast), `close` is teardown: EVERY sink must be completed exactly once
    // even when some `complete` callbacks throw — a teardown that skipped the rest
    // of its subscribers on the first fault would leak them (they never learn the
    // stream ended). So faults are captured, all sinks are completed, and the FIRST
    // fault is rethrown AFTER the pass — the closer still observes the failure
    // without the completeness invariant being sacrificed to it.
    let firstFault: { readonly error: unknown } | undefined;
    for (const registration of live) {
      try {
        registration.sink.complete?.();
      } catch (error) {
        if (firstFault === undefined) firstFault = { error };
      }
    }
    if (firstFault !== undefined) throw firstFault.error;
  };

  return {
    fanOut,
    runBatch,
    register,
    close,
    isClosed: (): boolean => closed,
    size: (): number => activeCount,
  };
}

const NOOP_DISPOSER: Disposer = () => undefined;

function replay1<T>(
  initial: T,
  policy: EmissionPolicy<T> = EMIT_ALL,
  reentrancy: ReentrancyPolicy = 'synchronous',
): CellReplayShape<T> {
  const core = createCore<T>();
  let current = initial;
  // {distinct} tracks the last FANNED-OUT value, boxed so an `undefined`-typed T
  // stays unambiguous. NEVER allocated on the {all} default (the compositor hot
  // path): the `emit` branch below skips it entirely.
  let lastEmitted: { readonly value: T } | undefined;
  // {deferred} async-append state: a publish issued from within an active fan-out
  // is enqueued here and drained FIFO after the fan-out unwinds (breadth-first).
  let inFanOut = false;
  const pending: { readonly value: T }[] = [];

  // Fan `value` out now, honoring the emission policy. Under {all} this is a raw
  // generation-bounded fan-out (dispatch-snapshot membership — zero allocation).
  // Under {distinct} a consecutive-equal value is NOT fanned out (the slot already
  // advanced in `publish`).
  const emit = (value: T): void => {
    if (policy.kind === 'distinct') {
      if (lastEmitted !== undefined && policy.equals(lastEmitted.value, value)) return;
      lastEmitted = { value };
    }
    core.fanOut(value);
  };

  return {
    _tag: 'CellReplay',
    read: () => current,
    publish: (value) => {
      if (core.isClosed()) return;
      // The current-value slot always tracks the latest publish (read
      // consistency), even when the emission is suppressed ({distinct}) or the
      // fan-out is deferred ({deferred}).
      current = value;
      if (reentrancy === 'deferred') {
        // async-append: a nested publish waits for the active fan-out to unwind,
        // then fans out breadth-first — every subscriber sees one total order. The
        // whole drain runs as one outermost dispatch (runBatch) so a dispose during
        // it is compacted only after the drain fully unwinds.
        if (inFanOut) {
          pending.push({ value });
          return;
        }
        inFanOut = true;
        // EXCEPTION-SAFE: if a sink throws mid-drain the latch MUST reset, else every
        // future publish buffers into `pending` and never drains — the channel wedges
        // permanently after one faulty listener. The throw propagates (fail-fast); the
        // aborted batch's undelivered follow-ups are dropped so the kernel returns to a
        // clean idle state rather than draining them out of order on the next publish.
        try {
          core.runBatch(() => {
            emit(value);
            while (pending.length > 0) {
              const next = pending.shift();
              if (next !== undefined) emit(next.value);
            }
          });
        } finally {
          inFanOut = false;
          pending.length = 0;
        }
        return;
      }
      // synchronous (default): a nested publish recurses depth-first through
      // `emit` → fanOutLive → sink → publish — the pinned I5 reentrancy law.
      emit(value);
    },
    subscribe: (subscriber) => {
      const sink = normalize(subscriber);
      if (core.isClosed()) {
        sink.complete?.();
        return NOOP_DISPOSER;
      }
      // Replay before registering (compositor ordering): the just-attached sink
      // is not re-delivered a value published from within its own replay.
      sink.next(current);
      return core.register(sink);
    },
    close: core.close,
    get closed() {
      return core.isClosed();
    },
    get size() {
      return core.size();
    },
  };
}

function fanout<T>(policy: EmissionPolicy<T> = EMIT_ALL): CellFanoutShape<T> {
  const core = createCore<T>();
  // {distinct} state — never allocated on the {all} default (zap/blend/crossings).
  let lastEmitted: { readonly value: T } | undefined;

  return {
    _tag: 'CellFanout',
    publish: (value) => {
      if (core.isClosed()) return;
      if (policy.kind === 'distinct') {
        if (lastEmitted !== undefined && policy.equals(lastEmitted.value, value)) return;
        lastEmitted = { value };
      }
      // Generation-bounded fan-out — a late/mid-fan-out subscriber is outside this
      // commit's dispatch membership and misses the in-flight value (it joins the
      // next commit); a disposed subscriber is skipped.
      core.fanOut(value);
    },
    subscribe: (subscriber) => {
      const sink = normalize(subscriber);
      if (core.isClosed()) {
        sink.complete?.();
        return NOOP_DISPOSER;
      }
      return core.register(sink);
    },
    close: core.close,
    get closed() {
      return core.isClosed();
    },
    get size() {
      return core.size();
    },
  };
}

// ---------------------------------------------------------------------------
// Namespace export (ADR-0001)
// ---------------------------------------------------------------------------

/**
 * CellKernel — the replay-current / fan-out reactive substrate. `replay1` mirrors
 * the compositor's replay-1 seam (current slot + replay-on-subscribe); `fanout`
 * is the strictly-simpler no-replay channel.
 */
export const CellKernel = {
  /**
   * Build a replay-1 kernel seeded with `initial`. `policy` defaults to `{all}`
   * (no dedup) and `reentrancy` to `'synchronous'` (the pinned I5 nested fan-out),
   * so `replay1(initial)` is byte-for-byte the compositor extraction target.
   */
  replay1,
  /** Build a no-replay fan-out kernel. `policy` defaults to `{all}` (no dedup). */
  fanout,
} as const;

export declare namespace CellKernel {
  /** Live replay-1 kernel — see {@link CellReplayShape}. */
  export type Replay<T> = CellReplayShape<T>;
  /** Live no-replay fan-out kernel — see {@link CellFanoutShape}. */
  export type Fanout<T> = CellFanoutShape<T>;
  /** A subscription sink — see {@link CellSink}. */
  export type Sink<T> = CellSink<T>;
  /** What `subscribe` accepts — see {@link CellSubscriber}. */
  export type Subscriber<T> = CellSubscriber<T>;
  /** The emission policy (dedup axis) — see the module-level {@link EmissionPolicy}. */
  export type Policy<T> = EmissionPolicy<T>;
  /** The reentrancy policy (nested-write axis) — see {@link ReentrancyPolicy}. */
  export type Reentrancy = ReentrancyPolicy;
}
