# Vite Build Products

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/vite/05_build/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the final build products — chunks, filled slots, assets, and source-map disposition — with one producer per slot and no second manifest.

## Owns

- The emitted chunk and its per-chunk ancestry.
- The filled slot: exactly one produced artifact, which carries exactly one producer.
- The build product: built, refused, or failed.

## Does not own

- A manifest vocabulary. Ancestry has owners already.
- Artifact identity, address, or digest.
- Deployment. That contract is deferred until a later child earns it.

## One artifact emitter

Two independently derived boundary manifests could disagree with no recorded winner. One produced artifact per slot and one producer per artifact make a second emitter unrepresentable.

The ecosystem does not arbitrate this — both derivation surfaces exist and neither has a concept of a winner. The umbrella already made the answer unrepresentable: a produced artifact carries one producer and one slot. This home consumes that rather than inventing a second manifest vocabulary, so a second emitter has no shape to take.

## Source-map honesty

After a transform moves code, a null map is not "no source map" — under the bundler contract it asserts that the transformation **preserved coordinates**, and the composer chains maps on that basis. The honest "no map here" return is an empty mapping object.

So the defect was not an omission. It was a false identity-preserving source relation, which is exactly the disease core's source-relation algebra exists to eliminate — and why disposition here is stated rather than defaulted.

## Laws

- One slot receives one produced artifact: no producer list, candidate set, or emitter roster exists.
- The build carries no second manifest vocabulary.
- Source-map disposition is core's source relation, stated rather than defaulted.
- A refused or failed build reports no slots.

## Proof obligations

- That the slots reported were the slots actually filled.
- That a transform which moved code emitted a mapped relation rather than claiming identity preservation.

Assurance-and-implementation territory.

## Implementation boundary

A realization must satisfy the laws and proof obligations above through this home's declared authorities.
