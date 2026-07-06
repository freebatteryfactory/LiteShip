# Cursor implementation handoff — cockpit

Status: local working note (cockpit). Everything referenced here is **merged on `main`**.
This is a pointer + order + guardrail map, **not a re-spec** — the specs live in the
linked artifacts. Read those; do not re-derive from this file (a second copy would drift).

## Read in this order (before touching code)
1. **`SKILL.md`** — how to reason in this repo; §16 "Completeness is machine-defined" and the compiler-first / gauntlet-backstop rule are load-bearing.
2. **`ROADMAP.md` Epic 9** — thesis, keystone, taxonomy, build spine, guardrails, free batteries, and the new-brain re-frame of the ledger.
3. **`docs/adr/0035-motion-is-intent-not-target.md`** — the ratified taxonomy decision.
4. **`docs/internal/design-authored-motion-state.md`** — the impl-ready vertical-slice spec (§3 has the real symbols/signatures).
5. **The issues** (below) — each carries source-anchored scope + compiler-enforcement notes in its comments.

## Build order (each PR is a vertical slice or a gate — never phase-by-layer)
1. **#106 / #107 — WGSL honesty first.** A multimedia-native framework cannot ship silent shader lies (unfed-uniform diagnostic + integer-vector mis-layout bug).
2. **#132 — completeness gate, NARROW first.** Field-level active-surface-has-reader, red-fixtured against the *live* `TransitionNode` orphan; reuse `@czap/audit` orphan facts + `@czap/gauntlet` authority ratchet (no `typescript` dep in gauntlet). Prove it bites on one surface, then generalize. This gate defines "done" for #130.
3. **#134 — stream wire-contract registry.** Typed event union + generated docs + drift guard (the ADR-0028 `DIRECTIVE_ATTRIBUTE_REGISTRY` / ADR-0018 `CAP_AXES` pattern). Cheap; kills fake-event-name bugs; a practice run for #132-style thinking. Fold in the stale `directive-boot.ts` "back-compat" docstring fix.
4. **#131 → ADR-0035** — already ratified; no work, just honor it (motion is intent, not a projection target).
5. **#130 — authored-motion vertical slice.** `interpolateTyped` → `interpretTransition` → `writeContinuousMap` → `MotionCompiler` → `StateCell`/`ProjectionState` → **one reveal**. Children: #124 (reveal proof), #126 (scroll). "Done" = #132 green for `TransitionNode`.
6. **#119 + #133 — graph-native sync/recovery lane.** After enough `StateCell` shape exists. #119 is the collab-sync read-leg (not polling perf); #133 is graph-native recovery (NOT a payload-widen).
7. **#113 / #123 — docs-bundle / MCP / prose chain.** Once registries exist, docs are projections, not mirrors.

## "Done" is machine-defined
Not a doc, an issue, or a model saying so. For #130: the #132 gate is green for
`TransitionNode.{routing,durationMs}`, plus red-green behavior tests. Mechanical
certainties block; heuristics advise. If you finish a capability, announce completeness
by the machine (green gate/test), not by the message.

## The DON'T list (old-brain traps — recorded; do not reintroduce)
- **Don't phase-by-layer.** Vertical slices only. A declaration without its consumer is an orphan (SKILL §16).
- **Don't build a `FeatureContract` subsystem** with string symbol names (#132) — a drift-prone mirror. Obligations derive from the type unions.
- **Don't widen the SSE replay payload with signals** (#133) — it replays ephemeral continuous transients that must NOT replay. Graph-native recovery only.
- **Don't delete the "dead" `czap:request-snapshot` dispatch or `ResumptionConfig.timeout`** (#122) — unfinished features, not cruft. Complete them (wire `request-snapshot` → `refreshBase`/`adopt`; thread `timeout` → `AbortSignal`).
- **Don't build fine-grained auto-tracking reactivity (SolidJS)** for `StateCell` — a typed authority over the *existing* coarse graph/boundary/quantizer/dirty model.
- **Don't add GSAP as a first-party dep** — its license bars Webflow-competitive no-code animation builders (this product). Motion (MIT, vanilla) is the optional adapter, later. Absorb AOS's pattern, don't depend on it.
- **Don't hand-write wire-contract / doc tables** — generate from source (#134). No prose mirrors.
- **Lean on the compiler first:** unrepresentable → uncompilable → #132 backstop (SKILL §16). Keep types readable; a type-level metaprogramming cathedral is its own ceremony.

## Artifact map
- **Doctrine:** `SKILL.md` (esp §16). **Ledger:** `ROADMAP.md` Epic 9. **Decision:** ADR-0035. **Spec:** `docs/internal/design-authored-motion-state.md`.
- **Gate:** #132. **Motion:** #130 / #124 / #126. **Taxonomy:** #131 (ADR-0035). **Stream:** #133 / #134. **Substrate:** #119. **Honesty:** #106 / #107. **Docs:** #113 / #123.
- **Thesis:** LiteShip is a multimedia-native adaptive UI compiler/runtime — not a component library.

## Operating note
The owner conserves Claude usage and hands implementation to you; the specs are
source-anchored and impl-ready. Docs/asset-only pushes go through the owner's zero-CI
recipe — do **not** push docs-only changes that would trigger CI; surface them for the
owner. If you find a modeled surface with no reader, that's the #132 class: wire it or
file it — never leave it orphaned and call it done.
