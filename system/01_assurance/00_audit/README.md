# Audit: Evidence Acquisition

Status: architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `system/01_assurance/00_audit/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Read the repository and produce facts. Open the type program, walk the source homes, resolve imports, canonicalize the public surface, and hand the result to `01_gauntlet`.

## Owns

- Probe identity and reference.
- The acquired fact: what was observed about which subject, by which probe.
- The structural twin observation: two declarations that are structurally identical and differently sourced.
- Probe coverage.
- The type-program interpreter and import-resolver capability holes, and the exact audit prerequisite row.
- The audit product.

## Does not own

- `TypeAbiSurface` or `TypeAbiAttestation`. Root `types.d.ts` owns both; audit produces instances.
- `AuthorityGraph`, `AuthorityRecord`, or `CanonicalImport`. `00_core/18_inspection` owns them; audit produces instances.
- Any gate, finding, or conclusion. Those belong to `01_gauntlet` and the assurance umbrella, and their absence from the audit product is a law.
- A roster of which checks will read a fact. See below.
- A compiler. The interpreter is an injected capability naming its root-assigned lane.

## Audit decides nothing

The boundary is worth stating flatly because it is the one that erodes, and it erodes one convenience member at a time, each individually reasonable.

`AuditProduct` carries no `verdict`, no `findings`, no `authority`, no `outcome`, and no `passed`. A law checks all five by name. The moment acquisition can conclude, the split has collapsed and the heaviest dependency in the repository follows every decision everywhere it goes.

## Producing other people's vocabulary

Every member of the audit product is a type owned upstream, assembled here. That is the whole shape of this home.

It also makes the home's own most likely defect its subject matter. A local interface with the same members as `AuthorityGraph` would satisfy any name check and be exactly the twin this home exists to find — committed by the detector. The laws therefore compare structurally against the owners rather than by name.

## Every fact has a consumer

`AcquiredFact.consumers` was required and non-empty, and it is deleted.

The failure mode it aimed at is real: acquisition drifts into a growing pile of interesting measurements nobody reads, which looks like thoroughness, costs like a subsystem, and is how thirteen probes and fifteen mutation banks came to exist beside a set of laws that were never wired to most of them.

But the member did not prevent it. A tuple of gate references inside an evidence product is a reverse index with no relation to what it names — free to list checks outside the run, free to omit checks inside it, answerable to nothing, and read by nobody but its own law. Opposite it sat `GateDefinition.reads`, the same relationship written from the other direction and traversed from neither.

Both are gone. The one declaration of what a check reasons about is its proposition. Whether every acquired fact has a reader is now a proof obligation, which is where a claim that only a traversal can establish belongs.

## A probe that could not run stays visible

`AcquiredFact.value` is `Evidence`, not a bare value, so a probe that ran and found nothing, a probe that could not run, and a probe that failed remain three distinct states all the way to the consumer. `ProbeCoverage` carries the same distinction at the run level, and has no `skipped` arm.

## The interpreter must name its lane

The root toolchain policy assigns roles, and `semantic-abi` and `analysis-api` may sit on a different lane than `primary-check` for as long as the native compiler exposes no *stable* programmatic API — 7.0.2 ships `typescript/unstable/*`, including a `Checker`, and unstable is the vendor's own word. That is a stated root policy with an explicit retirement trigger.

What must not happen again is the previous response to that gap. Lacking the API, the deleted harness hand-rolled lexical scanners over comment-stripped source — a second parser with none of a parser's guarantees, checking claims about type identity by matching text. Requiring `TypeProgramInterpreter` as a hole means an implementation that wants to read source has to name the lane it read with, and the attestation it produces carries that lane's fingerprint.

`ImportResolver` exists for the same reason at a smaller scale: what a specifier actually names is a resolution question, and text matching cannot answer it.

## Laws

- An acquired fact names at least one consumer, as a non-empty population that cannot become a plain array.
- The audit product's surfaces, attestations, and graph are structurally the upstream owners' types.
- The audit product carries no verdict, findings, authority, outcome, or pass flag.
- An acquired fact carries no roster of the checks that will read it, under that name or an obvious substitute.
- Probe coverage distinguishes complete from partial, has no skipped arm, and fact values remain `Evidence`.

## Proof obligations

Runtime and repository claims a type cannot express:

- That the canonicalized surface reflects the source at the snapshot's revision.
- That the interpreter lane named in an attestation is the lane that actually produced the surface.
- That a public form the canonicalizer could not interpret appears in coverage rather than being dropped from the population.
- That a structural twin observation compared genuine declaration sites, not two aliases of one declaration.
- That import resolution followed the module graph rather than matching specifier text.

## Implementation boundary

Architecture only. No implementation exists or is authorized.
