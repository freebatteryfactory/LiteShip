/**
 * reactive-model — internal-consistency + law-coverage proof (Wave 5.5 cage).
 *
 * Proves the SINGLE ORACLE (`tests/support/reactive-model.ts`) is a faithful,
 * internally-consistent projection of the pinned law tables, NOT a drifting
 * second spec (LS-001):
 *
 *   1. fc.commands self-consistency — the reference {@link ModelChannel} is run
 *      against the REAL {@link CellKernel} SUT (the thing the CellKernel law
 *      table pins) over a random op walk; any divergence reds. This is the
 *      strongest form of "covers the law tables": the model is checked against
 *      the very implementation the laws describe.
 *   2. Byte-exact scenario parity — the model reproduces the EXACT observations
 *      pinned in `cell-kernel.test.ts` for every enumerated invariant I1-I8,
 *      including the reentrancy (I5) and mutation-during-notify dispatch-snapshot
 *      membership (I6, S6.1a) edges, AND agrees with CellKernel on each.
 *   3. Lifetime laws L1-L7 — {@link predictLifetime} is checked against the REAL
 *      {@link Lifetime} SUT.
 *   4. Emission policy — {all} reproduces the no-dedup law; {distinct} is a
 *      model capability (NOT a current-behavior claim — capture answers that).
 *   5. Determinism — the same history always yields the same observation.
 *   6. The coverage rail — every enumerated law maps to ≥1 model invariant.
 *
 * Seeds pinned (no unseeded fast-check).
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { hasTag } from '@liteship/error';
import { Lifetime } from '../../../packages/core/src/reactive/lifetime.js';
import type { LifetimeDisposeError } from '../../../packages/core/src/reactive/lifetime.js';
import {
  ModelChannel,
  cellKernelChannel,
  runModel,
  subscriberView,
  reactiveCommandArbs,
  reactiveModelRunSetup,
  predictLifetime,
  runLifetime,
  EmissionPolicies,
  LAW_COVERAGE,
  ENUMERATED_LAWS,
  type ChannelLike,
  type LifetimeSpec,
} from '../../support/reactive-model.js';

// ===========================================================================
// 1. fc.commands self-consistency — model reference ≡ CellKernel SUT
// ===========================================================================

describe('reactive-model — fc.commands self-consistency (model ≡ CellKernel)', () => {
  test('replay1: model reference agrees with CellKernel over a random op walk', () => {
    fc.assert(
      fc.property(fc.commands(reactiveCommandArbs('replay1'), { maxCommands: 60 }), (cmds) => {
        fc.modelRun(reactiveModelRunSetup('replay1', 0), cmds);
      }),
      { seed: 0xce55, numRuns: 300 },
    );
  });

  test('fanout: model reference agrees with CellKernel over a random op walk', () => {
    fc.assert(
      fc.property(fc.commands(reactiveCommandArbs('fanout'), { maxCommands: 60 }), (cmds) => {
        fc.modelRun(reactiveModelRunSetup('fanout', 0), cmds);
      }),
      { seed: 0xce56, numRuns: 300 },
    );
  });
});

// ===========================================================================
// 2. Byte-exact scenario parity with cell-kernel.test.ts (I1-I8)
// ===========================================================================

/** Run a scenario against BOTH the model channel and CellKernel; assert both agree and match the pin. */
function bothChannels(
  channel: 'replay1' | 'fanout',
  initial: number,
): { model: () => ChannelLike; real: () => ChannelLike } {
  return {
    model: () => (channel === 'replay1' ? ModelChannel.replay1(initial) : ModelChannel.fanout()),
    real: () => (channel === 'replay1' ? cellKernelChannel.replay1(initial) : cellKernelChannel.fanout()),
  };
}

const assertParity = <T>(
  scenario: (mk: () => ChannelLike) => T,
  mk: { model: () => ChannelLike; real: () => ChannelLike },
  pinned: T,
): void => {
  const modelResult = scenario(mk.model);
  const realResult = scenario(mk.real);
  expect(modelResult).toEqual(realResult); // model ≡ CellKernel
  expect(modelResult).toEqual(pinned); // and both == the pinned law-table observation
};

describe('reactive-model — I1 replay-current-on-subscribe', () => {
  test('replay1 replays current; fanout does not', () => {
    const replayScenario = (mk: () => ChannelLike): number[] => {
      const ch = mk();
      ch.publish(1);
      ch.publish(2);
      const got: number[] = [];
      ch.subscribe({ next: (v) => got.push(v) });
      return got;
    };
    assertParity(replayScenario, bothChannels('replay1', 0), [2]);

    const noReplayScenario = (mk: () => ChannelLike): number[] => {
      const ch = mk();
      ch.publish(1);
      const got: number[] = [];
      ch.subscribe({ next: (v) => got.push(v) });
      return got;
    };
    assertParity(noReplayScenario, bothChannels('fanout', 0), []);
  });
});

describe('reactive-model — I2 read == last-published-or-initial', () => {
  test('replay1 read tracks the slot', () => {
    const scenario = (mk: () => ChannelLike): number[] => {
      const ch = mk();
      const reads: number[] = [];
      reads.push(ch.read!());
      ch.publish(1);
      ch.publish(2);
      reads.push(ch.read!());
      return reads;
    };
    assertParity(scenario, bothChannels('replay1', 42), [42, 2]);
  });
});

describe('reactive-model — I3 subscriber ordering', () => {
  test('fan-out visits subscribers in subscription order (both channels)', () => {
    const scenario = (mk: () => ChannelLike): string[] => {
      const ch = mk();
      const order: string[] = [];
      ch.subscribe({ next: () => order.push('a') });
      ch.subscribe({ next: () => order.push('b') });
      ch.subscribe({ next: () => order.push('c') });
      order.length = 0; // discard replays
      ch.publish(1);
      return order;
    };
    assertParity(scenario, bothChannels('replay1', 0), ['a', 'b', 'c']);
    assertParity(scenario, bothChannels('fanout', 0), ['a', 'b', 'c']);
  });
});

describe('reactive-model — I4 duplicate-value policy (no dedup under {all})', () => {
  test('equal consecutive values are all delivered (both channels)', () => {
    const scenario = (mk: () => ChannelLike): number[] => {
      const ch = mk();
      const got: number[] = [];
      ch.subscribe({ next: (v) => got.push(v) });
      ch.publish(7);
      ch.publish(7);
      ch.publish(7);
      // Drop the replay1 replay(0) prefix for a channel-agnostic assertion.
      return got.filter((v) => v === 7);
    };
    assertParity(scenario, bothChannels('replay1', 0), [7, 7, 7]);
    assertParity(scenario, bothChannels('fanout', 0), [7, 7, 7]);
  });
});

describe('reactive-model — I5 reentrancy (publish during notify)', () => {
  test('replay1: read() inside a reentrant publish observes the new value', () => {
    const scenario = (mk: () => ChannelLike): { seen: number[]; readInside: number[]; read: number } => {
      const ch = mk();
      const seen: number[] = [];
      const readInside: number[] = [];
      let fired = false;
      ch.subscribe({
        next: (v) => {
          seen.push(v);
          if (!fired && v === 1) {
            fired = true;
            ch.publish(2);
            readInside.push(ch.read!());
          }
        },
      });
      ch.publish(1);
      return { seen, readInside, read: ch.read!() };
    };
    assertParity(scenario, bothChannels('replay1', 0), { seen: [0, 1, 2], readInside: [2], read: 2 });
  });

  test('fanout: a reentrant publish runs a full nested fan-out before the outer resumes', () => {
    const scenario = (mk: () => ChannelLike): { a: number[]; b: number[] } => {
      const ch = mk();
      const a: number[] = [];
      const b: number[] = [];
      let fired = false;
      ch.subscribe({
        next: (v) => {
          a.push(v);
          if (!fired && v === 1) {
            fired = true;
            ch.publish(9);
          }
        },
      });
      ch.subscribe({ next: (v) => b.push(v) });
      ch.publish(1);
      return { a, b };
    };
    assertParity(scenario, bothChannels('fanout', 0), { a: [1, 9], b: [9, 1] });
  });
});

describe('reactive-model — I6 mutation during notify (dispatch-snapshot membership; S6.1a)', () => {
  test('replay1 (dispatch-snapshot): a subscriber added mid-fan-out MISSES the in-flight value — replay only, no double-spend', () => {
    const scenario = (mk: () => ChannelLike): { a: number[]; late: number[] } => {
      const ch = mk();
      const a: number[] = [];
      const late: number[] = [];
      let added = false;
      ch.subscribe({
        next: (v) => {
          a.push(v);
          if (v === 1 && !added) {
            added = true;
            ch.subscribe({ next: (w) => late.push(w) });
          }
        },
      });
      ch.publish(1);
      return { a, late };
    };
    // replay(0)+publish(1) => a=[0,1]. `late` is added mid-fan-out of publish(1), so
    // it is OUTSIDE that commit's dispatch membership: it observes the commit exactly
    // once via its replay(1) and is NOT re-delivered the in-flight 1 (the S6.1a
    // double-spend `[1,1]` — replay + live-set of one committed state — is retired).
    assertParity(scenario, bothChannels('replay1', 0), { a: [0, 1], late: [1] });
  });

  test('fanout (snapshot): a subscriber added mid-fan-out MISSES the in-flight value', () => {
    const scenario = (mk: () => ChannelLike): { a: number[]; late: number[]; after: number[] } => {
      const ch = mk();
      const a: number[] = [];
      const late: number[] = [];
      let added = false;
      ch.subscribe({
        next: (v) => {
          a.push(v);
          if (v === 1 && !added) {
            added = true;
            ch.subscribe({ next: (w) => late.push(w) });
          }
        },
      });
      ch.publish(1);
      const midpoint = [...late];
      ch.publish(2);
      return { a, late: midpoint, after: late };
    };
    assertParity(scenario, bothChannels('fanout', 0), { a: [1, 2], late: [], after: [2] });
  });

  test('both: a subscriber disposed mid-fan-out is skipped', () => {
    // fanout: no replay, so publish drives it.
    const fanoutScenario = (mk: () => ChannelLike): { a: number[]; b: number[] } => {
      const ch = mk();
      const a: number[] = [];
      const b: number[] = [];
      let disposeB: () => void = () => undefined;
      ch.subscribe({
        next: (v) => {
          a.push(v);
          disposeB();
        },
      });
      disposeB = ch.subscribe({ next: (v) => b.push(v) });
      ch.publish(1);
      return { a, b };
    };
    // replay1: the initial replay drives the first sink's callback (which disposes B).
    const replay1Scenario = (mk: () => ChannelLike): { a: number[]; b: number[] } => {
      const ch = mk();
      const a: number[] = [];
      const b: number[] = [];
      let disposeB: () => void = () => undefined;
      // B subscribes first (replays 0), then A; A's publish(1) fan-out disposes B before it is reached.
      disposeB = ch.subscribe({ next: (v) => b.push(v) });
      b.length = 0;
      ch.subscribe({
        next: (v) => {
          a.push(v);
          disposeB();
        },
      });
      ch.publish(1);
      return { a, b };
    };
    assertParity(fanoutScenario, bothChannels('fanout', 0), { a: [1], b: [] });
    assertParity(replay1Scenario, bothChannels('replay1', 0), { a: [0, 1], b: [] });
  });
});

describe('reactive-model — I7 disposer idempotence', () => {
  test('a disposed subscriber stops receiving; a repeat dispose is a no-op; two subscribes = two registrations', () => {
    const scenario = (mk: () => ChannelLike): { got: number[]; other: number[] } => {
      const ch = mk();
      const got: number[] = [];
      const other: number[] = [];
      const dispose = ch.subscribe({ next: (v) => got.push(v) });
      ch.subscribe({ next: (v) => other.push(v) }); // same shape, distinct registration
      ch.publish(1);
      dispose();
      dispose(); // idempotent — removes nothing more
      ch.publish(2);
      return { got: got.filter((v) => v > 0), other: other.filter((v) => v > 0) };
    };
    assertParity(scenario, bothChannels('fanout', 0), { got: [1], other: [1, 2] });
    assertParity(scenario, bothChannels('replay1', 0), { got: [1], other: [1, 2] });
  });
});

describe('reactive-model — I8 close-completes', () => {
  test('close completes each subscriber once, then publish is inert', () => {
    const scenario = (mk: () => ChannelLike): { got: number[]; completions: number } => {
      const ch = mk();
      const got: number[] = [];
      let completions = 0;
      ch.subscribe({ next: (v) => got.push(v), complete: () => (completions += 1) });
      ch.close();
      ch.publish(99); // inert
      return { got: got.filter((v) => v > 0), completions };
    };
    assertParity(scenario, bothChannels('fanout', 0), { got: [], completions: 1 });
    assertParity(scenario, bothChannels('replay1', 0), { got: [], completions: 1 });
  });

  test('after close, subscribe completes immediately without registering or replaying (replay1)', () => {
    const scenario = (mk: () => ChannelLike): { got: number[]; completed: number } => {
      const ch = mk();
      ch.publish(5);
      ch.close();
      const got: number[] = [];
      let completed = 0;
      ch.subscribe({ next: (v) => got.push(v), complete: () => (completed += 1) });
      return { got, completed };
    };
    assertParity(scenario, bothChannels('replay1', 0), { got: [], completed: 1 });
  });

  test('replay1: read() still returns the last value after close', () => {
    const scenario = (mk: () => ChannelLike): number => {
      const ch = mk();
      ch.publish(9);
      ch.close();
      return ch.read!();
    };
    assertParity(scenario, bothChannels('replay1', 0), 9);
  });
});

// ===========================================================================
// 3. runModel over the op vocabulary + determinism
// ===========================================================================

describe('reactive-model — runModel (OpHistory → Observation)', () => {
  test('replay1: a full history folds to the expected observation', () => {
    const obs = runModel(
      [
        { _tag: 'subscribe', sub: 's0' },
        { _tag: 'set', value: 1 },
        { _tag: 'update', delta: 4 },
        { _tag: 'read' },
        { _tag: 'subscribe', sub: 's1' },
        { _tag: 'set', value: 5 },
        { _tag: 'unsubscribe', sub: 's0' },
        { _tag: 'set', value: 6 },
        { _tag: 'complete' },
      ],
      { channel: 'replay1', initial: 0 },
    );
    expect(subscriberView(obs, 's0')).toEqual([0, 1, 5, 5]); // replay0, set1, update->5, set5 (unsub before set6)
    expect(subscriberView(obs, 's1')).toEqual([5, 5, 6]); // replay5, set5, set6
    expect(obs.reads).toEqual([5]);
    expect(obs.completions).toEqual(['s1']); // s0 unsubscribed before close
    expect(obs.closed).toBe(true);
    expect(obs.disposed).toBe(false);
  });

  test('dispose sets only the disposed flag (reactive coupling deferred to Wave 6 — reported gap)', () => {
    const obs = runModel(
      [
        { _tag: 'subscribe', sub: 's0' },
        { _tag: 'dispose' },
        { _tag: 'set', value: 1 }, // NOT inert — dispose does not close the kernel (unpinned coupling)
      ],
      { channel: 'replay1', initial: 0 },
    );
    expect(obs.disposed).toBe(true);
    expect(obs.closed).toBe(false);
    expect(subscriberView(obs, 's0')).toEqual([0, 1]);
    expect(obs.completions).toEqual([]); // dispose did NOT complete — the Wave-6 coupling the differential will pin
  });

  test('fanout: late subscriber misses prior crossings', () => {
    const obs = runModel(
      [
        { _tag: 'publishCrossing', value: 1 },
        { _tag: 'subscribe', sub: 's0' },
        { _tag: 'publishCrossing', value: 2 },
      ],
      { channel: 'fanout' },
    );
    expect(subscriberView(obs, 's0')).toEqual([2]);
  });

  test('determinism: the same history yields an identical observation', () => {
    const history = [
      { _tag: 'subscribe', sub: 'a' },
      { _tag: 'set', value: 3 },
      { _tag: 'set', value: 3 },
      { _tag: 'subscribe', sub: 'b' },
      { _tag: 'set', value: 7 },
    ] as const;
    const first = runModel([...history], { channel: 'replay1', initial: 0 });
    const second = runModel([...history], { channel: 'replay1', initial: 0 });
    expect(first).toEqual(second);
  });
});

// ===========================================================================
// 4. Emission policy — {all} pinned; {distinct} a capability, NOT a claim
// ===========================================================================

describe('reactive-model — emission policy (third axis)', () => {
  test('{all}: equal-consecutive publishes are all delivered (the pinned I4 law)', () => {
    const ch = ModelChannel.replay1(0, EmissionPolicies.all());
    const got: number[] = [];
    ch.subscribe({ next: (v) => got.push(v) });
    ch.publish(5);
    ch.publish(5);
    ch.publish(5);
    expect(got).toEqual([0, 5, 5, 5]);
  });

  test('{distinct}: equal-consecutive publishes are suppressed (a Wave-6 CAPABILITY, not a current-Cell claim)', () => {
    // This asserts the MODEL POLICY definition only. Whether any current primitive
    // dedups is answered by Foundation-A capture (reactive-observations.json), never here.
    const ch = ModelChannel.replay1(0, EmissionPolicies.distinct());
    const got: number[] = [];
    ch.subscribe({ next: (v) => got.push(v) });
    ch.publish(5);
    ch.publish(5); // suppressed
    ch.publish(6);
    ch.publish(6); // suppressed
    ch.publish(5);
    expect(got).toEqual([0, 5, 6, 5]);
  });
});

// ===========================================================================
// 4b. Reentrancy policy — the Wave 6 nested-write ruling (fourth axis).
//     'synchronous' (default, pinned I5) reorders; 'deferred' (Cell/Store's
//     product law: async-append / glitch-free) preserves the captured Effect
//     behavior. The model gains the 'deferred' arm so the differential oracle
//     asserts Cell's async-append POSITIVELY, not as a merely-tolerated delta.
// ===========================================================================

describe('reactive-model — reentrancy policy (nested-write ruling)', () => {
  const nestedWrite = (reentrancy: 'synchronous' | 'deferred'): { a: number[]; b: number[]; read: number } => {
    const ch = ModelChannel.replay1(0, EmissionPolicies.all(), reentrancy);
    const a: number[] = [];
    const b: number[] = [];
    let fired = false;
    ch.subscribe({
      next: (v) => {
        a.push(v);
        if (!fired && v === 1) {
          fired = true;
          ch.publish(99); // nested write from within a's delivery of the outer 1
        }
      },
    });
    ch.subscribe({ next: (v) => b.push(v) });
    ch.publish(1);
    return { a, b, read: ch.read!() };
  };

  test("'synchronous' (default): the second subscriber sees the REORDERED [0,99,1] (pinned I5)", () => {
    const { a, b, read } = nestedWrite('synchronous');
    expect(a).toEqual([0, 1, 99]);
    expect(b).toEqual([0, 99, 1]);
    expect(read).toBe(99);
  });

  test("'deferred': the second subscriber sees GLITCH-FREE async-append [0,1,99] (Cell/Store product law)", () => {
    const { a, b, read } = nestedWrite('deferred');
    // b's terminal delivery (99) == read() — no stale-terminal glitch; a and b
    // agree on the total order. This is the captured Effect behavior preserved.
    expect(a).toEqual([0, 1, 99]);
    expect(b).toEqual([0, 1, 99]);
    expect(read).toBe(99);
  });

  test("'deferred' with no nested write is identical to a plain synchronous publish", () => {
    const ch = ModelChannel.replay1(0, EmissionPolicies.all(), 'deferred');
    const got: number[] = [];
    ch.subscribe({ next: (v) => got.push(v) });
    ch.publish(1);
    ch.publish(2);
    expect(got).toEqual([0, 1, 2]);
    expect(ch.read!()).toBe(2);
  });
});

// ===========================================================================
// 5. Lifetime laws L1-L7 — predictLifetime ≡ real Lifetime
// ===========================================================================

describe('reactive-model — Lifetime L1 LIFO', () => {
  test('finalizers run in reverse registration order, for any count', async () => {
    const seeds = fc.sample(fc.integer({ min: 1, max: 40 }), { seed: 0x11fe, numRuns: 40 });
    for (const n of seeds) {
      const ops: LifetimeSpec[] = [];
      for (let i = 0; i < n; i++) ops.push({ _tag: 'add', id: `f${i}`, kind: 'sync' });
      ops.push({ _tag: 'dispose' });
      const predicted = predictLifetime(ops);
      const actual = await runLifetime(ops);
      const expectedOrder = Array.from({ length: n }, (_, i) => `f${n - 1 - i}`);
      expect(predicted.runOrder).toEqual(expectedOrder);
      expect(actual.runOrder).toEqual(predicted.runOrder);
    }
  });
});

describe('reactive-model — Lifetime L2 sync-close-before-async-dispose', () => {
  test('sync finalizers execute synchronously within dispose(); async settle before the promise resolves', async () => {
    const events: string[] = [];
    const lt = Lifetime.make();
    let releaseAsync: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseAsync = resolve;
    });
    lt.add(async () => {
      await gate;
      events.push('async');
    }); // registered first -> runs last
    lt.add(() => {
      events.push('sync');
    }); // registered last -> runs first
    const pending = lt.dispose();
    expect(events).toEqual(['sync']); // sync landed synchronously, before any await
    releaseAsync();
    await pending;
    expect(events).toEqual(['sync', 'async']);
  });
});

describe('reactive-model — Lifetime L3 exactly-once / idempotent', () => {
  test('a second dispose runs nothing; predict and real agree', async () => {
    const ops: LifetimeSpec[] = [
      { _tag: 'add', id: 'a', kind: 'sync' },
      { _tag: 'add', id: 'b', kind: 'sync' },
      { _tag: 'dispose' },
      { _tag: 'dispose' },
    ];
    const predicted = predictLifetime(ops);
    const actual = await runLifetime(ops);
    expect(predicted.runOrder).toEqual(['b', 'a']);
    expect(actual.runOrder).toEqual(['b', 'a']); // not re-run by the second dispose
    expect(actual.disposed).toBe(true);
  });
});

describe('reactive-model — Lifetime L4 late registration', () => {
  test('an add after dispose runs immediately, exactly once; predict and real agree', async () => {
    const ops: LifetimeSpec[] = [
      { _tag: 'add', id: 'a', kind: 'sync' },
      { _tag: 'dispose' },
      { _tag: 'add', id: 'late', kind: 'sync' },
      { _tag: 'dispose' },
    ];
    const predicted = predictLifetime(ops);
    const actual = await runLifetime(ops);
    expect(predicted.runOrder).toEqual(['a', 'late']);
    expect(actual.runOrder).toEqual(['a', 'late']);
  });
});

describe('reactive-model — Lifetime L5 remove handle', () => {
  test('a removed finalizer does not run; predict and real agree', async () => {
    const ops: LifetimeSpec[] = [
      { _tag: 'add', id: 'a', kind: 'sync' },
      { _tag: 'add', id: 'b', kind: 'sync' },
      { _tag: 'remove', id: 'a' },
      { _tag: 'dispose' },
    ];
    const predicted = predictLifetime(ops);
    const actual = await runLifetime(ops);
    expect(predicted.runOrder).toEqual(['b']);
    expect(actual.runOrder).toEqual(['b']);
  });
});

describe('reactive-model — Lifetime L6 aggregate failure', () => {
  test('all finalizers run even when some throw; failures fold LIFO into one tagged error', async () => {
    const ops: LifetimeSpec[] = [
      { _tag: 'add', id: 'e1', kind: 'sync', fails: true }, // runs LAST
      { _tag: 'add', id: 'mid', kind: 'sync' },
      { _tag: 'add', id: 'e3', kind: 'sync', fails: true }, // runs FIRST
      { _tag: 'dispose' },
    ];
    const predicted = predictLifetime(ops);
    const actual = await runLifetime(ops);
    expect(predicted.runOrder).toEqual(['e3', 'mid', 'e1']);
    expect(actual.runOrder).toEqual(['e3', 'mid', 'e1']); // mid ran despite the throws
    expect(predicted.failed).toEqual(['e3', 'e1']); // LIFO invocation order
    expect(actual.failed).toEqual(['e3', 'e1']);

    // The real aggregate is one tagged LifetimeDisposeError.
    const lt = Lifetime.make();
    lt.add(() => {
      throw new Error('boom');
    });
    const rejection = await lt.dispose().then(
      () => null,
      (error: unknown) => error,
    );
    expect(hasTag(rejection, 'LifetimeDisposeError')).toBe(true);
    expect((rejection as LifetimeDisposeError).causes.length).toBe(1);
  });
});

describe('reactive-model — Lifetime L7 AbortSignal projection', () => {
  test('signal aborts synchronously at dispose start; finalizers observe an already-aborted signal', async () => {
    const lt = Lifetime.make();
    let abortedWhenRun: boolean | undefined;
    lt.add(() => {
      abortedWhenRun = lt.signal.aborted;
    });
    expect(lt.signal.aborted).toBe(false);
    const pending = lt.dispose();
    expect(lt.signal.aborted).toBe(true); // synchronous at dispose start
    await pending;
    expect(abortedWhenRun).toBe(true);
  });
});

// ===========================================================================
// 6. The coverage rail — every enumerated law maps to ≥1 model invariant
// ===========================================================================

describe('reactive-model — law-coverage rail', () => {
  test('the enumeration is the two law tables: 8 CellKernel invariants + 7 Lifetime invariants', () => {
    expect(ENUMERATED_LAWS.length).toBe(15);
    expect(ENUMERATED_LAWS.filter((id) => id.startsWith('I')).length).toBe(8);
    expect(ENUMERATED_LAWS.filter((id) => id.startsWith('L')).length).toBe(7);
  });

  test('every enumerated law is covered exactly once, each with ≥1 model invariant', () => {
    const covered = LAW_COVERAGE.map((c) => c.law);
    // no duplicates
    expect(new Set(covered).size).toBe(covered.length);
    // exact set equality with the enumeration — a law cannot be silently omitted,
    // and no coverage entry can reference a non-enumerated law.
    expect([...covered].sort()).toEqual([...ENUMERATED_LAWS].sort());
    for (const entry of LAW_COVERAGE) {
      expect(entry.modelInvariants.length).toBeGreaterThan(0);
      expect(entry.statement.length).toBeGreaterThan(0);
      expect(entry.source.length).toBeGreaterThan(0);
    }
  });
});
