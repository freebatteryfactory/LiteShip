/**
 * `Zap<T>` — push-based event channel over a synchronous no-replay fan-out.
 *
 * Zap is the strictly-simpler sibling of {@link Cell}: a fire-and-forget event
 * channel with unbounded-PubSub fidelity, rebuilt on {@link CellKernel.fanout}
 * (the no-replay constructor). `emit` is a synchronous publish; `stream` is the
 * kernel's subscribe surface; a late subscriber NEVER sees a value published
 * before it attached (the no-replay law), and `close` completes every
 * subscriber without blocking.
 *
 * Every factory returns the channel augmented with its own `dispose()`
 * ({@link AsyncOwnedResource}) — the zap IS the disposable. Disposal tears down
 * the fan-out `close`, plus any source subscription, DOM listener, or pending
 * timer the derived channel holds; the owning {@link Lifetime} stays reachable as
 * `zap.lifetime` for advanced composition. This replaces the former
 * `Effect`/`Scope`/`PubSub` triad: `PubSub.unbounded` → listener set,
 * `Stream.fromPubSub` → subscribe surface, `emit` → sync publish, `addFinalizer`
 * → `Lifetime`.
 *
 * @module
 */

import { CellKernel } from './cell-kernel.js';
import { Lifetime, attachLifetime } from './lifetime.js';
import type { AsyncOwnedResource } from './lifetime.js';
import { type Clock, systemClock } from '../clock/clock.js';
import type { Millis } from '../schema/brands.js';

/**
 * The public read side of a Zap: the fan-out kernel's subscribe surface.
 * `publish`/`close` are intentionally excluded — a channel is written through
 * {@link ZapShape.emit} and torn down through its owning {@link Lifetime}.
 */
type ZapStream<T> = Pick<CellKernel.Fanout<T>, 'subscribe' | 'closed' | 'size'>;

interface ZapShape<T> {
  readonly _tag: 'Zap';
  /** The no-replay subscribe surface — `subscribe(sink)` returns a disposer. */
  readonly stream: ZapStream<T>;
  /** Fan `value` out to every current subscriber, synchronously. Inert after close. */
  emit(value: T): void;
}

/** A live {@link Zap} channel that owns its teardown directly (see {@link AsyncOwnedResource}). */
type OwnedZap<T> = ZapShape<T> & AsyncOwnedResource;

/**
 * Build a fresh no-replay channel and the Lifetime that closes it. The close
 * finalizer is registered FIRST, so it runs LAST (LIFO) — after any source
 * subscription / timer a derived channel adds on top.
 */
function makeChannel<T>(): { channel: CellKernel.Fanout<T>; zap: ZapShape<T>; lifetime: Lifetime } {
  const channel = CellKernel.fanout<T>();
  const lifetime = Lifetime.make();
  lifetime.add(() => channel.close());
  const zap: ZapShape<T> = {
    _tag: 'Zap',
    stream: channel,
    emit: (value: T) => channel.publish(value),
  };
  return { channel, zap, lifetime };
}

/**
 * Creates a new push-based event channel backed by a no-replay fan-out.
 *
 * @example
 * ```ts
 * const zap = Zap.make<number>();
 * zap.stream.subscribe((n) => received.push(n));
 * zap.emit(42); // subscribers receive 42
 * await zap.dispose();
 * ```
 */
const _make = <T>(): OwnedZap<T> => {
  const { zap, lifetime } = makeChannel<T>();
  return attachLifetime(zap, lifetime);
};

/**
 * Creates a Zap from a DOM event; the listener is owned by the returned
 * {@link Lifetime} and removed on dispose.
 *
 * @example
 * ```ts
 * const btn = document.getElementById('btn')!;
 * const clicks = Zap.fromDOMEvent(btn, 'click');
 * // clicks.stream emits MouseEvents; await clicks.dispose() removes the listener
 * ```
 */
const _fromDOMEvent = <K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  event: K,
): OwnedZap<HTMLElementEventMap[K]> => {
  const { channel, zap, lifetime } = makeChannel<HTMLElementEventMap[K]>();
  const listener = (e: HTMLElementEventMap[K]): void => {
    channel.publish(e);
  };
  element.addEventListener(event, listener);
  lifetime.add(() => element.removeEventListener(event, listener));
  return attachLifetime(zap, lifetime);
};

/**
 * Merges multiple Zaps of the same type into a single Zap.
 *
 * @example
 * ```ts
 * const merged = Zap.merge([a, b]);
 * // merged.stream receives events from both a and b
 * ```
 */
const _merge = <T>(events: ReadonlyArray<ZapShape<T>>): OwnedZap<T> => {
  const { channel, zap, lifetime } = makeChannel<T>();
  for (const event of events) {
    lifetime.add(event.stream.subscribe((value) => channel.publish(value)));
  }
  return attachLifetime(zap, lifetime);
};

/**
 * Transforms each value emitted by a Zap through a mapping function.
 *
 * @example
 * ```ts
 * const strs = Zap.map(nums, (n) => `value: ${n}`);
 * // strs.stream emits transformed strings
 * ```
 */
const _map = <A, B>(event: ZapShape<A>, f: (a: A) => B): OwnedZap<B> => {
  const { channel, zap, lifetime } = makeChannel<B>();
  lifetime.add(event.stream.subscribe((value) => channel.publish(f(value))));
  return attachLifetime(zap, lifetime);
};

/**
 * Filters a Zap, only forwarding values that satisfy the predicate.
 *
 * @example
 * ```ts
 * const evens = Zap.filter(nums, (n) => n % 2 === 0);
 * // evens.stream only receives even numbers
 * ```
 */
const _filter = <T>(event: ZapShape<T>, predicate: (value: T) => boolean): OwnedZap<T> => {
  const { channel, zap, lifetime } = makeChannel<T>();
  lifetime.add(
    event.stream.subscribe((value) => {
      if (predicate(value)) channel.publish(value);
    }),
  );
  return attachLifetime(zap, lifetime);
};

/**
 * Debounces a Zap, only emitting after `ms` milliseconds of silence.
 *
 * The pending timer is cancelled on each new source value (so only the trailing
 * value survives) and gated by the owning Lifetime's {@link AbortSignal}: a
 * timer that fires after dispose does not publish.
 *
 * @example
 * ```ts
 * const debounced = Zap.debounce(input, Millis(300));
 * // debounced.stream emits only after a 300ms pause in input
 * ```
 */
const _debounce = <T>(event: ZapShape<T>, ms: Millis): OwnedZap<T> => {
  const { channel, zap, lifetime } = makeChannel<T>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  // Registered above the source subscription so LIFO clears a pending timer
  // AFTER the subscription stops feeding new ones, and before the channel close.
  lifetime.add(() => {
    if (timer !== null) clearTimeout(timer);
  });
  lifetime.add(
    event.stream.subscribe((value) => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (!lifetime.signal.aborted) channel.publish(value);
      }, ms);
    }),
  );
  return attachLifetime(zap, lifetime);
};

/**
 * Throttles a Zap, allowing at most one emission per `ms` milliseconds. The
 * window is measured through the injected {@link Clock} (defaulting to
 * {@link systemClock}, the monotonic `performance.now` boundary) so the throttle
 * is replayable without an ambient time read.
 *
 * @example
 * ```ts
 * const throttled = Zap.throttle(scroll, Millis(16));
 * // throttled.stream emits at most once every 16ms (~60fps)
 * ```
 */
const _throttle = <T>(event: ZapShape<T>, ms: Millis, clock: Clock = systemClock): OwnedZap<T> => {
  const { channel, zap, lifetime } = makeChannel<T>();
  // Negative infinity so the first value always clears the window.
  let lastEmit = Number.NEGATIVE_INFINITY;
  lifetime.add(
    event.stream.subscribe((value) => {
      const now = clock.now();
      if (now - lastEmit >= ms) {
        lastEmit = now;
        channel.publish(value);
      }
    }),
  );
  return attachLifetime(zap, lifetime);
};

/**
 * Zap — push-based event channel over {@link CellKernel.fanout}. No-replay
 * fan-out with `map`, `filter`, `merge`, `debounce`, and `throttle`
 * combinators; every factory returns the channel augmented with its own
 * `dispose()` ({@link AsyncOwnedResource}).
 *
 * @example
 * ```ts
 * const zap = Zap.make<number>();
 * const doubled = Zap.map(zap, (n) => n * 2);
 * doubled.stream.subscribe((n) => received.push(n));
 * zap.emit(5); // doubled subscribers receive 10
 * await doubled.dispose();
 * await zap.dispose();
 * ```
 */
// OBLIGATION: OBL-REACTIVE-SWEEP-3
export const Zap = {
  make: _make,
  fromDOMEvent: _fromDOMEvent,
  merge: _merge,
  map: _map,
  filter: _filter,
  debounce: _debounce,
  throttle: _throttle,
};

/** Public structural type for `Zap`. */
export type Zap<T> = ZapShape<T>;
