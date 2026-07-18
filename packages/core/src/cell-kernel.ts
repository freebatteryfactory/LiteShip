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
 * DIVERGENCE BY DESIGN — the mid-fan-out membership law differs per constructor,
 * because {@link replay1} is the compositor's EXTRACTION TARGET (Wave 2 swaps
 * compositor.ts onto it, so it must match byte-for-byte) whereas {@link fanout}
 * models unbounded-PubSub fidelity where a late subscriber never sees an
 * in-flight publish:
 *  - {@link replay1} fans out over the LIVE registration set — exactly
 *    compositor.ts:241-246's `for (const notify of changeListeners) notify(state)`.
 *    A subscriber ADDED mid-fan-out (from within a sink) RECEIVES the in-flight
 *    value; one REMOVED mid-fan-out before the cursor reaches it is skipped.
 *  - {@link fanout} fans out over a membership SNAPSHOT taken at fan-out start.
 *    A subscriber ADDED mid-fan-out MISSES the in-flight value; one REMOVED
 *    mid-fan-out is skipped (membership re-checked before each delivery).
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

/** A distinct registration per subscribe call — so one sink object can subscribe twice. */
interface Registration<T> {
  readonly sink: CellSink<T>;
}

const normalize = <T>(subscriber: CellSubscriber<T>): CellSink<T> =>
  typeof subscriber === 'function' ? { next: subscriber } : subscriber;

/**
 * The listener substrate both constructors share: an insertion-ordered
 * registration set, a complete-once close, and the two fan-out disciplines the
 * constructors pick between (LIVE for replay1, SNAPSHOT for fanout — see the
 * divergence-by-design note in the module doc).
 */
function createCore<T>() {
  const registrations = new Set<Registration<T>>();
  let closed = false;

  // LIVE-Set fan-out (replay1): iterate the registration set directly, mirroring
  // compositor.ts:241-246 byte-for-byte. A subscriber ADDED mid-fan-out sits
  // after the cursor and IS delivered the in-flight value; one REMOVED before
  // the cursor reaches it is skipped (the Set iterator reflects live mutation).
  const fanOutLive = (value: T): void => {
    for (const registration of registrations) registration.sink.next(value);
  };

  // SNAPSHOT fan-out (fanout): freeze membership at fan-out start so a subscribe
  // mid-fan-out is NOT delivered the in-flight value; re-check membership so a
  // dispose mid-fan-out is skipped.
  const fanOutSnapshot = (value: T): void => {
    for (const registration of [...registrations]) {
      if (registrations.has(registration)) registration.sink.next(value);
    }
  };

  const register = (sink: CellSink<T>): Disposer => {
    const registration: Registration<T> = { sink };
    registrations.add(registration);
    return () => {
      registrations.delete(registration);
    };
  };

  const close = (): void => {
    if (closed) return;
    closed = true;
    // Detach before completing so a reentrant publish/subscribe from within a
    // complete callback sees the closed, empty state.
    const snapshot = [...registrations];
    registrations.clear();
    for (const registration of snapshot) registration.sink.complete?.();
  };

  return {
    registrations,
    fanOutLive,
    fanOutSnapshot,
    register,
    close,
    isClosed: (): boolean => closed,
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
  // LIVE-Set fan-out (compositor.ts:241-246 parity — zero allocation). Under
  // {distinct} a consecutive-equal value is NOT fanned out (the slot already
  // advanced in `publish`).
  const emit = (value: T): void => {
    if (policy.kind === 'distinct') {
      if (lastEmitted !== undefined && policy.equals(lastEmitted.value, value)) return;
      lastEmitted = { value };
    }
    core.fanOutLive(value);
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
        // then fans out breadth-first — every subscriber sees one total order.
        if (inFanOut) {
          pending.push({ value });
          return;
        }
        inFanOut = true;
        emit(value);
        while (pending.length > 0) {
          const next = pending.shift();
          if (next !== undefined) emit(next.value);
        }
        inFanOut = false;
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
      return core.registrations.size;
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
      // SNAPSHOT fan-out — late/mid-fan-out subscribers miss the in-flight value
      // (unbounded-PubSub fidelity).
      core.fanOutSnapshot(value);
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
      return core.registrations.size;
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
