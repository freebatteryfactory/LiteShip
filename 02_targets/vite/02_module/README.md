# Vite Module Identity

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/vite/02_module/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Separate the friendly name an author imports from what a generated module actually is, and make an unresolvable module refuse rather than empty itself.

## Owns

- The public module specifier — ergonomics, not identity.
- The generated module identity, reading the configuration revision, the source revision, and the environment.
- The resolved location, as an ecosystem location handle.
- The load outcome: generated, genuinely empty, or unresolved.

## Does not own

- The bundler resolution algorithm.
- Module contents. This home owns identity and disposition.
- Artifact identity. Core owns that; `04_asset` binds it.

## Specifier and identity

A fixed virtual-module string cannot distinguish projects or configurations, so caches, diffs, and ancestry questions would conflate byte-distinct modules.

The ecosystem does not help here. Neither the bundler nor its plugin contract documents any convention for parameterising a virtual id, and neither detects a collision. This is genuinely the target layer's to own, and the fix is that identity reads every axis that can change the bytes.

The companion failure was quieter: a virtual module loaded without data returned an empty object, indistinguishable from a genuinely empty project. Both answers exist here, and they are different arms.

## Laws

- Module identity reads the configuration revision.
- Module identity reads the source revision and the environment.
- The public specifier is not the semantic identity, in either direction.
- Empty and unresolved are different answers: `unresolved` carries diagnostics and no identity.
- A resolved location is not an identity.

## Proof obligations

- That two projects with different configurations never produce one module identity.
- That a module reported genuinely empty was genuinely empty.

Assurance-and-implementation territory.

## Implementation boundary

A realization must satisfy the laws and proof obligations above through this home's declared authorities.
