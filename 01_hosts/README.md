# Hosts: Physical Execution Environments

Status: umbrella contract confirmed and closed; all four children — `web/`, `worker/`, `edge/`, `server/` — architecture specified; child roster sealed; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the shared contract by which a host makes unresolved physical behavior real: how a host grounds authorities directly, how it offers constructible ones, and what every host realm owes the compiler regardless of environment.

## Owns

- The shared host realization contract.
- Host realms and host identity.
- The authority boundary through which physical capabilities are supplied.
- The grounding declaration, its origin vocabulary, its erased descriptor, its live admitted instance, and the admission failure channel.
- The erased per-host capability catalog.

## Does not own

- Concrete browser, worker, edge, or server APIs. Physical authority belongs to the four child homes — `web/`, `worker/`, `edge/`, `server/` — whose architectures all exist and whose implementations do not.
- Any second schema, operation, state, compiler, scene, or runtime meaning system.
- Requirement identity, realization planning, or settlement. Those belong to core.
- A hydration-tier table, in any spelling.

## The child roster is sealed

The approved host families are web, worker, edge, and server. That intent is recorded in the root README and its YAML projection.

For as long as only web physically existed, this umbrella deliberately declared no roster union: an inventory nothing can verify is the same defect as a law that cannot fail. All four child homes now physically exist with complete architectures, so the deferred population finalization has landed — `HostChildRoster` in `types.ts` names exactly web, worker, edge, and server in design order, and `TheChildRosterMatchesTheRealms` proves the roster and the host-realm union are one population: every realm has exactly one child, no child exists outside the union, and a fifth child is a new decision, never a silent edit.

Sibling hosts never import one another: web, worker, edge, and server are four independent physical realms whose only shared vocabulary is this umbrella and everything upstream of it. Cross-realm products — a web-constructed worker, edge policy admitting shared memory, an operation with edge and server realizations — belong to downstream composition points that may lawfully see both sides. The direction gate holds this mechanically.

## What a host may and may not do

A host realizes; it does not reinterpret.

- It binds authorities imported from their semantic owners. It never authors a replacement contract carrying the same name and a different meaning.
- It may declare host-local authorities of its own, namespaced to the host layer, and those enter branch closure as ordinary prerequisites.
- Every authority boundary takes exact bindings for an exact requirement row. A free `BindingRow` is not accepted, because accepting one would let a caller supply an unrelated collection and assert that the capabilities line up.
- A host adds physical meaning to its own surface only. It does not restate core operation, schema, scene, evidence, or state semantics.

## Grounding admits; offers construct

A grounding admits an authority that already exists at the explicit host boundary before any plan materializes. An offer causes an authority to exist through selected construction. The distinction is provenance and causation, not a taxonomy of environment nouns: the same capability type may be grounded when an already-existing value is injected at bootstrap and offered when LiteShip constructs it.

Grounding is deliberately not "an offer whose prerequisite row happens to be empty." That definition would be the escape hatch: every host would declare its whole surface grounded, the offer graph would collapse to one level, and the qualification fixed point would become decorative.

A lawful grounding:

- enters through one explicit origin — a host intrinsic captured at bootstrap, an invocation input, a deployment binding, or an application-supplied bootstrap value;
- exists independently of realization-plan selection;
- may be validated, narrowed, scoped, attenuated, or wrapped by admission, but never performs provider selection, resource acquisition, permission negotiation, network or storage work, or lifecycle creation;
- provides an exact non-empty unique row of canonical owner-imported holes;
- records its identity, host, realm, origin, and custody;
- is minted only by the host bootstrap and admission boundary.

Anything created, selected, activated, opened, or connected is an offer, and creating a new owned lifetime is construction and therefore an offer. Recording transferred custody of an already-existing lifetime may occur through grounding: the lifetime was created elsewhere, and admission only records who now disposes it. Two of the prohibitions are structural rather than promised: admission carries an exactly empty requirement row, so no LiteShip prerequisite can hide behind it, and its failure channel is the admission algebra, so it cannot launder a construction failure.

One slot identity passes through three states that never share a name: **declared** in the host catalog, **selected** by a plan, and — only when bootstrap admission succeeds — **admitted** as a live instance with its own provider identity. Catalogs list declared slots; plans list selected slots; neither is proof of admission. One grounding definition denotes one root slot, and a plan cannot use one slot twice invisibly. Selected slots are the roots of the realization fixed point, named by slot reference — never by a bare requirement name a host merely asserted.

## Admission failure is a third channel

A supplied boundary value can be malformed or violate policy. That refusal is neither a `RealizationRejection`, which says no lawful plan exists, nor a `RealizationFailure`, which says a selected lawful construction did not survive. It happened before planning ever saw the value as a root, and it stays in its own algebra so neither compiler channel can absorb it.

## Custody is recorded, not created

An admitted value's lifecycle arm records custody: `unowned` means the supplier keeps the lifetime, `owned` means custody transferred into LiteShip and the provider is disposed exactly once. Admission records which of these is true; it never creates the lifetime itself.

Custody is universal lifecycle metadata and answers exactly one question: who owns the physical lifetime and who disposes. Authority scope — where, for whom, during which transaction, request, region, or tenant a binding is valid — is owned by the provided capability contract or the child host that can state it faithfully. Custody never substitutes for scope, and this umbrella deliberately declares no scope vocabulary: a generic scope union would be a junk drawer whose members mean radically different things per environment, asserted before any child home exists to check it.

## Missing binding is not unavailable resource

These are different facts and must not collapse into one.

- No lawful provider exists for a required authority in this deployment: the offer or branch is rejected, and if every branch fails the compilation is unsatisfiable and production is blocked.
- The authority is lawfully bound and reports that its resource is currently unavailable: that is typed evidence inside the capability contract, handled by fallback, refusal, or explanation at runtime.

A GPU authority that reports no adapter is bound and working. A GPU authority nobody declared is a missing binding. Treating a denied microphone permission as a missing host is how a planner learns to lie.

## Lifecycle

Several authorities backed by one physical provider share one realization instance and one lifetime. That provider is disposed exactly once, not once per binding it happens to back.

A realization that owns no runtime lifetime says so explicitly rather than carrying a ceremonial resource with nothing to release.

## The catalog contains descriptors

The capability catalog contains the actual erased grounding and offer descriptors, not references to hypothetical ones, and names the `RealizationCatalog` it contributes to — the addressed product whose contents are exactly the descriptor populations planning consumes, owning the very address plans and refusals reference. The address and its contents recognize one another, and the address changes when descriptor semantics change. A requirement hole names a capability or provider authority whose multiplicity is stable across the plan; a repeatable per-use resource is returned by a typed operation on that provider and receives its own identity and lifecycle.

## Laws

- A host realizes upstream meaning and never redefines it.
- Provided authorities are imported from their owners.
- Host-local authorities are owned and namespaced by the host layer.
- Authority boundaries use exact binding rows.
- Build is a settlement location, not a host realm.
- Grounding admits what exists; offers construct what does not.
- Creating an owned lifetime is construction; recording transferred custody of an existing one may be grounding.
- Admission carries no LiteShip prerequisites and fails only in its own algebra.
- Declared, selected, and admitted are three grounding states that never share a name.
- Grounding roots are named by slot references, never asserted by requirement name.
- One physical provider owns one lifetime.
- A definition and its catalog share one host identity and one realm by construction.
- Retired names stay retired: no `grounded` key returns beside `groundings` at any type.
- Environmental availability is evidence inside a bound contract, never an omitted hole.
- No host creates a second semantic system.

## Proof obligations

- Every provided authority resolves to a canonical import from its semantic owner rather than a local structural twin.
- Host catalog descriptors agree with the typed offer and grounding declarations they were derived from.
- No host surface redeclares an upstream semantic contract.
- A grounded value genuinely entered through its declared origin: no admission path performs acquisition, selection, negotiation, or lifecycle creation behind the declaration.
- The declared grounding population matches the actual entrypoint and deployment surface, and no code path reads ambient host state outside the bootstrap.
- Only the host bootstrap mints grounding instances; downstream modules cannot fabricate a grounding-shaped object that planning would accept.
- Recorded custody is honored: an unowned admitted value is never disposed by LiteShip, and an owned one is disposed exactly once.
- Realization instances dispose exactly once under repeated and concurrent disposal.
- Unavailable resources surface as evidence, and no code path converts them into missing bindings or admission failures.
- Host-local hole names do not collide with any upstream owner's names.

The obligations concerning provenance, origin genuineness, boundary population, minting authority, and descriptor agreement are `system/01_assurance` claims; those concerning runtime behaviour — custody, disposal, evidence handling — belong to implementation fixtures. Neither set is a type law, and no positional count is kept here for a later edit to silently invalidate.

## Implementation boundary

The shared contract and all four child architectures are specified. Concrete environment APIs, physical capability implementations, and every runtime behavior remain absent and unauthorized until the whole repository architecture closes and implementation is explicitly authorized.

The host layer is architecturally complete and no implementation exists or is authorized. The waterfall continues downstream — targets, wires, system, and root composition — architecture-only until the whole repository closes.
