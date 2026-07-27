/**
 * Store<S, Msg> — TEA-style reducer store on CellKernel (Wave 6 transport swap).
 *
 * RED-FIRST: authored against the plain, Effect-free API (sync `read()` +
 * `subscribe(sink): Disposer` + sync `dispatch` + `lifetime`); the old
 * `Effect`/`Stream` surface would not type-check or run against these assertions.
 * `makeWithEffect` is retired (zero product consumers of an effectful reducer).
 *
 * The law table PINS the captured `tests/fixtures/reactive-capture/store.json`
 * observations:
 *  - EmissionPolicy {all} — every dispatch publishes (no dedup).
 *  - NESTED-DISPATCH async-append ('deferred' reentrancy, S6.F.2) — a dispatch
 *    from within a delivery handler lands AFTER the active fan-out, so BOTH
 *    subscribers see one glitch-free total order [0,1,99].
 *  - Subscriber teardown (unsubscribe) severs a subscriber while the value
 *    channel survives (read keeps updating) — the captured disposal observable.
 */

import { describe, test, expect } from 'vitest';
import type { Store} from '@liteship/core';
import { createStore } from '@liteship/core';

type CountMsg = { type: 'increment' } | { type: 'decrement' } | { type: 'set'; value: number };

const countReducer = (state: number, msg: CountMsg): number => {
  switch (msg.type) {
    case 'increment':
      return state + 1;
    case 'decrement':
      return state - 1;
    case 'set':
      return msg.value;
  }
};

/** A replace-reducer store over numbers — mirrors the capture's `(_state, msg) => msg`. */
const replaceStore = (initial = 0): Store<number, number> => createStore<number, number>(initial, (_s, m) => m);

// ---------------------------------------------------------------------------
// createStore — reducer basics
// ---------------------------------------------------------------------------

describe('createStore — reducer basics', () => {
  test('_tag is Store and initial state is readable', () => {
    const store = createStore(42, countReducer);
    expect(store._tag).toBe('Store');
    expect(store.read()).toBe(42);
  });

  test('dispatch runs the reducer (increment / decrement / set)', () => {
    const store = createStore(0, countReducer);
    store.dispatch({ type: 'increment' });
    expect(store.read()).toBe(1);
    store.dispatch({ type: 'increment' });
    store.dispatch({ type: 'decrement' });
    expect(store.read()).toBe(1);
    store.dispatch({ type: 'set', value: 99 });
    expect(store.read()).toBe(99);
  });

  test('works with object state (immutable reducer)', () => {
    type AppState = { count: number; label: string };
    type AppMsg = { type: 'rename'; label: string } | { type: 'bump' };
    const reducer = (s: AppState, m: AppMsg): AppState =>
      m.type === 'rename' ? { ...s, label: m.label } : { ...s, count: s.count + 1 };
    const store = createStore({ count: 0, label: 'hello' }, reducer);
    store.dispatch({ type: 'bump' });
    store.dispatch({ type: 'rename', label: 'world' });
    expect(store.read()).toEqual({ count: 1, label: 'world' });
  });
});

// ---------------------------------------------------------------------------
// createStore — captured store.json law table
// ---------------------------------------------------------------------------

describe('createStore — captured store.json parity', () => {
  test('initial-replay: a fresh subscriber replays the current state [0]', () => {
    const store = replaceStore(0);
    const a: number[] = [];
    store.subscribe((v) => a.push(v));
    expect(a).toEqual([0]);
  });

  test('late-subscriber-replay: a=[0,3,5], b=[5]', () => {
    const store = replaceStore(0);
    const a: number[] = [];
    store.subscribe((v) => a.push(v));
    store.dispatch(3);
    store.dispatch(5);
    const b: number[] = [];
    store.subscribe((v) => b.push(v));
    expect(a).toEqual([0, 3, 5]);
    expect(b).toEqual([5]);
    expect(store.read()).toBe(5);
  });

  test('duplicate-consecutive ({all}, no dedup): [0,7,7,7]', () => {
    const store = replaceStore(0);
    const a: number[] = [];
    store.subscribe((v) => a.push(v));
    store.dispatch(7);
    store.dispatch(7);
    store.dispatch(7);
    expect(a).toEqual([0, 7, 7, 7]);
  });

  test('subscriber-order: a/b/c each see [0,5], in subscription order', () => {
    const store = replaceStore(0);
    const order: string[] = [];
    const a: number[] = [];
    const b: number[] = [];
    const c: number[] = [];
    store.subscribe((v) => {
      a.push(v);
      order.push('a');
    });
    store.subscribe((v) => {
      b.push(v);
      order.push('b');
    });
    store.subscribe((v) => {
      c.push(v);
      order.push('c');
    });
    order.length = 0; // discard replays
    store.dispatch(5);
    expect(a).toEqual([0, 5]);
    expect(b).toEqual([0, 5]);
    expect(c).toEqual([0, 5]);
    expect(order).toEqual(['a', 'b', 'c']);
  });

  test('nested-dispatch: async-append — BOTH subscribers see [0,1,99] (S6.F.2 glitch-free)', () => {
    const store = replaceStore(0);
    const a: number[] = [];
    const b: number[] = [];
    let fired = false;
    store.subscribe((v) => {
      a.push(v);
      if (!fired && v === 1) {
        fired = true;
        store.dispatch(99); // nested dispatch from within a's delivery of 1
      }
    });
    store.subscribe((v) => b.push(v));
    store.dispatch(1);
    expect(a).toEqual([0, 1, 99]);
    expect(b).toEqual([0, 1, 99]); // b's terminal delivery == read() — no stale-terminal glitch
    expect(store.read()).toBe(99);
  });

  test('subscriber teardown: unsubscribe severs a subscriber; the value channel survives (read=2)', () => {
    const store = replaceStore(0);
    const a: number[] = [];
    const disposer = store.subscribe((v) => a.push(v));
    store.dispatch(1);
    disposer(); // the capture's `dispose` op for a value cell — sever the subscriber
    store.dispatch(2); // the value channel is untouched, so read keeps updating
    expect(a).toEqual([0, 1]);
    expect(store.read()).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Store lifetime — full teardown (distinct from subscriber teardown above)
// ---------------------------------------------------------------------------

describe('Store — lifetime teardown', () => {
  test('lifetime.dispose() completes subscribers once and makes dispatch inert', async () => {
    const store = replaceStore(0);
    let completions = 0;
    const seen: number[] = [];
    store.subscribe({ next: (v) => seen.push(v), complete: () => (completions += 1) });
    store.dispatch(1);
    await store.lifetime.dispose();
    expect(completions).toBe(1);
    store.dispatch(2); // kernel closed → publish inert
    expect(store.read()).toBe(1); // frozen at the last pre-close state
    expect(seen).toEqual([0, 1]);
  });
});
