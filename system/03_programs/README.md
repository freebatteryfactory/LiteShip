# Programs: The Eleven Operations Whose Subject Is This Repository

Status: architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `system/03_programs/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Declare the program population, bind each program's identity to it, and type the release chain those programs drive.

## Owns

- The roster: eleven names, one tuple.
- Program identity, computed from the name.
- The program itself, which is core's operation definition plus a name.
- The three release-path signatures: package, release, ship.
- The exposed population a wire projects, derived from the roster.

## Does not own

- Anything an operation already is. Schemas, effect classes, idempotency policy, cancellability, reversibility, and requirements are core's, supplied in the definition rather than restated here.
- Argv, exit codes, or streams. `02_wires/cli` owns those.
- Products. `00_audit` owns the audit product, `01_gauntlet` the assurance result, `02_release` the package, release, and publication receipts. This home says which program consumes and produces which; it declares none of them.
- Privilege. Nothing here is parameterized by `WireCaller`.

## A program is an operation

This is the whole subtraction, and it is why the home is small.

A program's `OperationId` is `liteship.system.program.${Name}`, computed from the roster entry. There is no `SystemProgramId` brand beside `OperationId` — a program reference *is* an operation reference, so every consumer that already accepts one accepts a program without knowing it is one. Eleven hand-written brands would have been eleven declarations that can disagree with the roster, which is the shape a topology fold already removed once.

Everything else comes from `OperationDefinition`. A program that lies about its effects lies in the same field an application operation would, and the same policy machinery reads it.

`ObservesOnly` projects through `definition.effects` rather than adding a `readOnly` member. A second summary of the effects would be one more fact that can drift from what it summarizes.

## Release consumes a qualified candidate

The system README carried this as prose it could not enforce. It is now the input type.

`ReleaseSignature` accepts `QualifiedReleaseCandidate` — a candidate whose qualification is in the qualified arm. A candidate that was packed but never judged is not that type, and there is no second door.

Both exactness axes thread. A candidate qualified over another snapshot is refused; a candidate qualified by a result from another run specification is refused. Those are different failures and both are closed at the same signature.

**What the type still cannot do** is force a concrete release program to be declared over an *exact* specification rather than the broad default. The broad form is an erased catalog shape and is correct for a catalog — it deliberately accepts results from several exact specifications. That a governed release path must not use it is an obligation on whoever writes the program, and it is in the obligations below rather than pretended away here.

## Exposure derives from the roster

`SystemProgramExposure` is a mapped type over the eleven names, producing exactly the shape `WireExposure.exposed` accepts.

So a program cannot exist and be unreachable, and a wire cannot claim to expose a program the roster does not name. A hand-written exposure list reaches disagreement within two additions, and nothing would notice.

The mapping goes through a generic helper rather than mapping the concrete roster directly, and that is not style. A homomorphic mapped type preserves tuple arity only when its source is a naked type parameter; mapping the concrete alias produced an object that answered `[8]` correctly while failing `['length']` and refusing to extend a non-empty tuple. Two law lines caught it, and the fix is the same shape `PlannedEvaluations` uses in `01_assurance`.

## Why this home waited

A program projects through a wire. Its contract could not be written honestly before the wire contract existed, and `02_wires/cli` landed first for that reason.

That was a dependency, not a schedule. The distinction matters because the previous arrangement's equivalent of this home was built anyway, under a `verification/` directory, before anything it needed existed.

## Laws

- A program reference is an operation reference; two programs are not interchangeable; the broad form does not substitute; and the identity is the computed one.
- Release consumes a qualified candidate, exact over both snapshot and specification, with a lawful control and a `never` guard.
- The exposed population and the program population are one, positionally, and the result is what a wire's exposure accepts.
- The effect character is read through the operation definition, with an anti-vacuity partner proving the projector discriminates.

## Proof obligations

Runtime and repository claims a type cannot express:

- That a governed release path supplies an exact `AssuranceRunSpec` rather than the broad default.
- That each program's declared effects match what it does. `migrate` declaring `observe` compiles.
- That the eleven programs are the eleven a user can invoke — that no twelfth is reachable through a wire and no rostered one is missing from a registry. `04_bootstrap` makes the second half structural; the first is a repository fact.
- That a program's requirements are satisfied by the capabilities a bootstrap bound, for the concrete programs that do not exist yet.

## Implementation

None. Eleven contracts and no bodies.
