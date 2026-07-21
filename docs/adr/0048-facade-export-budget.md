# ADR-0048 — The `liteship` curated facade + enforced root export budget

**Status:** Accepted
**Date:** 2026-07-20

## Context

`liteship` (the unscoped umbrella) began as an install-only meta-package: one
dependency that pulls the whole `@liteship/*` fleet into `node_modules`, after
which you imported from the individual scopes (`@liteship/core`,
`@liteship/astro`, …). That left an app author facing the machinery at the same
altitude the engine authors do.

The scale is the problem. The `@liteship/core` main barrel alone exposes over 500
public symbols (216 runtime values + 305 types) — a god-object surface where
`defineBoundary` (a first-day authoring verb) sits beside `SpeculativeEvaluator`,
`CompositorStatePool`, and the `GraphPatch` op algebra. ADR-0045 already split
`@liteship/core` into domain subpaths (`./authoring`, `./reactive`, `./motion`,
…) so the engine's own layout carries intent, but the umbrella still pointed
newcomers at the raw scopes: no curated "here is what you author with" surface,
and no boundary that keeps the beginner path small.

Two forces pulled against each other:

- **One front door.** App authors should learn one package and one import path,
  not choose among 23 scopes and hundreds of symbols.
- **No host coupling at rest.** The root a beginner imports must not drag in a
  host integration — importing the authoring verbs should never evaluate
  `@liteship/astro` (with its `astro` peer) or `@liteship/vite` (with `vite`).

## Decision

Make `liteship` a **real curated facade**, not just an installer:

- The root `.` entry is a small, **budgeted** authoring surface — the `define*` /
  `create*` verbs, `schema`, `computed`, `chooseTier`, `explainDiagnostic`, plus
  the domain nouns as types. It re-exports only from the host-free runtime scopes
  (`@liteship/core`, `@liteship/quantizer`, `@liteship/error`), so importing `.`
  evaluates no host integration.
- Eleven **domain subpaths** (`liteship/schema`, `liteship/reactive`,
  `liteship/motion`, `liteship/graph`, `liteship/media`, `liteship/evidence`,
  `liteship/compiler`, `liteship/runtime`, `liteship/astro`, `liteship/vite`,
  `liteship/testing`) each resolve to a `src/<name>.ts` file of explicit named
  re-exports (the facade law of ADR-0045 — no `export *`). `liteship/astro` and
  `liteship/vite` are the only host-touching entries; their module graphs are
  independent of the root's, and `astro` / `vite` are declared OPTIONAL peers so
  the version expectation flows only to a consumer that imports those subpaths.
- The permitted root surface is pinned as DATA in
  `packages/liteship/src/export-budget.ts` (`ROOT_VALUE_BUDGET` /
  `ROOT_TYPE_BUDGET`, each capped at 30) and enforced by the
  `gauntlet/facade-export-budget` gate, which reads the built `dist/index.d.ts`
  and asserts every exported symbol is an allowlisted, reviewed entry (the SUBSET
  law) under the cap.

The 23 `@liteship/*` packages remain the machinery underneath, unchanged and
independently importable. `liteship` keeps its umbrella dependency set; what is
new is the curated surface layered on top.

## Consequences

- **One install, one import path.** `npm create liteship` scaffolds an app whose
  only LiteShip dependency is `liteship`; it imports authoring verbs from the root
  and the Astro helper from `liteship/astro`, never a raw `@liteship/*` scope.
- **The beginner path stays small.** The budget gate makes the root surface a
  ratchet: a new export must be a reviewed allowlist edit, so the umbrella cannot
  silently sprawl back into a whole-fleet re-export. A symbol that belongs deeper
  goes on a domain subpath, not the root.
- **The root is host-free by construction.** Importing `.` never evaluates
  `@liteship/astro` / `@liteship/vite` / `@liteship/web` / `@liteship/compiler`,
  so a host-free (or vite-only) app pays no astro cost, and the peer warnings land
  only where the host subpath is actually used.
- **A second published truth to keep in step.** The facade re-exports symbols the
  source packages own; the api-surface / type-export snapshots stay anchored to
  the source packages (the facade is exempt, since it owns no definition site),
  and the resolution + budget gates guard the facade itself.
- **The facade owns no docs of its own.** TypeDoc documents definition sites, so
  `liteship` is exempt from the API-docs roster — its canonical docs are the
  source-package pages a symbol re-exports from.

## Evidence

- `packages/liteship/src/index.ts` — the budgeted root facade (15 value + 15 type
  re-exports, all from host-free scopes).
- `packages/liteship/src/export-budget.ts` — the allowlist DATA (`ROOT_VALUE_BUDGET`
  / `ROOT_TYPE_BUDGET`, caps 30/30).
- `packages/gauntlet/src/gates/facade-export-budget.ts` — the enforcing gate; it
  ships red/green/mutation fixtures, so it self-proves.
- `tests/unit/liteship/facade-subpaths.test.ts` — proves every subpath resolves to
  its built `dist/*.d.ts` and type-checks under BOTH `node16` and `bundler`
  resolution, that the root value surface is a subset of the budget, and that the
  built root `dist/index.js` pulls no host scope.
- `@liteship/core` public surface: 216 runtime + 305 type exports (the god-object
  scale the facade sits in front of).

## Rejected alternatives

- **Re-export the whole fleet from the root** — the original umbrella move;
  reproduces the god-object surface one level up and couples the root to every
  host integration.
- **Keep pointing authors at the raw `@liteship/*` scopes** — no front door;
  newcomers must learn the package taxonomy before writing a boundary.
- **Curate the root but skip the budget gate** — a curated surface with no
  enforced ceiling drifts back to a whole-fleet re-export the first time an export
  is added "just here"; the gate makes the ceiling a ratchet.
- **A single flat `liteship` barrel with no subpaths** — collapses the ADR-0045
  domain boundaries and forces the host integrations into the root graph.

## References

- `packages/liteship/src/index.ts`, `packages/liteship/src/export-budget.ts`
- `packages/liteship/src/{schema,reactive,motion,graph,media,evidence,compiler,runtime,astro,vite,testing}.ts` — the eleven subpath facades
- `packages/gauntlet/src/gates/facade-export-budget.ts` — the budget gate
- `tests/unit/liteship/facade-subpaths.test.ts` — the resolution + budget gate
- [ADR-0045](./0045-source-grammar.md) — source grammar: package boundary, domain directory, and the facade law
- [ADR-0044](./0044-liteship-brand-consolidation.md) — LiteShip brand consolidation
