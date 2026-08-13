# Vite Target

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/vite/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Attach already-defined LiteShip meaning to a bundler's plugin, module-graph, emission, and build surfaces — and expose, independently, the build facility this child is capable of.

Nothing here names a requester. This child does not know which framework, if any, will ask it for anything.

## Homes

Six.

| Home | Owns |
|---|---|
| `00_integration` | identity, registration, compatibility evidence, environment applicability |
| `01_projection` | the derived fleet projection and the exposed build facility |
| `02_module` | generated and virtual module identity, separate from its public specifier |
| `03_graph` | environment-scoped invalidation, hot-update ordering, stale rejection |
| `04_asset` | worker, WebAssembly, and binary emission with ancestry |
| `05_build` | chunks, filled slots, and source-map disposition |

## Does not own

- Any sibling target, or any requester.
- Compiler algorithms or arm semantics.
- Artifact identity, address, or digest. Core owns those; this child binds them.
- A second ordering coordinate, a second manifest vocabulary, or a second artifact vocabulary.
- Deployment.

## What the ecosystem does not give us

Four of the predecessor's defects are **not** solved by the bundler, and are therefore genuinely this layer's to own. Each lands on a member the umbrella already provides:

| Defect | Owner here |
|---|---|
| Virtual module ids not parameterised by configuration | the configuration revision inside module identity |
| A manifest emitted twice with no winner recorded | one produced artifact per slot, one producer per artifact |
| Hot updates with no monotonic generation | core's stream sequence |
| Data missing answered with an empty module | `unresolved` as its own arm, carrying diagnostics |

Two others **are** solved natively and are therefore deleted rather than reimplemented: the canonical worker entry replaces Blob-URL assembly, and map chaining across transforms is the bundler's own.

A third thing the ecosystem gives is bookkeeping that must not be mistaken for identity. An emit returns a reference id and resolves to a hashed filename; both are location handles. Neither is a content address, and neither records which plugin produced what.

## The seam with a requester

This child exposes a facility in upstream vocabulary and stops. It does not import a requester's hole to claim conformance, and it declares no member shaped around one — a `framework`, `astro`, or `hooks` member would make the facility fillable only by the requester it was shaped around, which is a sibling import re-entering through the type system.

Whether the facility converges with anyone's requirement is proved by a composition point importing both public surfaces, which acquires no semantic ownership by doing so. That is assurance; its home is `system/`, which is not yet authored.

## Laws

- The roster is exactly six homes.
- Load-bearing surface members keep their declared types, named one by one.
- This child declares no second ecosystem-target identity.

## Proof obligations

- That every arm in the live compiler fleet has a projection decision, and an unsupported one is reported rather than skipped.
- That a projection never runs in an environment it did not name.
- That an emitted asset digest matches the bytes actually written.
- That two projects with different configurations never produce one module identity.

## Implementation boundary

Specified. No plugin code, no hook handlers, no runtime exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 02_targets/vite
  title: "Vite Target"
  maturity: specified
  implementation: absent
  child_homes:
  - 00_integration
  - 01_projection
  - 02_module
  - 03_graph
  - 04_asset
  - 05_build
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - no-sibling-target-imports
  - the-facility-names-no-requester
  - environment-scope-is-required-not-default
  - projection-is-derived-never-listed
  - specifier-is-not-identity
  - ordering-is-core-sequence-not-timestamp
  - one-slot-one-producer
  - reference-ids-are-handles-not-identity
  production_authority: false
```
