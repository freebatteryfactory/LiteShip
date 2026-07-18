/**
 * #153 acceptance — a downstream consumer coordinates reactive state with NO
 * Effect import and NO local Effect-containment shim.
 *
 * Issue #153 asks LiteShip to make its Effect-migration seam explicit so a
 * downstream Astro application (SillPak) can use LiteShip reactive state —
 * `Cell` / `Derived` / `Store` / `Signal` — for ordinary state coordination
 * WITHOUT importing `effect` throughout application code and WITHOUT inventing a
 * local execution boundary (the named shim
 * `apps/shell/src/lib/liteship/effect-boundary.ts`). This file is that
 * acceptance contract, written to behave like a real consuming module:
 *
 *  1. It imports ONLY the public `@czap/core` reactive surface, from the package
 *     barrel — never a deep path (`@czap/core/cell`, a `/dist/` or `/src/`
 *     specifier). A downstream consumer sees exactly the public entry.
 *  2. It builds a small, realistic coordinated-state scenario — two writable
 *     Cells, a Derived over BOTH of them with a live subscriber, a controllable
 *     Signal, and a Store reducing an event stream — then tears it all down.
 *  3. It needs ZERO `effect` import and ZERO containment shim, proven three ways:
 *     the file's own source carries no such import (checked mechanically below),
 *     every reactive `read()` binds directly to a PLAIN typed value (so a
 *     re-Effectified surface would fail the typecheck — the real enforcer), and a
 *     permanent negative control proves the containment greps actually FIRE on
 *     each forbidden import form.
 *
 * Red-first note (honest): the plan authored this test to first fail to
 * type-check against the OLD `Effect`/`Stream`/`Scope` reactive API and pass
 * against the plain one. That old API no longer exists in the tree — the Wave 6
 * migration removed it — so the "red against the old API" half is subsumed by the
 * shipped migration and cannot be reconstructed without reverting Wave 6. What
 * remains, and what this file pins durably, is (a) the GREEN acceptance that the
 * plain surface carries a realistic coordinated-state pattern with zero Effect
 * surface, (b) the compile-time containment proof (the typed plain-value
 * bindings), and (c) the negative-control guards that bite on each forbidden
 * import shape every run — so the acceptance is not vacuous green.
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Cell, Derived, Store, Signal } from '@czap/core';

/**
 * The downstream consumer's own action vocabulary — an ordinary discriminated
 * union, authored in application code with no reference to Effect.
 */
type PlayerEvent =
  | { readonly kind: 'volume'; readonly value: number }
  | { readonly kind: 'track'; readonly value: number }
  | { readonly kind: 'seek'; readonly value: number };

describe('#153 — a downstream consumer coordinates reactive state with no Effect', () => {
  test('two cells + a derived over both + a controllable signal + a store reducer wire synchronously', () => {
    // A SillPak-shaped consumer state (adaptive definitions + a little
    // coordination), every wire an ordinary synchronous callback — no fiber, no
    // `Effect.runPromise`, no `Scope`:
    //  - `volume` and `track` are two writable Cells (ordinary UI inputs),
    //  - `nowPlaying` is a Derived over BOTH cells (a read-only projection),
    //  - `playhead` is a controllable Signal (a DOM-free scrubbable feed),
    //  - `journal` is a Store reducing a PlayerEvent stream into an ordered log.
    const volume = Cell.make(50);
    const track = Cell.make(1);

    // A derived value over TWO cells — recomputes when EITHER source changes.
    const nowPlaying = Derived.make(() => `track ${track.read()} @ vol ${volume.read()}`, [volume, track]);

    const playhead = Signal.controllable();

    const journal = Store.make<readonly string[], PlayerEvent>([], (log, ev) => [...log, `${ev.kind}:${ev.value}`]);

    // Compile-time containment proof: every reactive read binds directly to a
    // PLAIN value the consumer uses as-is — a number, a string. Were any `read()`
    // Effect-shaped, these annotated bindings would fail the typecheck (the real
    // enforcer), which is exactly the coupling #153 asks to remove.
    const v0: number = volume.read();
    const label0: string = nowPlaying.read();
    const head0: number = playhead.read();
    expect(v0).toBe(50);
    expect(label0).toBe('track 1 @ vol 50');
    expect(head0).toBe(0);

    // Wire subscribers — ordinary callbacks that each return a synchronous
    // Disposer. The Derived lazily wires its two sources on this FIRST subscribe.
    const labels: string[] = [];
    const stopLabel = nowPlaying.subscribe((l) => labels.push(l));
    const stopVol = volume.subscribe((val) => journal.dispatch({ kind: 'volume', value: val }));
    const stopTrack = track.subscribe((t) => journal.dispatch({ kind: 'track', value: t }));
    const stopHead = playhead.subscribe((h) => journal.dispatch({ kind: 'seek', value: h }));

    // Each direct subscribe replayed its source's current value into the journal.
    expect(journal.read()).toEqual(['volume:50', 'track:1', 'seek:0']);

    // Drive the state as a UI would — plain method calls, no runtime.
    volume.set(80); // derived recomputes over its FIRST source
    track.set(2); // derived recomputes over its SECOND source
    playhead.seek(1500);

    // The derived reflects BOTH cells and delivered every recompute. Its first
    // subscriber sees the initial value once on replay-1 plus one leading
    // republish per source wired at subscribe (2 sources) — the pinned Wave 6
    // Derived law — then one delivery per subsequent source change.
    expect(nowPlaying.read()).toBe('track 2 @ vol 80');
    expect(labels).toEqual([
      'track 1 @ vol 50', // replay-1 at subscribe
      'track 1 @ vol 50', // leading republish: wiring source `volume`
      'track 1 @ vol 50', // leading republish: wiring source `track`
      'track 1 @ vol 80', // volume.set(80) recompute
      'track 2 @ vol 80', // track.set(2) recompute
    ]);

    // The store reduced every event, in order, through the reducer.
    expect(journal.read()).toEqual(['volume:50', 'track:1', 'seek:0', 'volume:80', 'track:2', 'seek:1500']);

    // Teardown is synchronous and the disposers are idempotent.
    stopLabel();
    stopVol();
    stopTrack();
    stopHead();
    stopVol(); // exactly-once: a repeat is a no-op

    // Torn-down subscribers no longer feed the journal or the label log…
    volume.set(90);
    track.set(3);
    playhead.seek(9000);
    expect(journal.read()).toEqual(['volume:50', 'track:1', 'seek:0', 'volume:80', 'track:2', 'seek:1500']);
    expect(labels).toHaveLength(5);

    // …but the cells and signal remain live, readable value slots.
    expect(volume.read()).toBe(90);
    expect(track.read()).toBe(3);
    expect(playhead.read()).toBe(9000);

    // Full lifecycle teardown through the uniform `lifetime` handle every
    // primitive exposes — exactly-once and idempotent.
    for (const primitive of [nowPlaying, volume, track, playhead, journal]) {
      primitive.lifetime.dispose();
      primitive.lifetime.dispose(); // idempotent second dispose is a no-op
    }
  });

  test('this consumer imports ONLY the public @czap/core reactive surface — no Effect, no containment shim', () => {
    const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');

    // (1) No Effect runtime import in ANY form — bare, subpath, or scoped
    //     package. The character-class quotes keep each regex from matching its
    //     own text (the pattern's `[` follows `from `, never a quote).
    expect(source).not.toMatch(/from ['"]effect['"]/); // bare `effect`
    expect(source).not.toMatch(/from ['"]effect\//); // subpath, e.g. `effect/Stream`
    expect(source).not.toMatch(/from ['"]@effect\//); // scoped `@effect/*`
    expect(source).not.toMatch(/require\(\s*['"]effect['"]\s*\)/); // CJS require

    // (2) No local Effect-containment / execution-boundary shim import — the exact
    //     `effect-boundary` module #153 names. A downstream consumer must need
    //     NEITHER `effect` NOR a hand-rolled containment module.
    expect(source).not.toMatch(/from ['"][^'"]*effect-(boundary|containment|runtime)/);

    // (3) The reactive surface is imported from the PUBLIC entry only — the bare
    //     `@czap/core` barrel, never a deep path (`@czap/core/cell`, a `/dist/`
    //     or `/src/` specifier).
    expect(source).toMatch(/from ['"]@czap\/core['"]/);
    expect(source).not.toMatch(/from ['"]@czap\/core\//);
  });

  test('the containment guards have teeth — each grep FIRES on the import form it forbids', () => {
    // Permanent negative controls (the S0.5 "hand it a violation and watch it
    // red" discipline): the very greps that clear this file above MUST match the
    // exact violations #153 forbids, so the acceptance proof is provably not
    // vacuous. Each sample is assembled with an interpolated quote (`q`) so the
    // forbidden text exists only at RUNTIME — the file source never carries the
    // contiguous `from '…'` form, keeping the checks in test (2) green.
    const q = "'";
    expect(`import { Effect } from ${q}effect${q};`).toMatch(/from ['"]effect['"]/);
    expect(`import { Stream } from ${q}effect/Stream${q};`).toMatch(/from ['"]effect\//);
    expect(`import { X } from ${q}@effect/platform${q};`).toMatch(/from ['"]@effect\//);
    expect(`const r = require(${q}effect${q});`).toMatch(/require\(\s*['"]effect['"]\s*\)/);
    expect(`import { run } from ${q}./lib/liteship/effect-boundary${q};`).toMatch(
      /from ['"][^'"]*effect-(boundary|containment|runtime)/,
    );
    expect(`import { Cell } from ${q}@czap/core/cell${q};`).toMatch(/from ['"]@czap\/core\//);
  });
});
