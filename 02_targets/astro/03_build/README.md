# Astro Build Facility Requirement

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
- Whether a given supplier converges. A composition point under `system/` imports both and answers that assurance question.

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

`AstroBuildTypeSurface` does not list the requirement, and that is not a gap. A type surface is an inspection summary consumed by the parent topology, not an export membrane — the real semantic API is the module's exports at their owner path, which is what the composition fixture in `02_targets/types.laws.ts` imports. A member was briefly added here along with a law reading it, and neither was on any consumer path: the summary was being made to feel reached. Both are gone.

## Proof obligations

- That a runtime supplier actually produced the bytes its artifacts address.
- That a non-empty demand answered `empty` is a defect a live composition detects.
- That two suppliers never race for one slot.

Assurance-and-implementation territory.

## Implementation boundary

A realization must satisfy the laws and proof obligations above through this home's declared authorities.
