/**
 * Cell<T> — writable reactive primitive.
 *
 * A transport swap onto {@link CellKernel}: the replay-1 current-value slot +
 * synchronous fan-out that used to be a `SubscriptionRef` is now the extracted,
 * Effect-free kernel. The pure reactive law preserves the captured behavior
 * (Wave 5.5 golden fixtures `tests/fixtures/reactive-capture/cell.json`) with ONE
 * deliberate product-law correction: `subscribe-during-publish` observes each
 * committed emission at most once (the dispatch-snapshot MEMBERSHIP law — a
 * mid-fan-out subscriber gets its replay, not the in-flight value a second time;
 * Wave 6.5.1 ruling S6.1a, `late=[5,6]`). All other captured behaviors hold:
 *
 *  - EmissionPolicy `{all}` — every `set` is delivered; equal consecutive values
 *    are NOT suppressed (`SubscriptionRef.setUnsafe` published unconditionally;
 *    the "notify only if changed" docstrings were stale).
 *  - ReentrancyPolicy `'deferred'` — a `set` issued from within a delivery handler
 *    is async-appended (breadth-first / glitch-free): the outer value reaches every
 *    subscriber, THEN the nested value reaches every subscriber, so every live
 *    subscriber's terminal delivery equals `read()` (the Wave 6 nested-write
 *    RULING — PRESERVE the captured Effect behavior; scar S6.F.2). Realized
 *    synchronously by the kernel's re-entrancy guard — no Effect, no microtask.
 *
 * `get`/`changes` (Effect/Stream) collapse to sync `read()` +
 * `subscribe(sink): Disposer`; `set`/`update` are sync publishes. Teardown is owned by a
 * {@link Lifetime} whose sole finalizer closes the kernel.
 *
 * @module
 */

import { CellKernel } from './cell-kernel.js';
import type { Disposer } from './cell-kernel.js';
import { Lifetime } from './lifetime.js';

interface CellShape<T> {
  readonly _tag: 'Cell';
  /** Read the current value — the initial value until the first `set` (was the Effect `get`). */
  read(): T;
  /** Set the current value and fan it out to every subscriber (was the Effect `set`). */
  set(value: T): void;
  /** Functionally update the current value (was the Effect `update`). */
  update(f: (current: T) => T): void;
  /**
   * Subscribe to changes — replays the current value on attach (the replay-1
   * contract the `changes` stream gave) and returns a {@link Disposer}.
   */
  subscribe(subscriber: CellKernel.Subscriber<T>): Disposer;
  /**
   * Owns the cell's teardown. Its sole finalizer closes the reactive kernel —
   * completing every subscriber and making publish inert — so consumers thread
   * cell lifecycle through one uniform `dispose()`.
   */
  readonly lifetime: Lifetime;
}

const _make = <T>(initial: T): CellShape<T> => {
  // Replay-1 kernel under the captured product law: {all} (no dedup) +
  // 'deferred' (async-append nested writes). See the module doc + scar S6.F.2.
  const kernel = CellKernel.replay1<T>(initial, { kind: 'all' }, 'deferred');
  const lifetime = Lifetime.make();
  lifetime.add(() => kernel.close());

  return {
    _tag: 'Cell',
    read: () => kernel.read(),
    set: (value: T) => kernel.publish(value),
    update: (f: (current: T) => T) => kernel.publish(f(kernel.read())),
    subscribe: (subscriber) => kernel.subscribe(subscriber),
    lifetime,
  };
};

/**
 * Cell — mutable reactive primitive backed by {@link CellKernel}. `read` for a
 * snapshot, `set`/`update` to push, `subscribe` for the replay-1 stream of
 * values (current replayed on attach). Effect-free — the transport swap that lets
 * consumers coordinate ordinary state with no `effect` import (#153).
 */
export const Cell = {
  /** Build a cell with an initial value, owned by a fresh {@link Lifetime}. */
  make: _make,
};

/** Public structural type for `Cell`. */
export type Cell<T> = CellShape<T>;
