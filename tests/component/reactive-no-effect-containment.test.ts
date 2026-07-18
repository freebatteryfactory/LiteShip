/**
 * #153 acceptance — reactive state coordination needs NO Effect containment.
 *
 * The closure proof for issue #153: after the Wave 6 reactive convergence, a
 * consumer that coordinates ordinary application state — a {@link Cell}, a
 * {@link Derived}, and a {@link Store} wired together — compiles and runs against
 * the plain, synchronous `@czap/core` reactive API with **no local Effect
 * containment module** (no `Effect.runPromise`, no `Scope`, no `effect` import).
 *
 * Red-first note (honest): the plan authored this test to first fail to
 * type-check against the OLD `Effect`/`Stream`/`Scope` reactive API and pass
 * against the plain one. That old API no longer exists in the tree — the Wave 6
 * migration removed it — so the red half is now the migration itself (the
 * `Effect`-shaped `Cell.get`/`Signal.current`/`Store` return types are gone,
 * verified by the effect-free api-surface snapshot). What remains, and what this
 * file pins durably, is the GREEN acceptance: the plain API carries a realistic
 * coordinated-state pattern with zero effect surface. The containment claim is
 * also checked mechanically below (this module's own source imports nothing from
 * `effect`).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Cell, Derived, Store } from '@czap/core';

describe('#153 — ordinary reactive state coordinates with no Effect', () => {
  test('a Cell + Derived + Store wire together synchronously, no runtime needed', () => {
    // A tiny media-player state, the kind a UI consumer coordinates:
    //  - `volume` is writable input (a Cell),
    //  - `isMuted` is a pure projection of it (a Derived),
    //  - `log` accumulates user actions via a reducer (a Store).
    // Every wire below is an ordinary synchronous callback — no Effect, no fiber.
    const volume = Cell.make(50);
    const isMuted = Derived.make(() => volume.read() === 0, [volume]);
    const log = Store.make<readonly string[], string>([], (prev, entry) => [...prev, entry]);

    const mutedStates: boolean[] = [];
    // Subscribing wires `isMuted` to its source (Derived tracks after first
    // subscribe) AND proves derived delivery works without a runtime.
    const stopMuted = isMuted.subscribe((m) => mutedStates.push(m));
    // Every volume change appends a log entry — a plain subscribe → dispatch wire.
    const stopVol = volume.subscribe((v) => log.dispatch(`volume=${v}`));

    volume.set(0); // mute
    volume.set(30); // unmute at a new level

    // Reads are glitch-free and synchronous — no `Effect.runSync` in sight.
    expect(volume.read()).toBe(30);
    expect(isMuted.read()).toBe(false);

    // The derived observed the mute transition and the unmute.
    expect(mutedStates).toContain(true);
    expect(mutedStates).toContain(false);

    // The store accumulated every volume event, in order, via dispatch. The
    // leading entry is the replay-1 value delivered at subscribe time (50).
    expect(log.read()).toEqual(['volume=50', 'volume=0', 'volume=30']);

    stopMuted();
    stopVol();

    // Disposers are idempotent and teardown is synchronous — a repeat is a no-op.
    stopVol();
    log.dispatch('after-teardown');
    volume.set(90);
    // The torn-down volume subscriber no longer feeds the log…
    expect(log.read()).toEqual(['volume=50', 'volume=0', 'volume=30', 'after-teardown']);
    // …but the cell itself is still a live, readable value slot.
    expect(volume.read()).toBe(90);
  });

  test('this consumer module imports nothing from `effect` (the #153 containment claim)', () => {
    const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    // No import of the effect runtime — the crisp containment proof (with no
    // `effect` import, no `Effect.*` call shape is even reachable). The
    // quote-delimited `from '…'` form matches import statements, never prose.
    expect(source).not.toMatch(/from ['"]effect['"]/);
    // It DOES coordinate state purely through the plain @czap/core reactive API.
    expect(source).toMatch(/from ['"]@czap\/core['"]/);
  });
});
