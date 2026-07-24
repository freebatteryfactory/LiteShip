# ADR-0051 — Verb-grammar sweep 2: the reactive substrate collapses onto `create*`

**Status:** Accepted
**Date:** 2026-07-21

## Context

ADR-0046 fixed one enforced verb per operation class (`define` = immutable authored
intent, `create` = allocate stateful runtime behavior or a resource, `computed` =
derived value) and the P6/P7 waves migrated the AUTHORING factories to it
(`Boundary.make` → `defineBoundary`, `Cell.make` → `createCell`, `Derived` primary
→ `computed`). Those same waves DEFERRED the REACTIVE SUBSTRATE on the
`@liteship/core` barrel + the `liteship/reactive|media|motion` subpaths: a set of
`.make` factories shipped side-by-side with the new verbs, so a consumer saw
`createCell(...)` next to `Signal.make(...)`, `World.make(...)`,
`FrameBudget.make(...)`, and friends.

Three concrete gaps remained:

- `Signal.make`, `LiveCell.make` / `LiveCell.makeBoundary`, `World.make`,
  `BlendTree.make`, `TokenBuffer.make`, `Component.make`, `Composable.make`,
  `DirtyFlags.make`, `FrameBudget.make`, `CompositorStatePool.make` still spoke the
  retired `.make` grammar.
- `Signal`, `LiveCell`, and `FrameBudget` still returned a plain `{ …, lifetime }`
  object disposed via `x.lifetime.dispose()` — the exact `{value, lifetime}`
  adjacency P7 collapsed for `Cell` / `Zap` / `Store` / `Derived` via
  `attachLifetime`.
- The `liteship` root export budget RESERVED `createSignal`, `createLifetime`, and
  `inspectReceipt` with no backing implementation, and listed `tierTargets` without
  wiring it to the root; the `facade-export-budget` gate was SUBSET-only (plus a
  cap), so it could not catch a DROPPED root export.

## Decision

Finish the sweep on the reactive substrate, mirroring the P7 patterns exactly:

1. **`create<Name>` rename.** Each surviving public reactive `.make` becomes a
   standalone `create<Name>` function; the old spelling DIES with no alias. The
   namespace object keeps its non-primary members (mirroring `Derived.combine`
   surviving alongside the standalone `computed`): `Signal` keeps `controllable` /
   `audio`, `Composable` keeps `compose` / `merge`. A namespace whose only member
   was `make` (`World`, `BlendTree`, `TokenBuffer`, `Component`, `DirtyFlags`,
   `FrameBudget`, `CompositorStatePool`, `LiveCell`) has its VALUE deleted and its
   same-named TYPE retained. Genuinely-runtime `.create` allocators already in the
   grammar (`HLC.create`, `Compositor.create`, …) and out-of-scope survivors
   (`Zap.make`, `Plan.make`, `ComposableWorld.make`) are untouched.

2. **Lifetime collapse.** `createSignal` (and `Signal.controllable` / `Signal.audio`),
   `createLiveCell` / `createLiveCellBoundary`, and `createFrameBudget` now return
   the value augmented via `attachLifetime` — the value IS the disposable
   (`dispose()` + `[Symbol.asyncDispose]`), with the owning `Lifetime` still
   reachable as `x.lifetime` for advanced composition. `Lifetime` stays the
   composition primitive.

3. **Filled budget slots.** `createSignal` + `createLifetime` (a standalone verb over
   `Lifetime.make`) exist from steps 1–2; `inspectReceipt(envelope)` is a real thin
   `inspect`-verb facade over the `Receipt` namespace returning a structured
   `ReceiptInspection` view; `tierTargets` is wired through. All four ride BOTH the
   `@liteship/core` barrel AND the `liteship` root facade, so no phantom slot
   remains.

4. **Exact-match budget gate.** `facade-export-budget` now enforces the allowlist
   BOTH DIRECTIONS — every exported symbol listed AND every listed symbol exported —
   so a DROPPED root export reds like an unlisted one. `export-budget.ts` lists
   EXACTLY the post-sweep root surface (the stale reserved `Computed` type slot,
   which had no backing type, was removed).

## Consequences

- The reactive substrate speaks ONE grammar: `create*` everywhere, no `.make`
  next to `createCell`. The public disposal contract is uniform — every owned
  reactive value is `await x.dispose()` / `await using x = create…()`.
- `@liteship/core`'s value surface gains `createSignal`, `createWorld`,
  `createBlendTree`, `createTokenBuffer`, `createComponent`, `createComposable`,
  `createDirtyFlags`, `createFrameBudget`, `createCompositorStatePool`,
  `createLiveCell`, `createLiveCellBoundary`, `createLifetime`, `inspectReceipt`,
  `tierTargets`, and loses the `.make`-carrying `BlendTree` / `TokenBuffer` /
  `Component` / `DirtyFlags` / `FrameBudget` / `CompositorStatePool` / `LiveCell` /
  `World` VALUE exports (their TYPES remain). This is a reviewed breaking change,
  recorded in the regenerated api-surface + type-export snapshots.
- The `facade-export-budget` gate is strictly stronger: it now catches a silent
  public-contract regression (a dropped root export), the class of slip the SUBSET
  direction was blind to.
- `sgrules/no-reactive-make-factory.yml` reds if any retired reactive `.make`
  spelling is REINTRODUCED, pinned to the specific dead spellings so honest
  surviving `.make` factories (`Zap.make`, `Plan.make`, `HLC.makeClock`, …) never
  trip.

## Evidence

- `packages/core/src/reactive/signal.ts` — `createSignal` + `attachLifetime` collapse.
- `packages/core/src/reactive/live-cell.ts` — `createLiveCell` / `createLiveCellBoundary`.
- `packages/core/src/ecs.ts`, `.../motion/blend.ts`, `.../media/{frame-budget,compositor-pool,token-buffer}.ts`, `.../authoring/{component,composable}.ts`, `.../reactive/dirty.ts` — the renamed factories.
- `packages/core/src/reactive/lifetime.ts:createLifetime`, `.../evidence/receipt.ts:inspectReceipt`, `.../evidence/escalation.ts:tierTargets`.
- `packages/liteship/src/export-budget.ts` — the exact allowlist; `packages/gauntlet/src/gates/facade-export-budget.ts` — the bidirectional gate + red/green/mutation fixtures.
- `tests/fixtures/api-surface-snapshot.json`, `tests/fixtures/type-export-surface.json` — the regenerated public-surface snapshots.
- `sgrules/no-reactive-make-factory.yml` + `tests/unit/meta/source-grammar-rules.test.ts` (rule g) — the drift guard + its red/green proof.

## Rejected alternatives

- **Keep `.make` as a deprecated alias** — leaves the exact side-by-side surface
  the sweep exists to eliminate; the constitution's "old spellings DIE" is the
  cleaner contract for a pre-1.0 framework.
- **Extract `Signal.controllable` / `Signal.audio` to standalone `create*` too** —
  out of the frozen scope (the sweep renames `.make`, not every alternate
  constructor); the `Derived.combine`-alongside-`computed` precedent keeps
  specialized constructors on the namespace.
- **A blanket "any reactive `.make`" sgrule** — would false-positive on honest
  survivors (`Zap.make`, `Plan.make`); pinning to the specific dead spellings
  (the `detect-tier-vocab-drift` idiom) keeps real code green.

## References

- ADR-0046 — Direct generic types + the verb-grammar appendix (the enforced verbs).
- ADR-0048 — the facade export budget the gate hardens.
- `packages/core/src/reactive/lifetime.ts:attachLifetime` — the `{value, lifetime}` collapse helper.
