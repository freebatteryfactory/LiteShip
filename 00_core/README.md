# LiteShip Core Architecture

Status: specified; implementation absent

Authority: This README for core ownership, dependency direction, semantic relationships, implementation boundaries, and proof obligations; `types.ts` for the complete core type topology; each numbered home's `README.md` and `types.ts` for local authority

Scope: The complete realm-neutral semantic body of LiteShip

`00_core/` is where the root shape calculus becomes the actual framework.

Root `types.d.ts` supplies generic products, coproducts, ports, refinements, signatures, requirements, bindings, references, causality, provenance, envelopes, and Type ABI vocabulary. Core composes those operators into errors, canonical encoding, identity, schemas, time, lifecycle, evidence, operations, revisioned state, quantization, collections, scenes, media, semantic streams, compilation, residual programs, execution, editing, and explanation.

Core is not a starter kernel. It is not a utilities package. It is not the subset every application happens to materialize.

> **Core is complete in meaning. Realization is selective.**

A static application may emit only HTML and CSS. A dynamic application may retain a residual program. A scene may lower to dense numeric planes. An operation may require a server binding. Those physical differences do not create alternate semantic owners.

## 1. Mental model

LiteShip has one compositional grammar, one committed semantic world, several specialized algebras, and several lawful realizations.

```text
root types.d.ts
  generic composition grammar
        ↓
00_core/
  complete realm-neutral meaning
        ↓
01_hosts/
  physical capabilities and effects
        ↓
02_targets/ and 02_wires/
  ecosystem lifecycle and protocol projection

system/
  builds, inspects, proves, packages, and ships the same authorities
```

Inside core, dependency order is visible in the paths:

```text
00_error
01_encoding
02_identity
03_schema
04_time
05_lifecycle
06_evidence
07_operation
08_state
09_quantization
10_collection
11_scene
12_media
13_stream
14_compiler
15_program
16_runtime
17_editor
18_inspection
```

The numbered homes express additive dependency order. A later home may import root and earlier homes. It may not reverse the direction, relay ownership, or restate an earlier type under a new name.

`00_core/types.ts` is the broad topology view. It references every local type surface without becoming a barrel or implementation import hub. Runtime and compiler modules import exact declarations from their owner.

The global rule is:

> **Combine representations and execution strategies freely, but permit only one authority for each meaning.**

Therefore all of these combinations are healthy:

- persistent revision state plus dense execution slots;
- scene meaning plus ECS realization;
- readable residual IR plus packed execution image;
- TypeScript reference execution plus Rust, Wasm, worker, or WebGPU acceleration;
- revision DAG plus operation history plus snapshots plus an undo cursor;
- wall, logical, vector, sample, frame, and editor coordinates in one temporal product;
- one semantic definition projected into several egresses.

These combinations are not healthy:

- two schema authorities;
- two entity identities;
- two interpolation systems;
- two settlement interpreters;
- two current-world stores;
- two patch meanings for the same family;
- two compiler registries;
- two public canonical imports for the same declaration.

## 2. Repository as specification

The repository itself is the primary technical specification.

Every semantic home communicates through four reinforcing authorities:

1. **Path** identifies who owns the meaning.
2. **`types.ts`** declares the semantic surface and dependency relationships.
3. **`README.md`** explains purpose, composition, invariants, proof, and implementation boundaries.
4. **Executable evidence** eventually proves behavior through type fixtures, tests, examples, benchmarks, assurance, and packed artifacts.

README prose owns what code cannot regenerate:

- purpose;
- conceptual distinctions;
- causal rationale;
- support boundaries;
- proof meaning;
- empirical questions;
- explicitly deferred research.

Generated or executable sources own:

- export inventories;
- dependency graphs;
- current counts;
- current pass or fail state;
- toolchain fingerprints;
- Type ABI addresses and attestations;
- benchmark measurements;
- release evidence.

A local README may refine the inside of its home. It may not reverse an upstream contract.

### 2.1 Required local files

Every semantic home contains:

- `README.md`: human architecture authority;
- `types.ts`: local semantic declaration authority.

Implementation files are added only when their complete capability is ready to be implemented. A folder does not receive empty engines, speculative registries, or blank file forests merely to look complete.

### 2.2 Dependency authority

The numbered path sets the maximum legal dependency direction. Actual source imports state the current dependency graph. System assurance derives and checks that graph.

Local READMEs do not carry hand-maintained `upstream:` lists. Such lists are either redundant permission ceilings or drifting dependency maps. Both are weaker than source imports plus an import-direction gate.

### 2.3 File naming

Use established computer-science and domain terms.

Preferred file names describe an exact operation or model:

- `define.ts`;
- `decode.ts`;
- `encode.ts`;
- `validate.ts`;
- `resolve.ts`;
- `compile.ts`;
- `lower.ts`;
- `plan.ts`;
- `execute.ts`;
- `apply.ts`;
- `commit.ts`;
- `project.ts`;
- `render.ts`;
- `inspect.ts`;
- `explain.ts`;
- `dispose.ts`.

Generic drawers such as `utils.ts`, `helpers.ts`, `common.ts`, `misc.ts`, and ambiguous `manager.ts` or `service.ts` files do not communicate ownership. A shared operation earns an exact name and owner.

### 2.4 No duplicate maturity rollup

Each local README owns its implementation boundary and empirical questions. Core does not copy those states into a second hand-maintained maturity table.

The path roster comes from the directory tree and `CoreHomeName`. Current implementation and proof state later comes from system assurance. Absence remains visible without inventing a second status authority.

## 3. Standard operation vocabulary

The public and internal vocabulary uses familiar verbs whose behavior is predictable.

| Verb | Meaning |
|---|---|
| `define` | Create immutable authored intent. No long-lived resource is allocated. Invalid authored intent raises a structured definition error synchronously. |
| `create` | Allocate a stateful or resource-owning value. The result exposes direct lifecycle and disposal. |
| `parse` | Convert syntax into an untrusted representation. Parsing does not establish semantic trust. |
| `decode` | Convert external or untrusted representation into an admitted semantic type. Data failure returns a typed result. |
| `encode` | Convert an admitted semantic type into an external representation. |
| `validate` | Check a value or definition without changing its meaning. Returns a typed result or diagnostics. |
| `resolve` | Choose among legal alternatives without producing a target artifact. |
| `compile` | Transform semantic meaning into one or more target artifacts or residual programs. |
| `lower` | Transform a higher-level representation into a lower-level representation while preserving meaning. |
| `plan` | Choose settlement, backend, memory, index, or execution strategy under explicit constraints. |
| `execute` | Run an operation, residual program, or compute kernel. |
| `apply` | Apply a validated patch or change against an expected base. |
| `commit` | Make one coherent transaction result authoritative and visible. |
| `project` | Express the same meaning through another representation, coordinate system, or protocol. |
| `render` | Physically realize visual or media output in a host. |
| `inspect` | Return structured facts without inventing interpretation. |
| `explain` | Return a causal account, supporting evidence, and next actions. |
| `dispose` | End owned activity and release every resource exactly once. |
| `sample` | Evaluate semantic meaning at an explicit time, index, or coordinate. |
| `fork` | Create an isolated non-authoritative branch from an exact base. |
| `merge` | Combine explicit branches under a declared merge policy. |
| `append` | Add an admitted ordered item or event. |
| `acknowledge` | Confirm that a specific event or result was safely observed. |
| `checkpoint` | Create a bounded recovery point that authorizes prefix compaction. |
| `resume` | Continue from an acknowledged event or checkpoint. |
| `pack` | Derive a compact physical representation from a canonical semantic representation. |

A custom term survives only when it encodes a genuine distinction and is defined through an established category plus that distinction.

## 4. Failure and diagnostic experience

The same structured failure serves application authors, library authors, agents, wires, and system tooling.

### 4.1 When APIs return `Result`

Return typed `Result` values for:

- parsing and decoding external data;
- validation;
- operation invocation;
- patch application;
- settlement and compilation;
- persistence adapters;
- host capability failures;
- wire dispatch;
- recoverable runtime outcomes.

External or malformed data never raises merely because it failed validation.

### 4.2 When APIs raise

Raise a structured platform `Error` for:

- invalid immutable authored intent passed to an ergonomic `define*` API;
- violated internal invariants;
- unexpected defects crossing a raw host boundary.

The ergonomic `define*` path and the underlying validator share one implementation. There is no parallel validation language. Tooling and editors call the validator directly when they need a non-throwing result.

### 4.3 Diagnostic rendering

A diagnostic always retains the full machine-readable object.

Default human rendering contains:

1. what failed;
2. where it failed;
3. why it failed;
4. the first safe next action.

Detailed rendering additionally includes causes, evidence, all remediation alternatives, owner, and related authorities.

Agent rendering receives the complete structured diagnostic, including stable code, subject, location, evidence, and machine-actionable remediation.

Remediation uses standard verbs such as `edit`, `run`, `choose`, `supply`, `inspect`, `retry`, and `contact-owner`. A command is emitted only when it is deterministic, safe, and directly applicable.

## 5. Production completeness and explicit deferral

Development may contain explicit incompleteness. Production may not contain unresolved incompleteness.

Development may temporarily contain:

- typed holes;
- missing bindings;
- unavailable host capabilities;
- explicit recursive references;
- hot-reload placeholders;
- incomplete projections;
- suspended or pending operational work.

Every incomplete value must be enumerable, diagnosable, non-authoritative, and blocked from canonical production emission.

A production build refuses when any required hole, recursive reference, schema projection, capability binding, runtime feature, or production obligation remains unresolved.

Registration is never a side effect of loading. A module that registers a component, a codec, a directive, or a capability merely by being imported has made its own presence a hidden precondition: the program then depends on an import graph nobody declared, and removing an apparently unused import changes behaviour. Registration is an operation with a caller.

Operational deferral remains legal when it is represented by its real state:

- pending;
- unavailable;
- stream;
- checkpoint;
- suspended;
- deferred;
- memoized;
- remote.

Canonical semantic data never contains an opaque thunk whose future execution defines its meaning.

Recursive schemas use finite named definitions and explicit references. They do not require an arbitrary closure-bearing `lazy` node.

### 5.1 `any`

Explicit `any` is prohibited in governed product source, tests, examples, scripts, generated declarations, and public APIs.

An unavoidable third-party or compiler-API `any` is quarantined in a named adapter, documented, converted to `unknown` immediately, and prevented from flowing into the semantic core.

The Type ABI can represent `any` so assurance can report it. Representation is detection, not permission.

## 6. Type waterfall and typed semantic references

Root `types.d.ts` remains the pre-semantic declaration calculus.

Each core home adds only the meaning it uniquely owns.

```text
types.d.ts
  + 00_error/types.ts
  + 01_encoding/types.ts
  + 02_identity/types.ts
  + ...
  + 18_inspection/types.ts
  = complete core semantic type surface
```

The rules are:

- local implementations import exact types from the owning `types.ts`;
- a later home may import only root and earlier-numbered homes;
- `00_core/types.ts` synthesizes topology for assurance and comprehension but does not relay every declaration;
- downstream hosts, targets, and wires import canonical owners rather than a transitive barrel;
- additive composition is preferred;
- deliberate narrowing uses root refinement operators;
- one declaration has one canonical owner and import;
- the Type ABI verifies ownership, reachability, aliases, and upstream commitments.

### 6.1 Schema-derived field references

Root `DataPath` remains a generic path carrier. Core schema composes it into a typed semantic reference.

A schema field reached through immutable schema navigation (`Customer.address.city`, with `.fields` as the collision-safe view for reserved carrier names) is simultaneously:

- the target `Schema` and `Port`;
- a typed runtime `FieldPath`;
- a `FieldReference` bound to root and target schema identities;
- a content-addressable value usable in queries, patches, selections, operations, and programs;
- a future candidate for interning into a local dense slot.

This resolves the usual type-level versus runtime-path tradeoff without creating five encodings of the same field.

Direct navigation eagerly follows only finite object, array, and tuple structure. A named recursive reference is an explicit boundary rather than an infinitely expanded property tree. `ComposeFieldReferences<Outer, Inner>` crosses that boundary only when the outer target schema exactly matches the inner root schema, producing one concatenated typed path and one canonical field-reference identity. A foreign-root hop is `never`.

When a field is attached to a persistent semantic subject, the shared `EntityFieldReference` product binds the entity and schema field without inventing another path language. Operations, scene tracks, editor selections, and state changes reuse that product.

Shared references are universal. Expression languages are not.

- Collections build relational expressions over field references.
- Scenes build spatial and timeline targets over semantic references.
- State builds patches and preconditions over references.
- Editors build selections over references.
- Agents discover and invoke operations over references.

No universal expression language tries to query rows, animate geometry, authorize operations, and schedule work through one mega-AST.

### 6.2 Type laws are part of the specification

Each settled structural ruling names a positive or negative type fixture.

Examples include:

- raw strings cannot satisfy field references;
- fields from a foreign schema cannot satisfy another root schema;
- named-reference field composition accepts only a matching target/root pair;
- collection expressions cannot read fields rooted outside their declared query scope;
- draft revision references cannot satisfy committed revision contracts;
- values in one coordinate space cannot satisfy another without projection;
- scene timeline interpolation cannot use a raw string;
- scene field-writing tracks must name both persistent entity and schema field;
- trusted-fragment and generated-structure stream arms have exact non-overlapping payload rosters;
- versioned bodies cannot shadow envelope tag or version fields, even with otherwise compatible broad types.

The first implementation wave turns these exported laws into enrolled compiler fixtures. Prose never remains the sole enforcement for a type-level rule.

## 7. Encoding, identity, and record taxonomy

`01_encoding/` owns canonical portable values, deterministic bytes, digests, and content addresses.

`02_identity/` owns persistent subjects, revisions, references, paths, and local slot distinctions.

The architecture uses established record terms:

| Term | Meaning |
|---|---|
| Address | Identity of canonical immutable content. |
| Revision | One exact immutable state of a persistent subject or world. |
| Event | Something observed, proposed, or occurring. |
| Patch | A family-specific serializable delta against an exact base revision. |
| Change | A normalized semantic transition. |
| Commit | A change set accepted into authoritative history. |
| Causal link | A predecessor or merge relationship. |
| Attestation | A claim by an identifiable authority about content, execution, or verification. |
| Trace | Observed execution facts. |
| Certificate | A proof bundle satisfying a declared claim. |
| Receipt | An acknowledged outcome of an operation or transaction. |

A schema definition does not receive a receipt merely for existing. A content address is not a receipt. A frame may be an event or checkpoint. A Type ABI result is an attestation.

Schema plus canonical bytes plus time does not prove provenance. Provenance still requires an authenticated mint, signature, delegation, or other authority attestation.

Hot paths use slots, generations, dirty bits, and transaction-local memory. They do not cryptographically hash every scalar tick. The coherent revision, patch, change set, artifact, attestation, or operation outcome is addressed at the correct semantic boundary.

## 8. Schema and admission

`03_schema/` is LiteShip's native schema and representation language.

The root provides ports, results, issues, paths, and algebraic machinery. Core provides the concrete schema node vocabulary and runtime behavior.

Schema supports:

- primitives and literals;
- arrays, tuples, objects, and records;
- optional fields and defaults;
- closed and discriminated unions;
- bytes and media types;
- declarative refinements;
- named opaque refinement adapters where unavoidable;
- encoded-to-decoded transforms;
- named recursion and references;
- metadata and stable issue identities;
- structural combinators;
- faithful external projections or explicit refusal.

The runtime trust rule is:

```text
external bytes or text
        ↓ parse
untrusted representation
        ↓ decode exact port/schema
admitted semantic value or structured issues
        ↓ optional private payload-bound witness
security-sensitive admitted authority
```

`unknown` is correct at a boundary whose semantic value is not yet established. Unresolved `unknown` does not drift inward. A public schema-any escape hatch does not exist.

Object fields reject unknown keys by default. Strip or preserve behavior must be selected explicitly.

A schema-derived field object is simultaneously the target schema view, typed runtime path, root/target reference, decoded/encoded relationship, and content-addressable key. Ordinary object fields are directly navigable, such as `Customer.address.city`; a complete `.fields` view handles rare collisions with reserved type-carrier keys. Both names point to the same field object.

Typed schema references preserve decoded and encoded types without carrying the whole schema graph through every downstream relation.

Schemas project into JSON Schema, Standard Schema, forms, operations, documentation, arbitrary generators, storage plans, and Rust layouts only where the projection is faithful.

## 9. Temporal and spatial coordinate discipline

`04_time/` owns temporal coordinate systems, timebases, timecodes, products, and projections.

Distinct temporal systems include:

- wall;
- monotonic;
- logical;
- hybrid logical;
- vector;
- transaction generation;
- frame;
- sample;
- simulation step;
- stream sequence;
- editor position.

A subsystem composes the coordinates it needs into one `TimeCut`. One transaction sees one coherent cut. Semantic `tick` behavior is pure over prior state, declared input, and supplied time.

HLC keeps its standard meaning. A product containing HLC, vector, sample, and frame coordinates remains a temporal product, not a renamed universal clock.

A `TimeProjection` carries complete source and target timebases, including rates or tempo maps. Fidelity is exact or approximate under an addressed temporal tolerance profile; invertibility is an independent capability. A shared tag such as `frames` is not sufficient to make two timebases interchangeable.

### 9.1 Spatial coordinates

`11_scene/` follows the same explicit-projection discipline through a dedicated spatial algebra.

The temporal algebra is not literally reused because space adds different laws:

- dimension;
- axes;
- handedness;
- units;
- origin;
- transform order;
- invertibility;
- dimensional loss;
- bounds and geometric tolerance.

A `SpatialTransform<From, To>` makes parent/child and egress-space conversion explicit and type-checkable. Inexact conversion names an addressed scene-owned tolerance profile and may be refused by target or policy; invertibility remains a separate capability. Coordinate-bearing geometry values and bounds preserve the same space parameter, so a screen-space point cannot silently enter world-space geometry.

This spatial contract is the one major clean-room semantic hypothesis in core. The project packet requires hierarchy, geometry, transform composition, z-order, blend semantics, and faithful output, but does not supply a mature old spatial algebra. Production authority therefore depends on strong multi-egress proofs.

## 10. Lifecycle

`05_lifecycle/` owns one direct ownership and cancellation contract.

A resource-owning value is itself disposable. Disposal is:

- exactly once;
- idempotent;
- LIFO;
- synchronously initiated;
- asynchronously complete;
- aggregate-failing without skipping sibling finalizers;
- cancellation-projecting.

Hosts bind physical resources into this contract. Core does not pretend the environment is pure.

## 11. Evidence, truth, collections, and operations

### 11.1 Evidence and truth

`06_evidence/` keeps operational state and epistemic truth separate:

```text
Evidence = unavailable | pending | ready | failed
Truth = true | false | unknown
```

Strong Kleene logic governs propositions. A visible annihilator may settle truth while blockers and failures remain inspectable.

Evidence source axes remain distinct:

- lifetime;
- evolution;
- authority;
- cadence;
- realm.

Advisory or presentational evidence cannot satisfy authoritative requirements.

### 11.2 Collection predicates reuse propositions

`10_collection/` does not invent another boolean expression language.

Collection field comparisons extend generic `Proposition<Atom>` with typed collection atoms rooted in the query's declared row schemas. A row predicate may be unknown because a field is null, absent, or evidence is pending, while blockers and failures preserve the difference.

Filters retain only `true`. `isNull`, `isMissing`, and `coalesce` remain explicit.

### 11.3 Operations and delegated authority

`07_operation/` defines one protocol-neutral operation language.

An operation is a unit of power to cause a declared business or semantic effect. It includes:

- identity and version;
- input, output, and failure schemas;
- exact requirements;
- effects and business effects;
- idempotency and cancellation;
- reversibility;
- subject, actor, workload, client, and delegate identity where relevant;
- target, purpose, authority scope, expiry, budgets, and approval requirements;
- outcome and operation receipt.

Rate, quota, concurrency, request/response bytes, duration, fan-out, economic cost, steps, and tokens remain independent limits. Definition, delegation, and invocation requests compose into one policy-derived effective budget.

Authentication protocols and concrete policy engines remain host and wire concerns. Core defines the authority facts and decision contract they must satisfy.

Risk and approval derive from operation meaning, delegated authority, reversibility, effective budget, host policy, and current context. An editor or agent cannot label its own request safe.

## 12. Revisioned state, ECS realizations, and persistence

`08_state/` owns semantic state. Hosts own durable persistence mechanisms.

### 12.1 One revision authority

Typed component references preserve one decoded/encoded schema relationship through definitions, state, systems, collection rows, and storage-profile requests. A component value is recovered from its reference rather than restated beside it.

Core defines:

- persistent entities and worlds;
- typed components and relations;
- immutable world revisions;
- draft revisions and forks;
- family patches;
- preconditions;
- normalized changes;
- change sets;
- transactions;
- commits;
- merge contracts;
- snapshots and checkpoints.

Collections do not create a parallel `CollectionRevision`. Their rows participate in world revisions. Scenes and generated structures likewise retain their specialized algebras while joining the same revision and transaction substrate.

### 12.2 Layered change flow

The canonical lowering is:

```text
operation invocation
        ↓
family-specific semantic patch
        ↓
normalized state changes
        ↓
packed execution delta
        ↓
coherent commit
```

Each layer has one job and owner.

A patch is not a generic JSON edit. It names an exact base revision and carries legal family operations plus preconditions.

### 12.3 ECS family

Core defines one world algebra with several lawful realizations:

- semantic revision world;
- dense data world;
- scene world;
- interaction world;
- future replicated world.

They share identity, schema, relations, system authority, revisions, transactions, time, and explanation.

Dense ECS storage is an execution realization for workloads that earn it. It is not the authored ontology for every value.

### 12.4 Addressed subworlds

A parent world may refer to a child world or scene through an addressed subworld with:

- `WorldId`;
- exact revision;
- local identity space;
- local coordinates;
- optional local time;
- declared input and output ports;
- lifecycle;
- explicit relationship to the parent transaction.

The compiler may inline, instance, isolate, cache, or separately schedule it. Hidden nested scheduler authority is prohibited.

### 12.5 Durable persistence ports

Core defines:

- `RevisionStore`;
- `SnapshotStore`;
- `ChangeLog`;
- `BlobStore`.

IndexedDB, SQLite, PostgreSQL, D1, KV, filesystems, R2, object stores, and future systems implement those ports in hosts or integrations.

### 12.6 Empirical state realization

The semantics and conformance suite are specified now. Measurements select:

- frozen reference structures;
- persistent tries or maps;
- copy-on-write pages;
- append logs and snapshot cadence;
- relation indexes;
- dense projections.

The benchmark changes physical realization, not state meaning.

## 13. Quantization and interpolation

`09_quantization/` owns:

- continuous-to-discrete named states;
- thresholds;
- hysteresis;
- crossings;
- interpolation identity;
- reconstruction;
- blending;
- quality policies.

Interpolation has one owner.

Scene timeline keys, CSS motion, shader uniforms, scene values, and video samples reference the same `InterpolatorReference`. Scene does not introduce `easing?: string` or a second interpolation engine. Every value, state, and driver track also binds a persistent entity with its schema-derived field; a field path alone names a schema location, not the scene instance being animated.

Quality may remove optional richness. It may not remove:

- truth;
- security;
- authority;
- accessibility;
- required interaction.

## 14. Collections and relational expressions

`10_collection/` defines schema-backed keyed collections over world revisions.

A collection has three principal semantic values:

- `CollectionDefinition`: row schema, stable key field, legal query capabilities, and declared indexes;
- `CollectionQuery<Roots>`: immutable content-addressable relational expression restricted to its declared row roots;
- `CollectionView`: materialized result against an exact world revision.

The canonical relational algebra includes:

- source;
- filter;
- project;
- sort;
- group;
- aggregate;
- join;
- distinct;
- window.

The TypeScript surface uses familiar query terms and schema field objects.

A single-source query carries one row root. A join may widen the legal scope to the union of its input roots, while join conditions retain side-specific root parameters. A field rooted outside that scope cannot satisfy the expression type.

A callback-shaped convenience may run once during definition over symbolic values only if it lowers completely into the same finite expression tree. JavaScript control flow, truthiness, mutation, closures, and runtime state cannot survive as canonical query meaning.

Deterministic sorting declares direction, a content-addressed collation profile where text comparison is required, null placement, and a stable final tie-breaker. A backend that cannot implement the profile faithfully refuses or falls back explicitly. The row key is the default final tie-breaker.

Join cardinality is explicit so output schema remains derivable.

The compiler may settle the same query to:

- URL and server operation;
- local JavaScript;
- SQL or a persistence adapter;
- incremental derivation;
- dense or columnar execution;
- Rust/Wasm, worker, or GPU execution.

## 15. Scenes and media

### 15.1 Declarative scene meaning

`11_scene/` defines target-neutral artistic meaning:

- entities and hierarchy;
- coordinate spaces and transforms;
- geometry and paths;
- materials, z-order, and blend semantics;
- states and constraints;
- timelines and tracks;
- systems and affordances;
- addressed subscenes;
- scene patches.

Authors do not manually spawn ECS components to express ordinary scenes. The compiler may lower scene meaning into revision state, dense ECS planes, residual programs, render plans, CSS, DOM/SVG, GLSL/WGSL, media schedules, or editor projections.

### 15.2 Geometry support rule

A geometry kind is paved-road when it declares:

- canonical representation;
- bounds;
- transform behavior;
- per-egress exactness, tolerance, and fallback;
- interpolation support or explicit refusal.

Every coordinate-bearing geometry value and bound retains its declared coordinate-space type. Materials use explicit target-neutral color spaces and established blend modes. Opaque geometry remains an expert extension and cannot claim unsupported animation or egress.

### 15.3 Timelines

Timelines use standard `Timebase` and `Timecode` concepts.

Track families are:

- value;
- state;
- event;
- driver.

Value tracks reference the shared quantization interpolator. Event tracks reference operations. Driver tracks reference evidence or other semantic sources.

### 15.4 Media time

`12_media/` owns assets, analysis, samples, frames, markers, envelopes, and A/V synchronization.

For A/V-backed programs, the sample coordinate is authoritative. Frames, wall display time, scene samples, beats, and offline output project from declared rates.

Realtime and offline execution consume the same media program and temporal coordinates.

Physical APIs such as `AudioContext`, `AudioWorklet`, `WebCodecs`, ffmpeg, filesystems, and camera or microphone devices belong to hosts.

## 16. Semantic streams and patch families

`13_stream/` owns event envelopes, sequence, snapshots, patches, holds, predictions, acknowledgement, checkpoints, replay, resumption, completeness, quality, and backpressure.

Transports do not define payload meaning.

### 16.1 Explicit trust boundary

Trusted fragments and generated structures are separate payload families.

A trusted HTML or element fragment carries a `TrustedFragmentAttestation` from a trusted producer. Its own constrained patch family targets revision-pinned semantic locations and never becomes an unrestricted DOM instruction language.

An untrusted generated structure passes bounded structural and catalog admission and carries a distinct `GeneratedStructureAdmission` reference kind. Model output never enters the trusted-fragment path.

The type surface pins the exact membership of both payload arms and proves their payload unions have no assignable overlap. Runtime implementation still authenticates the separate mint and decoder paths; the compile-time roster law is not treated as runtime provenance.

### 16.2 Payload roster

The successor stream roster includes:

- trusted fragments;
- generated structures;
- evidence updates;
- collection patches;
- state changes;
- scene patches;
- media events.

Acknowledgements, checkpoints, resumption records, and operation receipts are control records rather than interchangeable payload families.

### 16.3 Family-specific patches

State, collection, scene, generated structure, evidence, and media retain their own legal patch or event algebras.

They share a small exact-revision envelope and common stream sequencing. They do not share one untyped mutation grammar.

### 16.4 Semantic frame classes

- snapshot establishes complete semantic structure or address topology;
- patch applies an addressed family mutation against an exact base;
- hold commits no semantic mutation while target-native motion continues;
- prediction carries a real future candidate, horizon, and invalidation behavior.

Classification follows semantic structure, not token arrival or an empty buffer.

## 17. Compiler, settlement, and runtime feature closure

`14_compiler/` owns one compiler fleet and one settlement planner.

### 17.1 Compiler fleet

Every compiler arm declares:

- identity;
- input and output semantics;
- requirements;
- supported settlement locations;
- supported egresses;
- determinism and cache identity;
- diagnostics;
- explanation;
- source-map behavior;
- downstream obligations;
- proof fixture.

Adding an arm creates every declared downstream obligation. A hand-edited partial dispatch union is not fleet completeness.

Migration is the inverse face:

```text
foreign representation
  → parse and decode
  → admit LiteShip meaning
  → ordinary LiteShip projections
```

### 17.2 Exact requirements determine the bundle

Root typed holes and exact requirement rows are not passive metadata.

Compilation resolves every requirement that can settle earlier, records the exact residual requirement row, derives the transitive runtime feature closure, and emits only those features and bindings. Each runtime feature is generic over a closed non-empty root `Hole` tuple, and its requirement identities are derived from those exact hole names.

```text
no residual requirements
  → no LiteShip runtime

residual animation clock
  → animation feature closure

residual GPU device and render program
  → GPU feature closure
```

This is derived from the actual requirements, not a fixed hydration-tier table.

A production build refuses when any required hole lacks a lawful binding.

### 17.3 Settlement before backend

Settlement answers:

> Where can this fact first be known faithfully?

Locations include:

- build;
- platform;
- request;
- local;
- live;
- remote.

Backend selection answers:

> How should the remaining work execute?

Backends include:

- HTML/CSS;
- JavaScript;
- Wasm;
- worker;
- WebGPU;
- server;
- host-native.

The two axes remain separate.

### 17.4 Legality before cost

Planning has two phases.

First, monotone constraint propagation eliminates candidates violating:

- data availability;
- realm;
- authority;
- fidelity;
- security;
- lifecycle;
- capability;
- requirement;
- egress support.

Second, bounded selection:

- enforces hard budgets;
- removes Pareto-dominated candidates;
- applies an explicit optimization objective;
- records the structured reason.

Quantization may classify and stabilize continuous cost or capability evidence. It is not the optimizer. A backend plan is a constrained finite alternative selection over a multidimensional cost vector, not continuous evidence crossing ordered state thresholds.

A solver may serve as an assurance oracle on bounded fixtures without becoming the normal product dependency.

### 17.5 Realization planning

Settlement chooses where a fact is known. Realization chooses which physical provider fills each unresolved authority.

A host declares an offer: an exact non-empty row of upstream authorities it constructs atomically, an exact row of host-local prerequisites, its hard conditions, and a construction contract reusing root `Signature`. Selecting an offer discharges the requirements it satisfies from that branch's worklist and merges its prerequisites into the same branch. Discharge is compiler meaning; root `ComposeSignatures` merges requirement rows but has no relation that lets one signature's output satisfy another's requirements.

Four facts stay separate: exact **demand**, the atomic row an offer **provides**, the non-empty intersection it **satisfies**, and everything selecting it **materializes**. Incidental provision never becomes demand and never reaches a consumer that did not declare the hole, while the provider's full inseparable physical cost is still counted once per plan.

An offer is a recipe; a `RealizationStep` is one planned application of it; a `RealizationInstance` is the live provider with its own identity. Construction order, cost deduplication, and failure identity speak in steps — every failure arm names the step that failed, and post-instance arms name the live provider. A satisfaction names its satisfier — `grounded` by a selected grounding slot or `realized` by a planned step — so a requirement a host supplies directly has a real satisfaction edge, and every demanded requirement in a closed plan has exactly one selected satisfier. Declared, selected, and admitted are three grounding-slot states that never share a name. The factory's failure channel is sealed to `RealizationFailure` with a host-typed nested cause, and one declared lifecycle arm binds materialization, factory output, and instance.

```text
residual demand
  → admitted grounding references plus offer catalog
  → monotone qualification
  → closed plans and structured rejections
  → lawful costed candidate
  → settlement decisions
  → materialization or typed failure
```

Two rows carry different meanings and must not share a name. `RequirementClosure.residual` is the immutable demand entering planning; an empty one still means no runtime. `RealizationPlan.unresolved` is the branch worklist a successful plan drives to empty while carrying real materialization.

Qualification is a monotone fixed point over a finite catalog and therefore terminates. A cycle in the catalog is lawful; a selected branch depending on a cycle nothing grounds is not.

Compilation reports one of three outcomes. `planned` carries artifacts, the requirement closure, and an explained global `RealizationDecision` whose selected candidate contains the closed plan; the plan itself owns the per-unit settlement decisions whose backend choices created its closure, each naming its exact `SemanticLocation` subject, and commits to the exact source revision and content-addressed realization catalog it planned against. The optimization objective is owned solely by the lowest-cost reason arm at both altitudes, refuted alternatives are explained by what refuted them rather than named as candidates, lowest-cost frontiers are non-empty, and no fallback selection reason exists — every failure phase keeps its own home. `unsatisfiable` carries a non-empty core and a proof. `incomplete` carries arm-specific stopping state — search exhaustion leaves unresolved requirements, while a Pareto limit may stop with closed lawful candidates and nothing unresolved at all — and claims nothing about whether a plan exists. Both refusals block production and only one is a proof, exactly as an uninterpreted declaration never becomes evidence of a clean ABI surface. Compiler-operation failure stays in the surrounding typed `Result`.

## 18. Residual programs, memory, runtime, and compute

### 18.1 Readable residual program

`15_program/` defines a canonical versioned `ResidualProgram` containing:

- source table;
- semantic node table;
- dependency table;
- operation table;
- output table;
- residual requirement closure;
- runtime feature closure;
- logical memory plan;
- backend eligibility;
- source maps;
- explanation references.

Unknown versions fail closed. Every versioned carrier composes the root `Envelope` operator. Its type fixtures use compatible shadow fields (`_tag: string` and `_version: number`) so the fixture fails only when the reserved-key guard is active; later source assurance verifies the carriers actually use that owner operator.

### 18.2 Logical memory plan and physical layout

A backend-neutral `MemoryPlan` describes logical planes, value kinds, capacities, lifetimes, and bounds.

A backend-specific `MemoryLayout` chooses:

- offsets;
- widths;
- padding;
- alignment;
- buffers;
- sharing rules.

An `ExecutionImage` binds one residual program, one layout, one backend, and kernel commands. Buffered runtime outputs preserve the value type of their schema reference through the commit barrier.

JavaScript, Wasm, native Rust, and WebGPU need not use byte-identical alignment to implement the same logical plan.

### 18.3 Width and numeric rules

- local packed indices default to `u32`;
- `u16` is selected only when the compiler proves the bound;
- semantic generations use `u64` or BigInt-class coordinates;
- packed `u32` generations require explicit epoch or rebase behavior;
- each kernel declares exact integer, `f32`, `f64`, fixed-point, or tolerance-bounded semantics;
- there is no universal float-width doctrine.

### 18.4 Capacity policies

Standard policies are:

- exact;
- bounded paged growth;
- fixed ring;
- segmented spill.

Capacity exhaustion returns a typed failure or replan requirement. It does not cause unbounded allocation inside a hot transaction.

### 18.5 Runtime transaction

`16_runtime/` executes the residual program:

```text
evidence or operation input
        ↓
source generation advances
        ↓
affected frontier becomes dirty
        ↓
topological recomputation
        ↓
one RuntimeWritePlan
        ↓
one commit barrier
        ↓
coherent visible cut
```

No observer sees a partial cut.

### 18.6 General compute ABI

The Rust/Wasm compute work is generalized into reusable kernel families:

- map;
- reduce;
- scan;
- gather;
- scatter;
- compact;
- compare;
- quantize;
- interpolate;
- normalize;
- transform;
- parse;
- hash;
- DSP;
- geometry.

Every kernel declares schemas, purity, determinism, requirements, buffer regions, backends, numeric contract, TypeScript reference, and parity fixture.

Domain APIs lower into kernels. Rust never becomes a second semantic implementation.

### 18.7 Backend profiles

Backend choice uses content-addressed profiles keyed by:

- kernel or segment family;
- data shape;
- residency;
- runtime and toolchain;
- backend and version;
- exact measured body.

Offline profiles may be refined by lightweight runtime calibration. Selection remains stable at compile, load, island activation, scene start, or program-segment boundaries.

### 18.8 Bytecode and GPU

Readable IR is mandatory.

Bytecode may appear as an optional packed section only after measurements prove value. It cannot add semantic operations.

WebGPU is a real backend for GPU-resident scene, visualization, collection, and shader work. Broad GPU reconciliation remains deferred research. The research order is:

1. GPU-resident scene and compositor state with GPU egress;
2. GPU-resident collection transforms with GPU egress;
3. reusable compare, scan, and compact kernels;
4. patch-list readback experiment;
5. adoption only if total synchronization and readback cost wins.

## 19. Editor and agent control

`17_editor/` uses the same state, operation, patch, compiler, time, and commit model as runtime.

The five layers are:

1. committed revision DAG;
2. operation history;
3. working overlay;
4. snapshots and checkpoints;
5. history cursor.

A working overlay stores linked derivations:

```text
operation invocation
  → family patch
  → normalized change
```

It does not store independently editable parallel realities.

A preview produces a `DraftRevisionReference`. Equal content bytes do not confer committed authority.

Selections are revision-pinned semantic targets, including:

- entities;
- fields;
- collection rows;
- timeline keys;
- geometry points;
- generated-structure nodes.

Selection resolution reports resolved, moved, deleted, stale, or ambiguous. It never silently follows an old path to a new subject.

Humans and agents share:

```text
inspect
  → list affordances
  → propose operation
  → preview draft
  → explain consequences
  → approve or refuse
  → commit
  → receive outcome
```

An edit proposal carries one admitted invocation, exact base, and explanation; the invocation is the sole owner of the operation reference. Agents receive explicit delegated authority and effective budgets, not ambient user access.

Undoing uncommitted work rewrites the working overlay. Undoing committed shared history creates a compensating operation and new commit.

Replication remains deferred. The initial architecture preserves identity, operations, causal records, and family conflict semantics without selecting one speculative collaboration algorithm.

## 20. Inspection and authority discovery

`18_inspection/` defines the semantic query, explanation, authority graph, and impact model.

`system/01_assurance` later joins:

- compiler-derived Type ABI ownership;
- package export maps;
- runtime schema and operation catalogs;
- compiler-arm registries;
- evidence sources;
- runtime features and requirement closures;
- diagnostics;
- proof claims;
- hosts, targets, and wires.

The content-addressed Authority Graph answers:

- who owns a declaration or capability;
- its canonical import;
- the type surface that introduced it;
- its runtime constructor;
- schemas and operations connected to it;
- which requirement selected a runtime feature;
- wires and targets exposing it;
- proofs qualifying it;
- downstream impact;
- duplicate, shadow, alias, zombie, or unreachable authority.

The TypeScript compiler API, not regular-expression source scanning, provides declaration meaning.

Type ABI evidence is a `TypeAbiAttestation`. It is an authority claim over an addressed canonical declaration surface under one exact interpreter lane.

## 21. Core-side public surface law

Source homes and npm packages are different concerns.

Core may ship as one package with explicit semantic subpaths while hosts, targets, wires, and heavy system tooling remain separate distribution boundaries.

The bare `liteship` package exposes a small paved road selected by user journey and role, then constrained by a numeric ceiling.

High-level APIs lower into canonical owners. They never implement second versions of schema, quantization, compilation, state, or runtime behavior.

The default authoring format remains ordinary TypeScript and `.astro`. A dedicated LiteShip file format is deferred until the visual editor requires a durable semantic artifact that those surfaces cannot express naturally. Product need, not taxonomy symmetry, is the trigger.

## 22. Proof model

Different claims require different evidence.

| Claim | Required evidence |
|---|---|
| Type relation | Positive and negative compiler fixture. |
| Identity | Canonical bytes and content address. |
| Revision | Base revision, family patch, normalized change, and resulting revision. |
| Causality | Predecessors or merge ancestry plus temporal coordinates. |
| Authority | Private mint witness, signature, delegation, or attestation. |
| Execution | Trace against the TypeScript reference executor. |
| Backend equivalence | Differential output and measured crossover including bridge cost. |
| Operation | Operation receipt. |
| Stream recovery | Acknowledged checkpoint and replay result. |
| Compatibility | Type ABI, wire fixtures, persisted-data fixtures, and migration result. |
| Deployment | Build and deployment attestation from system. |

Every proof claim identifies:

- owner;
- complete relevant population;
- complement or refusal set;
- negative fixtures;
- exact measured body;
- produced artifact;
- shipping path it qualifies.

The first cheap repository proof is mechanical parity between `AGENTS.md` and `CLAUDE.md`. That check belongs in the first system assurance program and demonstrates the repo-as-spec enforcement pattern before the full system exists.

## 23. Implementation and port order

Implementation waits on the consuming contracts, so it begins against boundaries that downstream homes have already had to hold rather than against candidates. That is a dependency, not a permission.

The dependency order is:

1. error, encoding, identity, schema, time, and lifecycle;
2. evidence and operations;
3. state, revision conformance, ECS realizations, and quantization;
4. collections and relation-aware state;
5. compiler fleet, migration, settlement, requirement closure, and explanation;
6. residual program, logical memory plan, physical layouts, execution images, and TypeScript reference runtime;
7. generalized Rust/native and Wasm compute plus worker execution;
8. scene, spatial algebra, geometry, timeline, media, and A/V convergence;
9. semantic streams, generated structures, replay, editor, and agent controls;
10. hosts, targets, wires, system assurance, packaging, and release.

This is sequencing, not scope reduction. Each capability reaches its complete semantic contract and vertical proof before its old owner is retired.

For every old subsystem:

1. read its complete source and relevant tests;
2. inventory behavior, security, performance assumptions, and unfinished intent;
3. write successor contracts first;
4. build negative and fidelity proofs;
5. port or strengthen the implementation;
6. connect every promised consumer path;
7. remove the old authority only after reachability and parity are proven.

Empirical contracts can begin in parallel once their semantic workload shape exists:

- revision-store conformance;
- index-plan conformance;
- memory-plan/layout conformance;
- cost-vector and objective evaluation;
- backend profiles.

Measurements wait for workloads. Contract design does not.

## 24. Remaining signals

No unresolved core product-language decision is hidden in this artifact.

### Highest-risk semantic proof

The dedicated spatial-coordinate and transform algebra is a clean-room specified hypothesis. It has no mature old implementation to certify. Multi-egress fixtures may refine exact constructors and standard presets, but explicit typed projection, ordered transforms, and loss visibility are held.

### Empirical selections

Measurements still select:

- persistent in-memory revision structures;
- relation and collection indexes;
- snapshot cadence;
- physical memory layouts;
- widths, page sizes, and reserve policies;
- backend crossover profiles;
- optional bytecode value;
- GPU reconciliation value.

### Outside this architecture

Core owns none of the following. Each is a decision nobody has made rather than
a chore nobody has done, so adding one is an explicit architecture reopening
with its own denominator — not an obligation waiting quietly in a list:

- compact bytecode as a default execution form;
- broad GPU reconciliation;
- replication and CRDT algorithms;
- a dedicated LiteShip file format.

### Downstream design

Later phases still own:

- concrete host adapters;
- browser, worker, edge, and server implementation;
- target lifecycle;
- wire framing;
- system programs;
- final package distribution;
- final bare-root export roster.

Absence remains signal. It is not covered with optimistic counts or invented implementation detail.
