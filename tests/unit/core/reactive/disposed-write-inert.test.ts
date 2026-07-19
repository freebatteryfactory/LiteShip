/**
 * Post-dispose write INERTNESS — the disposed-lifetime guard law for the reactive
 * primitives whose write path advances metadata BEYOND the kernel slot.
 *
 * After `lifetime.dispose()` the underlying value kernel is closed, so `cell.set` /
 * `setState` are inert — but the surrounding commit also bumps the protocol envelope
 * (HLC / version / content-address `id`) or the elapsed position. Without a disposed
 * guard those advance while `read()` / `state()` freeze, so the content-addressed `id`
 * ends up describing a value the cell never returns (an envelope/value divergence) and
 * the version drifts unbounded on repeated post-dispose writes. This suite pins that a
 * post-dispose write is FULLY inert: no envelope drift, no elapsed drift, value frozen.
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { LiveCell, Boundary, Millis, Timeline, manualClock } from '@liteship/core';

describe('LiveCell._make — a post-dispose set() is fully inert (no envelope/value divergence)', () => {
  test('scalar LiveCell: value frozen, version + content-address id do not drift', async () => {
    const lc = LiveCell.make('signal', 10, manualClock(1000));
    const before = lc.envelope();
    await lc.lifetime.dispose();
    lc.set(999);
    lc.set(1000); // a second post-dispose write must not drift the version either
    const after = lc.envelope();
    expect(lc.read()).toBe(10); // frozen at the last committed value
    expect(after.meta.version).toBe(before.meta.version); // no unbounded version drift
    expect(after.id).toBe(before.id); // id still addresses the committed value, not 999/1000
  });
});

describe('LiveCell._makeBoundary — a post-dispose set() is fully inert', () => {
  test('boundary LiveCell: value + envelope frozen even for a would-be crossing', async () => {
    const boundary = Boundary.make({
      input: 'x',
      at: [
        [0, 'lo'],
        [100, 'hi'],
      ] as const,
    });
    const lc = LiveCell.makeBoundary(boundary, 0, manualClock(1000));
    const before = lc.envelope();
    await lc.lifetime.dispose();
    lc.set(150); // crosses lo→hi — must NOT advance the envelope or prevState
    const after = lc.envelope();
    expect(lc.read()).toBe(0);
    expect(after.meta.version).toBe(before.meta.version);
    expect(after.id).toBe(before.id);
  });
});

describe('Timeline — a post-dispose seek/scrub does not move elapsed while state() is frozen', () => {
  const makeBoundary = () =>
    Boundary.make({
      input: 'time.elapsed',
      at: [
        [0, 'idle'],
        [100, 'active'],
        [200, 'done'],
      ] as const,
    });

  test('seek after dispose leaves elapsed()/progress() at 0 (state frozen)', async () => {
    const timeline = Timeline.from(makeBoundary(), { duration: Millis(200) });
    const state0 = timeline.state();
    await timeline.lifetime.dispose();
    timeline.seek(Millis(150));
    expect(timeline.state()).toBe(state0); // frozen (kernel closed)
    expect(timeline.elapsed()).toBe(Millis(0)); // seek did not advance currentElapsed
    expect(timeline.progress()).toBe(0);
  });

  test('scrub after dispose is inert too', async () => {
    const timeline = Timeline.from(makeBoundary(), { duration: Millis(200) });
    await timeline.lifetime.dispose();
    timeline.scrub(0.75);
    expect(timeline.elapsed()).toBe(Millis(0));
    expect(timeline.progress()).toBe(0);
  });
});
