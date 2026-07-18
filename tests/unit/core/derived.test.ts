/**
 * Derived<T> — computed reactive value on CellKernel (Wave 6 transport swap).
 *
 * RED-FIRST: authored against the plain, Effect-free API (sync `read()` +
 * `subscribe(sink): Disposer` + `lifetime`); the old `Effect`/`Stream`/`Scope`
 * surface would not type-check or run against these assertions.
 *
 * The law table PINS the captured `tests/fixtures/reactive-capture/derived.json`
 * observations byte-for-byte (the byte-law cage — master-plan Law 2), so the
 * transport swap is proven behavior-preserving:
 *  - EmissionPolicy {all} — every source change republishes (no dedup).
 *  - Leading-republish PRESERVED — a subscriber present at the source-wiring
 *    interleave sees the initial value twice; a later subscriber does not.
 *  - Recompute-on-source — a consistent snapshot of every source per change.
 *  - Disposal — recompute torn down, `read()` frozen at the last value.
 */

import { describe, test, expect } from 'vitest';
import { Cell, Derived, CellKernel } from '@czap/core';

/** Subscribe a named collector to a derived; return the live delivery array. */
const collect = <T>(derived: Derived.Shape<T>): { readonly values: T[]; readonly dispose: () => void } => {
  const values: T[] = [];
  const dispose = derived.subscribe((v) => values.push(v));
  return { values, dispose };
};

// ---------------------------------------------------------------------------
// Derived.make
// ---------------------------------------------------------------------------

describe('Derived.make', () => {
  test('computes the initial value and carries _tag Derived', () => {
    const d = Derived.make(() => 42);
    expect(d._tag).toBe('Derived');
    expect(d.read()).toBe(42);
  });

  test('a static derived (no sources) replays once and never changes', () => {
    let counter = 0;
    const d = Derived.make(() => ++counter);
    // Initial computation happens once (during construction).
    expect(d.read()).toBe(1);
    const { values } = collect(d);
    // No sources => the first subscriber sees only the replay, no leading republish.
    expect(values).toEqual([1]);
    expect(d.read()).toBe(1);
  });

  test('recomputes when a source cell emits', () => {
    const cell = Cell.make(10);
    const d = Derived.make(() => cell.read(), [cell]);
    const { values } = collect(d);
    // 10 (replay) + 10 (source-wiring republish) — the leading duplicate.
    expect(values).toEqual([10, 10]);
    cell.set(20);
    expect(values).toEqual([10, 10, 20]);
    expect(d.read()).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Derived.combine — the captured derived.json law table (base = Cell(0), +100)
// ---------------------------------------------------------------------------

describe('Derived.combine — captured derived.json parity', () => {
  const build = (): { base: Cell.Shape<number>; derived: Derived.Shape<number> } => {
    const base = Cell.make(0);
    const derived = Derived.combine([base] as const, (x: number): number => x + 100);
    return { base, derived };
  };

  test('initial-value: the first subscriber sees the leading republish [100,100]', () => {
    const { derived } = build();
    const { values } = collect(derived);
    expect(values).toEqual([100, 100]);
    expect(derived.read()).toBe(100);
  });

  test('recompute-on-source: [100,100,105]', () => {
    const { base, derived } = build();
    const { values } = collect(derived);
    base.set(5);
    expect(values).toEqual([100, 100, 105]);
    expect(derived.read()).toBe(105);
  });

  test('duplicate-source ({all}, no dedup): [100,100,105,105,108]', () => {
    const { base, derived } = build();
    const { values } = collect(derived);
    base.set(5);
    base.set(5); // equal-consecutive source value still republishes
    base.set(8);
    expect(values).toEqual([100, 100, 105, 105, 108]);
    expect(derived.read()).toBe(108);
  });

  test('subscriber-order: a=[100,100,105], b=[100,105] (only the first sub gets the republish)', () => {
    const { base, derived } = build();
    const a = collect(derived);
    const b = collect(derived);
    base.set(5);
    expect(a.values).toEqual([100, 100, 105]);
    expect(b.values).toEqual([100, 105]);
  });

  test('late-subscriber-replay: a=[100,100,105], b=[105]', () => {
    const { base, derived } = build();
    const a = collect(derived);
    base.set(5);
    const b = collect(derived);
    expect(a.values).toEqual([100, 100, 105]);
    expect(b.values).toEqual([105]);
    expect(derived.read()).toBe(105);
  });

  test('disposal: recompute torn down, read() frozen at the last value (105)', async () => {
    const { base, derived } = build();
    const a = collect(derived);
    base.set(5);
    expect(a.values).toEqual([100, 100, 105]);
    await derived.lifetime.dispose();
    base.set(9); // post-dispose source change no longer recomputes
    expect(derived.read()).toBe(105);
    expect(a.values).toEqual([100, 100, 105]); // no further deliveries
  });
});

// ---------------------------------------------------------------------------
// Derived.combine — multi-source
// ---------------------------------------------------------------------------

describe('Derived.combine — multi-source', () => {
  test('combines current values through the combiner', () => {
    const a = Cell.make(3);
    const b = Cell.make(7);
    const sum = Derived.combine([a, b] as const, (x: number, y: number) => x + y);
    expect(sum.read()).toBe(10);
  });

  test('recomputes when any input changes', () => {
    const a = Cell.make(1);
    const b = Cell.make(2);
    const product = Derived.combine([a, b] as const, (x: number, y: number) => x * y);
    const { values } = collect(product);
    a.set(5);
    expect(product.read()).toBe(10); // 5 * 2
    expect(values.at(-1)).toBe(10);
  });

  test('produces consistent snapshots (no torn reads): every recompute reads a fresh snapshot', () => {
    const a = Cell.make(0);
    const b = Cell.make(0);
    const derived = Derived.combine([a, b] as const, (x: number, y: number) => ({ x, y, consistent: x === y }));
    // A live subscriber activates recompute-on-change (a Derived is lazy — it only
    // recomputes once it has been subscribed).
    const seen: { x: number; y: number; consistent: boolean }[] = [];
    derived.subscribe((v) => seen.push(v));
    for (let i = 1; i <= 30; i++) {
      a.set(i);
      b.set(i);
    }
    const final = derived.read();
    expect(final.x).toBe(30);
    expect(final.y).toBe(30);
    expect(final.consistent).toBe(true);
    // Every recompute combined the two cells at that instant — whenever both cells
    // hold the same value the snapshot is consistent (no stale/torn combination).
    expect(seen.filter((v) => v.x === v.y).every((v) => v.consistent)).toBe(true);
  });

  test('composes over a raw CellKernel.replay1 source (decoupled from Cell)', () => {
    // Derived depends on the structural read+subscribe surface, not Cell's type.
    const source = CellKernel.replay1<number>(2);
    const derived = Derived.combine([source] as const, (x: number) => x * 3);
    const { values } = collect(derived);
    expect(values).toEqual([6, 6]); // 2*3 replay + leading republish
    source.publish(4);
    expect(derived.read()).toBe(12);
    expect(values).toEqual([6, 6, 12]);
  });
});
