/**
 * LiveCell — protocol envelope, crossings, kind, _tag, content addressing
 * (Wave 6: plain CellKernel, Effect-free; migrated ATOMICALLY with Cell).
 *
 * RED-FIRST kernel-preservation proof: fnv1a ids + HLC bumps + crossing fan-out
 * are BYTE-IDENTICAL to the Wave 5.5 capture
 * (`tests/fixtures/reactive-capture/live-cell.json`), and the S2.3 interleave
 * window is CLOSED — `set`/`update` record the mutation BEFORE the value fans out,
 * so a subscriber that reads `envelope()` from within its own delivery observes
 * the already-consistent envelope.
 */

import { describe, test, expect } from 'vitest';
import { LiveCell, HLC, StateName, Boundary, fixedClock, manualClock } from '@liteship/core';
import type { CellKind, BoundaryCrossing } from '@liteship/core';

const collectCrossings = (cell: {
  crossings: LiveCell<CellKind, unknown>['crossings'];
}): BoundaryCrossing<string>[] => {
  const out: BoundaryCrossing<string>[] = [];
  cell.crossings.subscribe((c) => out.push(c));
  return out;
};

// ---------------------------------------------------------------------------
// Construction and _tag
// ---------------------------------------------------------------------------

describe('LiveCell', () => {
  test('_tag is LiveCell', () => {
    expect(LiveCell.make('state', 0)._tag).toBe('LiveCell');
  });

  test('kind matches constructor argument', () => {
    expect(LiveCell.make('boundary', 'test').kind).toBe('boundary');
  });

  test('accepts all valid CellKind values', () => {
    const kinds: CellKind[] = [
      'boundary',
      'state',
      'output',
      'signal',
      'transition',
      'timeline',
      'compositor',
      'blend',
      'css',
      'glsl',
      'wgsl',
      'aria',
      'ai',
    ];
    for (const kind of kinds) {
      expect(LiveCell.make(kind, null).kind).toBe(kind);
    }
  });

  // -------------------------------------------------------------------------
  // read / set / update (value channel, inherited from Cell)
  // -------------------------------------------------------------------------

  test('read returns initial value', () => {
    expect(LiveCell.make('state', 42).read()).toBe(42);
  });

  test('set updates value', () => {
    const cell = LiveCell.make('state', 'hello');
    cell.set('world');
    expect(cell.read()).toBe('world');
  });

  test('update transforms value', () => {
    const cell = LiveCell.make('state', 10);
    cell.update((n) => n * 2);
    expect(cell.read()).toBe(20);
  });

  test('update also advances envelope metadata and content address', () => {
    const cell = LiveCell.make('state', { count: 1 });
    const before = cell.envelope();
    cell.update((current) => ({ count: current.count + 1 }));
    const after = cell.envelope();
    expect(after.value).toEqual({ count: 2 });
    expect(after.meta.version).toBe(before.meta.version + 1);
    expect(after.id).not.toBe(before.id);
  });

  // -------------------------------------------------------------------------
  // Envelope
  // -------------------------------------------------------------------------

  test('envelope has correct shape', () => {
    const env = LiveCell.make('signal', { x: 1 }).envelope();
    expect(env.kind).toBe('signal');
    expect(env.value).toEqual({ x: 1 });
    expect(env.meta.version).toBe(1);
    expect(env.meta.created).toBeDefined();
    expect(env.meta.updated).toBeDefined();
    expect(env.id).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  });

  test('content address is deterministic: same kind+value yields the same id', () => {
    const a = LiveCell.make('state', { x: 1, y: 2 }).envelope();
    const b = LiveCell.make('state', { x: 1, y: 2 }).envelope();
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  });

  test('content address is permutation-stable on object values (CanonicalCbor sorts keys)', () => {
    const a = LiveCell.make('state', { x: 1, y: 2 }).envelope();
    const b = LiveCell.make('state', { y: 2, x: 1 }).envelope();
    expect(a.id).toBe(b.id);
  });

  test('envelope version increments on set', () => {
    const cell = LiveCell.make('state', 'a');
    expect(cell.envelope().meta.version).toBe(1);
    cell.set('b');
    expect(cell.envelope().meta.version).toBe(2);
  });

  test('envelope content address changes with value', () => {
    const cell = LiveCell.make('state', 'first');
    const id1 = cell.envelope().id;
    cell.set('second');
    expect(cell.envelope().id).not.toBe(id1);
  });

  test('envelope updated HLC advances on mutation (created <= updated)', () => {
    const cell = LiveCell.make('state', 0);
    const created = cell.envelope().meta.created;
    cell.set(1);
    const updated = cell.envelope().meta.updated;
    expect(HLC.compare(created, updated)).toBeLessThanOrEqual(0);
  });

  test('different kind with same value produces a different content address', () => {
    const a = LiveCell.make('state', { x: 1 }).envelope();
    const b = LiveCell.make('signal', { x: 1 }).envelope();
    expect(a.id).not.toBe(b.id);
  });

  // -------------------------------------------------------------------------
  // Crossings (manual, no-replay fan-out)
  // -------------------------------------------------------------------------

  test('publishCrossing emits on the crossings channel', () => {
    const cell = LiveCell.make('boundary', 0);
    const crossings = collectCrossings(cell);
    cell.publishCrossing({
      from: StateName('mobile'),
      to: StateName('desktop'),
      timestamp: HLC.create('test'),
      value: 1024,
    });
    expect(crossings).toHaveLength(1);
    expect(crossings[0]!.from).toBe('mobile');
    expect(crossings[0]!.to).toBe('desktop');
    expect(crossings[0]!.value).toBe(1024);
  });

  test('multiple crossings arrive in order', () => {
    const cell = LiveCell.make('boundary', 0);
    const crossings = collectCrossings(cell);
    const mk = (from: string, to: string, val: number): BoundaryCrossing<string> => ({
      from: StateName(from),
      to: StateName(to),
      timestamp: HLC.create('test'),
      value: val,
    });
    cell.publishCrossing(mk('a', 'b', 1));
    cell.publishCrossing(mk('b', 'c', 2));
    cell.publishCrossing(mk('c', 'd', 3));
    expect(crossings.map((c) => c.value)).toEqual([1, 2, 3]);
  });

  test('crossings are no-replay: a late subscriber misses prior crossings', () => {
    const cell = LiveCell.make('boundary', 0);
    cell.publishCrossing({ from: StateName('a'), to: StateName('b'), timestamp: HLC.create('t'), value: 1 });
    const late: BoundaryCrossing<string>[] = [];
    cell.crossings.subscribe((c) => late.push(c));
    expect(late).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Changes channel (value)
  // -------------------------------------------------------------------------

  test('value subscribe replays current then delivers every set', () => {
    const cell = LiveCell.make('state', 0);
    const values: number[] = [];
    cell.subscribe((v) => values.push(v));
    cell.set(10);
    cell.set(20);
    expect(values).toEqual([0, 10, 20]);
  });

  test('S2.3b: a reentrant set(undefined) is DRAINED, not dropped (value type includes undefined)', () => {
    // The serialized-commit drain must run a dequeued value unconditionally; a
    // `next !== undefined` guard would silently discard a legitimately-queued
    // `undefined` for a LiveCell whose value type includes it.
    const cell = LiveCell.make<'state', number | undefined>('state', 1);
    const seen: (number | undefined)[] = [];
    let nested = false;
    cell.subscribe((v) => {
      seen.push(v);
      if (v === 2 && !nested) {
        nested = true;
        cell.set(undefined); // reentrant write, queued while the outer commit runs
      }
    });
    cell.set(2);
    expect(seen).toEqual([1, 2, undefined]); // the nested undefined WAS delivered
    expect(cell.read()).toBeUndefined();
    expect(cell.envelope().meta.version).toBe(3); // init(1) → set(2) → set(undefined)
  });

  test('S2.3b: reentrant update() composes on FRESH drained state — two +1 updates land 3, not a lost 2', () => {
    // Two reentrant RELATIVE updates issued while the outer set(1) commit is in
    // flight. The commit queues the OPERATION `(n) => n + 1`, applied against the
    // cell's state AT DRAIN TIME. If instead `f` were evaluated EAGERLY against
    // `cell.read()` at call time (queuing a pre-computed value), BOTH updates would
    // read the same pre-drain 1 and enqueue the value 2 — the second write clobbering
    // the first, landing a lost-update 2. Deferring `f` to the drain composes them.
    const cell = LiveCell.make('state', 0);
    let fired = false;
    cell.subscribe((v) => {
      if (v === 1 && !fired) {
        fired = true;
        cell.update((n) => n + 1);
        cell.update((n) => n + 1);
      }
    });
    cell.set(1);
    expect(cell.read()).toBe(3); // 1 → (+1) → 2 → (+1) → 3, NOT a clobbered 2
    expect(cell.envelope().meta.version).toBe(4); // init(0) → set(1) → +1 → +1
  });

  test('S2.3b: two subscribers each issuing one reentrant update(+1) compose across the drain (3, not 2)', () => {
    // The cross-subscriber interleaving: both value subscribers observe 1 and each
    // enqueue ONE `(n) => n + 1`. Eager pre-drain evaluation would have both read 1
    // and enqueue 2 (lost update → 2); operation-queuing applies the second against
    // the first's already-drained result → 3.
    const cell = LiveCell.make('state', 0);
    let firedA = false;
    let firedB = false;
    cell.subscribe((v) => {
      if (v === 1 && !firedA) {
        firedA = true;
        cell.update((n) => n + 1);
      }
    });
    cell.subscribe((v) => {
      if (v === 1 && !firedB) {
        firedB = true;
        cell.update((n) => n + 1);
      }
    });
    cell.set(1);
    expect(cell.read()).toBe(3);
    expect(cell.envelope().meta.version).toBe(4); // init(0) → set(1) → +1 → +1
  });
});

// ---------------------------------------------------------------------------
// LiveCell.makeBoundary — automatic crossing on state transition
// ---------------------------------------------------------------------------

describe('LiveCell.makeBoundary', () => {
  const viewport = Boundary.make({
    input: 'viewport.width',
    at: [
      [0, 'mobile'],
      [768, 'tablet'],
      [1024, 'desktop'],
    ] as const,
  });

  test('_tag is LiveCell and kind is boundary', () => {
    const cell = LiveCell.makeBoundary(viewport, 400);
    expect(cell._tag).toBe('LiveCell');
    expect(cell.kind).toBe('boundary');
  });

  test('auto-publishes crossing when value crosses threshold', () => {
    const cell = LiveCell.makeBoundary(viewport, 400); // mobile
    const crossings = collectCrossings(cell);
    cell.set(1200); // desktop
    expect(crossings).toHaveLength(1);
    expect(crossings[0]!.from).toBe('mobile');
    expect(crossings[0]!.to).toBe('desktop');
    expect(crossings[0]!.value).toBe(1200);
  });

  test('does not publish crossing when the state stays the same', () => {
    const cell = LiveCell.makeBoundary(viewport, 400); // mobile
    const crossings = collectCrossings(cell);
    cell.set(500); // still mobile
    cell.set(600); // still mobile
    expect(crossings).toEqual([]);
  });

  test('publishes the crossing even when a VALUE subscriber throws (the edge is never lost)', () => {
    // The mutation is already committed (envelope bumped, prevState advanced to `to`) before the
    // value fan-out, so a throwing value subscriber must NOT swallow the crossing edge — a
    // downstream crossing consumer would otherwise permanently miss it and no later write could
    // reconstruct it. The listener fault still surfaces (rethrown after the crossing publishes).
    const cell = LiveCell.makeBoundary(viewport, 400); // mobile
    const crossings = collectCrossings(cell);
    // Throw only on the crossing write (replay-1 delivers the initial 400 at subscribe time).
    cell.subscribe((v) => {
      if (v === 1200) throw new Error('value subscriber boom');
    });
    expect(() => cell.set(1200)).toThrow(); // desktop — the value fault still surfaces
    expect(crossings).toHaveLength(1);
    expect(crossings[0]!.from).toBe('mobile');
    expect(crossings[0]!.to).toBe('desktop');
    expect(crossings[0]!.value).toBe(1200);
  });

  test('boundary update publishes crossings through the update path too', () => {
    const cell = LiveCell.makeBoundary(viewport, 400);
    const crossings = collectCrossings(cell);
    cell.update(() => 900); // tablet
    expect(crossings).toHaveLength(1);
    expect(crossings[0]!.from).toBe('mobile');
    expect(crossings[0]!.to).toBe('tablet');
    expect(crossings[0]!.value).toBe(900);
  });

  test('publishes multiple crossings for sequential transitions', () => {
    const cell = LiveCell.makeBoundary(viewport, 300); // mobile
    const crossings = collectCrossings(cell);
    cell.set(800); // tablet
    cell.set(1100); // desktop
    expect(crossings.map((c) => [String(c.from), String(c.to)])).toEqual([
      ['mobile', 'tablet'],
      ['tablet', 'desktop'],
    ]);
  });

  test('crossing carries an HLC timestamp stamped with the live-cell node id', () => {
    const cell = LiveCell.makeBoundary(viewport, 400);
    const crossings = collectCrossings(cell);
    cell.set(1200);
    expect(crossings[0]!.timestamp).toBeDefined();
    expect(crossings[0]!.timestamp.node_id).toBe('live-cell-boundary');
  });

  test('crossing works in reverse direction (desktop -> mobile)', () => {
    const cell = LiveCell.makeBoundary(viewport, 1200); // desktop
    const crossings = collectCrossings(cell);
    cell.set(300); // mobile
    expect(crossings[0]!.from).toBe('desktop');
    expect(crossings[0]!.to).toBe('mobile');
    expect(crossings[0]!.value).toBe(300);
  });

  test('envelope still tracks correctly alongside crossings', () => {
    const cell = LiveCell.makeBoundary(viewport, 400);
    const e1 = cell.envelope();
    cell.set(1200);
    const e2 = cell.envelope();
    expect(e1.value).toBe(400);
    expect(e2.value).toBe(1200);
    expect(e2.meta.version).toBe(2);
    expect(e1.id).not.toBe(e2.id);
  });

  test('S2.3b nested write: crossings publish in commit order and the A→B subscriber never reads the advanced envelope', () => {
    // An outer A→B (mobile→tablet) commit whose value subscriber performs a nested
    // B→C (tablet→desktop) write. Before serializing the whole commit unit, only the
    // Cell value fan-out was deferred: the nested recordMutation + crossing publish
    // ran synchronously inside the nested call, so B→C published BEFORE A→B and the
    // A→B subscriber read the already-advanced (desktop / version 3) envelope.
    const cell = LiveCell.makeBoundary(viewport, 400); // mobile
    const crossings = collectCrossings(cell);

    let nested = false;
    let envelopeAfterNestedWrite: { value: number; version: number } | null = null;
    cell.subscribe((value) => {
      if (value === 800 && !nested) {
        nested = true;
        cell.set(1200); // nested B→C write FIRST …
        const env = cell.envelope(); // … then read: must STILL be the A→B envelope
        envelopeAfterNestedWrite = { value: env.value as number, version: env.meta.version };
      }
    });

    cell.set(800); // mobile -> tablet (the outer commit)

    // Commit order, NOT reversed: A→B (mobile→tablet) then B→C (tablet→desktop).
    expect(crossings.map((c) => [String(c.from), String(c.to), c.value])).toEqual([
      ['mobile', 'tablet', 800],
      ['tablet', 'desktop', 1200],
    ]);
    // Even AFTER issuing the nested write, the A→B subscriber still reads the A→B
    // envelope (value 800, version 2) — the nested commit is deferred, not applied.
    expect(envelopeAfterNestedWrite).toEqual({ value: 800, version: 2 });
    // Final envelope reflects the last (drained) commit.
    const final = cell.envelope();
    expect(final.value).toBe(1200);
    expect(final.meta.version).toBe(3);
  });

  test('S2.3b: reentrant boundary update() composes on FRESH drained state (makeBoundary path)', () => {
    // The boundary commit shares the operation-queuing serializer. A subscriber that
    // observes tablet (800) issues two reentrant `update(n => n + 400)` writes. With
    // eager pre-drain evaluation both would read 800 and enqueue 1200, and the second
    // (1200 → desktop, no fresh crossing) would clobber the first — landing 1200.
    // Operation-queuing composes them: 800 → 1200 → 1600.
    const cell = LiveCell.makeBoundary(viewport, 400); // mobile
    const crossings = collectCrossings(cell);
    let fired = false;
    cell.subscribe((v) => {
      if (v === 800 && !fired) {
        fired = true;
        cell.update((n) => n + 400);
        cell.update((n) => n + 400);
      }
    });
    cell.set(800); // mobile -> tablet (outer commit)
    expect(cell.read()).toBe(1600); // 800 → 1200 → 1600, NOT a clobbered 1200
    // Crossings still publish in commit order: mobile→tablet, then tablet→desktop
    // (the 1200 → 1600 step stays in desktop, so it emits no further crossing).
    expect(crossings.map((c) => [String(c.from), String(c.to)])).toEqual([
      ['mobile', 'tablet'],
      ['tablet', 'desktop'],
    ]);
  });
});

// ---------------------------------------------------------------------------
// S2.3 kernel-preservation + atomicity (byte-identical to the Wave 5.5 capture)
// ---------------------------------------------------------------------------

describe('LiveCell — S2.3 kernel preservation + atomic set-and-record', () => {
  const captureBoundary = Boundary.make({
    input: 'viewport.width',
    at: [
      [0, 'idle'],
      [100, 'active'],
      [200, 'done'],
    ] as const,
  });

  test('fnv1a ids + version bumps are byte-identical to the golden capture (crossings-and-identity)', () => {
    const cell = LiveCell.makeBoundary(captureBoundary, 0);
    const trail: { version: number; id: string }[] = [];
    for (const v of [150, 50, 150]) {
      cell.set(v);
      const env = cell.envelope();
      trail.push({ version: env.meta.version, id: String(env.id) });
    }
    // Byte-identical to tests/fixtures/reactive-capture/live-cell.json.
    expect(trail).toEqual([
      { version: 2, id: 'fnv1a:56916657' },
      { version: 3, id: 'fnv1a:b290642b' },
      { version: 4, id: 'fnv1a:56916657' },
    ]);
  });

  test('the HLC trail is monotonic across mutations', () => {
    const cell = LiveCell.make('state', 0);
    let prev = cell.envelope().meta.updated;
    for (let i = 1; i <= 5; i++) {
      cell.set(i);
      const now = cell.envelope().meta.updated;
      expect(HLC.compare(prev, now)).toBeLessThanOrEqual(0);
      prev = now;
    }
  });

  test('ATOMIC: a subscriber that reads envelope() during its own value delivery sees the bumped version (no interleave window)', () => {
    const cell = LiveCell.make('state', 0);
    const observed: { value: number; version: number; id: string }[] = [];
    cell.subscribe((value) => {
      const env = cell.envelope();
      observed.push({ value, version: env.meta.version, id: String(env.id) });
    });
    cell.set(1); // delivery of 1 must observe version 2 + the id for value 1
    const env = cell.envelope();
    // The replay (0) was observed at the initial envelope (version 1); the set(1)
    // delivery observes the ALREADY-consistent post-mutation envelope (version 2)
    // — proving the value and its envelope commit with no observable gap.
    expect(observed).toEqual([
      { value: 0, version: 1, id: String(LiveCell.make('state', 0).envelope().id) },
      { value: 1, version: 2, id: env.id },
    ]);
    expect(env.value).toBe(1);
    expect(env.meta.version).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Injected-clock determinism — the envelope HLC + crossing timestamps are a pure
// function of the op-sequence when a manual/fixed Clock is passed (clock.ts law).
// No ambient wallClock, no Date mocking.
// ---------------------------------------------------------------------------

describe('LiveCell — injected clock determinism', () => {
  const viewport = Boundary.make({
    input: 'viewport.width',
    at: [
      [0, 'mobile'],
      [768, 'tablet'],
      [1024, 'desktop'],
    ] as const,
  });

  test('identical op-sequences under the same manualClock produce byte-identical envelopes + crossing timestamps', () => {
    const run = (): {
      envelopes: { version: number; id: string; updated: HLC; created: HLC }[];
      crossings: BoundaryCrossing<string>[];
    } => {
      // A fresh manual clock advanced by the SAME deterministic schedule each run.
      const clock = manualClock(1_000);
      const cell = LiveCell.makeBoundary(viewport, 400, clock); // mobile
      const crossings = collectCrossings(cell);
      const envelopes: { version: number; id: string; updated: HLC; created: HLC }[] = [];
      const snap = (): void => {
        const e = cell.envelope();
        envelopes.push({ version: e.meta.version, id: String(e.id), updated: e.meta.updated, created: e.meta.created });
      };
      clock.advance(5);
      cell.set(1200); // desktop crossing
      snap();
      clock.advance(7);
      cell.set(500); // back to mobile crossing
      snap();
      return { envelopes, crossings };
    };
    const a = run();
    const b = run();
    // Pure function of the op-sequence: the wall_ms/counter bytes match exactly.
    expect(a.envelopes).toEqual(b.envelopes);
    expect(a.crossings).toEqual(b.crossings);
    // And the timestamps are the injected clock's, not the ambient wall clock.
    expect(a.crossings.map((c) => (c.timestamp as HLC).wall_ms)).toEqual([1005, 1012]);
    expect(a.envelopes.map((e) => e.updated.wall_ms)).toEqual([1005, 1012]);
  });

  test('a fixedClock pins wall_ms constant while the HLC counter increments per mutation', () => {
    const cell = LiveCell.make('state', 0, fixedClock(9000));
    const created = cell.envelope().meta.created;
    cell.set(1);
    const afterOne = cell.envelope().meta.updated;
    cell.set(2);
    const afterTwo = cell.envelope().meta.updated;
    // Constant wall_ms (the fixed clock never advances)...
    expect(created.wall_ms).toBe(9000);
    expect(afterOne.wall_ms).toBe(9000);
    expect(afterTwo.wall_ms).toBe(9000);
    // ...so the HLC counter carries the monotonic ordering deterministically.
    expect(afterOne.counter).toBe(created.counter + 1);
    expect(afterTwo.counter).toBe(afterOne.counter + 1);
    // Monotonic under HLC.compare regardless — the byte-law fact the fixture pins.
    expect(HLC.compare(created, afterOne)).toBeLessThan(0);
    expect(HLC.compare(afterOne, afterTwo)).toBeLessThan(0);
  });

  test('the default clock still reads the ambient wall clock (no behavior change for casual callers)', () => {
    const before = Date.now();
    const wall = LiveCell.make('state', 0).envelope().meta.created.wall_ms;
    const after = Date.now();
    expect(wall).toBeGreaterThanOrEqual(before);
    expect(wall).toBeLessThanOrEqual(after);
  });
});
