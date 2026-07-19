/**
 * Cell<T> — writable reactive primitive (Wave 6: plain CellKernel, Effect-free).
 *
 * RED-FIRST law table for the transport swap onto {@link CellKernel.replay1}:
 * replay-current-on-subscribe, EmissionPolicy {all} (emit-every-set, no dedup),
 * subscriber order, ReentrancyPolicy 'deferred' (glitch-free async-append nested
 * write), disposer idempotence, and Lifetime-owned teardown — every law matching
 * the Wave 5.5 capture (`tests/fixtures/reactive-capture/cell.json`).
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { Cell } from '@liteship/core';

// ---------------------------------------------------------------------------
// Cell.make — value slot (read / set / update)
// ---------------------------------------------------------------------------

describe('Cell.make', () => {
  test('initial value is retrievable via read', () => {
    const cell = Cell.make(42);
    expect(cell.read()).toBe(42);
  });

  test('set updates value', () => {
    const cell = Cell.make(0);
    cell.set(99);
    expect(cell.read()).toBe(99);
  });

  test('update applies function to current value', () => {
    const cell = Cell.make(10);
    cell.update((n) => n * 2);
    expect(cell.read()).toBe(20);
  });

  test('update with identity preserves value', () => {
    const cell = Cell.make('hello');
    cell.update((x) => x);
    expect(cell.read()).toBe('hello');
  });

  test('has _tag Cell', () => {
    expect(Cell.make(0)._tag).toBe('Cell');
  });
});

// ---------------------------------------------------------------------------
// replay-current-on-subscribe (I1) + emit-every-set ({all}, I4)
// ---------------------------------------------------------------------------

describe('Cell — subscribe replays current + delivers every set', () => {
  test('a new subscriber is replayed the current value synchronously', () => {
    const cell = Cell.make(7);
    const got: number[] = [];
    cell.subscribe((v) => got.push(v));
    expect(got).toEqual([7]);
  });

  test('a late subscriber replays the LATEST value, not the whole history', () => {
    const cell = Cell.make(0);
    cell.set(3);
    cell.set(5);
    const got: number[] = [];
    cell.subscribe((v) => got.push(v));
    expect(got).toEqual([5]);
    expect(cell.read()).toBe(5);
  });

  test('EmissionPolicy {all}: equal-consecutive sets are NOT suppressed — set(7)x3 delivers [0,7,7,7]', () => {
    const cell = Cell.make(0);
    const got: number[] = [];
    cell.subscribe((v) => got.push(v));
    cell.set(7);
    cell.set(7);
    cell.set(7);
    expect(got).toEqual([0, 7, 7, 7]);
  });

  test('update fans out the transformed value', () => {
    const cell = Cell.make(0);
    const got: number[] = [];
    cell.subscribe((v) => got.push(v));
    cell.update((n) => n + 10);
    cell.update((n) => n * 2);
    expect(got).toEqual([0, 10, 20]);
  });
});

// ---------------------------------------------------------------------------
// subscriber ordering (I3)
// ---------------------------------------------------------------------------

describe('Cell — subscriber ordering', () => {
  test('a set fans out to every subscriber in subscription order', () => {
    const cell = Cell.make(0);
    const order: string[] = [];
    cell.subscribe(() => order.push('a'));
    cell.subscribe(() => order.push('b'));
    cell.subscribe(() => order.push('c'));
    order.length = 0; // discard the per-subscribe replays
    cell.set(5);
    expect(order).toEqual(['a', 'b', 'c']);
  });
});

// ---------------------------------------------------------------------------
// ReentrancyPolicy 'deferred' — nested write is glitch-free async-append (S6.F.2)
// ---------------------------------------------------------------------------

describe('Cell — nested write (deferred / async-append, the PRESERVED product law)', () => {
  test('a set issued from a delivery handler reaches EVERY subscriber after the outer value (b: [0,1,99])', () => {
    const cell = Cell.make(0);
    const a: number[] = [];
    const b: number[] = [];
    let fired = false;
    cell.subscribe((v) => {
      a.push(v);
      if (!fired && v === 1) {
        fired = true;
        cell.set(99); // nested write from within a's delivery of the outer 1
      }
    });
    cell.subscribe((v) => b.push(v));
    cell.set(1);
    // Glitch-free: the outer 1 reaches every subscriber, THEN the nested 99. Every
    // live subscriber's terminal delivery equals read() — no stale-terminal glitch,
    // a and b agree on the total order (the captured async-append behavior).
    expect(a).toEqual([0, 1, 99]);
    expect(b).toEqual([0, 1, 99]);
    expect(cell.read()).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// disposer + Lifetime teardown
// ---------------------------------------------------------------------------

describe('Cell — disposer + Lifetime', () => {
  test('a disposed subscriber stops receiving values; others are unaffected', () => {
    const cell = Cell.make(0);
    const a: number[] = [];
    const b: number[] = [];
    const disposeA = cell.subscribe((v) => a.push(v));
    cell.subscribe((v) => b.push(v));
    cell.set(1);
    disposeA();
    cell.set(2);
    expect(a).toEqual([0, 1]);
    expect(b).toEqual([0, 1, 2]);
  });

  test('the disposer is idempotent — a repeat call is a no-op', () => {
    const cell = Cell.make(0);
    const got: number[] = [];
    const dispose = cell.subscribe((v) => got.push(v));
    dispose();
    dispose();
    cell.set(1);
    expect(got).toEqual([0]);
  });

  test('disposing the Lifetime completes every subscriber once and makes set inert', async () => {
    const cell = Cell.make(0);
    const got: number[] = [];
    let completed = 0;
    cell.subscribe({ next: (v) => got.push(v), complete: () => (completed += 1) });
    await cell.lifetime.dispose();
    expect(completed).toBe(1);
    cell.set(1); // inert after close
    expect(got).toEqual([0]);
  });
});

// ---------------------------------------------------------------------------
// Property — set then read roundtrips (seeded)
// ---------------------------------------------------------------------------

describe('Cell properties', () => {
  test('set then read roundtrips', () => {
    fc.assert(
      fc.property(fc.integer(), (value) => {
        const cell = Cell.make(0);
        cell.set(value);
        expect(cell.read()).toBe(value);
      }),
      { seed: 0xce77, numRuns: 200 },
    );
  });
});
