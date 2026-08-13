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
- Release candidate identity and the candidate itself.
- Release qualification.
- The release and publication plans, and the publication destination.
- Three receipts — package, release, publication — and the withdrawal.

## Does not own

- Registry protocol, transport, or credentials. Publishing is physical behaviour: a host capability reached through a wire.
- Command parsing or a release workflow. `package`, `release`, and `ship` are three programs in `system/03_programs`, which does not exist yet.
- Assurance authority. `01_assurance` issues it; this home consumes it and cannot mint it.
- Artifact ancestry, source relations, or projection targets. `00_core/14_compiler` owns those, and a packed artifact binds addresses rather than restating them.
- Version numbers as a source of truth about compatibility. See below.

## A release cannot qualify itself

This is the relation the home exists to make structural.

`ReleaseQualification`'s qualified arm carries `CaseOf<AssuranceAuthority, 'earned'>` — the earned arm specifically, never the whole algebra. Widening that member to `AssuranceAuthority` would readmit `unearned` and restore self-qualification, so a law pins the exact arm rather than merely pinning that some authority is present.

Earned authority in turn carries the qualified gates that earned it and the snapshot it was earned over. Qualified gates carry non-empty detection witnesses. The chain from a published artifact back to a demonstrated detection is therefore unbroken and typed at every link, and it cannot be cut at the far end instead of the near one.

The alternative is the ordinary industry arrangement, in which the same program produces a tarball and declares it fit. That arrangement has nowhere to record *why* it is fit, which means it has nothing to be wrong about.

## The candidate and the authority share one coordinate

`ReleaseCandidate.snapshot` is the same coordinate assurance earned its authority over.

A candidate built from one revision and qualified against another is the failure that member exists to make visible. It is also why the working-tree state lives on the snapshot rather than being asked for again here: assurance evidence acquired from a modified tree does not describe the revision it names, and this home should not be able to launder that by re-observing.

## Compatibility is claimed over the ABI, not the version

`CompatibilityClaim` ranges over `TypeAbiAddress`.

A semantic version is an assertion a human typed. An ABI address is a fact about the surface, computed from the canonicalizer, the surface digest, and the exact interpreter lane. The difference is the entire reason the Type ABI exists, and stating compatibility over version strings would have made the ABI decorative on its first real consumer.

The `unknown` arm is required and is not a failure. A release with no predecessor surface to compare against genuinely does not know, and a grammar that forces it to say `compatible` teaches the whole apparatus to lie exactly once per first release — after which the lie is in the record and indistinguishable from a measurement. A law pins the arm count so `unknown` cannot later be deleted as apparent dead weight.

## Three receipts, because three things can fail separately

Packaging, releasing, and publishing are three operations over one authority, and each can succeed while the next does not.

`02_targets` already learned this shape and recorded it: every product carries the identity of the phase it belongs to, so nothing changes phase by swapping which reference it holds. A package receipt names no destination because packaging reaches no registry. A publication receipt names one because it did. A law checks that none of the three substitutes for another.

`Withdrawal` exists because publication is the one system operation that is not reversible by re-running it. A vocabulary with no way to say *this went out and should not have* forces the retraction into prose, and prose does not run.

## Laws

- Release qualification's qualified arm carries the earned assurance arm exactly; the full algebra is not assignable into it.
- A compatibility claim may be unknown, carries no predecessor in that arm, and its breaking arm carries a non-empty diagnostic population.
- The three receipts are three populations; none substitutes for another, and the package receipt carries no destination.
- A release candidate and its receipt are exact over candidate identity, and the broad form does not substitute.

## Proof obligations

Runtime and repository claims a type cannot express:

- That the packed artifact's contents are the addresses it enumerates.
- That the authority a qualification carries was issued by a gauntlet run over the candidate's own snapshot.
- That a compatibility claim compared the predecessor surface it names.
- That published destinations correspond to the candidate the publication receipt references.
- That a withdrawal reached every destination the publication did.

## Implementation boundary

Architecture only. No implementation exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: system/02_release
  title: "Release: Distributable Meaning and Earned Qualification"
  maturity: architecture-specified
  implementation: absent
  child_homes: []
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - a-release-cannot-qualify-itself
  - qualification-carries-the-earned-arm-not-the-algebra
  - candidate-and-authority-share-one-snapshot
  - compatibility-is-claimed-over-the-type-abi-not-the-version
  - a-compatibility-claim-may-be-unknown
  - packaging-releasing-publishing-are-three-receipts
  - withdrawal-is-representable
  - no-second-artifact-vocabulary
  production_authority: false
```
