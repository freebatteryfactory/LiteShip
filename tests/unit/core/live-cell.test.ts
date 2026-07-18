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
import { LiveCell, HLC, StateName, Boundary } from '@czap/core';
import type { CellKind, BoundaryCrossing } from '@czap/core';

const collectCrossings = (cell: { crossings: LiveCell.Shape<CellKind, unknown>['crossings'] }): BoundaryCrossing<string>[] => {
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
