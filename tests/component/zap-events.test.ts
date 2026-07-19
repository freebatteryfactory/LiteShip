/**
 * Component test: Zap push-based event channels.
 *
 * Zap is now a synchronous, Effect-free fan-out channel over
 * `CellKernel.fanout` (no-replay unbounded-PubSub semantics): `make` returns a
 * `{ zap, lifetime }` handle, `emit` is a synchronous fire-and-forget publish,
 * and `zap.stream.subscribe(sink)` registers a listener and returns a disposer.
 * A late subscriber never sees a value published before it attached — the
 * no-replay law this suite pins EXPLICITLY.
 */

import { describe, test, expect } from 'vitest';
import { Zap } from '@liteship/core';
import type { Millis } from '@liteship/core';
import { mockHTMLElement, type MockHTMLElementShape } from '../helpers/mock-dom.js';

/** Settle past a macrotask so any pending debounce/throttle timer has fired. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Bridge the DOM mock to the `HTMLElement` surface `Zap.fromDOMEvent` consumes.
 * `MockHTMLElementShape` is a deliberate subset (it also exposes `_listeners` /
 * `_emit` for assertions). `Zap.fromDOMEvent` touches ONLY `addEventListener` /
 * `removeEventListener`, and the mock supplies exactly those — so we narrow it to
 * that two-method `Pick` surface with a CHECKED structural assignment (no `unknown`
 * hop), then widen once.
 */
function asElement(el: MockHTMLElementShape): HTMLElement {
  const surface: Pick<HTMLElement, 'addEventListener' | 'removeEventListener'> = el;
  // Single sanctioned widen: the narrow above already proved the mock covers the surface fromDOMEvent uses.
  return surface as HTMLElement;
}

// ---------------------------------------------------------------------------
// Zap.make -- basic fan-out channel
// ---------------------------------------------------------------------------

describe('Zap.make', () => {
  test('creates a Zap with correct tag', () => {
    const { zap } = Zap.make<number>();
    expect(zap._tag).toBe('Zap');
  });

  test('emit does not throw', () => {
    const { zap } = Zap.make<number>();
    expect(() => zap.emit(42)).not.toThrow();
  });

  test('stream exposes a subscribe surface', () => {
    const { zap } = Zap.make<string>();
    expect(typeof zap.stream.subscribe).toBe('function');
  });

  test('delivers values emitted while subscribed', () => {
    const { zap } = Zap.make<number>();
    const received: number[] = [];
    zap.stream.subscribe((value) => received.push(value));

    zap.emit(1);
    zap.emit(2);

    expect(received).toEqual([1, 2]);
  });

  test('NO REPLAY: a late subscriber misses values published before it attached', () => {
    const { zap } = Zap.make<number>();
    zap.emit(1); // published with no subscriber — dropped, never buffered

    const received: number[] = [];
    zap.stream.subscribe((value) => received.push(value));
    zap.emit(2);

    // Only the post-subscribe value arrives; the pre-subscribe `1` is gone.
    expect(received).toEqual([2]);
  });

  test('fans out to every current subscriber, in subscription order', () => {
    const { zap } = Zap.make<number>();
    const a: number[] = [];
    const b: number[] = [];
    zap.stream.subscribe((v) => a.push(v));
    zap.stream.subscribe((v) => b.push(v));

    zap.emit(7);

    expect(a).toEqual([7]);
    expect(b).toEqual([7]);
  });

  test('disposing the returned disposer stops delivery to that subscriber', () => {
    const { zap } = Zap.make<number>();
    const received: number[] = [];
    const dispose = zap.stream.subscribe((v) => received.push(v));

    zap.emit(1);
    dispose();
    zap.emit(2);

    expect(received).toEqual([1]);
  });

  test('lifetime dispose closes the channel: publish is inert afterwards', async () => {
    const { zap, lifetime } = Zap.make<number>();
    const received: number[] = [];
    zap.stream.subscribe((v) => received.push(v));

    zap.emit(1);
    await lifetime.dispose();
    zap.emit(2); // channel closed — dropped

    expect(received).toEqual([1]);
    expect(zap.stream.closed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Zap.fromDOMEvent
// ---------------------------------------------------------------------------

describe('Zap.fromDOMEvent', () => {
  test('registers event listener on element', () => {
    const el = mockHTMLElement();
    Zap.fromDOMEvent(asElement(el), 'click');
    expect(el._listeners.get('click')?.size).toBe(1);
  });

  test('lifetime dispose removes the event listener', async () => {
    const el = mockHTMLElement();
    const { lifetime } = Zap.fromDOMEvent(asElement(el), 'click');
    expect(el._listeners.get('click')?.size).toBe(1);

    await lifetime.dispose();
    expect(el._listeners.get('click')?.size ?? 0).toBe(0);
  });

  test('returns a Zap with correct tag', () => {
    const el = mockHTMLElement();
    const { zap } = Zap.fromDOMEvent(asElement(el), 'click');
    expect(zap._tag).toBe('Zap');
  });

  test('emits DOM events through the stream', () => {
    const el = mockHTMLElement();
    const { zap } = Zap.fromDOMEvent(asElement(el), 'click');
    const received: string[] = [];
    zap.stream.subscribe((event) => received.push(event.type));

    el._emit('click');

    expect(received).toEqual(['click']);
  });
});

// ---------------------------------------------------------------------------
// Zap.map
// ---------------------------------------------------------------------------

describe('Zap.map', () => {
  test('creates a mapped Zap', () => {
    const { zap } = Zap.make<number>();
    const { zap: doubled } = Zap.map(zap, (x) => x * 2);
    expect(doubled._tag).toBe('Zap');
  });

  test('transforms emitted values through the mapped stream', () => {
    const { zap } = Zap.make<number>();
    const { zap: doubled } = Zap.map(zap, (x) => x * 2);
    const received: number[] = [];
    doubled.stream.subscribe((value) => received.push(value));

    zap.emit(2);

    expect(received).toEqual([4]);
  });
});

// ---------------------------------------------------------------------------
// Zap.filter
// ---------------------------------------------------------------------------

describe('Zap.filter', () => {
  test('creates a filtered Zap', () => {
    const { zap } = Zap.make<number>();
    const { zap: evens } = Zap.filter(zap, (x) => x % 2 === 0);
    expect(evens._tag).toBe('Zap');
  });

  test('drops values that do not satisfy the predicate', () => {
    const { zap } = Zap.make<number>();
    const { zap: evens } = Zap.filter(zap, (x) => x % 2 === 0);
    const received: number[] = [];
    evens.stream.subscribe((value) => received.push(value));

    zap.emit(1);
    zap.emit(2);
    zap.emit(3);

    expect(received).toEqual([2]);
  });
});

// ---------------------------------------------------------------------------
// Zap.merge
// ---------------------------------------------------------------------------

describe('Zap.merge', () => {
  test('creates a merged Zap from multiple channels', () => {
    const { zap: zap1 } = Zap.make<string>();
    const { zap: zap2 } = Zap.make<string>();
    const { zap: merged } = Zap.merge([zap1, zap2]);
    expect(merged._tag).toBe('Zap');
  });

  test('forwards events from every merged source', () => {
    const { zap: zap1 } = Zap.make<string>();
    const { zap: zap2 } = Zap.make<string>();
    const { zap: merged } = Zap.merge([zap1, zap2]);
    const received: string[] = [];
    merged.stream.subscribe((value) => received.push(value));

    zap1.emit('left');
    zap2.emit('right');

    expect(received).toEqual(['left', 'right']);
  });
});

describe('Zap.debounce', () => {
  test('emits only the latest value after the debounce window', async () => {
    const { zap } = Zap.make<number>();
    const { zap: debounced } = Zap.debounce(zap, 30 as Millis);
    const received: number[] = [];
    debounced.stream.subscribe((value) => received.push(value));

    zap.emit(1);
    zap.emit(2);
    // Nothing fires synchronously — the trailing value lands after the window.
    expect(received).toEqual([]);

    await delay(60);
    expect(received).toEqual([2]);
  });
});

describe('Zap.throttle', () => {
  test('emits at most one value per throttle window', async () => {
    const { zap } = Zap.make<number>();
    const { zap: throttled } = Zap.throttle(zap, 10 as Millis);
    const received: number[] = [];
    throttled.stream.subscribe((value) => received.push(value));

    zap.emit(1);
    zap.emit(2);
    await delay(15);
    zap.emit(3);

    expect(received).toEqual([1, 3]);
  });
});
