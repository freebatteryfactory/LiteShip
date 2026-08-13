# Astro Build Facility Requirement

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/astro/03_build/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

State the one build facility this child needs, in already-closed upstream vocabulary, as a requirement no supplier gets to define.

## Owns

- The exact artifact-slot demands this child makes.
- The projection request, carrying the planned compilation product whole.
- The projection disposition across five altitudes: empty, produced, unsupported, unresolved, failed.
- The build-facility contract shape, and the requirement that names who fills it.

## Does not own

- Any supplier. This home names no ecosystem, no plugin, and no bundler.
- Compiler algorithms, a compiler-arm roster, source maps, artifact identity, or output bytes.
- Whether a given supplier converges. That is a question for a composition point importing both, and it is assurance rather than architecture — its home is `system/`, which is not yet authored.

## Why the parameter is constrained, and by what

Two shapes were rejected on the way here. Both compile; neither proves anything.

A **free contract parameter** — `Hole<name, Facility>` with `Facility` unconstrained — lets every supplier satisfy the requirement by nominating itself. The binding compiles and demonstrates that a shoe fits itself.

A parameter constrained by the **broad instantiation** is the same failure wearing a constraint, because broadening is precisely what the broad form permits.

So the requirement is generic over the exact axes and the supplier is constrained by *those*. The parameter names who filled the socket; it does not define what the socket means.

## An exactness axis inside the request is not proved

Found by measurement, not by reasoning. `Signature<Input, Output>` stores its input as `(input: Input) => void`, which is contravariant: a supplier that accepts a *broader* request stays assignable, so a broadening mutation survives. Participation held only inside the request was therefore unprovable, and the same applied to slots and the producer.

Every axis that must be exact is consequently also a covariant member of the facility. The repetition is load-bearing, not redundancy.

## Direct mode is not exercised here

A host-only composition does not need to pretend it can satisfy a build-tool facility. The producer-neutral question belongs at the deployment boundary, where an Astro-produced and a directly-produced deployment input must enter one consumer path without the consumer asking which happened.

## Laws

- The hole hands consumers the supplier they named, read through `HoleContract` — the path a consumer actually takes.
- The facility carries its exactness axes on covariant members, not only inside the request.
- A broadened supplier is not a legal filler of an exact socket.
- The produced disposition pins the exact producer.
- The disposition keeps five altitudes distinct, and only production carries artifacts.
- Every non-productive disposition explains itself with a non-empty diagnostic tuple.
- The request carries the planned outcome whole and restates no planning facts.
- The facility names no foreign ecosystem: no plugin handle, no hook payload, no ambient context.

## Proof obligations

- That a runtime supplier actually produced the bytes its artifacts address.
- That a non-empty demand answered `empty` is a defect a live composition detects.
- That two suppliers never race for one slot.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 02_targets/astro/03_build
  title: "Astro Build Facility Requirement"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - astro-owns-the-socket-shape
  - supplier-parameter-names-who-not-what
  - exactness-axes-live-in-covariant-position
  - five-disposition-altitudes
  - planned-outcome-enters-whole
  - no-foreign-vocabulary-in-the-contract
  production_authority: false
```
