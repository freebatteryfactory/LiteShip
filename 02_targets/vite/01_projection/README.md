# Vite Fleet Projection

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/vite/01_projection/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Project the complete core compiler fleet into the build lifecycle, and expose the build facility this child offers — in upstream vocabulary, without reference to any requester.

## Owns

- The per-arm projection decision: projected with its environments, or unsupported with evidence.
- The fleet projection, derived from the arm roster by construction rather than listed beside it.
- The projection request and disposition this child accepts and returns.
- The build facility this child exposes.

## Does not own

- Any requester. Nothing here imports, names, or is shaped around a framework.
- Compiler algorithms or arm semantics. Core owns those.
- Whether the facility converges with anyone. `verification/` answers that.

## Derived, because a hand-maintained list goes quiet

The predecessor kept a fixed set of transforms. Adding a compiler capability produced no error and no diagnostic — the new arm simply had no projection, and nothing said so.

Here the projection is a mapped type over the roster. Adding an arm adds a key, and a projection that has not decided about it does not type-check. The decision may be "unsupported", but it must be made and it must carry evidence.

## Laws

- The projection is derived from the fleet: a two-arm fleet projects to exactly two decisions.
- An unsupported arm carries evidence — there is no arm meaning "nothing happened and nobody was told".
- A projected arm declares where it applies, non-empty.
- The facility carries its exact axes on covariant members.
- The facility names no requester and no foreign ecosystem.
- Only production carries artifacts.

## Proof obligations

- That every arm in the live fleet has a projection decision.
- That an unsupported arm is reported rather than skipped.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 02_targets/vite/01_projection
  title: "Vite Fleet Projection"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - projection-is-derived-never-listed
  - unsupported-is-explicit-with-evidence
  - the-facility-names-no-requester
  - exactness-axes-live-in-covariant-position
  production_authority: false
```
