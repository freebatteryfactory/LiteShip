/**
 * Signal -- live data feeds from the browser environment.
 *
 * (viewport, scroll, pointer, time, media queries, custom).
 *
 * Wave 6: a transport swap onto {@link CellKernel.replay1}. The `SubscriptionRef`
 * value slot becomes the extracted, Effect-free kernel; `current` (Effect) →
 * sync `read()`; `changes` (Stream) → `subscribe(sink): Disposer`; `seek`/`pause`/
 * `resume`/`poll` are synchronous. The DOM/rAF/interval listeners publish directly
 * into the kernel and their teardown is owned by a {@link Lifetime} (replacing the
 * `Scope`-bound `acquireRelease`/`addFinalizer`/`forkScoped`). The value channel is
 * the Cell channel — EmissionPolicy `{all}` (emit every set) + ReentrancyPolicy
 * `'deferred'` (glitch-free async-append nested write) — so the pure reactive law
 * is byte-identical to the captured behavior
 * (`tests/fixtures/reactive-capture/signal.json`). `Signal.audio`'s eager-throw
 * (normalized without a positive duration throws SYNCHRONOUSLY at construction) is
 * preserved verbatim.
 *
 * @module
 */

import type { AVBridge } from '../media/av-bridge.js';
import { wallClock, type Clock } from '../clock/clock.js';
import { ValidationError } from '@liteship/error';
import { CellKernel } from './cell-kernel.js';
import type { Disposer } from './cell-kernel.js';
import { Lifetime } from './lifetime.js';

/** Tag of a {@link SignalSource} — the family of live data feed a signal binds to. */
export type SignalSourceType = 'viewport' | 'time' | 'pointer' | 'scroll' | 'media' | 'custom' | 'audio';

/**
 * Configuration describing what a {@link Signal} reads from: viewport axis,
 * time mode, pointer axis, scroll axis, media query, custom push source,
 * or audio sample/normalized mode.
 *
 * Discriminant payloads default to the common case when omitted:
 * viewport `axis: 'width'`, time `mode: 'elapsed'`, pointer `axis: 'x'`,
 * scroll `axis: 'y'`, audio `mode: 'sample'`. {@link Signal.make} normalizes
 * the source, so the returned signal's `source` always carries explicit values.
 *
 * Audio modes:
 * - `sample` / `normalized` — offline/scrub reads via {@link Signal.audio}
 *   (raw sample index / 0..1 progress over a known duration).
 * - `amplitude` / `beat` — LIVE analyser-driven feeds, published by a runtime
 *   producer (e.g. the Astro `audio.*` rAF observer reading an AnalyserNode).
 *   `amplitude` is 0..1 RMS loudness; `beat` is a 0/1 onset pulse. These are
 *   "driven externally" stubs here — `@liteship/core` owns the vocabulary and
 *   initial value; the host publishes the live samples.
 */
export type SignalSource =
  | { readonly type: 'viewport'; readonly axis?: 'width' | 'height' }
  | { readonly type: 'time'; readonly mode?: 'elapsed' | 'absolute' | 'scheduled' }
  | { readonly type: 'pointer'; readonly axis?: 'x' | 'y' | 'pressure' }
  | { readonly type: 'scroll'; readonly axis?: 'x' | 'y' | 'progress' }
  | { readonly type: 'media'; readonly query: string }
  | { readonly type: 'custom'; readonly id: string }
  | { readonly type: 'audio'; readonly mode?: 'sample' | 'normalized' | 'amplitude' | 'beat' };

/** Fill omitted discriminant payloads with their documented defaults. */
function normalizeSource(source: SignalSource): SignalSource {
  switch (source.type) {
    case 'viewport':
      return { type: 'viewport', axis: source.axis ?? 'width' };
    case 'time':
      return { type: 'time', mode: source.mode ?? 'elapsed' };
    case 'pointer':
      return { type: 'pointer', axis: source.axis ?? 'x' };
    case 'scroll':
      return { type: 'scroll', axis: source.axis ?? 'y' };
    case 'audio':
      return { type: 'audio', mode: source.mode ?? 'sample' };
    case 'media':
    case 'custom':
      return source;
  }
}

interface SignalShape<T> {
  readonly source: SignalSource;
  /** Read the current value — the initial value until the first update (was the Effect `current`). */
  read(): T;
  /**
   * Subscribe to changes — replays the current value on attach (the replay-1
   * contract the `changes` stream gave) and returns a {@link Disposer}.
   */
  subscribe(subscriber: CellKernel.Subscriber<T>): Disposer;
  /**
   * Owns the signal's teardown. Its finalizers remove the browser listeners
   * (resize/scroll/pointer/media) or cancel the rAF/interval loop, then close
   * the reactive kernel — so consumers thread the signal lifecycle through one
   * uniform `dispose()` (replacing the `Scope`-bound listener cleanup).
   */
  readonly lifetime: Lifetime;
}

interface ControllableSignalShape<T> extends SignalShape<T> {
  /** Drive the value (ignored while paused; was the Effect `seek`). */
  seek(to: T): void;
  /** Pause the seek gate — subsequent `seek`s are ignored until `resume` (was the Effect `pause`). */
  pause(): void;
  /** Resume the seek gate (was the Effect `resume`). */
  resume(): void;
}

function initialValueForSource(source: SignalSource, clock: Clock): number {
  switch (source.type) {
    case 'viewport':
      return typeof globalThis.window !== 'undefined'
        ? source.axis === 'width'
          ? window.innerWidth
          : window.innerHeight
        : 0;
    case 'scroll':
      if (typeof globalThis.window === 'undefined') return 0;
      if (source.axis === 'x') return window.scrollX;
      if (source.axis === 'y') return window.scrollY;
      {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        return max > 0 ? window.scrollY / max : 0;
      }
    case 'pointer':
      return 0;
    case 'time':
      // Absolute mode emits the current wall-clock instant as the signal VALUE
      // (epoch ms) through the INJECTED clock (default wallClock, not the monotonic
      // systemClock) — a manual/fixed clock makes it deterministic.
      return source.mode === 'absolute' ? clock.now() : 0;
    case 'media':
      return typeof globalThis.window !== 'undefined' && window.matchMedia(source.query).matches ? 1 : 0;
    case 'custom':
      return 0;
    case 'audio':
      return 0;
  }
}

/**
 * Attach the source's browser/rAF/interval listeners, publishing directly into
 * `kernel` and registering their teardown on `lifetime`. Synchronous — the
 * listeners are live the moment {@link _make} returns (no forked setup fiber);
 * `lifetime.dispose()` removes every listener and cancels every loop.
 */
function setupListener(
  source: SignalSource,
  kernel: CellKernel.Replay<number>,
  lifetime: Lifetime,
  clock: Clock,
): void {
  switch (source.type) {
    case 'viewport': {
      if (typeof globalThis.window === 'undefined') return;
      const handler = (): void => {
        kernel.publish(source.axis === 'width' ? window.innerWidth : window.innerHeight);
      };
      window.addEventListener('resize', handler);
      lifetime.add(() => window.removeEventListener('resize', handler));
      return;
    }
    case 'scroll': {
      if (typeof globalThis.window === 'undefined') return;
      const handler = (): void => {
        let val: number;
        if (source.axis === 'x') val = window.scrollX;
        else if (source.axis === 'y') val = window.scrollY;
        else {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          val = max > 0 ? window.scrollY / max : 0;
        }
        kernel.publish(val);
      };
      window.addEventListener('scroll', handler, { passive: true });
      lifetime.add(() => window.removeEventListener('scroll', handler));
      return;
    }
    case 'pointer': {
      if (typeof globalThis.window === 'undefined') return;
      const handler = (e: PointerEvent): void => {
        kernel.publish(source.axis === 'x' ? e.clientX : source.axis === 'y' ? e.clientY : e.pressure);
      };
      window.addEventListener('pointermove', handler);
      lifetime.add(() => window.removeEventListener('pointermove', handler));
      return;
    }
    case 'time': {
      if (source.mode === 'elapsed') {
        if (typeof requestAnimationFrame === 'undefined') return;
        // The time signal is wall-clock by nature (both modes): elapsed since
        // subscription is measured in epoch ms via the INJECTED clock, consistent
        // with absolute mode and deterministic when a manual/fixed clock is passed.
        const start = clock.now();
        const id = { current: 0 };
        // DISPOSAL-SAFE self-reschedule. A value subscriber may dispose the signal
        // from WITHIN this tick's `publish`; the finalizer then cancels the frame id
        // of the tick already executing (a no-op), and without this guard the tick
        // would re-arm a fresh frame AFTER disposal — an inert-publish loop that runs
        // forever. `disposed` is monotonic (never reset), so the reschedule stays
        // permanently blocked once teardown has begun.
        //
        // EXCEPTION-SAFE re-arm: if a subscriber throws during `publish`, the next
        // frame MUST still be scheduled in a `finally`, else the signal permanently
        // stops advancing even after the faulty subscription is removed (the same
        // re-arm-despite-fault law timeline.ts follows). The listener fault still
        // surfaces — it propagates out of the rAF callback to the host — but the tick
        // has already re-armed. Disposal (checked after publish) still blocks re-arm.
        let disposed = false;
        const tick = (): void => {
          try {
            kernel.publish(clock.now() - start);
          } finally {
            if (!disposed) id.current = requestAnimationFrame(tick);
          }
        };
        id.current = requestAnimationFrame(tick);
        lifetime.add(() => {
          disposed = true;
          cancelAnimationFrame(id.current);
        });
      } else if (source.mode === 'absolute') {
        const id = setInterval(() => {
          kernel.publish(clock.now());
        }, 1000);
        lifetime.add(() => clearInterval(id));
      }
      // Scheduled mode: no automatic ticking. External code drives this signal
      // via seek() on the ControllableSignal.
      return;
    }
    case 'media': {
      if (typeof globalThis.window === 'undefined') return;
      const mql = window.matchMedia(source.query);
      const handler = (e: MediaQueryListEvent): void => {
        kernel.publish(e.matches ? 1 : 0);
      };
      mql.addEventListener('change', handler);
      lifetime.add(() => mql.removeEventListener('change', handler));
      return;
    }
    case 'custom':
      // Custom signals are driven externally via Signal.custom() push API.
      return;
    case 'audio':
      // Audio signals are driven externally via Signal.audio() / AVBridge
      // ('sample'/'normalized') or a host analyser producer ('amplitude'/'beat').
      return;
  }
}

/**
 * Create a reactive signal from a browser environment source.
 *
 * Returns a plain signal owned by a {@link Lifetime}: it sets up event listeners
 * (resize, scroll, pointermove, etc.) immediately and removes them on
 * `signal.lifetime.dispose()`. The signal exposes `.read()` (latest value) and
 * `.subscribe(sink)` (replay-1 stream of updates, returning a {@link Disposer}).
 *
 * `clock` (default {@link wallClock}) is the injected time source for the `time`
 * source family (elapsed/absolute) — pass a `manualClock`/`fixedClock` to drive an
 * elapsed/absolute signal deterministically without touching the ambient clock.
 *
 * @example
 * ```ts
 * import { Signal } from '@liteship/core';
 *
 * const sig = Signal.make({ type: 'viewport', axis: 'width' });
 * const width = sig.read(); // current window.innerWidth
 * const off = sig.subscribe((w) => console.log(w));
 * // ...
 * off();
 * await sig.lifetime.dispose();
 * ```
 */
function _make(rawSource: SignalSource, clock: Clock = wallClock): SignalShape<number> {
  const source = normalizeSource(rawSource);
  const initial = initialValueForSource(source, clock);
  // Cell channel: {all} (emit every update) + 'deferred' (glitch-free async-append
  // nested write). See scar S6.F.1 / S6.F.2 — Signal inherits the Cell value channel.
  const kernel = CellKernel.replay1<number>(initial, { kind: 'all' }, 'deferred');
  const lifetime = Lifetime.make();

  setupListener(source, kernel, lifetime, clock);
  // Close the kernel LAST (LIFO): listeners/loops detach before the value channel
  // completes its subscribers, so a straggler event cannot publish post-close.
  lifetime.add(() => kernel.close());

  return {
    source,
    read: () => kernel.read(),
    subscribe: (subscriber) => kernel.subscribe(subscriber),
    lifetime,
  };
}

/**
 * Create a controllable time signal for video rendering / scrubbing.
 *
 * External code drives the signal value via `seek()`; no automatic ticking.
 * `pause()`/`resume()` gate seek updates. Effect-free — `seek`/`pause`/`resume`
 * are synchronous.
 *
 * @example
 * ```ts
 * import { Signal } from '@liteship/core';
 *
 * const ctrl = Signal.controllable();
 * ctrl.seek(1500);
 * const t = ctrl.read(); // 1500
 * ctrl.pause();
 * ctrl.seek(2000); // ignored while paused
 * ```
 */
function _controllable(): ControllableSignalShape<number> {
  const kernel = CellKernel.replay1<number>(0, { kind: 'all' }, 'deferred');
  const lifetime = Lifetime.make();
  lifetime.add(() => kernel.close());
  // Closure paused-flag (was `Ref.make(false)`).
  let paused = false;

  return {
    source: { type: 'time' as const, mode: 'scheduled' as const },
    read: () => kernel.read(),
    subscribe: (subscriber) => kernel.subscribe(subscriber),
    seek: (to: number) => {
      if (!paused) kernel.publish(to);
    },
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    lifetime,
  };
}

// ---------------------------------------------------------------------------
// Audio signal
// ---------------------------------------------------------------------------

interface AudioSignalShape extends SignalShape<number> {
  /** Read the latest sample from the bridge, publish it, and return it (was the Effect `poll`). */
  poll(): number;
}

/**
 * Create an audio signal backed by an AVBridge.
 *
 * In 'sample' mode, returns the raw sample index. In 'normalized' mode,
 * returns a 0..1 progress value based on totalDurationSec — omitting
 * `totalDurationSec` (or passing a non-positive value) in 'normalized'
 * mode throws a `ValidationError` SYNCHRONOUSLY at construction (the eager-throw
 * fault edge, preserved verbatim). Call `.poll()` to read the latest sample from
 * the bridge and update the signal.
 *
 * @example
 * ```ts
 * import { Signal } from '@liteship/core';
 *
 * const audioSig = Signal.audio(bridge, 'normalized', 120);
 * const progress = audioSig.poll(); // 0..1
 * ```
 */
function _audio(
  bridge: AVBridge,
  mode: 'sample' | 'normalized' = 'sample',
  totalDurationSec?: number,
): AudioSignalShape {
  if (mode === 'normalized' && !(totalDurationSec !== undefined && totalDurationSec > 0)) {
    throw ValidationError(
      'Signal.audio',
      `normalized mode requires totalDurationSec > 0, got ${totalDurationSec} — pass Signal.audio(bridge, "normalized", durationSec)`,
    );
  }
  const kernel = CellKernel.replay1<number>(0, { kind: 'all' }, 'deferred');
  const lifetime = Lifetime.make();
  lifetime.add(() => kernel.close());

  const poll = (): number => {
    const sample = bridge.getCurrentSample();
    let value: number;
    if (mode === 'normalized' && totalDurationSec !== undefined && totalDurationSec > 0) {
      const totalSamples = totalDurationSec * bridge.sampleRate;
      value = Math.min(sample / totalSamples, 1);
    } else {
      value = sample;
    }
    kernel.publish(value);
    return value;
  };

  return {
    source: { type: 'audio' as const, mode } as const,
    read: () => kernel.read(),
    subscribe: (subscriber) => kernel.subscribe(subscriber),
    poll,
    lifetime,
  };
}

/**
 * Signal namespace -- live data feeds from the browser environment.
 *
 * Create reactive signals from viewport, scroll, pointer, time, media query,
 * audio, or custom sources. Each signal provides `.read()` and `.subscribe(sink)`
 * backed by {@link CellKernel.replay1}, plus a {@link Lifetime} for listener
 * cleanup. Effect-free — consumers coordinate live state with no `effect` import.
 *
 * @example
 * ```ts
 * import { Signal } from '@liteship/core';
 *
 * const viewport = Signal.make({ type: 'viewport', axis: 'width' });
 * const width = viewport.read();
 * const ctrl = Signal.controllable();
 * ctrl.seek(500);
 * ```
 */
export const Signal = { make: _make, controllable: _controllable, audio: _audio };

/** Public structural type for `Signal`. */
export type Signal<T> = SignalShape<T>;

export declare namespace Signal {
  /** Structural shape of a seekable, pausable signal — e.g. driven by Remotion or a scrub UI. */
  export type Controllable<T> = ControllableSignalShape<T>;
  /** Structural shape of an audio-sourced signal backed by an {@link AVBridge}. */
  export type Audio = AudioSignalShape;
}
