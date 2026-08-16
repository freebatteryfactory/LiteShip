# Release: Distributable Meaning and Earned Qualification

Status: architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `system/02_release/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own what a release is: a candidate over an exact snapshot, the artifacts packed from it, what its type surface claims about compatibility, whether it is qualified to ship, and the receipts for packaging, releasing, and publishing.

## Owns

- Package identity and the packed artifact, including the addressed population it contains.
- The compatibility claim, stated over Type ABI addresses.
- Release candidate identity, the candidate itself, and the qualified candidate.
- Release qualification.
- The release and publication plans, and the publication destination.
- Three receipts — package, release, publication — and the withdrawal.
- The order those products consume one another in, which is the chain the laws pin.

## Does not own

- Registry protocol, transport, or credentials. Publishing is physical behaviour: a host capability reached through a wire.
- Command parsing or a release workflow. `package`, `release`, and `ship` are three rostered programs in `system/03_programs`.
- Assurance results. `01_assurance` produces them; this home consumes one and cannot mint it. There is no authority object to mint — a passing result is the evidence.
- Artifact ancestry, source relations, or projection targets. `00_core/14_compiler` owns those, and a packed artifact binds addresses rather than restating them.
- Version numbers as a source of truth about compatibility. See below.

## A release cannot qualify itself

This is the relation the home exists to make structural.

`ReleaseQualification`'s qualified arm carries `CaseOf<AssuranceResult, 'passed'>` — the passed arm specifically, never the whole algebra. Widening that member would readmit `blocked` and restore self-qualification, so a law pins the exact arm rather than merely pinning that some result is present.

That relation was true and was being applied one stage too early. `ReleaseReceipt` took a plain `ReleaseCandidate`, whose qualification may be sitting in the `unqualified` arm — so the type that exists to record that something shipped could record the shipping of something the apparatus had refused. It now takes `QualifiedReleaseCandidate`, built with root's `Refine`, which rejects a change that narrows nothing.

A candidate must still be able to be unqualified: it is packed before it is judged, and a grammar with no unqualified state forces packaging to lie. What must not be representable is a *release* of one.

The alternative is the ordinary industry arrangement, in which the same program produces a tarball and declares it fit. That arrangement has nowhere to record *why* it is fit, which means it has nothing to be wrong about.

## Two axes, not one

A result is exact over its snapshot and over its specification. The snapshot axis answers *was this evidence about the right revision*. The specification axis answers *was it about the right question*.

The second is not redundant. A passing result means every check the run required was satisfied — so a run that required nothing passes too, and without this axis an editor invocation's result is assignable wherever a release-grade one is, carrying an honest `passed` tag the whole way to a published artifact. Which specification release requires is a decision the release program makes. What the type prevents is one run's answer being quoted for another run's question.

The broad specification is not the union of all specifications. It is the case where nobody has said which run this was, and it does not satisfy a carrier that named one.

## Every stage consumes the previous stage's product, not a name for it

A plan names a snapshot. A package receipt carries the plan. A candidate carries the receipt. A release receipt carries a qualified candidate. A publication plan carries the release receipt. A withdrawal carries the publication receipt.

This replaced three carriers that held a name where they should have held a product. `ReleaseCandidate.packages` was `NonEmptyTuple<PackedArtifact>`, and an artifact carries an address, a digest, and no ancestry at all — so a candidate for snapshot A could hold artifacts packaged under a plan for snapshot B. `PublicationPlan` and `Withdrawal` both held a bare `ReleaseCandidateReference`, so publishing something never released, and withdrawing something never published, were both representable.

`ReleaseCandidate.snapshot` remains beside `packaged`, and it is not a second fact. Both read the same type parameter, so `packaged.plan.snapshot` and `snapshot` are the same type by construction and cannot be made to disagree. A member that cannot disagree with its source is a convenience, not a duplicate.

The working-tree state lives on the snapshot rather than being asked for again here: assurance evidence acquired from a modified tree does not describe the revision it names, and this home should not be able to launder that by re-observing.

## The chain is proved by reading the producer, not by restating it

`TheReleaseChainCarriesOneCoordinateEndToEnd` pins six stages against `OutputOf<WorkspaceObservation<…>>['id']` — the coordinate as `00_workspace`'s public operation actually emits it, rather than as this file would like it to be.

The difference is the whole point. Writing the expected type by hand proves the stages agree with the author. Reading it from the operation proves they agree with the producer, so a producer that broadens fails here as well as at home. That is measured: broadening `WorkspaceObservation`'s output turns two laws red, one in each file.

A positive chain law alone would be satisfied by a chain in which every stage carried the broad reference, because the broad reference equals itself. `NoStageInTheChainAdmitsAnotherCoordinate` supplies one refusal per joint, and ends with the lawful pairing so the chain is not proved airtight by being unbuildable.

## Compatibility is claimed over the ABI, not the version

`CompatibilityClaim` ranges over `TypeAbiAddress`.

A semantic version is an assertion a human typed. An ABI address is a fact about the surface, computed from the canonicalizer, the surface digest, and the exact interpreter lane. The difference is the entire reason the Type ABI exists, and stating compatibility over version strings would have made the ABI decorative on its first real consumer.

The `no-predecessor` arm is a real conclusion, not an unfinished assessment: it carries the current ABI address and states that no previous surface exists. A grammar that forces the first release to say `compatible` teaches the apparatus to invent a comparison. A law pins the complete roster, the current address, the absent predecessor, and the absence of a free-text reason.

## Three receipts, because three things can fail separately

Packaging, releasing, and publishing are three operations over one authority, and each can succeed while the next does not.

`02_targets` already learned this shape and recorded it: every product carries the identity of the phase it belongs to, so nothing changes phase by swapping which reference it holds. A package receipt names no destination because packaging reaches no registry. A publication receipt names one because it did. A law checks that none of the three substitutes for another.

A publication receipt's `published` population is separate from its plan's `destinations` and is not a duplicate of it. A publication that reached two registries out of three is a real outcome, and a grammar in which intent and result are the same member cannot say so.

`Withdrawal` exists because publication is the one system operation that is not reversible by re-running it. A vocabulary with no way to say *this went out and should not have* forces the retraction into prose, and prose does not run.

## Laws

- Release qualification's qualified arm carries the passed assurance arm exactly; the full algebra is not assignable into it.
- One coordinate travels from the observation to the publication receipt, pinned at six stages against the type the producer emits.
- No stage in that chain admits a product from another coordinate, and the matching coordinate is still accepted at every joint.
- No stage admits a result from another specification either, and the broad specification does not satisfy a carrier that named one.
- A release receipt requires a candidate whose qualification is in the qualified arm; a plain candidate is not assignable, a qualified one is still a candidate, and the refinement did not collapse to `never`.
- A compatibility claim may name no predecessor, carries the current ABI but no predecessor or reason in that arm, and its breaking arm carries a non-empty diagnostic population.
- The three receipts are three populations; none substitutes for another, and the package receipt carries no destination.
- A release candidate and its receipt are exact over candidate identity and over the snapshot, and the broad form does not substitute.

The `never` line is not decoration. `Refine` resolves to `never` when a change is not a strict narrowing, and `never` is assignable to everything — so a `QualifiedReleaseCandidate` that had quietly become `never` would satisfy every other assertion written about it. This repository has shipped that composition before.

## Proof obligations

Runtime and repository claims a type cannot express:

- That the packed artifact's contents are the addresses it enumerates.
- That the passing result a qualification carries was produced by an assurance run that actually evaluated the candidate's snapshot, rather than one that merely names it.
- That a compatibility claim compared the predecessor surface it names.
- That the destinations a publication receipt reports as published were reached.
- That a withdrawal reached every destination it names.

## Implementation boundary

Architecture only. No implementation exists or is authorized.
