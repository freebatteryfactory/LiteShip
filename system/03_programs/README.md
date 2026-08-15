# Programs: The Operations Whose Subject Is This Repository

Status: architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `system/03_programs/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Declare the program population, bind each program's identity to it, and type the repository operations and release chain those programs drive.

## Owns

- The definition map: each program beside its exact contract, in one tuple.
- Program identity, computed from the name.
- The program itself, which is core's operation definition plus a name.
- The target-neutral consumer build contract, its npm/pnpm and Astro/Vite adapter populations, and its composition-specific exposure.
- The observational doctor contract over repository, consumer-application, and deployed-application subjects, including remediation composition.
- The exact migrate program contract and its five-wire compile-use composition.
- The three release-path signatures: package, release, ship.
- The exposed population a wire projects, derived from the roster.

## Does not own

- Anything an operation already is. Schemas, effect classes, idempotency policy, cancellability, reversibility, and requirements are core's, supplied in the definition rather than restated here.
- Argv, exit codes, or streams. `02_wires/cli` owns those.
- Upstream products. `00_audit` owns the audit product, `01_gauntlet` the assurance result, targets own their native products, and `02_release` owns package, release, and publication receipts. This home declares only the cross-domain build and doctor products that have no legal owner before the system composition point.
- Privilege. Nothing here is parameterized by `WireCaller`.

## A program is an operation

This is the whole subtraction, and it is why the home is small.

A program's `OperationId` is `liteship.system.program.${Name}`, computed from the roster entry. There is no `SystemProgramId` brand beside `OperationId` — a program reference *is* an operation reference, so every consumer that already accepts one accepts a program without knowing it is one. A hand-written brand per program would be one more declaration per program that can disagree with the population, which is the shape a topology fold already removed once.

Everything else comes from `OperationDefinition`. A program that lies about its effects lies in the same field an application operation would, and the same policy machinery reads it.

`ObservesOnly` projects through `definition.effects` rather than adding a `readOnly` member. A second summary of the effects would be one more fact that can drift from what it summarizes.

## Nine programs, because nine contracts are earned

The population was eleven names — `doctor`, `verify`, `audit`, `gauntlet`, `build`, `benchmark`, `docs`, `migrate`, `package`, `release`, `ship` — in a tuple of strings, with every registry entry resolving to `SystemProgram<Name, unknown, unknown, RequirementRow>`.

Eleven names and eleven broad placeholders. The three exact release signatures were declared *beside* that registry rather than defining its entries, so a bootstrap holding the `release` entry held something that accepted `unknown` while an exact contract sat one home away describing what release should consume. Two correct declarations about different things, which is the shape this repository keeps finding.

`SystemProgramDefinitions` pairs each name with its contract, and the roster, the name union, the identities, the references, the registry, and the wire exposure all derive from it. There is one place a program is introduced.

Nine are here because nine have exact inputs, outputs, failures, prerequisites, and consumers presently readable off types that exist: `AuditProduct`, `AssuranceResult`, the compiler-owned migration authority, the consumer-build adapters, the doctor provider authority, and the package, release, and publication chain. `benchmark` and `docs` remain intended capabilities whose outputs have not yet been quarried. Naming them would restore exactly the placeholder the map exists to remove — a roster is a promise the compiler checks, and a promise about a contract nobody has written is not one it can keep.

Each returns when its complete operation definition is reasoned and consumed. That is one edit to one tuple.

`AuditRequirements` came back with them. It was declared once as "the exact prerequisite row for one audit run", was never a requirement row on any signature because no audit signature existed, and was deleted for having no consumer. The concrete `audit` program is that consumer, so there is now a signature for it to be the requirement row of.

### Where the request shapes live, and why they must live here

`gauntlet` evaluates an audit product, and `01_gauntlet` may not import `00_audit` — they are siblings, and sibling exclusion is the rule that kept the predecessor's Cloudflare package from losing its independent story.

So `GauntletRequest` and `VerifyRequest` are declared here. This home is downstream of both children and is the first place allowed to name them together, which is precisely its job: it says which program consumes and produces which, and declares none of the products itself.

## Release consumes a qualified candidate

The system README carried this as prose it could not enforce. It is now the input type.

`ReleaseSignature` accepts `QualifiedReleaseCandidate` — a candidate whose qualification is in the qualified arm. A candidate that was packed but never judged is not that type, and there is no second door.

Both exactness axes thread. A candidate qualified over another snapshot is refused; a candidate qualified by a result from another run specification is refused. Those are different failures and both are closed at the same signature.

**What the type still cannot do** is force a concrete release program to be declared over an *exact* specification rather than the broad default. The broad form is an erased catalog shape and is correct for a catalog — it deliberately accepts results from several exact specifications. That a governed release path must not use it is an obligation on whoever writes the program, and it is in the obligations below rather than pretended away here.

## Exposure derives from the roster

`SystemProgramExposure` is a mapped type over the definition map, producing exactly the shape `WireExposure.exposed` accepts.

A hand-written exposure list reaches disagreement with the roster within two additions, and nothing would notice.

`SystemProgramWire` is what binds that shape to a wire, and until it existed the shape reached no consumer. `WireExposure.exposed` is `NonEmptyTuple<OperationReference>` — it admits any operations at all, in any order, including none of these — so this home's claim that a wire cannot expose a program the roster does not name was false wherever it mattered. The mapped type produced the right shape, the wire accepted that shape, and nothing put one into the other.

A `SystemProgramWire` refines `WireDefinition` so its exposed population *is* the derived one, positionally. The withheld population stays open: a wire that projects the programs and also withholds some application operation is ordinary, and constraining what a wire declines would be this home reaching across the boundary into the wire's own catalog.

The mapping goes through a generic helper rather than mapping the concrete roster directly, and that is not style. A homomorphic mapped type preserves tuple arity only when its source is a naked type parameter; mapping the concrete alias produced an object that answered `[8]` correctly while failing `['length']` and refusing to extend a non-empty tuple. Two law lines caught it, and the fix is the same shape `PlannedEvaluations` uses in `01_assurance`.

## The verify chain composes

`TheVerifyChainComposesAtOneCoordinate` is the first composition of the assurance spine, and it is the reason the definition map was worth building.

Until the programs carried contracts there was nothing to compose. Every registry entry consumed `unknown`, so *audit produces what gauntlet consumes* was a sentence in a README with no type that could disagree with it.

Read through the programs' own signatures at one exact coordinate: audit's product is gauntlet's input, and the same product read at a different snapshot is refused, so the coordinate threads through the composition rather than riding alongside it. Verify answers with gauntlet's answer, because verify is audit and gauntlet in one invocation.

What it is not: a run. These are contracts, and a composition of contracts proves the shapes meet. Whether an implementation of audit produces a product an implementation of gauntlet can read is a claim about bodies that do not exist.

## Migrate is an operation, not an orphan library

`MigrateProgram` consumes core's exact selected-row `MigrationRequest`, produces the report parameterized by that same adapter and request identity, fails with `MigrationFailure`, and requires the compiler-owned `MigrationAuthorityRequirement`. Its failure type is not the default diagnostic array: `SystemProgram` permits an exact failure carrier after the requirement row, so the rostered entry is the contract wires actually project.

`MigrateProgramProjection` binds that one computed program identity through direct, CLI, HTTP, and MCP carriers and binds the exact adapter/request pair through the editor's semantic migration method. The editor handler returns `MigrationReport` directly; its outer request carrier adds correlation and crossing once. This composition lives here because wires cannot import system back. No browser projection exists, and none is implied. The composition is compile-use evidence only; no handler body exists.

Its effect population is exactly `create`. Migration creates an addressed admitted-meaning bundle and proposes a later application operation; it has no `modify` effect and no workspace-mutation arm.

## Build means one consumer application build

`BuildProgram` consumes one exact `ConsumerApplicationSnapshot`: an application identity, one immutable workspace snapshot, and the addressed admitted LiteShip configuration that proves it is a consumer application. It never builds this repository. Repository repair remains an ordinary remediation operation proposed by doctor.

Target selection has two inputs: explicit or discover. An explicit Astro request cannot inhabit the Vite execution-plan arm and vice versa. Discovery produces a plan only after exactly one compatible candidate remains; zero candidates and two-or-more candidates are typed failures. There is no Astro-first ordered guess.

Package-manager and target integration are catalogued definitions, not switches distributed through a body. The manager population is exactly npm and pnpm. Yarn and Bun are explicit unsupported observations, and an unrecognized manager has its own admitted name. The target population is Astro and Vite, each with a stable adapter lineage, an addressed definition, its exact binary, and an admission signature from its target-owned successful product. Vite's `BuildProduct` is the input to the Vite row; it is never the universal build result.

The build request identity is also its execution identity viewed through `BuildExecutionReference`; there is no unrelated second identifier to reconcile. A manager renders that identity into the child-process request beside its exact manager selection and target binary. The selected target adapter then accepts only a native product carrying that same execution and its own exact adapter coordinate. The target-neutral report is generic over the resulting plan, so its admitted non-empty `ProducedArtifact` population and successful process receipt cannot be borrowed from another request, application, or target. Launch failure and a completed nonzero host build remain different failure arms. Every failure carries non-empty diagnostics.

Initial exposure is exact and composition-owned: direct, CLI, and a trusted-local MCP tool whose admission evidence is named. HTTP and editor do not appear on `BuildProgramProjection`.

## Doctor diagnoses; ordinary operations remediate

`DoctorProgram` has exactly one effect: `observe`. Its subject algebra begins with three arms:

- a LiteShip repository snapshot;
- a LiteShip consumer-application snapshot;
- an admitted deployed application or admitted server endpoint.

The subject selects one of three provider definitions. Repository diagnosis requires the workspace observation row; consumer diagnosis requires workspace reads and child-process authority; deployed diagnosis requires admitted server network authority. A corrupt or unreadable source remains `unreadable`, distinct from `absent` and from an `ok` read.

The report carries observations, the honest `ready | caution | blocked` conclusion, core diagnostics, an explanation, and proposed ordinary operation invocations. Each conclusion carries an addressed provider decision and the probes it considered. That evidence is deliberate: `caution` and `blocked` are provider judgments, not aliases for warning and error severity. A blocked environment is a successful diagnosis, not a doctor failure. Doctor failure means the diagnostic operation itself could not select a provider, admit the subject, run a probe, or admit its report.

`DoctorRemediationComposition` is the contract behind `doctor --fix`: diagnose, map the exact proposal tuple positionally to one terminal result per proposal, then diagnose the same exact subject again. A result is declined by policy, approved but not executed with a reason, execution-failed with its receipt, or applied with the exact proposal invocation repeated in the successful operation receipt. There is no second decision or application list that can drift from the diagnosis. The flag does not create approval semantics and the doctor operation never mutates.

Strict CLI mode exposed one missing wire state. A caution report remains a successful operation result and stays on the answer stream; the CLI may separately select its `threshold` exit arm so a shell receives nonzero without rewriting the report or receipt as failed.

Initial doctor exposure is direct, CLI, MCP, and the editor's diagnostics/explanation surface. HTTP is absent.

## Why this home waited

A program projects through a wire. Its contract could not be written honestly before the wire contract existed, and `02_wires/cli` landed first for that reason.

That was a dependency, not a schedule. The distinction matters because the previous arrangement's equivalent of this home was built anyway, under a `verification/` directory, before anything it needed existed.

## Laws

- A program reference is an operation reference; two programs are not interchangeable; the broad form does not substitute; and the identity is the computed one.
- Release consumes a qualified candidate, exact over both snapshot and specification, with a lawful control and a `never` guard.
- The exposed population and the program population are one, positionally, and the result is what a wire's exposure accepts.
- The effect character is read through the operation definition: the concrete doctor program is observation-only, the concrete migrate program is not, and a synthetic publish program remains the negative neighbour.
- Migrate carries its exact request, report, typed failure, and migration-authority requirement through five existing wire projections under one program identity.
- Build threads one request-derived execution coordinate through manager rendering, selected target admission, process receipt, and report; a foreign target product, receipt, or application report is rejected while explicit and discovered selection remain lawful.
- Doctor is observation-only, keeps absent and unreadable separate, selects one of three providers with subject-specific prerequisites, and carries addressed conclusion evidence without deriving readiness mechanically from diagnostic severity.
- Doctor remediation maps the before-report's exact proposal tuple to one positional outcome tuple, binds applied and failed receipts to the proposal invocation, and re-diagnoses the same exact subject.

## Proof obligations

Runtime and repository claims a type cannot express:

- That a governed release path supplies an exact `AssuranceRunSpec` rather than the broad default.
- That each program's declared effects match what it does. `release` declaring `observe` compiles.
- That the rostered programs are the ones a user can invoke — that no unrostered program is reachable through a wire and no rostered one is missing from a registry. `04_bootstrap` makes the second half structural; the first is a repository fact.
- That a program's requirements are satisfied by the capabilities a bootstrap bound, for the concrete programs that do not exist yet.

## Implementation

None. Nine contracts and no product bodies.
