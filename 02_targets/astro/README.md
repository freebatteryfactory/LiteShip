# Astro Target

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/astro/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Attach already-defined LiteShip meaning and already-defined host capability to Astro's configuration, registration, authoring, build, island, server, and development surfaces.

This child is semantically thin and operationally complete — thin meaning subordinate in authority, not small. Every relationship it owns is a translation between something an author or an ecosystem expresses and something upstream already means.

## Homes

Seven, each earning its place by owning a distinct translation relationship rather than by mirroring an ecosystem feature.

| Home | Owns |
|---|---|
| `00_integration` | identity, registration, compatibility evidence |
| `01_configuration` | the raw-to-admitted trust boundary and field disclosure |
| `02_authoring` | authored activation to core's evidence proposition |
| `03_build` | the one build-facility requirement |
| `04_island` | translation into web's island contract, and entry ancestry |
| `05_server` | application-directed mount mechanics over core operations |
| `06_development` | development evidence, with no production authority |

## Why there is no artifact home

Core owns the artifact. The home that *causes* a production owns the production relation: build artifacts with build, island entries with islands, generated declarations with development.

A generic artifact home would become a waiting room for unrelated emitted things, and it would tempt this child to restate core artifact fields — the second-vocabulary failure the umbrella already forbids. Folder symmetry is not a reason.

## Does not own

- Any sibling target. This child imports none, and names none.
- Artifact identity, address, digest, media type, or ancestry grammar.
- A source relation, an explanation product, or a lifecycle taxonomy.
- Routes, status policy, content negotiation, entity tags, request decoding, or protocol framing.
- Execution backend selection.
- The activation decision, or the physical act of activation.
- A deployable-application contract.

## The seam with the build supplier

Astro genuinely uses Vite. That fact is expressed without importing Vite, naming Vite, or borrowing Vite's vocabulary: `03_build` declares a hole whose contract is written entirely in upstream language, and a supplier converges with it or does not.

Coexistence does not create ownership. "Astro uses Vite" does not put Vite above Astro, and the predecessor's one target that imported a sibling is precisely the one that lost its independent story.

Whether any supplier actually converges is not a question this child may answer about itself. `verification/` imports both public surfaces and proves the binding, which it may do because it is not a target and acquires no semantic ownership by doing so.

## Laws

- The roster is exactly seven homes; a home added on disk without being reached here breaks the umbrella.
- Load-bearing surface members keep their declared types, named one by one — a whole-surface comparison stays green while an individual member blurs to `unknown`.
- This child declares no second ecosystem-target identity. Its identity is the umbrella's, instantiated.

## Proof obligations

Deferred to assurance and implementation, named here so they are not mistaken for compile-time claims:

- That a registered integration observes the ecosystem version its compatibility evidence claims.
- That no secret-classified configuration field reaches browser-visible output.
- That an island entry's ancestry genuinely reaches the residual program.
- That a mount invokes the operation it names and honours only its correlated commit grant.

## Implementation boundary

Specified. No integration code, no hook handlers, no runtime exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 02_targets/astro
  title: "Astro Target"
  maturity: specified
  implementation: absent
  child_homes:
  - 00_integration
  - 01_configuration
  - 02_authoring
  - 03_build
  - 04_island
  - 05_server
  - 06_development
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - no-sibling-target-imports
  - the-application-owns-the-route
  - the-compiler-chooses-backends
  - astro-owns-the-socket-shape
  - no-generic-artifact-home
  - no-transport-policy-in-a-target
  - web-owns-activation-astro-owns-translation
  - no-production-authority-in-development
  production_authority: false
```
