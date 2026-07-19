/**
 * reactive-model — the SINGLE ORACLE for the transition cage (Wave 5.5).
 *
 * A pure, deterministic reference model of the two reactive semantics the
 * fleet's primitives ride: the REPLAY-1 channel (Cell / Derived / Store /
 * Signal / Timeline-state / LiveCell-changes) and the NO-REPLAY fan-out channel
 * (LiveCell crossings). It is expressed as an `fc.commands` command set over a
 * closed operation vocabulary, plus a companion model of the `Lifetime` disposal
 * primitive the reactive primitives own.
 *
 * ── LS-001 / single-oracle discipline ──────────────────────────────────────
 * This model is DERIVED FROM the pinned law tables, not hand-authored as a
 * second spec that could drift from them:
 *
 *   - CellKernel laws  → `tests/unit/core/cell-kernel.test.ts`
 *                        (docblock `packages/core/src/cell-kernel.ts:16-45`).
 *   - Lifetime  laws   → `tests/unit/core/lifetime.test.ts`
 *                        (docblock `packages/core/src/lifetime.ts:19-31`).
 *
 * Every model invariant is a projection of one enumerated law-table entry (see
 * {@link LAW_COVERAGE}, the coverage rail). The model's own test proves it is
 * internally consistent by running it AGAINST the very SUTs those law tables
 * pin — `CellKernel` and `Lifetime` — so the projection cannot silently diverge
 * from the laws it claims to encode. Wave 6 then re-uses this same model as the
 * oracle the migrated CellKernel-backed primitives are checked against; the
 * current Effect-backed primitives are checked against it via the Foundation-A
 * capture harness.
 *
 * ── Op-vocabulary coordination (Foundation-A: reactive-trace.ts) ────────────
 * Foundation-A landed `tests/support/reactive-trace.ts` — the CANONICAL trace +
 * CBOR `traceDigest` owner. It is a PRIMITIVE-level vocabulary (it drives the
 * whole Cell/Signal/Timeline/LiveCell surface through its public API); this
 * module is the KERNEL-level LAW ORACLE (the replay1/fanout + Lifetime laws
 * I1-I8 / L1-L7 the primitives ride). Same `_tag` family for the shared core
 * ops; the two live at different altitudes ON PURPOSE. Integration reconciles
 * naming (the task's seam). The precise, load-bearing deltas so integration
 * wires — not re-transcribes — the two:
 *
 *   - subscribe: canonical field `sink` (+ `react?: ReactionSpec[]`, the DATA
 *     encoding of during-delivery behaviors 4/5/6) ↔ this file's `sub` (this
 *     model covers reentrancy/mid-fan-out I5/I6 IMPERATIVELY in its own test via
 *     the executable {@link ModelChannel}, not as op data).
 *   - update: canonical `transform: UpdateTransform` (add|mul|replace|identity,
 *     data — Axiom 1) ↔ this file's `delta` (a numeric convenience). Reconcile
 *     onto `reactive-trace.ts`'s `applyTransform`.
 *   - publishCrossing: canonical `{ from, to, value }` (boundary crossing) ↔
 *     this file's `{ value }` (the no-replay fan-out is agnostic to from/to —
 *     the crossing labels are a LiveCell concern above the kernel).
 *   - close/dispose: canonical has ONE teardown op, `dispose` (no `complete`),
 *     because the CURRENT impl couples scope-close→completion. This model keeps
 *     `complete` (kernel `close`, law I8) and `dispose` (Lifetime, L1-L7)
 *     SEPARATE — see the reported gap below; canonical `dispose` reconciles to
 *     `dispose ∘ complete` under the Wave-6 coupling.
 *   - Timeline/Signal control ops (`pause`/`resume`/`play`/`reverse`/`scrub`/
 *     `tick`): primitive-level, ABOVE this kernel oracle — not modelled here.
 *   - Observation: canonical is per-subscriber (`subscribers[]` sorted by sink)
 *     + reads/crossings/meta/finalValue/disposed ↔ this file's delivery-centric
 *     `deliveries[]`/`completions[]`/`closed`/`disposed` (inter-convertible:
 *     group deliveries by subscriber; `subscriberView` is the projection).
 *   - TraceValue: canonical `number|string|boolean|null` ↔ this file `number`
 *     (the numeric laws `cell-kernel.test.ts` pins). Widen at the seam if needed.
 *
 * These are DELIBERATELY NOT hard-imported here: both are still-settling Wave-5.5
 * foundation files, and integration (not this leaf) owns wiring them together.
 *
 * ── Reported gap (unpinned law — RECORD, do not fix; PRIME CONSTRAINT) ──────
 * The reactive `dispose` op is modelled as a `Lifetime` teardown (laws L1-L7).
 * Whether disposing a reactive primitive ALSO closes its underlying kernel (so
 * subscribers are completed) is the coupling "a Cell's Lifetime owns
 * `kernel.close` as a finalizer" — that composition is a Wave-6 CONSTRUCTION and
 * is NOT pinned by any current law table (CellKernel pins `close()`, Lifetime
 * pins finalizer semantics; neither pins the reactive primitive's ownership of
 * the close finalizer). The model therefore keeps `dispose` (Lifetime teardown)
 * and `complete` (kernel `close`) SEPARATE, and `dispose` has no reactive-channel
 * effect beyond the `disposed` flag. Foundation-A's capture of the CURRENT impl
 * will show scope-close DOES complete streams; that captured coupling is the
 * evidence Wave 6 pins into a product law (the differential oracle then checks
 * it). See `docs/plan/scar-ledger.md` (Wave 6 seed) / `remaining-waves.md`.
 *
 * TraceValue is `number` — exactly the value type the law-table tests exercise
 * (`cell-kernel.test.ts` drives numeric channels throughout). Richer value types
 * are Foundation-A's extension point and are not needed to project the laws.
 *
 * @module
 */

import fc from 'fast-check';
import { hasTag } from '@liteship/error';
import { CellKernel } from '../../packages/core/src/cell-kernel.js';
import type { Disposer } from '../../packages/core/src/cell-kernel.js';
import { Lifetime } from '../../packages/core/src/lifetime.js';
import type { LifetimeDisposeError } from '../../packages/core/src/lifetime.js';

// ===========================================================================
// § Operation vocabulary  (shape-coordinated with Foundation-A operation-trace)
// ===========================================================================

/** The value carried by the reactive channels under test. */
export type TraceValue = number;

/** The two reactive semantics the model projects. */
export type Channel = 'replay1' | 'fanout';

/**
 * The closed reactive-trace op vocabulary. `_tag` union coordinated by shape
 * with Foundation-A `operation-trace.ts`. `read`/`set`/`update` are replay-1
 * only; `publishCrossing` is fan-out only; `dispose`/`complete` apply to both.
 */
export type ReactiveOp =
  | { readonly _tag: 'subscribe'; readonly sub: string }
  | { readonly _tag: 'unsubscribe'; readonly sub: string }
  | { readonly _tag: 'read' }
  | { readonly _tag: 'set'; readonly value: TraceValue }
  | { readonly _tag: 'update'; readonly delta: TraceValue }
  | { readonly _tag: 'publishCrossing'; readonly value: TraceValue }
  | { readonly _tag: 'dispose' }
  | { readonly _tag: 'complete' };

/** A deterministic sequence of reactive ops. */
export type OpHistory = readonly ReactiveOp[];

// ===========================================================================
// § Emission policy  (the third axis — orthogonal to the replay/no-replay mode)
// ===========================================================================

/**
 * How a channel treats a publish whose value equals the previous emission.
 *
 * `all` is the LAW-PINNED behavior of both kernel constructors
 * (`cell-kernel.ts:18-19` — "every publish is delivered; equal consecutive
 * values are NOT suppressed"). `distinct` is a Wave-6 CAPABILITY the model
 * offers so the migration can DELIBERATELY choose an arm from the empirical
 * capture — it is NOT a claim that any current primitive dedups. That question
 * is answered only by Foundation-A capture, never here.
 */
export type EmissionPolicy =
  { readonly kind: 'all' } | { readonly kind: 'distinct'; readonly equals: (a: TraceValue, b: TraceValue) => boolean };

export const EmissionPolicies = {
  /** {all}: the pinned no-dedup law (I4). */
  all: (): EmissionPolicy => ({ kind: 'all' }),
  /** {distinct}: suppress equal-consecutive emissions. Wave-6 capability, not a current-behavior claim. */
  distinct: (equals: (a: TraceValue, b: TraceValue) => boolean = Object.is): EmissionPolicy => ({
    kind: 'distinct',
    equals,
  }),
} as const;

/**
 * The reentrancy policy — the Wave-6 nested-write axis, mirroring
 * `CellKernel.ReentrancyPolicy`. `synchronous` is the pinned I5 depth-first
 * nested fan-out (the raw kernel law + compositor parity); `deferred` is the
 * async-append (breadth-first / glitch-free) law Cell/Store adopt in Wave 6
 * (the RULING: PRESERVE the captured Effect behavior). The model carries both
 * arms so the differential oracle can assert Cell's async-append POSITIVELY —
 * Cell's channel config selects `deferred`, the compositor's stays `synchronous`.
 */
export type ReentrancyPolicy = 'synchronous' | 'deferred';

// ===========================================================================
// § Observation  (the canonical read of what a channel produced)
// ===========================================================================

/** One value delivery to one subscriber, in global fan-out order. */
export interface Delivery {
  readonly subscriber: string;
  readonly value: TraceValue;
}

/**
 * The canonical observable read of a channel over an {@link OpHistory}:
 * delivered values in order, per-subscriber sequence (derived via
 * {@link subscriberView}), completions in order, closed + disposed flags. This
 * is the byte-law currency the capture fixture and the differential oracle
 * speak (master-plan Law 2).
 */
export interface Observation {
  readonly channel: Channel;
  /** Every value delivery, in the exact order it fanned out (subscriber-visible sequence). */
  readonly deliveries: readonly Delivery[];
  /** Every `read()` result, in order (replay-1 only). */
  readonly reads: readonly TraceValue[];
  /** Subscriber ids completed, in completion order. */
  readonly completions: readonly string[];
  /** True once the channel was closed (`complete`). */
  readonly closed: boolean;
  /** True once the owning Lifetime was disposed (`dispose`). See the module gap note. */
  readonly disposed: boolean;
}

/** The per-subscriber delivered-value sequence — the "subscriber-visible sequence" view. */
export const subscriberView = (obs: Observation, sub: string): readonly TraceValue[] =>
  obs.deliveries.filter((d) => d.subscriber === sub).map((d) => d.value);

// ===========================================================================
// § The reference channel  (the executable projection of I1-I8)
// ===========================================================================

/** A subscription sink — mirrors {@link CellKernel}'s `CellSink`. */
export interface Sink {
  readonly next: (value: TraceValue) => void;
  readonly complete?: () => void;
}

/**
 * The minimal channel surface both the model reference and the {@link CellKernel}
 * adapter satisfy — so a single {@link Recorder} drives BOTH, and any divergence
 * is purely channel semantics, never recorder logic.
 */
export interface ChannelLike {
  readonly kind: Channel;
  /** Present on replay-1 only (the current-value slot). */
  readonly read?: () => TraceValue;
  readonly publish: (value: TraceValue) => void;
  readonly subscribe: (sink: Sink) => Disposer;
  readonly close: () => void;
  readonly closed: boolean;
}

const NOOP_DISPOSER: Disposer = () => undefined;

interface Reg {
  readonly sink: Sink;
  alive: boolean;
}

/**
 * replay-1 reference: a current-value slot + synchronous DISPATCH-SNAPSHOT fan-out.
 *
 * Faithful projection of `cell-kernel.ts` `replay1` + `createCore.fanOut`:
 *  - I1 (REPLAY law): `subscribe` replays the current committed slot exactly ONCE
 *    BEFORE registering.
 *  - I2: `read()` returns the last published value (initial until first publish).
 *  - I3: fan-out visits registrations in insertion order.
 *  - I4: `all` policy delivers every publish (no equal-consecutive suppression).
 *  - I5: a publish from within a sink recurses a full nested fan-out first.
 *  - I6 (MEMBERSHIP law — S6.1a ruling): dispatch membership is bounded at the
 *    START of each committed emission. A subscriber added mid-fan-out is OUTSIDE
 *    that dispatch's membership and does NOT receive the in-flight value — it
 *    participates only in FUTURE commits; one removed before the cursor reaches it
 *    is skipped. Together with the REPLAY law this makes each subscription observe
 *    each committed emission AT MOST ONCE (no replay+live-set double delivery).
 *  - I8: `close` completes each live subscriber once, then publish is inert and
 *    subscribe completes immediately without registering or replaying.
 */
function modelReplay1(initial: TraceValue, policy: EmissionPolicy, reentrancy: ReentrancyPolicy): ChannelLike {
  const regs: Reg[] = [];
  let current = initial;
  // The last value actually FANNED OUT — what a fresh subscribe replays. Distinct from
  // `current` (the latest write, returned by `read()`) so the {deferred} arm's eager
  // `current` advance cannot leak a queued-but-unemitted value through replay (the
  // at-most-once law I6 documents: no replay+live-set double delivery).
  let committed = initial;
  let closed = false;
  let lastEmitted: { readonly v: TraceValue } | undefined;
  // {deferred} async-append state: a publish issued from within an active fan-out
  // is enqueued and drained FIFO after the fan-out unwinds (breadth-first).
  let inFanOut = false;
  const pending: { readonly v: TraceValue }[] = [];

  // DISPATCH-SNAPSHOT membership (I6, S6.1a ruling): capture `regs.length` ONCE at
  // the start of the commit, so a subscribe issued from within a sink (which
  // appends BEYOND the captured limit) is NOT reached by the in-flight fan-out —
  // it joins only future commits. An alive=false set before the cursor reaches it
  // is still skipped. `regs` is append-only (dispose flips `alive`, never splices),
  // so the captured limit indexes stable registrations.
  const fanOut = (value: TraceValue): void => {
    const limit = regs.length;
    for (let i = 0; i < limit; i++) {
      const reg = regs[i];
      if (reg !== undefined && reg.alive) reg.sink.next(value);
    }
  };

  // Fan `value` out now, honoring the emission policy (the slot is advanced by
  // the caller, so a {distinct}-suppressed value is not lost — read still tracks it).
  const emit = (value: TraceValue): void => {
    if (policy.kind === 'distinct' && lastEmitted !== undefined && policy.equals(lastEmitted.v, value)) return;
    lastEmitted = { v: value };
    // Advance the replay slot WITH the emission (not the eager `current` write).
    committed = value;
    fanOut(value);
  };

  return {
    kind: 'replay1',
    read: () => current,
    publish: (value) => {
      if (closed) return;
      // The slot always tracks the latest publish (read consistency), even when
      // the emission is suppressed ({distinct}) or the fan-out is deferred.
      current = value;
      if (reentrancy === 'deferred') {
        // async-append: a nested publish waits for the active fan-out to unwind,
        // then fans out breadth-first — every subscriber sees one total order.
        if (inFanOut) {
          pending.push({ v: value });
          return;
        }
        inFanOut = true;
        emit(value);
        while (pending.length > 0) {
          const next = pending.shift();
          if (next !== undefined) emit(next.v);
        }
        inFanOut = false;
        return;
      }
      // synchronous (default): a nested publish recurses depth-first — pinned I5.
      emit(value);
    },
    subscribe: (sink) => {
      if (closed) {
        sink.complete?.();
        return NOOP_DISPOSER;
      }
      // Replay the last COMMITTED (fanned-out) value BEFORE registering — NOT the eager
      // `current` slot, which under {deferred} may hold a queued value whose fan-out has
      // not begun. (A value published from within the sink's own replay is not
      // re-delivered to it — compositor ordering.)
      sink.next(committed);
      const reg: Reg = { sink, alive: true };
      regs.push(reg);
      return () => {
        reg.alive = false;
      };
    },
    close: () => {
      if (closed) return;
      closed = true;
      const live = regs.filter((r) => r.alive);
      for (const r of regs) r.alive = false;
      for (const r of live) r.sink.complete?.();
    },
    get closed() {
      return closed;
    },
  };
}

/**
 * no-replay fan-out reference: fire-and-forget over a DISPATCH-SNAPSHOT membership.
 *
 * Faithful projection of `cell-kernel.ts` `fanout` + `createCore.fanOut`:
 *  - I1 (negative): no replay — a subscriber attached after a publish misses it.
 *  - I3/I4: snapshot fan-out in subscription order, no dedup under `all`.
 *  - I6 (MEMBERSHIP law): a subscriber added mid-fan-out is OUTSIDE the dispatch
 *    membership bounded at the commit's start and MISSES the in-flight value (it
 *    joins future commits); one removed mid-fan-out is re-checked and skipped. This
 *    is the SAME membership discipline as replay1 — the two channels differ ONLY in
 *    the REPLAY law (fanout does not replay the current slot on subscribe).
 *  - I8: identical close-completes discipline.
 */
function modelFanout(policy: EmissionPolicy): ChannelLike {
  const regs: Reg[] = [];
  let closed = false;
  let lastEmitted: { readonly v: TraceValue } | undefined;

  // DISPATCH-SNAPSHOT membership: capture `regs.length` at the commit's start so a
  // mid-fan-out subscribe (appended beyond the limit) is not reached; a disposed
  // reg (alive=false) is skipped. Same law as replay1's `fanOut`.
  const fanOut = (value: TraceValue): void => {
    const limit = regs.length;
    for (let i = 0; i < limit; i++) {
      const reg = regs[i];
      if (reg !== undefined && reg.alive) reg.sink.next(value);
    }
  };

  return {
    kind: 'fanout',
    publish: (value) => {
      if (closed) return;
      if (policy.kind === 'distinct' && lastEmitted !== undefined && policy.equals(lastEmitted.v, value)) {
        return;
      }
      lastEmitted = { v: value };
      fanOut(value);
    },
    subscribe: (sink) => {
      if (closed) {
        sink.complete?.();
        return NOOP_DISPOSER;
      }
      const reg: Reg = { sink, alive: true };
      regs.push(reg);
      return () => {
        reg.alive = false;
      };
    },
    close: () => {
      if (closed) return;
      closed = true;
      const live = regs.filter((r) => r.alive);
      for (const r of regs) r.alive = false;
      for (const r of live) r.sink.complete?.();
    },
    get closed() {
      return closed;
    },
  };
}

/** The reference-model channel constructors (the executable projection of I1-I8). */
export const ModelChannel = {
  replay1: (
    initial: TraceValue,
    policy: EmissionPolicy = EmissionPolicies.all(),
    reentrancy: ReentrancyPolicy = 'synchronous',
  ): ChannelLike => modelReplay1(initial, policy, reentrancy),
  fanout: (policy: EmissionPolicy = EmissionPolicies.all()): ChannelLike => modelFanout(policy),
} as const;

/**
 * The REAL {@link CellKernel} adapted to {@link ChannelLike} — the SUT the law
 * tables pin. Used as the `real` in the model's self-consistency run (this
 * wave) and as the CellKernel-backed impl side of the differential oracle
 * (Wave 6). CellKernel is raw `{all}` — it has no emission policy.
 */
export const cellKernelChannel = {
  replay1: (initial: TraceValue): ChannelLike => {
    const k = CellKernel.replay1(initial);
    return {
      kind: 'replay1',
      read: () => k.read(),
      publish: (value) => k.publish(value),
      subscribe: (sink) => k.subscribe(sink),
      close: () => k.close(),
      get closed() {
        return k.closed;
      },
    };
  },
  fanout: (): ChannelLike => {
    const k = CellKernel.fanout<TraceValue>();
    return {
      kind: 'fanout',
      publish: (value) => k.publish(value),
      subscribe: (sink) => k.subscribe(sink),
      close: () => k.close(),
      get closed() {
        return k.closed;
      },
    };
  },
} as const;

// ===========================================================================
// § runModel  (fold an OpHistory to an Observation — the oracle currency)
// ===========================================================================

export interface RunConfig {
  readonly channel: Channel;
  readonly initial?: TraceValue;
  readonly policy?: EmissionPolicy;
}

interface MutableObservation {
  readonly channel: Channel;
  readonly deliveries: Delivery[];
  readonly reads: TraceValue[];
  readonly completions: string[];
  closed: boolean;
  disposed: boolean;
}

/**
 * Fold a passive {@link OpHistory} over the reference channel into an
 * {@link Observation}. Deterministic and pure — the same history always yields
 * the same observation. This is the value Foundation-A's capture fixture is
 * compared against and the CellKernel migration must reproduce.
 *
 * `dispose` sets only the `disposed` flag (see the module gap note): the
 * reactive-surface effect of disposal is a Wave-6 coupling, deferred here.
 */
export function runModel(history: OpHistory, config: RunConfig): Observation {
  const policy = config.policy ?? EmissionPolicies.all();
  const ch =
    config.channel === 'replay1' ? ModelChannel.replay1(config.initial ?? 0, policy) : ModelChannel.fanout(policy);

  const obs: MutableObservation = {
    channel: config.channel,
    deliveries: [],
    reads: [],
    completions: [],
    closed: false,
    disposed: false,
  };
  const disposers = new Map<string, Disposer>();

  for (const op of history) {
    switch (op._tag) {
      case 'subscribe': {
        const sub = op.sub;
        const disposer = ch.subscribe({
          next: (value) => obs.deliveries.push({ subscriber: sub, value }),
          complete: () => obs.completions.push(sub),
        });
        disposers.set(sub, disposer);
        break;
      }
      case 'unsubscribe': {
        disposers.get(op.sub)?.();
        break;
      }
      case 'read': {
        if (ch.read !== undefined) obs.reads.push(ch.read());
        break;
      }
      case 'set': {
        ch.publish(op.value);
        break;
      }
      case 'update': {
        if (ch.read !== undefined) ch.publish(ch.read() + op.delta);
        break;
      }
      case 'publishCrossing': {
        ch.publish(op.value);
        break;
      }
      case 'complete': {
        ch.close();
        break;
      }
      case 'dispose': {
        obs.disposed = true;
        break;
      }
    }
  }

  obs.closed = ch.closed;
  return {
    channel: obs.channel,
    deliveries: obs.deliveries,
    reads: obs.reads,
    completions: obs.completions,
    closed: obs.closed,
    disposed: obs.disposed,
  };
}

// ===========================================================================
// § fc.commands  (the model-based command set — model vs a ChannelLike SUT)
// ===========================================================================

/**
 * A recording driver over any {@link ChannelLike}. The SAME driver wraps the
 * model reference and the CellKernel SUT, so their {@link signature}s can only
 * differ by channel semantics. Subscriber ids are allocated from an internal
 * counter; because every command runs on the model and the real in lockstep,
 * the two recorders allocate identical ids and identical `active` lists.
 */
export class Recorder {
  private readonly ch: ChannelLike;
  private nextId = 0;
  private readonly active: string[] = [];
  private readonly disposers = new Map<string, Disposer>();
  private readonly deliveries: Delivery[] = [];
  private readonly reads: TraceValue[] = [];
  private readonly completions: string[] = [];

  constructor(ch: ChannelLike) {
    this.ch = ch;
  }

  get kind(): Channel {
    return this.ch.kind;
  }
  get closed(): boolean {
    return this.ch.closed;
  }
  get activeCount(): number {
    return this.active.length;
  }
  get canRead(): boolean {
    return this.ch.read !== undefined;
  }

  subscribe(): void {
    const id = String(this.nextId++);
    const disposer = this.ch.subscribe({
      next: (value) => this.deliveries.push({ subscriber: id, value }),
      complete: () => this.completions.push(id),
    });
    this.disposers.set(id, disposer);
    this.active.push(id);
  }

  unsubscribeKth(k: number): void {
    if (this.active.length === 0) return;
    const idx = k % this.active.length;
    const id = this.active[idx];
    if (id === undefined) return;
    this.active.splice(idx, 1);
    this.disposers.get(id)?.();
  }

  read(): void {
    if (this.ch.read !== undefined) this.reads.push(this.ch.read());
  }

  set(value: TraceValue): void {
    this.ch.publish(value);
  }

  update(delta: TraceValue): void {
    if (this.ch.read !== undefined) this.ch.publish(this.ch.read() + delta);
  }

  publishCrossing(value: TraceValue): void {
    this.ch.publish(value);
  }

  complete(): void {
    this.ch.close();
  }

  /** A canonical string of the full observable state — compared model-vs-real. */
  signature(): string {
    return JSON.stringify({
      deliveries: this.deliveries.map((d) => [d.subscriber, d.value]),
      reads: this.reads,
      completions: this.completions,
      closed: this.ch.closed,
    });
  }
}

const assertConsistent = (model: Recorder, real: Recorder, op: string): void => {
  const m = model.signature();
  const r = real.signature();
  if (m !== r) {
    throw new Error(`reactive-model divergence after ${op}\n  model: ${m}\n  real:  ${r}`);
  }
};

abstract class ReactiveCommand implements fc.Command<Recorder, Recorder> {
  abstract check(model: Readonly<Recorder>): boolean;
  abstract apply(recorder: Recorder): void;
  abstract label(): string;
  run(model: Recorder, real: Recorder): void {
    this.apply(model);
    this.apply(real);
    assertConsistent(model, real, this.label());
  }
  toString(): string {
    return this.label();
  }
}

class SubscribeCmd extends ReactiveCommand {
  check(): boolean {
    return true;
  }
  apply(r: Recorder): void {
    r.subscribe();
  }
  label(): string {
    return 'subscribe';
  }
}

class UnsubscribeCmd extends ReactiveCommand {
  constructor(private readonly k: number) {
    super();
  }
  check(model: Readonly<Recorder>): boolean {
    return model.activeCount > 0;
  }
  apply(r: Recorder): void {
    r.unsubscribeKth(this.k);
  }
  label(): string {
    return `unsubscribe#${this.k}`;
  }
}

class ReadCmd extends ReactiveCommand {
  check(model: Readonly<Recorder>): boolean {
    return model.canRead;
  }
  apply(r: Recorder): void {
    r.read();
  }
  label(): string {
    return 'read';
  }
}

class SetCmd extends ReactiveCommand {
  constructor(private readonly value: TraceValue) {
    super();
  }
  check(): boolean {
    return true;
  }
  apply(r: Recorder): void {
    r.set(this.value);
  }
  label(): string {
    return `set(${this.value})`;
  }
}

class UpdateCmd extends ReactiveCommand {
  constructor(private readonly delta: TraceValue) {
    super();
  }
  check(model: Readonly<Recorder>): boolean {
    return model.canRead;
  }
  apply(r: Recorder): void {
    r.update(this.delta);
  }
  label(): string {
    return `update(+${this.delta})`;
  }
}

class PublishCrossingCmd extends ReactiveCommand {
  constructor(private readonly value: TraceValue) {
    super();
  }
  check(model: Readonly<Recorder>): boolean {
    return model.kind === 'fanout';
  }
  apply(r: Recorder): void {
    r.publishCrossing(this.value);
  }
  label(): string {
    return `publishCrossing(${this.value})`;
  }
}

class CompleteCmd extends ReactiveCommand {
  check(): boolean {
    return true;
  }
  apply(r: Recorder): void {
    r.complete();
  }
  label(): string {
    return 'complete';
  }
}

const arbValue = fc.integer({ min: -1000, max: 1000 });
const arbDelta = fc.integer({ min: -50, max: 50 });
const arbK = fc.nat({ max: 15 });

/**
 * The command arbitraries for a channel. replay-1 exercises the slot ops
 * (read/set/update); fan-out exercises publishCrossing. `complete` is included
 * (low-weight) so close-then-op inertness (I8) is walked. `dispose` is NOT a
 * reactive command — CellKernel has no disposal primitive; the Lifetime laws
 * are modelled separately (see {@link predictLifetime}).
 */
export function reactiveCommandArbs(channel: Channel): fc.Arbitrary<fc.Command<Recorder, Recorder>>[] {
  const common: fc.Arbitrary<fc.Command<Recorder, Recorder>>[] = [
    fc.constant(new SubscribeCmd()),
    arbK.map((k) => new UnsubscribeCmd(k)),
    fc.constant(new CompleteCmd()),
  ];
  if (channel === 'replay1') {
    return [
      ...common,
      fc.constant(new ReadCmd()),
      arbValue.map((v) => new SetCmd(v)),
      arbDelta.map((d) => new UpdateCmd(d)),
    ];
  }
  return [...common, arbValue.map((v) => new PublishCrossingCmd(v))];
}

/**
 * The `modelRun` setup: model = the reference {@link ModelChannel} under `{all}`
 * (the pinned I4 policy), real = the {@link cellKernelChannel} SUT. Any
 * divergence over the random command walk reds — proving the reference is a
 * faithful projection of the CellKernel laws.
 */
export function reactiveModelRunSetup(
  channel: Channel,
  initial: TraceValue = 0,
): () => {
  model: Recorder;
  real: Recorder;
} {
  return () => ({
    model: new Recorder(
      channel === 'replay1'
        ? ModelChannel.replay1(initial, EmissionPolicies.all())
        : ModelChannel.fanout(EmissionPolicies.all()),
    ),
    real: new Recorder(channel === 'replay1' ? cellKernelChannel.replay1(initial) : cellKernelChannel.fanout()),
  });
}

// ===========================================================================
// § Lifetime model  (the projection of L1-L7)
// ===========================================================================

/**
 * The Lifetime op vocabulary the disposal laws fold over. `add` covers both
 * pre-dispose registration and late (post-dispose) registration (L4); `remove`
 * is the remove-handle (L5); `dispose` triggers teardown (L1/L2/L3/L6/L7).
 *
 * `fails` marks a finalizer that throws/rejects (L6). `kind` selects sync vs
 * async (L2). NOTE: failing LATE finalizers are intentionally out of the
 * corpus — a late sync throw propagates out of `add()` and a late async
 * rejection is dropped (`lifetime.ts:114-117`); neither folds into an aggregate,
 * so modelling them adds no law coverage.
 */
export type LifetimeSpec =
  | { readonly _tag: 'add'; readonly id: string; readonly kind: 'sync' | 'async'; readonly fails?: boolean }
  | { readonly _tag: 'remove'; readonly id: string }
  | { readonly _tag: 'dispose' };

/** The observable read of a Lifetime run: finalizer invocation order + failures + disposed. */
export interface LifetimeObservation {
  /** Finalizer ids in INVOCATION order (LIFO on dispose; append for late adds). */
  readonly runOrder: readonly string[];
  /** Ids whose finalizer failed, in LIFO invocation order (the aggregate-cause order). */
  readonly failed: readonly string[];
  readonly disposed: boolean;
}

interface LifeEntry {
  readonly id: string;
  readonly fails: boolean;
  removed: boolean;
}

/**
 * PREDICT the {@link LifetimeObservation} for a spec sequence, purely from the
 * pinned Lifetime laws:
 *  - L1: dispose runs live finalizers in LIFO (reverse registration) order.
 *  - L3: a second dispose is idempotent (runs nothing).
 *  - L4: an add after dispose runs immediately (appended to `runOrder`).
 *  - L5: a removed finalizer does not run.
 *  - L6: failures are collected in LIFO invocation order.
 */
export function predictLifetime(ops: readonly LifetimeSpec[]): LifetimeObservation {
  const stack: LifeEntry[] = [];
  let disposed = false;
  const runOrder: string[] = [];
  const failed: string[] = [];

  for (const op of ops) {
    if (op._tag === 'add') {
      if (disposed) {
        // L4 late registration runs immediately, exactly once.
        runOrder.push(op.id);
        if (op.fails === true) failed.push(op.id);
      } else {
        stack.push({ id: op.id, fails: op.fails === true, removed: false });
      }
    } else if (op._tag === 'remove') {
      if (!disposed) {
        const entry = stack.find((e) => e.id === op.id && !e.removed);
        if (entry !== undefined) entry.removed = true; // L5
      }
    } else {
      if (disposed) continue; // L3 idempotent
      disposed = true;
      const live = stack.filter((e) => !e.removed);
      for (let i = live.length - 1; i >= 0; i--) {
        const entry = live[i];
        if (entry === undefined) continue;
        runOrder.push(entry.id); // L1 LIFO
        if (entry.fails) failed.push(entry.id); // L6 LIFO cause order
      }
    }
  }

  return { runOrder, failed, disposed };
}

interface TaggedFinalizerError extends Error {
  readonly finalizerId: string;
}

const finalizerError = (id: string): TaggedFinalizerError => {
  const error = new Error(`finalizer ${id} failed`) as Error & { finalizerId?: string };
  error.finalizerId = id;
  return error as TaggedFinalizerError;
};

/**
 * RUN a spec sequence against the REAL {@link Lifetime} and read back the same
 * {@link LifetimeObservation}. Async finalizers push their id synchronously
 * before awaiting, so invocation order is deterministic. Only the FIRST
 * dispose's aggregate is folded (subsequent disposes return the same settled
 * promise — L3). This is the SUT side of the Lifetime self-consistency check.
 */
export async function runLifetime(ops: readonly LifetimeSpec[]): Promise<LifetimeObservation> {
  const lt = Lifetime.make();
  const handles = new Map<string, () => void>();
  const runOrder: string[] = [];
  const failed: string[] = [];
  let captured = false;

  for (const op of ops) {
    if (op._tag === 'add') {
      const handle = lt.add(() => {
        runOrder.push(op.id);
        if (op.kind === 'async') {
          return Promise.resolve().then(() => {
            if (op.fails === true) throw finalizerError(op.id);
          });
        }
        if (op.fails === true) throw finalizerError(op.id);
        return undefined;
      });
      handles.set(op.id, handle);
    } else if (op._tag === 'remove') {
      handles.get(op.id)?.();
    } else {
      const rejection = await lt.dispose().then(
        () => undefined,
        (error: unknown) => error,
      );
      if (!captured) {
        captured = true;
        if (rejection !== undefined && hasTag(rejection, 'LifetimeDisposeError')) {
          for (const cause of (rejection as LifetimeDisposeError).causes) {
            const id = (cause as { finalizerId?: string }).finalizerId;
            failed.push(id ?? String(cause));
          }
        }
      }
    }
  }

  return { runOrder, failed, disposed: lt.disposed };
}

// ===========================================================================
// § Law-coverage rail  (every law-table entry → ≥1 model invariant)
// ===========================================================================

/** The closed set of enumerated law-table entries the model MUST cover. */
export const ENUMERATED_LAWS = [
  'I1',
  'I2',
  'I3',
  'I4',
  'I5',
  'I6',
  'I7',
  'I8',
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
  'L6',
  'L7',
] as const;

export type LawId = (typeof ENUMERATED_LAWS)[number];

export interface LawCoverage {
  readonly law: LawId;
  readonly source: string;
  readonly statement: string;
  /** The model invariant(s) that encode this law — asserted by the model's own test. */
  readonly modelInvariants: readonly string[];
}

/**
 * The coverage rail: each pinned law-table entry mapped to the model invariant
 * that projects it. The model's test asserts this table covers every entry in
 * {@link ENUMERATED_LAWS} exactly once — so a law can never be silently omitted
 * (add a law to the enumeration and this table must grow, or the rail reds).
 */
export const LAW_COVERAGE: readonly LawCoverage[] = [
  {
    law: 'I1',
    source: 'cell-kernel.test.ts (replay/no-replay)',
    statement: 'replay-1 replays the current value on subscribe; fan-out does not replay.',
    modelInvariants: ['modelReplay1 replays current before register', 'modelFanout registers without replay'],
  },
  {
    law: 'I2',
    source: 'cell-kernel.test.ts (current slot)',
    statement: 'read() == last-published-or-initial (replay-1).',
    modelInvariants: ['ModelChannel.replay1.read tracks the slot; runModel reads == CellKernel reads'],
  },
  {
    law: 'I3',
    source: 'cell-kernel.test.ts (subscriber ordering)',
    statement: 'subscribers are notified in subscription order.',
    modelInvariants: ['fanOut iterates registrations in insertion order (both channels)'],
  },
  {
    law: 'I4',
    source: 'cell-kernel.test.ts (duplicate-value policy)',
    statement: 'no dedup: every publish is delivered, equal-consecutive NOT suppressed (EmissionPolicy {all}).',
    modelInvariants: ['{all} policy delivers every publish', 'model vs CellKernel equal under {all}'],
  },
  {
    law: 'I5',
    source: 'cell-kernel.test.ts (reentrancy)',
    statement: 'a publish from within a sink runs a full nested synchronous fan-out before the outer resumes.',
    modelInvariants: ['fanOutLive recursion reproduces the reentrancy scenario byte-exact'],
  },
  {
    law: 'I6',
    source: 'cell-kernel.test.ts (mutation during notify)',
    statement:
      'MEMBERSHIP law (S6.1a): dispatch membership is bounded at the start of each committed emission — a subscriber added mid-fan-out MISSES the in-flight value on BOTH channels (it joins future commits); both skip a subscriber disposed mid-fan-out. With the REPLAY law (I1) each subscription observes each committed emission at most once (no replay+live-set double delivery).',
    modelInvariants: [
      'fanOut captures the membership limit at the commit start (both channels)',
      'a mid-fan-out subscribe is excluded from the in-flight dispatch (joins future commits)',
    ],
  },
  {
    law: 'I7',
    source: 'cell-kernel.test.ts (disposer)',
    statement:
      'a disposer removes exactly one registration; the same sink twice is two registrations; repeat dispose is a no-op.',
    modelInvariants: ['Reg.alive per registration; disposer idempotent; two subscribes = two Regs'],
  },
  {
    law: 'I8',
    source: 'cell-kernel.test.ts (close-completes)',
    statement:
      'close completes every subscriber once, synchronously; after close publish is inert and subscribe completes immediately without registering/replaying.',
    modelInvariants: ['close completes live regs once; post-close publish inert; post-close subscribe completes'],
  },
  {
    law: 'L1',
    source: 'lifetime.test.ts (LIFO order)',
    statement: 'finalizers run in reverse registration order.',
    modelInvariants: ['predictLifetime.runOrder is LIFO; matches runLifetime for any count'],
  },
  {
    law: 'L2',
    source: 'lifetime.test.ts (sync close before async dispose)',
    statement: 'sync finalizers execute synchronously in dispose(); the promise settles once async ones settle.',
    modelInvariants: ['runLifetime sync side effects land before the returned promise resolves'],
  },
  {
    law: 'L3',
    source: 'lifetime.test.ts (exactly-once / idempotent)',
    statement: 'each finalizer runs once across repeated dispose(); a second dispose runs nothing.',
    modelInvariants: ['predictLifetime skips the second dispose; runLifetime runOrder unchanged by re-dispose'],
  },
  {
    law: 'L4',
    source: 'lifetime.test.ts (late registration)',
    statement: 'an add after dispose runs the finalizer immediately and exactly once.',
    modelInvariants: ['predictLifetime appends a late add to runOrder; matches runLifetime'],
  },
  {
    law: 'L5',
    source: 'lifetime.test.ts (remove handle)',
    statement: 'a removed finalizer does not run; remove after run is a no-op.',
    modelInvariants: ['predictLifetime drops a removed entry from runOrder; matches runLifetime'],
  },
  {
    law: 'L6',
    source: 'lifetime.test.ts (aggregate failure)',
    statement:
      'all finalizers run even if some throw; failures fold into one LifetimeDisposeError in LIFO invocation order.',
    modelInvariants: ['predictLifetime.failed is LIFO; matches runLifetime causes; error is tagged'],
  },
  {
    law: 'L7',
    source: 'lifetime.test.ts (AbortSignal projection)',
    statement: 'signal aborts synchronously at dispose start, before any finalizer runs.',
    modelInvariants: ['a finalizer observes signal.aborted === true at run time'],
  },
] as const;
