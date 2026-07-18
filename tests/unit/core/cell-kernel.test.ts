/**
 * CellKernel — the shared replay-current / fan-out substrate.
 *
 * Two constructors, extracted from compositor.ts:231-246 (the source of truth):
 *   - replay1(initial): current-value slot + synchronous listener set; a new
 *     subscriber is replayed the current value on subscribe.
 *   - fanout(): no-replay fire-and-forget; late subscribers miss prior values.
 *
 * Pinned laws (asserted below for BOTH constructors):
 *   - subscriber ordering: subscribers are notified in subscription order.
 *   - duplicate-value policy: every publish is delivered; equal values are NOT
 *     suppressed (no dedup — mirrors the raw compositor fan-out).
 *   - reentrancy: a publish issued from within a subscriber runs a full nested
 *     synchronous fan-out over the membership snapshot before the outer resumes.
 *   - mid-fan-out membership (S6.1a): dispatch membership is bounded at each
 *     commit's start on BOTH constructors — a subscriber added mid-fan-out MISSES
 *     the in-flight value and joins future commits. With replay1's replay-once law
 *     this makes each subscription observe each commit at most once (no double-spend).
 *   - disposer idempotence: the returned disposer removes exactly one
 *     subscription; calling it again is a no-op.
 *   - close-completes: close() completes every subscriber exactly once,
 *     synchronously (never blocks); afterwards publish is inert and subscribe
 *     completes immediately without registering.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { CellKernel } from '../../../packages/core/src/cell-kernel.js';
import type { Disposer } from '../../../packages/core/src/cell-kernel.js';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

describe('CellKernel — identity', () => {
  test('replay1 has _tag CellReplay, is open, empty', () => {
    const k = CellKernel.replay1(0);
    expect(k._tag).toBe('CellReplay');
    expect(k.closed).toBe(false);
    expect(k.size).toBe(0);
  });

  test('fanout has _tag CellFanout, is open, empty', () => {
    const k = CellKernel.fanout<number>();
    expect(k._tag).toBe('CellFanout');
    expect(k.closed).toBe(false);
    expect(k.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// replay-1: current slot + replay-current-on-subscribe
// ---------------------------------------------------------------------------

describe('CellKernel.replay1 — current slot + replay', () => {
  test('read() returns the initial value before any publish', () => {
    expect(CellKernel.replay1(42).read()).toBe(42);
  });

  test('read() returns the most-recently-published value', () => {
    const k = CellKernel.replay1(0);
    k.publish(1);
    k.publish(2);
    expect(k.read()).toBe(2);
  });

  test('subscribe replays the current value synchronously', () => {
    const k = CellKernel.replay1(7);
    const got: number[] = [];
    k.subscribe((v) => got.push(v));
    expect(got).toEqual([7]);
  });

  test('a late subscriber replays the latest value, not the whole history', () => {
    const k = CellKernel.replay1(0);
    k.publish(1);
    k.publish(2);
    const got: number[] = [];
    k.subscribe((v) => got.push(v));
    expect(got).toEqual([2]);
  });

  test('publish delivers to every already-attached subscriber', () => {
    const k = CellKernel.replay1(0);
    const a: number[] = [];
    const b: number[] = [];
    k.subscribe((v) => a.push(v));
    k.subscribe((v) => b.push(v));
    k.publish(5);
    expect(a).toEqual([0, 5]);
    expect(b).toEqual([0, 5]);
  });
});

// ---------------------------------------------------------------------------
// no-replay: late subscribers miss prior values
// ---------------------------------------------------------------------------

describe('CellKernel.fanout — no replay', () => {
  test('a subscriber attached before publish receives it', () => {
    const k = CellKernel.fanout<number>();
    const got: number[] = [];
    k.subscribe((v) => got.push(v));
    k.publish(1);
    expect(got).toEqual([1]);
  });

  test('a subscriber attached after a publish misses that value', () => {
    const k = CellKernel.fanout<number>();
    k.publish(1);
    const got: number[] = [];
    k.subscribe((v) => got.push(v));
    expect(got).toEqual([]);
    k.publish(2);
    expect(got).toEqual([2]);
  });
});

// ---------------------------------------------------------------------------
// subscriber ordering
// ---------------------------------------------------------------------------

describe('CellKernel — subscriber ordering', () => {
  test('fanout notifies subscribers in subscription order', () => {
    const k = CellKernel.fanout<number>();
    const order: string[] = [];
    k.subscribe(() => order.push('a'));
    k.subscribe(() => order.push('b'));
    k.subscribe(() => order.push('c'));
    k.publish(1);
    expect(order).toEqual(['a', 'b', 'c']);
  });

  test('replay1 notifies subscribers in subscription order', () => {
    const k = CellKernel.replay1(0);
    const order: string[] = [];
    k.subscribe(() => order.push('a'));
    k.subscribe(() => order.push('b'));
    k.subscribe(() => order.push('c'));
    // clear the per-subscribe replays; assert the publish fan-out order only.
    order.length = 0;
    k.publish(1);
    expect(order).toEqual(['a', 'b', 'c']);
  });
});

// ---------------------------------------------------------------------------
// duplicate-value policy (no dedup)
// ---------------------------------------------------------------------------

describe('CellKernel — duplicate-value policy', () => {
  test('fanout delivers equal consecutive values without suppression', () => {
    const k = CellKernel.fanout<number>();
    const got: number[] = [];
    k.subscribe((v) => got.push(v));
    k.publish(7);
    k.publish(7);
    k.publish(7);
    expect(got).toEqual([7, 7, 7]);
  });

  test('replay1 delivers equal consecutive values without suppression', () => {
    const k = CellKernel.replay1(3);
    const got: number[] = [];
    k.subscribe((v) => got.push(v));
    k.publish(3);
    k.publish(3);
    expect(got).toEqual([3, 3, 3]);
  });
});

// ---------------------------------------------------------------------------
// EmissionPolicy (Wave 6 — the third axis, orthogonal to replay1/fanout):
//   {all}      — the DEFAULT + pinned law above: every publish is delivered.
//   {distinct} — suppress a publish whose value equals the previous EMITTED
//                value under the supplied equality; the current slot still
//                advances (read consistency) so a suppressed value is not lost.
// Timeline's hand-rolled `newState !== oldState` state dedup is this arm; the
// default stays {all} so compositor / zap / crossings byte-parity is untouched.
// ---------------------------------------------------------------------------

describe('CellKernel — EmissionPolicy {distinct}', () => {
  test('replay1 {distinct} suppresses a consecutive-equal publish; {all} (default) does not', () => {
    const distinct = CellKernel.replay1(0, { kind: 'distinct', equals: Object.is });
    const got: number[] = [];
    distinct.subscribe((v) => got.push(v));
    distinct.publish(7);
    distinct.publish(7); // suppressed — equals the previous emission
    distinct.publish(8);
    distinct.publish(7); // NOT suppressed — differs from the previous emission (8)
    // replay(0) + 7 + 8 + 7 (the middle duplicate 7 dropped).
    expect(got).toEqual([0, 7, 8, 7]);

    const all = CellKernel.replay1(0); // default {all}
    const allGot: number[] = [];
    all.subscribe((v) => allGot.push(v));
    all.publish(7);
    all.publish(7);
    all.publish(8);
    all.publish(7);
    expect(allGot).toEqual([0, 7, 7, 8, 7]);
  });

  test('fanout {distinct} suppresses a consecutive-equal publish; {all} (default) does not', () => {
    const distinct = CellKernel.fanout<number>({ kind: 'distinct', equals: Object.is });
    const got: number[] = [];
    distinct.subscribe((v) => got.push(v));
    distinct.publish(7);
    distinct.publish(7); // suppressed
    distinct.publish(7); // suppressed
    distinct.publish(9);
    expect(got).toEqual([7, 9]);

    const all = CellKernel.fanout<number>();
    const allGot: number[] = [];
    all.subscribe((v) => allGot.push(v));
    all.publish(7);
    all.publish(7);
    all.publish(7);
    all.publish(9);
    expect(allGot).toEqual([7, 7, 7, 9]);
  });

  test('replay1 {distinct}: a SUPPRESSED publish still advances the current slot (read tracks it — the mutation target)', () => {
    const k = CellKernel.replay1(0, { kind: 'distinct', equals: Object.is });
    k.publish(5);
    k.publish(5); // fan-out suppressed, but the slot must still be 5…
    expect(k.read()).toBe(5);
    // …and a LATE subscriber replays the slot exactly once (not the suppressed dup twice).
    const late: number[] = [];
    k.subscribe((v) => late.push(v));
    expect(late).toEqual([5]);
  });

  test('replay1 {distinct} does not suppress across a distinct value (equal-to-two-ago is delivered)', () => {
    const k = CellKernel.replay1(0, { kind: 'distinct', equals: Object.is });
    const got: number[] = [];
    k.subscribe((v) => got.push(v));
    k.publish(1);
    k.publish(2);
    k.publish(1); // equals two-ago, not the immediate previous — delivered
    expect(got).toEqual([0, 1, 2, 1]);
  });

  test('{distinct} honors a custom equality (not just Object.is)', () => {
    // Equal-by-parity: consecutive same-parity emissions are suppressed. The
    // replayed initial (0) does NOT seed the dedup — the FIRST publish always
    // emits (lastEmitted is undefined until a publish fans out), matching the
    // reference model.
    const sameParity = (a: number, b: number): boolean => a % 2 === b % 2;
    const k = CellKernel.replay1(0, { kind: 'distinct', equals: sameParity });
    const got: number[] = [];
    k.subscribe((v) => got.push(v));
    k.publish(2); // first publish → always emitted
    k.publish(4); // even, same parity as 2 → suppressed
    k.publish(3); // odd → delivered
    k.publish(5); // odd, same parity as 3 → suppressed
    k.publish(2); // even → delivered
    expect(got).toEqual([0, 2, 3, 2]);
  });
});

// ---------------------------------------------------------------------------
// reentrancy: publish during notify
// ---------------------------------------------------------------------------

describe('CellKernel — reentrancy (publish during notify)', () => {
  test('fanout: a reentrant publish runs a full nested fan-out before the outer resumes', () => {
    const k = CellKernel.fanout<number>();
    const a: number[] = [];
    const b: number[] = [];
    let fired = false;
    k.subscribe((v) => {
      a.push(v);
      if (!fired && v === 1) {
        fired = true;
        k.publish(9);
      }
    });
    k.subscribe((v) => b.push(v));
    k.publish(1);
    // a: outer 1, then reentrant 9. b: reentrant 9 (nested) then outer 1.
    expect(a).toEqual([1, 9]);
    expect(b).toEqual([9, 1]);
  });

  test('replay1: read() inside a reentrant publish observes the new value', () => {
    const k = CellKernel.replay1(0);
    const seen: number[] = [];
    const readInside: number[] = [];
    let fired = false;
    k.subscribe((v) => {
      seen.push(v);
      if (!fired && v === 1) {
        fired = true;
        k.publish(2);
        readInside.push(k.read());
      }
    });
    k.publish(1);
    expect(seen).toEqual([0, 1, 2]);
    expect(readInside).toEqual([2]);
    expect(k.read()).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// ReentrancyPolicy (Wave 6 — the nested-write ruling):
//   'synchronous' (DEFAULT) — a publish issued from within a fan-out recurses a
//     full nested fan-out depth-first before the outer resumes (the pinned I5
//     law; compositor byte-parity). The second subscriber sees the nested value
//     BEFORE the outer value → a REORDERING (b: [0,99,1]).
//   'deferred' — the async-append law Cell/Store adopt (RULING: PRESERVE the
//     captured Effect behavior — glitch-free / breadth-first). A publish issued
//     from within a fan-out is enqueued and fanned out AFTER the active fan-out
//     unwinds, so every subscriber observes the same total order and every live
//     subscriber's TERMINAL delivery equals read() (b: [0,1,99]).
// The current slot advances synchronously in BOTH arms (read() == last publish).
// ---------------------------------------------------------------------------

describe('CellKernel — ReentrancyPolicy (nested write)', () => {
  const runNestedWrite = (
    k: ReturnType<typeof CellKernel.replay1<number>>,
  ): { a: number[]; b: number[]; read: number } => {
    const a: number[] = [];
    const b: number[] = [];
    let fired = false;
    k.subscribe((v) => {
      a.push(v);
      if (!fired && v === 1) {
        fired = true;
        k.publish(99); // nested write from within a's delivery of the outer 1
      }
    });
    k.subscribe((v) => b.push(v));
    k.publish(1);
    return { a, b, read: k.read() };
  };

  test("'synchronous' (default): the second subscriber sees the REORDERED nested-first sequence (pinned I5)", () => {
    const { a, b, read } = runNestedWrite(CellKernel.replay1(0));
    // a: replay0, outer 1, nested 99. b: replay0, nested 99 (depth-first) then outer 1.
    expect(a).toEqual([0, 1, 99]);
    expect(b).toEqual([0, 99, 1]);
    expect(read).toBe(99);
  });

  test("'deferred': the second subscriber sees GLITCH-FREE async-append (the Cell/Store product law)", () => {
    const { a, b, read } = runNestedWrite(CellKernel.replay1(0, { kind: 'all' }, 'deferred'));
    // Breadth-first: the outer 1 reaches EVERY subscriber, THEN the nested 99
    // reaches every subscriber. b's terminal delivery (99) equals read() — no
    // stale-terminal glitch, and a and b agree on the total order.
    expect(a).toEqual([0, 1, 99]);
    expect(b).toEqual([0, 1, 99]);
    expect(read).toBe(99);
  });

  test("'deferred': a chain of nested writes drains FIFO (breadth-first), terminal == read()", () => {
    const k = CellKernel.replay1(0, { kind: 'all' }, 'deferred');
    const a: number[] = [];
    const b: number[] = [];
    let firedA = false;
    let firedB = false;
    k.subscribe((v) => {
      a.push(v);
      if (!firedA && v === 1) {
        firedA = true;
        k.publish(2);
      }
    });
    k.subscribe((v) => {
      b.push(v);
      if (!firedB && v === 2) {
        firedB = true;
        k.publish(3);
      }
    });
    k.publish(1);
    // Level order: 1 to {a,b}; then 2 to {a,b} (a's nested); then 3 to {a,b} (b's nested).
    expect(a).toEqual([0, 1, 2, 3]);
    expect(b).toEqual([0, 1, 2, 3]);
    expect(k.read()).toBe(3);
  });

  test("'deferred' with no nested write behaves exactly like a plain publish", () => {
    const k = CellKernel.replay1(0, { kind: 'all' }, 'deferred');
    const got: number[] = [];
    k.subscribe((v) => got.push(v));
    k.publish(1);
    k.publish(2);
    expect(got).toEqual([0, 1, 2]);
    expect(k.read()).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// subscribe / dispose during notify — UNIFORM DISPATCH-SNAPSHOT membership law
// (S6.1a ruling). Dispatch membership is bounded at the START of each committed
// emission on BOTH constructors: a subscriber added mid-fan-out is OUTSIDE that
// dispatch and MISSES the in-flight value — it participates only in FUTURE
// commits. The two constructors differ ONLY in the REPLAY law:
//   - fanout : no replay — a mid-fan-out subscriber first hears the NEXT commit.
//   - replay1: replays the current committed slot ONCE on subscribe, then hears
//     future commits. Because membership is dispatch-bounded, the replay is the
//     sole delivery of the current commit — NEVER replay + in-flight of the same
//     commit (that old live-Set double-spend was a law-composition defect: replay
//     and live iteration observing one committed state twice; see S6.1a).
// Both skip a subscriber DISPOSED mid-fan-out before it is reached.
// ---------------------------------------------------------------------------

describe('CellKernel — mutation during notify', () => {
  test('fanout: a subscriber added during a fan-out MISSES the in-flight value (dispatch-snapshot)', () => {
    const k = CellKernel.fanout<number>();
    const a: number[] = [];
    const late: number[] = [];
    k.subscribe((v) => {
      a.push(v);
      if (v === 1) k.subscribe((w) => late.push(w));
    });
    k.publish(1);
    expect(a).toEqual([1]);
    expect(late).toEqual([]);
    k.publish(2);
    expect(a).toEqual([1, 2]);
    expect(late).toEqual([2]);
  });

  test('replay1: a subscriber added during a fan-out MISSES the in-flight value — replay only, no double-spend (dispatch-snapshot; S6.1a)', () => {
    const k = CellKernel.replay1(0);
    const a: number[] = [];
    const late: number[] = [];
    let added = false;
    k.subscribe((v) => {
      a.push(v);
      if (v === 1 && !added) {
        added = true;
        // Attached from WITHIN the fan-out of publish(1). ONE delivery reaches it:
        // the replay of the current committed value (1) on subscribe. The
        // dispatch of publish(1) captured its membership BEFORE `late` existed, so
        // `late` is not in it and does NOT receive the in-flight 1 — it observes
        // the commit exactly once (via replay), then joins future commits. The old
        // live-Set fan-out delivered the in-flight 1 a SECOND time (late=[1,1]) —
        // the S6.1a double-spend this membership law retires.
        k.subscribe((w) => late.push(w));
      }
    });
    k.publish(1);
    expect(a).toEqual([0, 1]);
    expect(late).toEqual([1]);
  });

  test('fanout: a subscriber disposed during a fan-out does not receive the in-flight value', () => {
    const k = CellKernel.fanout<number>();
    const a: number[] = [];
    const b: number[] = [];
    let disposeB: Disposer = () => {};
    k.subscribe((v) => {
      a.push(v);
      disposeB();
    });
    disposeB = k.subscribe((v) => b.push(v));
    k.publish(1);
    expect(a).toEqual([1]);
    expect(b).toEqual([]);
  });

  test('replay1: a subscriber disposed during a fan-out is skipped (dispatch-snapshot honors removal)', () => {
    const k = CellKernel.replay1(0);
    const a: number[] = [];
    const b: number[] = [];
    let disposeB: Disposer = () => {};
    k.subscribe((v) => {
      a.push(v);
      disposeB();
    });
    disposeB = k.subscribe((v) => b.push(v));
    // B replays the current value (0) on subscribe; the assertion below concerns
    // only the publish fan-out, so clear that replay first.
    b.length = 0;
    k.publish(1);
    expect(a).toEqual([0, 1]);
    expect(b).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// disposer
// ---------------------------------------------------------------------------

describe('CellKernel — disposer', () => {
  test('fanout: a disposed subscriber stops receiving values', () => {
    const k = CellKernel.fanout<number>();
    const got: number[] = [];
    const dispose = k.subscribe((v) => got.push(v));
    k.publish(1);
    dispose();
    k.publish(2);
    expect(got).toEqual([1]);
    expect(k.size).toBe(0);
  });

  test('replay1: a disposed subscriber stops receiving values', () => {
    const k = CellKernel.replay1(0);
    const got: number[] = [];
    const dispose = k.subscribe((v) => got.push(v));
    k.publish(1);
    dispose();
    k.publish(2);
    expect(got).toEqual([0, 1]);
    expect(k.size).toBe(0);
  });

  test('disposer is idempotent — calling twice removes only one subscription', () => {
    const k = CellKernel.fanout<number>();
    const sink = { next: (): void => undefined };
    // The SAME sink object subscribed twice yields two distinct registrations.
    const d1 = k.subscribe(sink);
    const d2 = k.subscribe(sink);
    expect(k.size).toBe(2);
    d1();
    d1();
    expect(k.size).toBe(1);
    d2();
    expect(k.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// close-completes
// ---------------------------------------------------------------------------

describe('CellKernel — close-completes', () => {
  test('fanout: close() completes every subscriber exactly once and clears them', () => {
    const k = CellKernel.fanout<number>();
    let completedA = 0;
    let completedB = 0;
    k.subscribe({ next: () => undefined, complete: () => (completedA += 1) });
    k.subscribe({ next: () => undefined, complete: () => (completedB += 1) });
    expect(k.close()).toBeUndefined(); // synchronous, never blocks
    expect(k.closed).toBe(true);
    expect(completedA).toBe(1);
    expect(completedB).toBe(1);
    expect(k.size).toBe(0);
  });

  test('close() is idempotent — a second close does not re-complete subscribers', () => {
    const k = CellKernel.fanout<number>();
    let completed = 0;
    k.subscribe({ next: () => undefined, complete: () => (completed += 1) });
    k.close();
    k.close();
    expect(completed).toBe(1);
  });

  test('after close, publish is inert', () => {
    const k = CellKernel.fanout<number>();
    const got: number[] = [];
    k.subscribe((v) => got.push(v));
    k.close();
    k.publish(1);
    expect(got).toEqual([]);
  });

  test('after close, subscribe completes immediately without registering or replaying', () => {
    const k = CellKernel.replay1(5);
    k.close();
    const got: number[] = [];
    let completed = 0;
    const dispose = k.subscribe({ next: (v) => got.push(v), complete: () => (completed += 1) });
    expect(got).toEqual([]); // no replay after close
    expect(completed).toBe(1);
    expect(k.size).toBe(0);
    expect(() => dispose()).not.toThrow();
  });

  test('fanout: after close, subscribe completes immediately and returns a callable no-op disposer', () => {
    // The fanout twin of the replay1 close-subscribe law above. The closed-kernel
    // branch returns NOOP_DISPOSER (a callable no-op), never null — a consumer
    // that threads `Lifetime.add(kernel.subscribe(...))` must be able to call the
    // returned Disposer unconditionally, even when it subscribed post-close.
    const k = CellKernel.fanout<number>();
    k.close();
    let completed = 0;
    const dispose = k.subscribe({ next: () => undefined, complete: () => (completed += 1) });
    expect(completed).toBe(1);
    expect(k.size).toBe(0);
    expect(typeof dispose).toBe('function');
    expect(() => dispose()).not.toThrow();
  });

  test('replay1: read() still returns the last value after close', () => {
    const k = CellKernel.replay1(0);
    k.publish(9);
    k.close();
    expect(k.read()).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// property: subscriber ordering + delivery completeness (seeded fast-check)
// ---------------------------------------------------------------------------

describe('CellKernel — property: subscriber ordering', () => {
  test('fanout: every publish reaches every subscriber, in subscription order, once each', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), fc.array(fc.integer(), { maxLength: 24 }), (numSubs, values) => {
        const k = CellKernel.fanout<number>();
        const order: number[] = [];
        for (let i = 0; i < numSubs; i++) {
          const id = i;
          k.subscribe(() => order.push(id));
        }
        for (const v of values) k.publish(v);
        const expected: number[] = [];
        for (let p = 0; p < values.length; p++) {
          for (let i = 0; i < numSubs; i++) expected.push(i);
        }
        expect(order).toEqual(expected);
      }),
      { seed: 0xce11, numRuns: 250 },
    );
  });

  test('replay1: publish fan-out preserves subscription order (replays excluded)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), fc.array(fc.integer(), { maxLength: 24 }), (numSubs, values) => {
        const k = CellKernel.replay1(0);
        const order: number[] = [];
        for (let i = 0; i < numSubs; i++) {
          const id = i;
          k.subscribe(() => order.push(id));
        }
        // Discard the per-subscribe replays; measure only the publish fan-out.
        order.length = 0;
        for (const v of values) k.publish(v);
        const expected: number[] = [];
        for (let p = 0; p < values.length; p++) {
          for (let i = 0; i < numSubs; i++) expected.push(i);
        }
        expect(order).toEqual(expected);
      }),
      { seed: 0xce12, numRuns: 250 },
    );
  });
});

// ---------------------------------------------------------------------------
// property: replay invariant (seeded fast-check)
// ---------------------------------------------------------------------------

describe('CellKernel — property: replay invariant', () => {
  test('replay1: read() equals the last published value and a late subscriber replays exactly it', () => {
    const initial = -999;
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 24 }), (values) => {
        const k = CellKernel.replay1(initial);
        for (const v of values) k.publish(v);
        const last = values.length === 0 ? initial : values[values.length - 1];
        expect(k.read()).toBe(last);
        const received: number[] = [];
        k.subscribe((v) => received.push(v));
        expect(received).toEqual([last]);
      }),
      { seed: 0xce13, numRuns: 250 },
    );
  });

  test('fanout: a late subscriber observes only values published after it subscribed', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { maxLength: 24 }),
        fc.array(fc.integer(), { maxLength: 24 }),
        (before, after) => {
          const k = CellKernel.fanout<number>();
          for (const v of before) k.publish(v);
          const received: number[] = [];
          k.subscribe((v) => received.push(v));
          for (const v of after) k.publish(v);
          expect(received).toEqual(after);
        },
      ),
      { seed: 0xce14, numRuns: 250 },
    );
  });
});
