# LiteShip Root Architecture and Type Foundation

Authority: This README for architecture and intent; `types.d.ts` for the declaration-level shape calculus

Scope: Repository-wide ownership, type composition, dependency direction, type ABI evidence, executable placement, public addressing, and the closed boundary into `00_core/`

LiteShip is an Astro-first, frontend-centered, fullstack-aware compiler framework for addressed interface meaning. It pushes each fact to the earliest layer that can know it faithfully, emits browser-platform behavior whenever possible, and executes only the uncertainty that remains.

> **One addressed meaning graph. One settlement compiler. One transactional residual engine. Many backends. Many projections. No duplicated reality.**

This foundation deliberately begins one level below product semantics. The root `types.d.ts` defines the small data-oriented calculus used to compose LiteShip's type surfaces. The first numbered semantic rung is `00_core/`. Every later rung takes upstream types, adds only the meaning it uniquely owns, and supplies runtime behavior through small scoped implementation modules.

The repository is therefore built from LiteShip primitives before it has enough code to call itself a framework.

## 1. What this foundation settles

The successor repository uses this global skyline:

```text
types.d.ts
    ↓
00_core/
    ↓
01_hosts/
    ↓
02_targets/   02_wires/

system/       (orthogonal control plane)
```

The repository root is the `liteship` meta-package, canonical TypeScript toolchain authority, public export membrane, and executable composition root.

The root `types.d.ts` is not a package, not a runtime module, and not an ambient global namespace. It is the declaration-only type ABI from which the numbered waterfall composes.

The major rulings are:

- Root `types.d.ts` is the declaration prelude; `00_core/` is the first numbered semantic home.
- `01_hosts/` contains `web`, `worker`, `edge`, and `server` execution environments.
- `02_targets/` and `02_wires/` are peer boundary bands.
- `system/` remains unnumbered because it builds, inspects, proves, packages, and ships the product rather than extending the application runtime waterfall.
- The root package exposes owner-backed public subpaths without becoming a second semantic implementation.
- The root executable is a tiny composition bootstrap over the real CLI wire and real system programs.
- LiteShip dogfoods its own type calculus, schemas, operations, results, capability injection, wires, diagnostics, causal records, operation receipts, and assurance model wherever the environment permits.
- AI is an ingress and egress mode through the architecture, not a top-level home or a replacement agent framework.
- Meaning is complete at the center. Runtime and distribution cost are materialized only where required.

## 2. The repository tree is an authority map

The source tree answers where a concept is authored. It does not automatically dictate how many npm packages exist, what a consumer imports, or which artifacts are published separately.

| Surface | Role | What it may author |
|---|---|---|
| Repository root | Meta-package, toolchain, type ABI, exports, bootstrap | Root composition and publication policy only |
| `types.d.ts` | Global declaration calculus | Irreducible shape operators only |
| `00_core/` | Complete realm-neutral LiteShip semantics | Meaning, schema, compilation, settlement, residual execution, operations, scenes, media, admission, revisions, causal records, operation receipts, explanation |
| `01_hosts/` | Physical execution environments | Environment APIs, lifecycle, I/O, effects, and host realizations |
| `02_targets/` | Ecosystem lifecycle integration | Astro, Vite, and Cloudflare translation; a further child is an explicit architecture edit |
| `02_wires/` | Protocol and invocation projection | Direct, HTTP, CLI, MCP, LSP/editor, browser, and future wire behavior |
| `system/` | Repository control plane | Typed programs, workspace operation, assurance, packaging, and release |

The numbers teach dependency direction. They are private source-layout names and do not become consumer import names.

### 2.1 The type waterfall

The waterfall is composition, not merely folders.

Each semantic rung has a broad local `types.ts` that makes its whole type surface inspectable:

```text
root types.d.ts
  + 00_core/types.ts local meaning
  = core type surface

core type surface
  + 01_hosts/web/types.ts local browser meaning
  = web-host type surface

core + relevant host surfaces
  + 02_targets/astro/types.ts local Astro meaning
  = Astro target type surface
```

Executable implementation files remain smaller and scoped. A broad `types.ts` is intentional because it shows the local semantic topology in one place. It is not permission to place all implementation in one file.

A downstream type file composes upstream declarations. It does not mirror them, rename them, or relay them as if it became their owner.


### 2.2 Repository-as-spec law

Every semantic home explains itself through its path, local `types.ts`, local `README.md`, and executable proof. Paths and type ownership are mechanically enforced; prose explains purpose, rationale, and unresolved seams without duplicating generated facts.

A semantic home contains `README.md` and `types.ts`. Implementation files are added only when their capability is ready to be implemented. The repository does not create blank source forests, generic utility drawers, or documentation files whose only purpose is to describe other documentation.

### 2.3 Established vocabulary

LiteShip uses standard computer-science and domain terms wherever they preserve the exact meaning. Public and internal operations use predictable verbs such as `define`, `create`, `parse`, `decode`, `encode`, `validate`, `resolve`, `compile`, `lower`, `plan`, `execute`, `apply`, `commit`, `project`, `render`, `inspect`, `explain`, `dispose`, `sample`, `fork`, `merge`, `append`, `acknowledge`, `checkpoint`, `resume`, and `pack`.

A custom term survives only when it encodes a genuine distinction and is defined through an established category plus that distinction.

## 3. Repository root

The root has four honest responsibilities.

### 3.1 Meta-package and public membrane

The root is the published `liteship` package identity and the front door to the complete product.

It owns:

- package name, version, license, metadata, and release entry points;
- curated root and subpath exports;
- direct owner-backed type and value addresses;
- optional peer relationships for ecosystem targets;
- package-level side-effect declarations;
- release qualification and packed-artifact verification.

The root owns no second compiler, runtime, schema, operation registry, or host engine.

The default `liteship` import should expose the common core authoring surface without evaluating Astro, Vite, assurance, TypeScript analysis, server effects, model integrations, or optional host peers.

Advanced capabilities remain available through deliberate owner-backed subpaths. The exact export map is a later distribution decision, but the ownership law is already settled:

> **Import from the owner. Export from the owner. Compose locally. Never relay ownership through the waterfall.**

### 3.2 Canonical TypeScript toolchain

The root owns every TypeScript compiler lane and the interpretation context used by the repository.

That includes:

- the primary compiler and exact version;
- compiler implementation family;
- the explicit role of each qualification lane;
- compiler options and module-resolution policy;
- project-reference policy;
- standard library selection;
- declaration generation and qualification;
- type-level test enrollment;
- compatibility-test policy for host ecosystems;
- the exact context included in Type ABI fingerprints.

The initial repository posture assigns TypeScript 7's native lane to primary project-wide CLI checking and declaration emit. A scoped TypeScript 6 JavaScript lane owns the repository language service while Astro-class embedded-language tooling still requires it, handles embedded-language and compatibility qualification, and supports system programs that still require the compiler API. Until the native compiler exposes the programmatic API needed by assurance, that TypeScript 6 lane is also the designated semantic ABI interpreter. These are roles in one root policy, not alternate semantic authorities. The same source must qualify under every role it claims.

Exact versions live in package metadata and content-addressed toolchain attestations rather than prose. The TypeScript 6 lane has an explicit retirement trigger: remove each role when the corresponding Astro/embedded-language or compiler-API dependency supports the native toolchain. A host target may add another scoped qualification only when its ecosystem requires it and the role is declared rather than smuggled in through package hoisting.

### 3.3 Root type ABI

The root `types.d.ts` is the declaration-only calculus shared by core, hosts, targets, wires, and system.

It is intentionally easy to find. Running `ls` at the repository root exposes the type foundation beside the architecture README and the numbered source homes.

The file is not the declaration entry for every value exported by bare `liteship`. Bare package declarations follow the actual runtime module layout, beginning with core. Those generated or authored declarations reference the root type ABI where needed.

This avoids a dependency circle where root declarations re-export core while core must import root declarations.

Consumers receive the root type vocabulary transitively by importing LiteShip. A dedicated expert type-only subpath may be published later, but nobody must install or import a separate types package for LiteShip to work.

### 3.4 Executable composition root

The root executable contains a tiny bootstrap.

It:

1. captures process arguments, environment, working directory, standard streams, and signals;
2. constructs the concrete server/system host capabilities;
3. loads the system program registry;
4. connects that registry to the generic CLI wire;
5. dispatches one typed invocation;
6. projects the typed result to terminal output and an exit code;
7. disposes resources.

The bootstrap does not implement `verify`, `doctor`, `build`, `audit`, `package`, or `ship`. Those are system programs. It does not parse a private command language. CLI grammar belongs to the CLI wire. It does not hide shell workflows. Concrete effects arrive as injected host capabilities.

## 4. `types.d.ts`: the global shape calculus

The root declaration file answers a deliberately smaller question than core:

> **What are the irreducible ways LiteShip composes data, identity, relations, and required authority before domain meaning is introduced?**

It does not define `EntityId`, `ContentAddress`, `SurfacePath`, `Schema`, `Operation`, `Receipt`, `Evidence`, `Truth`, `Scene`, `Query`, `Program`, or `Finding`. Those are semantic nouns that belong to the layer that gives them meaning.

The root calculus defines the reusable shape operators from which those nouns are built.

### 4.1 Data first

The type foundation treats behavior-rich concepts as data before attaching runtime machinery.

An error is a tagged product.

An error algebra is a coproduct of tagged products.

A result is a two-case coproduct.

A brand is a nominal refinement over a carrier.

A schema begins as a port between admitted and encoded types.

An operation is a named semantic relation composed later from input, output, failure, requirements, identity, schemas, and runtime policy.

A causal or assurance record begins with an envelope plus the identity, provenance, causality, and integrity supplied later by its semantic owner. Core distinguishes addresses, revisions, events, changes, commits, attestations, traces, certificates, and operation or transaction receipts rather than assigning one universal noun to every record.

A capability requirement is a named typed hole that a later host or composition must fill.

This lets the architecture get meta without building a maze of higher-kinded emulation or conditional-type acrobatics. Root operators remove duplicated shape. Domain types remain legible ordinary TypeScript.

### 4.2 Products, coproducts, and tagged algebras

`Product<Fields>` describes fields that exist together.

`Coproduct<Cases>` describes exactly one member of a closed case tuple.

`Tagged<Tag, Fields>` gives a case a stable discriminant and rejects a field product that tries to restate `_tag`.

`Algebra<Definition>` maps a compact tag-to-fields vocabulary into a closed tagged union. `Handlers` and `PartialHandlers` derive exhaustive and fallback-aware handler tables without implementing runtime dispatch.

`Result<Value, Failure>` is the global two-case success/failure carrier. Runtime constructors, matchers, stack-bearing errors, and secure field installation are implemented by core, but core, hosts, system, wires, and assurance do not invent competing result shapes.

The root also carries tuple-preserving and type-proof utilities such as `Tuple`, `MemberOf`, `Concat`, `Equal`, and `Assert`. These are batteries for composition and tests, not a TypeScript metaprogramming theme park.

### 4.3 One nominal-refinement operator

`Brand<Carrier, Identity>` is the one global nominal-refinement operator.

`BrandCarrier` and `BrandIdentity` recover its two dimensions without teaching the root what any semantic brand means. `Address`, `Digest`, and `Fingerprint` are generic refinements built from the same operator, not independent brand systems.

A semantic value receives the root brand once. When identity has several dimensions, the owner composes those dimensions into one readonly tuple or product inside `Identity` rather than stacking incompatible brands over the same carrier. This keeps extraction deterministic and makes the nominal identity itself ordinary, inspectable type data.

Core may compose:

- persistent identity from a string carrier;
- immutable revision address from canonical bytes;
- a structural path from a tuple carrier;
- a validated duration from a numeric carrier;
- a type-ABI address from an interpreted declaration surface.

The root type file does not validate, calculate, or mint any of them.

The semantic owner defines what a refinement means. The executable owner validates or mints it. Object provenance stronger than TypeScript nominality remains with the runtime authority through private witnesses, identity registries, signatures, or payload binding.

A compile-time brand never pretends to prove runtime provenance.

### 4.4 Representation ports

`Port<Type, Encoded>` is the structural relationship between an admitted type and its encoded or external representation.

A schema implementation can satisfy a port by shape without importing a concrete schema implementation. The port is not itself a decoder, AST, codec, registry, or proof that decoding happened.

`TypeOf`, `EncodedOf`, `TypesOf`, and `EncodedTypesOf` recover information already carried by a port. `RefinePort` narrows the admitted type while preserving the exact encoded form and every additional field owned by the concrete port. `RebindPort` is the explicit path for a true transform that changes the admitted or encoded relationship rather than pretending the change is merely a refinement.

Core can build its schema language around this relationship while accepting compatible foreign schema values only at explicit integration boundaries. A branded schema composes the root `Brand` and `RefinePort`; a transform composes `RebindPort`; the executable schema owner still supplies AST, decode, encode, derivation, and runtime proof. The schema phase can therefore focus on manufacturing proof instead of maintaining handwritten aliases beside schemas.

### 4.5 Additive layer composition

`Extend<Upstream, Local>` composes a local object shape only when it does not shadow an upstream key. A collision becomes `never`, forcing the downstream layer to make its intent explicit.

`Refine<Upstream, Changes>` is the deliberate specialization path when a downstream semantic layer truly narrows members it already owns. `InvalidRefinementKeys` exposes a foreign key or widening as data for type-level proofs. Refinement maps over the upstream shape, so the upstream owner retains required/optional and readonly/mutable field laws; a downstream layer cannot make a required field optional and call that specialization.

`Compose<Layers>` recursively performs additive composition across a closed layer tuple and rejects a collision at any step. It does not blindly intersect several records and let incompatible fields ferment into an unreadable type.

This encodes a central waterfall law:

> **A later layer adds meaning. It does not silently restate earlier meaning.**

The mechanism remains small. It does not replace modules, infer the repository graph, or turn every type error into a forty-screen conditional-type séance.

### 4.6 Named typed holes and closed requirement tuples

`Hole<Name, Contract>` describes an authority or capability that must be supplied later. Hole names are stable strings because requirement identity must survive canonicalization, explanation, wires, and runtime lookup without symbol or positional folklore.

A `RequirementRow` is an exact readonly tuple, including the empty tuple. Open arrays are excluded because an unknown-length list cannot serve as a closed declaration of authority.

The tuple is valuable because it is:

- closed;
- ordered;
- literal-preserving;
- inspectable;
- deterministic;
- suitable for canonicalization and content addressing.

The runtime does not resolve dependencies by tuple position. `ContextOf<Row>` derives an ergonomic name-indexed context from the tuple. The tuple is the canonical declaration; the object context is the convenient execution view.

The calculus exposes the evidence needed to explain composition failures rather than reducing everything to one boolean:

- `RequirementKeys` and `RequirementAt` inspect the row;
- `DuplicateRequirementKeys` and `UniqueRequirements` reject ambiguous declarations;
- `MissingRequirementKeys` identifies absent capabilities;
- `IncompatibleRequirementKeys` identifies same-name contract mismatches;
- `RequirementsSatisfied` and `SatisfiedContext` prove a supplied context;
- `Binding`, `BindingRow`, `BindingsFor`, `RequirementsFromBindings`, and `ContextFromBindings` type exact implementations and reject duplicate binding identities;
- `MergeRequirements` preserves declaration order, deduplicates equal cross-layer holes, appends new holes, and rejects same-name contract conflicts.

This is dependency injection expressed as ordinary data and types. It does not require decorators, reflection metadata, class tokens, a global container, or stringly side tables.

The distinction between imports and holes is fundamental:

- imports answer where a declaration or implementation is owned;
- holes answer what authority a composition requires another layer to supply.

Typed holes never replace normal TypeScript imports.

A hole declares that a composition requires an authority capable of answering a contract. Environmental availability remains data inside that contract. For example, a GPU capability source may report unavailable through core evidence semantics, but the authority that reports it is still a required hole. This keeps absence visible instead of making an omitted dependency indistinguishable from an undeclared one.

### 4.6.1 Requirement closure determines runtime feature closure

The requirement calculus is not passive dependency documentation. Downstream compilation uses the exact row as the source of runtime materialization.

Core and the compiler later:

1. satisfy every hole that can settle at build, platform, request, or another earlier location;
2. retain the exact residual requirement row;
3. map each residual hole to its owning runtime feature;
4. compute the transitive feature closure;
5. emit only those features and bindings;
6. refuse production if any required hole has no lawful binding.

An empty residual row means no LiteShip runtime is required. A composition that retains an animation clock, worker, GPU device, database, or other authority receives exactly the feature closure needed for those holes.

The repository does not maintain a second fixed hydration-tier table beside the requirement graph. Type selection, bundle selection, explanation, and assurance all project from the same exact requirement data.

### 4.7 Typed signatures and signature composition

`Signature<Input, Output, Failure, Requirements>` is the root type-only relationship from which core can define semantic operations, queries, transforms, programs, policies, or other executable contracts.

The root does not bless `Operation` as a pre-semantic universal noun. Core earns that name by adding identity, schemas, idempotency, cancellation, receipts, affordances, and dispatch semantics.

`InputOf`, `OutputOf`, `FailureOf`, and `RequirementsOf` project the signature's dimensions. `SignatureResult` and `Executor` derive its common executable view.

`SignaturesConnect<Left, Right>` checks whether the left output can feed the right input. `ComposeSignatures` builds the pipeline when it can, unions the two failure algebras, and merges named requirements with the same conflict laws used everywhere else.

This is the useful meta-layer: a small algebra for composing richer algebras downstream. It does not attempt higher-kinded emulation or make the TypeScript checker cosplay as a theorem prover with a migraine.

### 4.8 Generic identity, reference, causality, path, and envelope products

The root supplies generic products such as `Named`, `Identified`, `Addressed`, `Versioned`, `Reference`, `Predecessors`, `Causal`, and `Provenanced`.

`Predecessors<Ref>` is one stable readonly row: empty for genesis, one member for a linear successor, and several members for an explicit merge. Core may refine the row for a stricter domain, but the root does not make genesis structurally impossible or alternate between scalar and array representations.

`Envelope<Tag, Version, Body>` composes a closed versioned carrier and refuses bodies that try to shadow `_tag` or `_version`.

`DataPath`, `PathSegment`, and `Issue` provide generic path-addressed issue scaffolding. Core still owns actual parse, validation, integrity, host, evidence, and domain error algebras.

These products do not choose LiteShip's semantic identity model. Core still defines persistent identity, immutable revision address, and current surface location as different facts. They simply prevent each subsystem from handwriting the same structural bones.

### 4.9 The type ABI describes itself

The root Type ABI does not stop at a digest-shaped token. It defines the normalized graph that `system/01_assurance` must produce.

The public model includes:

- `TypeAbiNode`, the closed normalized vocabulary for primitives, literals, parameters, references, unions, intersections, arrays, tuples, objects, conditionals, mapped types, indexed access, operators, template literals, type queries, infer binders, and intrinsics;
- canonical node, binder, and declaration identities;
- call/construct signatures, predicates, parameters, members, accessors, index signatures, generic parameters, variance, and mapped modifiers;
- local, upstream, standard-library, and unique-symbol references;
- declarations, public exports, reachable private support identities, anti-vacuity population, upstream ABI dependencies, and explicit coverage state;
- `TypeAbiSurface`, the strict versioned canonical IR envelope;
- `TypeAbiSurfaceDigest`, `TypeAbiAddress`, and `TypeAbiSurfaceReference`;
- exact TypeScript compiler fingerprints and the root role-to-lane `TypeScriptToolchainMatrix`;
- `TypeAbiAttestation`, which identifies one surface digest under the exact lane that interpreted it.

The IR is normalized around resolved type meaning rather than TypeScript source syntax. Recursive types remain finite because nodes reference canonical local IDs. Generic and infer parameters use binder/index identity rather than source variable names. Tuple labels and harmless private-support names are source metadata rather than ABI identity. A public declaration may pull a private unique-symbol brand into the reachable support closure, but that support declaration receives a canonical local identity independent of its source spelling.

Unsupported public forms do not vanish. `TypeAbiCoverage` is either complete or incomplete with a non-empty `TypeAbiUnsupportedForm` row. An incomplete surface can still be identified for diagnostics and development, but assurance cannot award complete type-ABI authority to it.

The root policy can deliberately contain several TypeScript lanes without creating several authorities. `TypeScriptToolchainFingerprint` identifies one exact compiler, option fingerprint, and standard-library set. `TypeScriptToolchainMatrix` owns the role assignment once by mapping every declared role to exactly one lane address. The ABI attestation binds only the semantic interpreter lane that actually produced the normalized graph; other lanes contribute independent qualification evidence.

At the foundation cut, TypeScript 7's native lane owns primary CLI checking and declaration emit. TypeScript 6 owns the repository language service while Astro-class embedded-language tooling requires it, embedded-language and compatibility qualification, and compiler-API/semantic-ABI analysis until those roles can move. Exact versions live in package metadata and content-addressed fingerprints, not prose.

`system/01_assurance` later implements the canonicalizer, computes the surface digest and final address with core's byte/digest capabilities, and verifies the attestation. The address never lives inside the file or surface it identifies.

### 4.10 Type proof helpers

`Equal`, `Assert`, `ExtendsSurface`, and `SurfaceEquivalent` support compile-time proofs.

They are not the complete type ABI assurance system. TypeScript assignability cannot prove declaration provenance, canonical ownership, runtime identity, or semantic compatibility by itself.

They are small batteries for type-level tests and local invariants. The assurance layer supplies population derivation, canonical IR, addresses, attestations, drift analysis, and compatibility judgment.

The root's own fixtures live in `types.laws.ts`, not in `types.d.ts`. A declaration file cannot host its proofs without those fixture names entering the addressed public surface, so the laws are a sibling module that imports the calculus and asserts against it. `types.laws.ts` is mandatory assurance input and must type-check under the primary lane, but it is excluded from the Type ABI population, from declaration emission, and from the public export membrane. Assurance derives the root surface from `types.d.ts` alone.

A law that cannot fail is not a law. Every law pairs a conforming case with a non-conforming one and is qualified by reversing the implementation it guards and confirming that the *named* law errors. Two fixture hazards are known and recurring, and both have shipped here before being caught:

- operands that TypeScript reduces to `never` on their own prove nothing about the guard under test, so shared-key and reserved-key fixtures must stay inhabited;
- a guard proven only at the helper that defines it says nothing about the operators that claim to apply it, so every consumer of a shared check needs its own red fixture.

## 5. Why the type ABI is one root file

One broad root `types.d.ts` is intentional because:

- the global calculus is one coherent ABI;
- it has no runtime implementation to split for bundle cost;
- humans and agents can inspect it in one pass;
- content-addressed ABI evidence can treat it as one root surface;
- downstream `types.ts` files compose from it directly;
- the vocabulary ships with the `liteship` package without a separate dependency;
- the declaration surface has no runtime artifact or initialization path.

This does not imply every semantic type belongs in the root file. The global file remains small relative to the full framework because it contains operators, not the product's nouns.

## 6. Type ABI content addressing

LiteShip content-addresses the interpreted type world as assurance evidence.

The system does not hash raw `types.d.ts` text and call that semantic identity. Whitespace, comments, formatting, and harmless declaration ordering are source details, not the type ABI.

### 6.1 Canonical Type ABI IR

`system/01_assurance` parses declarations with the root-governed semantic interpreter lane and lowers each observed public type surface into the `TypeAbiSurface` model already declared by `types.d.ts`.

The canonicalizer derives the complete public-export closure, including private support declarations whose identity is reachable from public types. It independently derives the observed population before lowering, so a parser that recognizes only easy declarations cannot redefine the denominator downward.

The IR records the meaning needed to compare resolved public declarations, including:

- module and owner identity;
- exported symbol names and declaration kinds;
- generic parameters, variance, constraints, and defaults;
- property names, types, optionality, readonly status, and index signatures;
- function and call signatures;
- tuple arity and per-position types;
- literal values;
- union and intersection members in canonical order where order is not semantic;
- mapped, conditional, indexed-access, infer, and template-literal structure where public;
- references to declarations in the same layer;
- references to upstream owner surfaces by their ABI address;
- module-resolution mode and compiler options that change interpretation;
- the semantic-interpreter compiler fingerprint and standard-library fingerprint;
- an independently observed export population distinguishing type, value, and dual meaning;
- explicit unresolved or unsupported forms rather than silent omission;
- the independently observed source/export/declaration/node/dependency population and complete/incomplete coverage verdict.

Comments, whitespace, source offsets, function parameter names, tuple labels, and non-semantic formatting are excluded from the ABI digest. A separate source digest may retain exact-file identity when useful. Type ABI canonicalizer v1 encodes `TypeAbiSurface` as deterministic CBOR and digests it with SHA-256. The final `TypeAbiAddress` commits to the canonicalizer, surface digest, and interpreter-lane address. The algorithms are part of the canonicalizer version, so a future change creates a new interpretation instead of silently rewriting old evidence.

### 6.2 Recursive declarations

Mutually recursive public types form strongly connected components.

The canonicalizer:

1. builds the resolved declaration-reference graph;
2. collapses strongly connected components;
3. assigns stable local identifiers inside each component;
4. canonicalizes component members independent of source order;
5. hashes the condensed acyclic graph from upstream components downward.

The first implementation addresses each layer's complete public surface rather than trying to mint a globally stable hash for every individual TypeScript alias. Layer-level addressing gives most of the value without pretending that arbitrary TypeScript equivalence is easy.

### 6.3 Merkle-like waterfall

The type ABI composes in the same direction as source authority.

```text
root ABI for one qualification lane
  = canonical root types.d.ts surface
    + TypeScript interpretation fingerprint

core ABI
  = root ABI address
    + canonical core-owned public declarations

web-host ABI
  = root ABI address
    + core ABI address
    + canonical web-host declarations

Astro-target ABI
  = root ABI address
    + core ABI address
    + relevant host ABI addresses
    + canonical Astro-target declarations
```

A downstream surface commits to the exact upstream type world it consumed. The evidence graph remains acyclic even when declarations inside one surface are recursive.

### 6.4 What the addresses buy us

Type ABI addresses support:

- deterministic cache invalidation;
- declaration drift detection;
- release compatibility analysis;
- proof that a generated declaration was built from the claimed upstream surfaces;
- authority and canonical-import lookup;
- agent context fingerprints;
- reproducible type-level assurance attestations;
- packed-artifact verification;
- differential qualification across TypeScript versions and compiler implementations;
- precise identification of which type world a bug report or generated artifact used.

TypeScript still resolves modules normally. Content addressing proves which interpreted type world was resolved. LiteShip does not invent hash-based import syntax or a custom module loader.

### 6.5 Honest compatibility claims

A matching ABI address proves identity under one declared TypeScript interpretation lane.

A home qualified by several compiler roles receives evidence appropriate to each role. ABI equality is compared only between semantic attestations produced under the same interpretation contract. Release policy additionally requires TypeScript 7 primary compilation and TypeScript 6 compatibility/API interpretation to satisfy a declared relation rather than share an impossible cross-compiler hash.

A changed address means the surface changed or its interpretation context changed. It does not automatically say whether the change is additive, source-breaking, runtime-breaking, or harmless.

Compatibility analysis is a separate assurance fold over the canonical IR and representative compile-time probes. Unknown or unsupported constructs remain visible.

The type system never claims to have cryptographically proved mathematical equivalence between arbitrary TypeScript programs.

### 6.6 Attestation ownership

Type ABI surfaces and attestations are generated by `system/01_assurance` using core canonical-byte and digest capabilities once those exist.

The canonical surface is a first-class addressed artifact. `TypeAbiAttestation.subject` references its digest. The attestation's final address is computed from canonicalizer + surface digest + semantic-interpreter address, never by hashing the attestation including its own address. An optional exact-source digest can accompany the semantic evidence without changing what the ABI address means.

Neither the surface digest nor the final ABI address is embedded inside `types.d.ts`, avoiding self-reference. Attestations appear in assurance and release evidence, generated manifests, caches, authority lookup, packed-artifact qualification, and explanation surfaces.

## 7. Import, export, and public addressing law

The architecture avoids both barrel forests and hidden alias magic.

### 7.1 Source imports

Source imports name the actual authority.

A core module that uses `Brand` imports it from the root type ABI.

A web-host module that uses `ContentAddress` imports it from core, because core owns the semantic identity.

A web-host module that independently needs the generic `Hole` operator may import it from the root type ABI.

A target imports the core and host concepts it actually integrates.

No layer imports a concept from an intermediate layer merely because that layer re-exported it.

### 7.2 No relay ownership

Core does not re-export every root type merely because it uses them.

Web does not re-export core's entire type surface.

Astro does not become the owner of web or core declarations through a barrel.

Root smart exports may provide ergonomic public addresses, but each address resolves directly to the owning module or an identity-preserving generated declaration projection.

### 7.3 Public visibility

A type can be:

- local to one implementation module;
- home-public for downstream LiteShip composition;
- expert-public through an explicit package subpath;
- ordinary authoring API through core or a target surface.

Filesystem presence does not automatically make a declaration public.

The package `exports` whitelist is the public membrane. Declaration layout follows actual module layout. Type conditions point to the declarations for the corresponding runtime entry. Type-only expert surfaces may exist without pretending to be runtime APIs.

### 7.4 No built-output self-imports

Source does not import the package through its own built `dist` output. Internal code uses source-owner paths or project references that resolve to source.

Public package self-reference is a consumer-facing contract tested from packed artifacts, not a shortcut used by source to hide dependency direction.

## 8. `00_core/`: first semantic rung

Core is the complete realm-neutral LiteShip system.

It composes the root shape calculus into actual product semantics:

- `EntityId`, `ContentAddress`, and `SurfacePath` as distinct branded identities;
- canonical bytes, hashes, digests, and validating constructors;
- tagged error algebras and secure runtime constructors;
- schema AST, decoding, inference, refinements, transforms, recursion, defaults, projections, and arbitrary generation;
- addressed meaning graph, persistent entities, revisions, hierarchy, and paths;
- quantizers, boundaries, hysteresis, reconstruction, transitions, and motion;
- evidence state, three-valued truth, authority, lifetime, evolution, cadence, and settlement placement;
- compiler and migration fleets;
- residual program, transactional propagation, write plans, memory plans, commits, traces, and operation receipts;
- operations, affordances, queries, forms, counterfactuals, and protocol-neutral dispatch;
- scenes, timelines, geometry, hierarchy, media analysis, A/V semantics, and multi-egress values;
- semantic streams, proposals, admission, constrained catalogs, frame planning, replay, and resumption;
- agent/editor/accessibility/shader/media projections;
- explanation and authority discovery.

The attached `00_core/README.md`, `00_core/types.ts`, and numbered core homes record the confirmed internal authority structure, type waterfall, runtime doctrine, proof obligations, and visible open seams. They are downstream of this root foundation and exist as architecture; implementation is intentionally absent. Nothing there is protected from correction — see §17.

### 8.1 Complete meaning, selective realization

Core is complete in meaning. Applications materialize only the runtime realization they require.

A quantizer may compile entirely to CSS.

A static page may materialize no operation wire.

A conventional page may materialize no scene host.

A deployment may materialize no worker or server host.

An application may use Mastra, Composio, AI SDK, a custom backend, or no AI at all while still using LiteShip's proposal-safe interface machinery.

> **Tree-shake the realization, not the meaning.**

## 9. `01_hosts/`: physical execution

Hosts answer where unresolved behavior physically runs.

### 9.1 `web/`

Owns DOM reads/writes, browser events, physical state, fetch/SSE consumption, browser probes, AudioContext, WebCodecs, island activation, browser security policy, and application of admitted plans to browser egresses.

### 9.2 `worker/`

Owns worker lifecycle, messages, transfers, SharedArrayBuffer/SPSC, worker-side residual or numeric execution, batching, backpressure, and eligible rendering/encoding hosts.

### 9.3 `edge/`

Owns Request/Response/Headers, Client Hints, constrained request-time execution, edge caches, edge storage/network bindings, and platform limits.

### 9.4 `server/`

Owns general trusted host execution: filesystem, processes, databases, native binaries, long-running services, operation handlers, native media tools, and server-side residual work.

Server support does not turn LiteShip into a general backend framework. It provides trusted execution for interface semantics that cannot legally or practically run in the browser or edge.

Host type surfaces compose core types with environment-specific contracts. They do not redefine core meaning.

## 10. `02_targets/`: ecosystem integration

Targets attach upstream LiteShip capabilities to ecosystem lifecycles.

The target children are Astro, Vite, and Cloudflare. `TargetChildRoster` in `02_targets/types.ts` names exactly those three, so a fourth is an edit somebody makes on purpose rather than a folder that appears because a dependency did.

An earlier draft of this section also named Remotion. No such target exists and none is planned for this phase: media rendering is core and host capability — `00_core/12_media` and `01_hosts/server/10_media` — and routing it through an ecosystem target would have made a capability the repository owns look like one it borrows.

A target may own registration, build hooks, lifecycle translation, host configuration, generated artifacts, middleware attachment, directive registration, and ecosystem compatibility.

A target does not own generic compiler algorithms, stream semantics, schema meaning, scene meaning, capability ladders, operation catalogs, or model-session engines.

A target may remain independently published even when its source authority is thin. Source ownership and distribution packaging are different questions.

## 11. `02_wires/`: protocol and invocation projection

Wires project existing operations, schemas, resources, diagnostics, attestations, operation receipts, and events across boundaries.

Initial wire families include:

- direct;
- HTTP;
- CLI;
- MCP;
- LSP/editor;
- browser;
- typed model/agent stream codecs where earned.

A protocol translation is a wire.

An ecosystem lifecycle integration is a target.

An execution environment is a host.

Meaning, admission, transactions, and projections remain in core.

### 11.1 Dogfooded CLI

The CLI wire is generic. It parses arguments, derives help and flags from contracts, decodes input, invokes typed programs or operations, projects diagnostics/results, maps exit codes, and handles cancellation.

LiteShip's own system programs use this same wire. User applications can project their own operation catalogs through it. There is no privileged internal CLI engine and a weaker public imitation.

## 12. `system/`: unnumbered control plane

`system/` operates on the repository and product architecture without becoming part of application runtime composition.

Its responsibilities are workspace, assurance, release, repository programs, and bootstrap.

It owns typed programs for:

- build;
- verify;
- doctor;
- audit;
- gauntlet;
- benchmark;
- docs generation;
- migration orchestration;
- packaging;
- release;
- shipping.

Eleven, not twelve. This list previously opened with *workspace discovery*, and that entry has moved rather than vanished: `system/00_workspace` owns workspace identity, snapshots, root and source-home observation, revision and working-tree state, and toolchain references, and the programs above consume that authority. Discovery is a thing programs need, not a thing programs orchestrate. Exposing it later through `doctor`, an editor wire, or MCP is ordinary; making it a twelfth orchestration engine would have meant two places that answer "what repository is this", which is the defect the layer exists to prevent.

Packaging likewise did not disappear from the responsibility list — it was absorbed. `system/02_release` owns distributable artifact identity, package manifests, candidates, qualification, attestations, publication plans, and receipts; `package`, `release`, and `ship` remain three distinct programs over that one authority. There is no separate packaging home waiting to hatch.

It also owns assurance acquisition/evaluation composition, type ABI canonicalization, release attestations, and workspace governance.

System may import the root type ABI directly. It may consume core, hosts, targets, and wires because it is downstream and observational. Product homes never depend on system.

Meaningful repository workflows become programs, not loose scripts.

Package-manager commands and CI invoke the same system programs exposed by the root executable. MCP or editor wires may expose an allowed subset of those programs through the same contracts.

## 13. Assurance and the free batteries

Assurance remains a real subsystem inside `system/`.

Audit acquires rich evidence. Gauntlet folds evidence into findings and earned authority. The split survives because the algorithms and deployment costs differ.

The root type ABI immediately gives assurance several reusable batteries:

- public type-surface enumeration;
- canonical type ABI IR;
- layer address computation;
- upstream ABI binding;
- duplicate and shadowed-authority detection;
- type projection equivalence checks;
- capability-row completeness;
- relation input/output/failure/requirement inspection;
- consumer extension through the same fact and gate paths.

Missing evidence remains visible. A parser or checker that cannot understand a declaration does not silently omit it from the ABI.

## 14. AI and generated interfaces

There is no numbered AI home.

Most mechanisms that currently carry an AI label are established computer-science concepts:

- typed incremental streams;
- partial versus complete units;
- schema decoding;
- hostile-input admission;
- constrained trees;
- addressed patches;
- transactional mutation;
- adaptive quality;
- buffering and backpressure;
- causal events, acknowledgements, checkpoints, and replay;
- lifecycle and disposal.

Those belong to core and hosts according to their real semantics.

Model-specific prompt/context projection and provider/protocol adaptation remain optional projections or wires.

Mastra may own agent orchestration. Composio may own authenticated third-party tools. A provider SDK may own model invocation. LiteShip owns the addressed, admitted, transactional interface world their output enters.

> **AI is an ingress and egress mode through LiteShip, not a layer of LiteShip.**

## 15. Dogfooding law

LiteShip is made from LiteShip primitives wherever that is honest.

Internally and publicly it shares:

- one shape calculus;
- one schema discipline;
- one result and error algebra;
- one operation/typed-signature model;
- one requirement and capability-injection model;
- one wire model;
- one address, causality, attestation, operation-outcome, diagnostic, and explanation model;
- one authority and projection model;
- one assurance path.

Bootstrap, operating-system APIs, browser APIs, TypeScript compiler APIs, and other raw host realities remain legitimate lower floors. Dogfooding the architecture does not require pretending the environment is written in LiteShip.

The rule is:

> **Users stand on the same semantic floor the framework stands on.**

## 16. Proof obligations for the type foundation

The root type foundation is complete only when the eventual implementation proves:

1. `types.d.ts` is an external module and introduces no ambient globals.
2. It contains no runtime exports and emits no JavaScript.
3. Every semantic refinement composes from the one root `Brand` operator while runtime provenance remains with its minter.
4. Tagged algebras discriminate correctly, reject reserved-tag collisions, and derive exhaustive handler tables.
5. Result arms narrow to their exact success and failure payloads.
6. Ports preserve admitted/encoded inference across structural implementations; `RefinePort` only narrows and preserves encoding, while `RebindPort` makes true transforms explicit.
7. `Extend` and `Compose` reject accidental shadowing; `Refine` rejects foreign keys, widening, and presence-law weakening while preserving upstream modifiers.
8. Requirement rows exclude open arrays, preserve literal tuple order, and reject duplicate names.
9. Missing and incompatible capabilities remain separately inspectable.
10. Closed binding tuples infer exact implementations, recover their requirement rows, reject duplicate hole identities, and derive the same name-indexed context.
11. Requirement merges preserve order, deduplicate identical cross-layer holes, and reject same-name contract conflicts.
12. Signatures project input, output, failure, and requirements correctly.
13. Signature composition rejects disconnected pipelines, unions failures, and merges requirements without positional injection.
14. Generic causality admits genesis, linear ancestry, and explicit merges through one stable predecessor-row representation; versioned envelopes reject bodies that shadow reserved identity fields.
15. System and core can import the root type ABI without any runtime module edge.
16. The normalized Type ABI graph represents every v1-supported public type form, references recursive nodes finitely, preserves overload order where semantic, and normalizes order only where it is not.
17. Generic and infer binders, private/protected nominality, unique-symbol references, type/value dual declarations, reachable support declarations, and upstream/library references retain identity through canonicalization.
18. Public-population derivation is independent from successful lowering, includes anti-vacuity counts, and records every unsupported form in an incomplete coverage row.
19. A complete `TypeAbiSurface` commits to the exact upstream ABI addresses it consumed.
20. A `TypeAbiAttestation` binds the surface digest to the exact semantic-interpreter lane; primary checking, embedded-language, analysis, and declaration-emission lanes remain separately qualified under one root matrix.
21. Type ABI canonicalization is stable across comments, formatting, parameter names, tuple labels, and harmless private-support renames, while remaining sensitive to public semantic changes.
22. Recursive public declarations canonicalize without unstable traversal or source-order dependence.
23. Address identity and compatibility judgment remain separate outputs.
24. Packed-artifact declarations resolve through the same owner paths consumers use.
25. `AGENTS.md` and `CLAUDE.md` remain ordinary files with mechanically verified byte parity.
26. Exact residual requirement rows derive exact runtime feature closure; an empty row emits no runtime, and an unresolved required hole blocks production.
27. `types.laws.ts` type-checks under the primary lane, declares no runtime values, and stays outside the Type ABI population, declaration emission, and the public export membrane, so fixture names never enter the addressed root surface.
28. Every root law is non-vacuous: reversing the implementation a law guards makes that named law fail, and a shared guard is proven separately at each operator that claims to apply it.

## 17. What is undecided, and what may be corrected

This foundation and the attached `00_core/` architecture candidate intentionally do not decide:

- the final root package export map;
- physical host persistence implementations;
- concrete browser, worker, edge, and server bridges;
- final target and wire inventories;
- system program implementation;
- exact measured backend crossover profiles;
- final packed execution-image layout;
- replication and merge algorithms;
- compatibility packages and release versioning.

**Nothing above is protected from correction.** A commit records bytes; a tag is a bookmark; "type-checks" means TypeScript accepted this tree under one named configuration. No layer name, prior ruling, or tag creates a permission barrier. When evidence shows an authority is wrong or incomplete, correct that authority directly rather than working around it downstream.

Evidence that warrants correcting core, or anything else: a downstream contract that cannot be expressed faithfully over it; compiler behaviour contradicting a written claim; an implementation showing a declared contract is unrealizable; an old-source oracle revealing an omitted capability; an empirical result invalidating a physical assumption; or a change in product intent.

Dependency direction is the one rule that does not bend — it is what makes this a waterfall rather than a graph.

The physical tree is the population. A home exists when its directory does; this document does not carry a second census of what is written, because a hand-maintained one drifts from the tree within hours and then misleads every reader who trusts the root first.

No runtime implementation exists anywhere. Every home receives its architecture before any executable product code, so the shape settles while it is still cheap to change.

## 18. Source basis

This clean-room design was built from:

- the post-fiasco North Star;
- the reset postmortem;
- the capability port ledger;
- the human-in-the-loop method;
- the layout seed and global-layout artifact;
- the full-send ideation atlas;
- line-by-line source-quarry evidence for the schema port, schema AST/inference, tagged error algebra, result carrier, content addressing, typed requirement tuples, capsule contracts, ECS authority tuples, receipt envelopes, and type-surface enumeration;
- current official TypeScript transition guidance establishing the native TypeScript 7 primary lane and the temporary TypeScript 6 compatibility/API lane required by Astro-class embedded-language tooling.

The source quarry supplied mechanisms and failure evidence. The architecture in this document is clean-room successor design.
