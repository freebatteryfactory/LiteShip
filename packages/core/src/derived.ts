/**
 * Derived<T> — computed reactive value, rebuilt on {@link CellKernel.replay1}.
 *
 * A `Derived` computes an initial value into a replay-1 slot and recomputes it
 * whenever any of its sources emits — the coalgebraic recompute-on-change loop,
 * with NO `Effect`/`Stream`/`Scope`/`SubscriptionRef`. The compute kernel is the
 * pure combiner/factory (byte-identical to the pre-migration logic); only the
 * reactive carrier changed (`SubscriptionRef.make`+`changes`+`get` → the replay-1
 * kernel; `Stream.mergeAll`+`runForEach` → kernel `subscribe`; `Scope` →
 * {@link Lifetime}). Every factory returns a `{ derived, lifetime }` handle, the
 * shipped Zap/Compositor precedent.
 *
 * EMISSION POLICY `{all}` (S6.F.1). The kernel does NOT dedup — every source change
 * republishes even when the recomputed value is unchanged (`duplicate-source`
 * fixture: `[100,100,105,105,108]`). This is the captured `SubscriptionRef`
 * behavior preserved.
 *
 * LEADING-REPUBLISH PRESERVED (S6 Derived divergence — PRESERVE, not changed).
 * The captured Effect impl subscribed to its sources in a forked fiber at
 * construction; the source's replay-1 replay re-triggered compute, so a
 * subscriber present at that interleave point saw the initial value TWICE
 * (`initial-value` fixture: `a=[100,100]`) while a later subscriber did not
 * (`subscriber-order`: `b=[100,105]`). This is reproduced SYNCHRONOUSLY by wiring
 * the sources LAZILY on the FIRST subscribe: the first subscriber IS the
 * interleave point (it gets the kernel replay, then the source-replay republish);
 * later subscribers attach after the sources are wired and see no republish. All
 * six `derived.json` golden observations are reproduced byte-for-byte — a
 * transport swap, not a behavior change; no fixture regenerated.
 *
 * DISPOSAL (recompute-teardown, PINNED). `lifetime.dispose()` unsubscribes from
 * the sources (LIFO: stop feeding first) then closes the kernel (completes
 * subscribers). A post-dispose source change no longer recomputes, so `read()`
 * freezes at the last value (`disposal` fixture: read stays `105`).
 *
 * @module
 */

import { CellKernel } from './cell-kernel.js';
import type { CellSubscriber, Disposer } from './cell-kernel.js';
import { Lifetime } from './lifetime.js';

/**
 * The minimal readable + subscribable source a {@link Derived} recomputes from —
 * the replay-1 kernel surface `read()` + `subscribe()`. Structurally satisfied by
 * a `Cell`, a raw {@link CellKernel.replay1}, or another `Derived`. Derived
 * depends on this SHAPE, never on `Cell`'s concrete type (closure-not-restraint),
 * so it composes over anything that can be read and subscribed.
 */
export type DerivedSource<T> = Pick<CellKernel.Replay<T>, 'read' | 'subscribe'>;

/**
 * A recompute trigger for {@link Derived.make} — only the subscribe half is
 * needed (the factory reads whatever it wants; the trigger merely says WHEN to
 * recompute).
 */
export type DerivedTrigger = Pick<CellKernel.Replay<unknown>, 'subscribe'>;

interface DerivedShape<T> {
  readonly _tag: 'Derived';
  /** Current derived value (sync; was `get: Effect.Effect<T>`). */
  read(): T;
  /**
   * Subscribe to derived changes — replays the current value on attach, returns
   * a {@link Disposer} (was `changes: Stream.Stream<T>`). The FIRST subscribe
   * lazily wires the sources (the leading-republish interleave point).
   */
  subscribe(subscriber: CellSubscriber<T>): Disposer;
  /**
   * Owns the derived's teardown. Its finalizers unsubscribe from the sources
   * (stop recomputing) then close the kernel (complete subscribers) — so a
   * post-dispose source change no longer recomputes and `read()` freezes at the
   * last value. Mirrors {@link Cell}'s `lifetime` member so consumers thread
   * lifecycle through one uniform `dispose()`.
   */
  readonly lifetime: Lifetime.Shape;
}

/**
 * Build the derived kernel + Lifetime and wire recompute-on-source-change.
 * `recompute()` reads the current source values and returns the derived value;
 * `triggers` are the sources whose emissions re-run it.
 *
 * Sources are wired LAZILY on the FIRST subscriber so the captured
 * leading-republish is reproduced synchronously (see the module doc). The kernel
 * `close` finalizer is registered FIRST, so LIFO runs it LAST — after the source
 * subscriptions are torn down.
 */
function buildDerived<T>(recompute: () => T, triggers: ReadonlyArray<DerivedTrigger>): DerivedShape<T> {
  const kernel = CellKernel.replay1<T>(recompute());
  const lifetime = Lifetime.make();
  lifetime.add(() => kernel.close());

  let wired = false;
  // The value the LAST unwired pull `read()` returned. Frozen at disposal so a source
  // mutation AFTER that final read cannot move the "disposed" value, and so teardown
  // NEVER re-invokes a possibly-throwing/effectful combiner (a snapshot-recompute at
  // dispose would capture a never-observed source value and could throw during
  // teardown). `hasPulled` distinguishes "never pull-read" (freeze at the kernel's
  // construction value) from "pulled at least once" (freeze at that observed value).
  let hasPulled = false;
  let lastPulled!: T;

  const ensureWired = (): void => {
    if (wired) return;
    wired = true;
    for (const source of triggers) {
      // The source's replay-1 subscribe replays its current value NOW, re-running
      // compute → the leading republish; each later emission recomputes + republishes.
      lifetime.add(source.subscribe(() => kernel.publish(recompute())));
    }
  };

  return {
    _tag: 'Derived',
    // PULL-ONLY FRESHNESS (S6 divergence closure). Sources are wired LAZILY on the
    // first subscribe (to reproduce the leading republish), so a pull-only reader —
    // `const d = Derived.combine([cell], …); cell.set(2); d.read()` — would otherwise
    // freeze at the construction-time value with no subscriber to advance the slot.
    // While UNWIRED AND source-backed, `read()` recomputes from the live sources
    // (pull) WITHOUT wiring, so the eventual first subscribe still gets its leading
    // republish. A SOURCELESS derived can never go stale (nothing feeds it), so it
    // returns the cached construction value — never re-invoking a compute that may be
    // effectful (`() => ++n`). Once wired, the kernel slot is kept current by the push
    // subscriptions (and stays frozen at the last value after disposal — `wired` is
    // never reset), so `read()` returns it.
    //
    // DISPOSED FREEZE: a source-backed derived disposed BEFORE its first subscribe never
    // wired, so the pull branch would keep recomputing from live sources and a later
    // source mutation would still move the "disposed" value — violating the teardown
    // contract. Once disposed, return the LAST value a pull `read()` actually observed
    // (or the kernel's construction value if none was ever pulled), never a fresh
    // recompute — exactly as a wired-then-disposed derived freezes at its last pushed
    // value. Each live unwired pull caches its result into `lastPulled`.
    read: () => {
      if (wired || triggers.length === 0) return kernel.read();
      if (lifetime.disposed) return hasPulled ? lastPulled : kernel.read();
      lastPulled = recompute();
      hasPulled = true;
      return lastPulled;
    },
    subscribe: (subscriber) => {
      const disposer = kernel.subscribe(subscriber);
      ensureWired();
      return disposer;
    },
    lifetime,
  };
}

/**
 * Build a derived value from a `compute` factory and the sources whose emissions
 * recompute it. With no sources it is static (never recomputes).
 */
const _make = <T>(compute: () => T, sources: ReadonlyArray<DerivedTrigger> = []): DerivedShape<T> =>
  buildDerived(compute, sources);

/**
 * Combine multiple sources into a single derived value of `combiner(...values)`.
 * Recomputes from a CONSISTENT snapshot of every source on each change (no torn
 * reads): the recompute reads all current source values at that instant.
 */
const _combine = <T extends readonly unknown[], U>(
  sources: { readonly [K in keyof T]: DerivedSource<T[K]> },
  combiner: (...args: T) => U,
): DerivedShape<U> => {
  // Read every source's current value, preserving tuple arity/order. `.map` over a
  // tuple erases element types to `readonly unknown[]`; the single `as T` re-narrows
  // it — provably safe because `.map` is total and order-preserving over the tuple.
  const readAll = (): T => {
    const values: readonly unknown[] = sources.map((source) => source.read());
    return values as T;
  };
  const recompute = (): U => combiner(...readAll());
  return buildDerived(recompute, sources);
};

/**
 * Derived — read-only reactive view computed from upstream sources, on
 * {@link CellKernel.replay1}. Recomputes lazily on any source change and
 * republishes to its own subscribers; compose via `make` (factory + triggers) or
 * `combine` (tuple of readable sources).
 */
export const Derived = {
  /** Build a derived value from a factory and the sources that recompute it. */
  make: _make,
  /** Combine readable sources into a single derived value of their combiner. */
  combine: _combine,
};

export declare namespace Derived {
  /** Structural shape of a {@link Derived}: `_tag`, sync `read`, `subscribe`, `lifetime`. */
  export type Shape<T> = DerivedShape<T>;
}
