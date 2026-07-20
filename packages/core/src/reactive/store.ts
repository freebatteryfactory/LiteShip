/**
 * `Store<S, Msg>` — TEA-style reducer store, rebuilt on {@link CellKernel.replay1}.
 *
 * A `Store` folds a pure `reducer(state, msg) => state` over a replay-1 slot:
 * `dispatch(msg)` publishes `reducer(read(), msg)`. No `Effect`/`Stream`/`Scope`/
 * `SubscriptionRef`/`Semaphore` — the reducer is the pure kernel (byte-identical
 * to the pre-migration logic); only the reactive carrier changed
 * (`SubscriptionRef.get`/`changes` → kernel `read`/`subscribe`; `dispatch`
 * synchronous). Every factory returns a `{ store, lifetime }` handle, the shipped
 * Zap/Compositor precedent.
 *
 * EMISSION POLICY `{all}` (S6.F.1). Every dispatch publishes — equal-consecutive
 * states are NOT suppressed (`duplicate-consecutive` fixture: `[0,7,7,7]`),
 * matching the captured `SubscriptionRef` behavior.
 *
 * NESTED-DISPATCH — async-append, 'deferred' reentrancy (S6.F.2, the ruling:
 * PRESERVE the captured glitch-free behavior). A `dispatch` issued from within a
 * delivery handler is enqueued and fanned out AFTER the active fan-out unwinds,
 * so every subscriber observes one total order and every live subscriber's
 * terminal delivery equals `read()` (`nested-dispatch` fixture: `[0,1,99]` for
 * BOTH subscribers). Realized synchronously by the kernel's `'deferred'` arm — no
 * microtask, no Effect; observable only in delivery ORDER.
 *
 * The former `makeWithEffect` (effectful reducer + `Semaphore` gate) is RETIRED:
 * zero product consumers constructed an effectful reducer (greenfield-zero-debt).
 * A synchronous reducer needs no serialization gate — `dispatch` is atomic under
 * JS single-threading, and nested dispatch is ordered by the `'deferred'` arm.
 *
 * @module
 */

import { CellKernel } from './cell-kernel.js';
import type { CellSubscriber, Disposer } from './cell-kernel.js';
import { Lifetime } from './lifetime.js';

interface StoreShape<S, Msg> {
  readonly _tag: 'Store';
  /** Current state (sync; was `get: Effect.Effect<S>`). */
  read(): S;
  /** Subscribe to state changes — replays current on attach, returns a {@link Disposer} (was `changes: Stream`). */
  subscribe(subscriber: CellSubscriber<S>): Disposer;
  /** Apply a message through the reducer, publishing the next state (sync; was `Effect.Effect<void>`). */
  dispatch(msg: Msg): void;
  /**
   * Owns the store's teardown — its sole finalizer closes the kernel (completing
   * subscribers, making `dispatch` inert). Mirrors {@link Cell}'s `lifetime`
   * member so consumers thread lifecycle through one uniform `dispose()`.
   */
  readonly lifetime: Lifetime;
}

const _make = <S, Msg>(initial: S, reducer: (state: S, msg: Msg) => S): StoreShape<S, Msg> => {
  // {all}: emit every dispatch (no dedup — the captured law). 'deferred': a
  // dispatch from within a delivery handler async-appends (glitch-free — S6.F.2).
  const kernel = CellKernel.replay1<S>(initial, { kind: 'all' }, 'deferred');
  const lifetime = Lifetime.make();
  lifetime.add(() => kernel.close());

  return {
    _tag: 'Store',
    read: () => kernel.read(),
    subscribe: (subscriber) => kernel.subscribe(subscriber),
    dispatch: (msg) => kernel.publish(reducer(kernel.read(), msg)),
    lifetime,
  };
};

/**
 * Store — TEA-style state container over {@link CellKernel.replay1}. Build with an
 * initial state and a pure `reducer(state, msg) => state`, then dispatch messages;
 * the store publishes each resulting state through `subscribe`, and
 * `lifetime.dispose()` tears it down.
 */
export const Store = {
  /** Synchronous reducer store. */
  make: _make,
};

/** Public structural type for `Store`. */
export type Store<S, Msg> = StoreShape<S, Msg>;
