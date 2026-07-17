/**
 * Component test: Zap.debounce and Zap.throttle.
 *
 * Debounce/throttle are now Effect-free closures over the synchronous
 * `CellKernel.fanout` channel: debounce uses a platform timer cancelled by the
 * owning Lifetime's AbortSignal, throttle measures its window through the
 * injected {@link systemClock}. Real (small) delays keep the timing
 * deterministic without a scheduler mock; values are collected via a plain
 * subscribe sink.
 */

import { describe, test, expect } from 'vitest';
import { Zap, Millis } from '@czap/core';

/** Wait `ms` real milliseconds so a debounce window / throttle gap elapses. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// ---------------------------------------------------------------------------
// Zap.throttle
// ---------------------------------------------------------------------------

describe('Zap.throttle', () => {
  test('creates a throttled Zap with correct tag', () => {
    const { zap: source } = Zap.make<number>();
    const { zap: throttled } = Zap.throttle(source, Millis(100));
    expect(throttled._tag).toBe('Zap');
  });

  test('first emission passes through, subsequent within window are dropped', () => {
    const collected: number[] = [];
    const { zap: source } = Zap.make<number>();
    const { zap: throttled } = Zap.throttle(source, Millis(500));
    throttled.stream.subscribe((v) => collected.push(v));

    // Emit three values rapidly — only the first passes (500ms window).
    source.emit(1);
    source.emit(2);
    source.emit(3);

    expect(collected).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// Zap.debounce
// ---------------------------------------------------------------------------

describe('Zap.debounce', () => {
  test('creates a debounced Zap with correct tag', () => {
    const { zap: source } = Zap.make<number>();
    const { zap: debounced } = Zap.debounce(source, Millis(10));
    expect(debounced._tag).toBe('Zap');
  });

  test('emits last value after delay', async () => {
    const collected: number[] = [];
    const { zap: source } = Zap.make<number>();
    const { zap: debounced } = Zap.debounce(source, Millis(30));
    debounced.stream.subscribe((v) => collected.push(v));

    source.emit(99);
    expect(collected).toEqual([]); // nothing fires before the window elapses

    await delay(60);
    expect(collected).toEqual([99]);
  });

  test('cancels the pending timer on rapid re-emission', async () => {
    const collected: number[] = [];
    const { zap: source } = Zap.make<number>();
    const { zap: debounced } = Zap.debounce(source, Millis(50));
    debounced.stream.subscribe((v) => collected.push(v));

    source.emit(1);
    await delay(15);
    source.emit(2); // cancels the pending "1"

    await delay(80);
    expect(collected).toEqual([2]);
  });

  test('a fired timer after dispose does not publish (AbortSignal gate)', async () => {
    const collected: number[] = [];
    const { zap: source } = Zap.make<number>();
    const { zap: debounced, lifetime } = Zap.debounce(source, Millis(20));
    debounced.stream.subscribe((v) => collected.push(v));

    source.emit(1);
    await lifetime.dispose(); // aborts before the window elapses
    await delay(40);

    expect(collected).toEqual([]);
  });
});
