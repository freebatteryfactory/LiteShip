# LiteShip Project Guide

This file is the shared repository guide for coding agents. `AGENTS.md` and `CLAUDE.md` are ordinary, byte-identical files so Codex and Claude Code receive the same project model without symlink behavior or tool-specific architecture forks.

## Start here

Before changing architecture, declarations, exports, or source ownership, read these files in full:

1. `README.md`
2. `types.d.ts`
3. `types.laws.ts`
4. `00_core/README.md`
5. `00_core/types.ts`
6. the `README.md` and `types.ts` of every numbered core home touched by the change

The README is the human architecture authority. `types.d.ts` is the declaration-level shape calculus. Neither is a status cache.

`types.laws.ts` holds the root's compile-time fixtures. It must type-check under the primary lane and must stay outside the Type ABI population, declaration emission, and public exports, so fixture names never become addressed root surface. When you change a root operator, change or add its law in the same edit, then prove the law by reversing the change and confirming that the named law fails. Two fixture hazards recur: operands TypeScript reduces to `never` on their own prove nothing, and a guard proven only where it is defined says nothing about the operators that claim to apply it.

When a numbered home later gains its own approved README and `types.ts`, read those files in full before editing that home. Local guidance may refine the inside of a home but cannot reverse the root waterfall without an explicit architecture decision.

## Current phase

The global architecture, root type ABI, and `00_core/` are confirmed and closed.

`01_hosts/` is closed and independently ratified. The umbrella contract in `01_hosts/README.md` and `01_hosts/types.ts` is confirmed, and its child roster is sealed. All four children exist as specified architecture: `web/` across twelve numbered homes, `worker/` across seven, `edge/` across eleven, and `server/` across eleven — each home carrying only a README, a declaration surface, laws, and proof obligations.

The current phase is a narrow correction inside `00_core/`, opened because the first layer downstream of it needed to state artifact ancestry and found the upstream contract unable to express it. Its scope is exactly: exact artifact identity, a canonical artifact reference, exact revision references, and one required source relation replacing an optional source-map field in both the compiler artifact and the residual program. Nothing else in core is open. This is the waterfall working — a downstream layer revealing a primitive that must be promoted upward — not a reopening of settled meaning.

`02_targets/` does not exist and must not be created until that correction closes and its target denominator is approved.

No runtime implementation of any kind is authorized anywhere: the entire repository receives its architecture — targets, wires, system, root composition — before any executable product code exists, and implementation opens only on Eassa's explicit authorization after whole-repository closure.

Core product-language semantics are settled. Do not reopen them through local implementation convenience. Reopen a closed core decision only when a downstream host, target, or wire proof creates a contradiction, an implementation shows a declared contract cannot be realized faithfully, an old-source oracle reveals an omitted capability, an empirical result invalidates a physical assumption, or Eassa reopens it explicitly.

Realization planning is being specialized at the host boundary. That is payment of the legality-propagation and unsatisfiable-core obligations `14_compiler` already declared, not a reopened core defect. A host realizes upstream meaning; it never reinterprets, renames, or replaces an upstream authority. Grounding admits an authority that already exists at the explicit host boundary; an offer constructs one that does not, and grounding is never "an offer with an empty prerequisite row." The spatial-coordinate algebra remains the highest-risk clean-room hypothesis and must be pressure-tested rather than silently replaced.

## Project identity

LiteShip is an Astro-first, frontend-centered, fullstack-aware compiler framework for addressed interface meaning.

North star:

> One addressed meaning graph. One settlement compiler. One transactional residual engine. Many backends. Many projections. No duplicated reality.

Human form:

> Astro renders the page. LiteShip decides what the page still needs to know, where that knowledge can be settled faithfully, and what little code remains necessary.

Runtime is residual. Static and platform-settleable work should disappear into HTML, CSS, request processing, or generated artifacts. Only late information and unresolved behavior materialize executable runtime cost.

## Global source layout

The source waterfall is:

- root `types.d.ts`: declaration-only global shape calculus and type ABI
- `00_core/`: complete realm-neutral LiteShip semantics
- `01_hosts/`: shared host realization contract with a sealed four-child roster; `web/` (twelve homes), `worker/` (seven), `edge/` (eleven), and `server/` (eleven) all exist as specified architecture with no implementation
- `02_targets/`: ecosystem lifecycle integrations
- `02_wires/`: protocol and invocation projections
- unnumbered `system/`: repository programs, assurance, workspace, packaging, and release

The repository root is the `liteship` meta-package, canonical TypeScript toolchain authority, public export membrane, and tiny executable composition root.

The initial toolchain posture assigns TypeScript 7's native lane to primary project-wide CLI checking and declaration emit. A scoped TypeScript 6 JavaScript lane owns the repository language service while Astro-class embedded-language tooling still requires it, handles embedded-language and compatibility qualification, and supports system programs that still require the compiler API. Until the native compiler exposes the required programmatic API, TypeScript 6 is also the designated semantic ABI interpreter. Exact versions live in package metadata and Type ABI attestations. These are roles in one root policy, not a second semantic authority, and retire independently when their consumers support the native lane.

The numbers express dependency bands. They are not consumer package names.

## Type foundation

Root `types.d.ts` is an external module with no ambient globals and no runtime values.

It defines generic shape operators, not LiteShip semantic nouns:

- products, coproducts, tagged algebras, exhaustive handlers, and Result
- one Brand operator plus generic Address, Digest, and Fingerprint refinements; compose multi-axis identity inside one brand rather than stacking brands
- admitted/encoded representation Ports, narrowing through `RefinePort`, and explicit transforms through `RebindPort`
- collision-rejecting Extend/Compose and a Refine path that rejects foreign keys, widening, and presence-law weakening
- exact string-named Hole tuples with duplicate, missing, and incompatible requirement evidence
- closed binding tuples, recovered requirement rows, derived contexts, and conflict-aware requirement merging
- typed Signatures, composition, and Executors
- generic identity, reference, genesis/linear/merge causality, provenance, paths, issues, and strict versioned envelopes
- a closed normalized Type ABI graph (`TypeAbiNode` and `TypeAbiSurface`), canonical IDs, public/export/support declarations, anti-vacuity population, explicit incomplete coverage, exact compiler fingerprints, one root role-to-lane matrix, addresses, and attestations
- small compile-time proof helpers

Core defines semantic identities and mechanisms such as `EntityId`, `ContentAddress`, `SurfacePath`, `Schema`, `Operation`, `Receipt`, `Evidence`, and `Truth` by composing the root shapes.

Each numbered home may use one broad `types.ts` to show its local semantic surface. Runtime implementation files stay smaller and scoped.

A later type layer adds meaning. It does not silently restate an upstream owner.

Use `Extend` for additive composition. Use `Refine` only when an approved downstream semantic layer deliberately narrows an inherited field; it may not add keys, widen values, or change upstream required/optional ownership.


## Repository as specification

Every semantic home communicates through:

- its path;
- its local `types.ts`;
- its local `README.md`;
- executable proof as implementation lands.

Paths and type ownership are enforceable. Prose explains purpose, causal distinctions, proof meaning, empirical seams, and deferred research. Do not maintain hand-written inventories, status counts, dependency maps, maturity rollups, or public-surface lists when the repository can derive them.

A semantic folder contains `README.md` and `types.ts`. Add implementation files only when implementing a complete capability. Do not create blank engine forests or generic `utils`, `helpers`, `common`, or `misc` drawers.

Schema navigation owns typed field references. Ordinary finite fields navigate directly (`Customer.address.city`); `.fields` is the collision-safe view for reserved carrier names. Named recursive references stop direct expansion and cross only through compatible `ComposeFieldReferences` composition. Collections, patches, selections, scenes, operations, and programs reuse these references rather than using raw string paths or inventing a universal expression language. A field bound to a persistent subject uses the shared `EntityFieldReference` product.

The change lowering is operation invocation → family-specific patch → normalized state changes → packed execution delta → coherent commit. Each layer has one owner. Trusted server fragments use their own constrained semantic-location patch family and attestation reference kind; generated structures remain catalog-admitted under a different admission reference kind and cannot enter that path. Type laws pin the exact, non-overlapping payload rosters, while runtime minting and decoding still prove provenance.

Interpolation has one semantic owner in `09_quantization/`. Scene timelines reference that owner and do not define a second easing vocabulary. Every value, state, and driver track names both its persistent entity and schema-derived field. Collection expressions are parameterized by their legal row roots; foreign-root fields fail at the type boundary.

## Naming and operation vocabulary

Use established computer-science and domain terms. Custom branded words do not replace familiar categories.

Canonical verbs have stable meaning:

- `define`: immutable authored intent;
- `create`: allocate a stateful or owned resource;
- `parse`: syntax to untrusted representation;
- `decode`: untrusted representation to admitted semantic value;
- `encode`: semantic value to external representation;
- `validate`: check without changing meaning;
- `resolve`: choose among legal alternatives;
- `compile`: semantic meaning to artifact or residual program;
- `lower`: higher-level to lower-level representation;
- `plan`: choose settlement, backend, memory, or execution strategy;
- `execute`: run an operation, program, or kernel;
- `apply`: apply a validated change against an expected base;
- `commit`: publish one coherent authoritative result;
- `project`: express the same meaning through another representation;
- `render`: physically realize visual or media output in a host;
- `inspect`: structured facts;
- `explain`: causal account and next actions;
- `dispose`: end owned activity;
- `sample`: evaluate at an explicit time, index, or coordinate;
- `fork`: create an isolated non-authoritative branch;
- `merge`: combine explicit branches under a declared policy;
- `append`: add an admitted ordered item or event;
- `acknowledge`: confirm safe observation of a specific event or result;
- `checkpoint`: create a bounded recovery point;
- `resume`: continue from an acknowledgement or checkpoint;
- `pack`: derive a compact physical representation.

## Failure and diagnostic contract

Return `Result` for external data, validation, operations, compilation, persistence, host capabilities, and wire dispatch.

Ergonomic immutable `define*` APIs may raise the same structured DefinitionError produced by the underlying validator so authors receive immediate source location and stack context. Do not maintain a second validation implementation.

Diagnostics always carry a stable code, severity, owner, subject/location, cause or evidence where available, and remediation actions. Default human rendering says what failed, where, why, and the first safe next action. Agents receive the complete structured object.

## Production completeness

Development may contain explicit typed holes, unavailable capabilities, recursive references, hot-reload placeholders, and incomplete projections. They must remain visible, non-authoritative, and blocked from canonical production emission.

Production may not contain unresolved holes, deferred validation, deferred trust, hidden load-time registration, unbounded lazy collections on critical paths, or opaque thunks inside canonical data.

Explicit `any` is forbidden in governed source, tests, scripts, examples, and public declarations. Unavoidable third-party/compiler `any` is quarantined in a named adapter and converted to `unknown` immediately.

## State, persistence, and compute

Core owns semantic state, revisions, changes, transactions, in-memory conformance behavior, ECS authority, and persistence contracts. Component references preserve their schema's decoded and encoded types through state. Durable storage is supplied by hosts through typed ports such as revision, snapshot, change-log, and blob stores.

Core owns one state/world algebra with semantic, dense, scene, interaction, and future replicated realizations. Nested composition uses addressed subworlds with explicit ports, local coordinates/time, lifecycle, and parent transaction relationships.

The compute layer is a general kernel ABI, not a collection of feature-specific Rust functions. Domain APIs lower into reusable map, reduce, scan, gather, scatter, compact, compare, quantize, interpolate, normalize, transform, parse, hash, DSP, and geometry kernels. Kernel and runtime output schema types remain intact through the commit barrier. TypeScript remains the semantic reference. Rust/native, Wasm, worker, and WebGPU realizations earn authority through parity and measured end-to-end crossover.

Scene space uses a dedicated typed spatial-coordinate algebra with the same explicit-projection discipline as time, but not temporal ordering semantics. Dimension, axes, handedness, units, parent relationship, one origin/basis-defining parent transform, transform order, invertibility, and loss tolerance remain explicit. This is the principal clean-room hypothesis and requires SVG, CSS, Canvas, WebGPU, video, editor, and accessibility proofs.

## Ownership and imports

Import a concept from the module that owns it.

Do not rely on transitive re-export ladders to hide ownership. Core does not become the owner of every root operator it uses. A host does not become the owner of core types. A target does not become the owner of host or core types.

Root smart exports may provide ergonomic public addresses, but those addresses must resolve directly to the owner or to an identity-preserving declaration projection.

Source code does not self-import through built `dist` output.

Imports and typed holes solve different problems:

- imports locate owned declarations and implementations;
- holes declare capabilities or authority that a composition requires another layer to supply.

A requirement tuple is the canonical closed declaration. Hole identities are stable strings; open requirement arrays are not valid declarations. Its derived name-indexed context is the ergonomic execution view. Runtime injection resolves by hole identity/name, not tuple position. Closed binding tuples recover the same requirement row and reject duplicate identities. Cross-layer merges deduplicate equal holes, append new holes, and reject same-name contract conflicts.

A hole represents a required authority. Optional environmental availability belongs inside the supplied contract as typed evidence; omitting the hole would hide whether the authority was undeclared or merely unavailable.

Exact requirement rows determine runtime materialization. Compilation satisfies every hole that can settle early, retains the exact residual requirement row, derives the transitive runtime feature closure from the exact hole names, emits only those features and bindings, and blocks production when any required hole remains unrealized. An empty residual row emits no LiteShip runtime. Do not maintain a second fixed hydration-tier table.

## Type ABI evidence

A Type ABI result is an attestation, not an operation receipt. `types.d.ts` defines the canonical normalized type graph that `system/assurance` must produce. It includes the v1 node vocabulary, canonical node/binder/symbol identities, signatures, members, declarations, exports, upstream references, population counts, complete/incomplete coverage, surface artifacts, toolchain lanes, and attestations.

`system/assurance` will derive the complete observed public population before lowering it, then content-address the supported `TypeAbiSurface` rather than raw source text. Canonicalizer v1 uses deterministic CBOR and SHA-256. The final ABI address binds canonicalizer + surface digest + the exact semantic-interpreter lane. The surface itself commits to upstream ABI addresses, creating the type waterfall.

Comments, formatting, source offsets, function parameter names, tuple labels, and harmless names of reachable private support declarations do not define ABI identity. Unsupported public forms remain in a non-empty incomplete-coverage row and prevent complete authority. They never disappear because the canonicalizer did not understand them.

The root owns one role-indexed `TypeScriptToolchainMatrix`. One fingerprint identifies one exact compiler, options, and standard libraries; the matrix maps each role to exactly one lane address. The initial policy uses the native TypeScript 7 lane for primary CLI checking and declaration emit. A scoped TypeScript 6 lane owns the repository language service while Astro-class embedded-language tooling requires it, handles embedded-language and compatibility qualification, and performs compiler-API/semantic-ABI work until those roles can move. The Type ABI attestation binds only the lane that actually interpreted the normalized graph; every other lane contributes separate qualification evidence.

A matching address proves the same interpreted type surface under the same declared interpreter. Compatibility classification and cross-lane qualification are separate assurance folds.

Do not embed an ABI hash inside the declaration file or surface it identifies.

## Semantic ownership

`00_core/` owns realm-neutral meaning and engines, including schema, canonical identity, quantization, evidence, settlement, compilation, residual execution, operations, scenes, media, admission, revisions, causal records, operation receipts, and explanation.

`01_hosts/` owns concrete environment APIs and effects. A host binds authorities imported from their semantic owners and may declare host-local ones; it never authors a replacement contract under an upstream name. Authority boundaries take exact binding rows, never a free `BindingRow`. A missing binding and a bound capability reporting an unavailable resource are different facts and must not collapse into one. Several authorities backed by one physical provider share one lifetime and dispose once.

`02_targets/` owns ecosystem registration and lifecycle translation.

`02_wires/` owns protocol and invocation projection.

`system/` owns typed repository workflows and assurance. Product homes never depend on system.

AI is not a top-level home. Generic stream, proposal, admission, patch, transaction, replay, and rendering behavior belongs to core and hosts. Provider or protocol integration belongs to the relevant wire or target. LiteShip does not replace agent-orchestration or third-party-tool frameworks.

## Dogfooding

LiteShip uses the same substrate it offers users wherever the environment permits:

- the same type calculus
- the same schema discipline
- the same result and error algebra
- the same typed signature/operation model
- the same capability injection
- the same wires
- the same addresses, causal records, attestations, operation receipts, diagnostics, and explanation
- the same assurance path

Bootstrap and raw host APIs are legitimate lower layers. They must remain thin and must not become a private second framework.

## Working method

Eassa is the product and architecture authority. Agents are reasoning, source-mining, implementation, and verification partners.

For architecture work:

1. restate the actual decision;
2. distinguish owner intent, verified old behavior, inference, and new design;
3. recommend one direction with causal reasons;
4. explain downstream consequences;
5. preserve behavior and ambition;
6. stop at load-bearing seams for approval.

The old repository is a quarry and behavior oracle, not the successor skeleton.

When mining old code, read the complete relevant files and call paths. Search and grep are navigation tools, not final evidence. Verify presence, direction, counts, and reachability against source before turning them into design claims.

A package boundary has no constitutional standing merely because it exists.

## Implementation discipline

When implementation begins:

- accept the actual external carrier or `unknown` at trust boundaries and decode once;
- derive types from schemas rather than restating shapes;
- preserve literal precision and readonly ownership;
- keep runtime provenance with the validator or minter that enforces it;
- use typed results and structured errors rather than stringly failure paths;
- make every authored field reach a real consumer or an explicit unsupported result;
- prove semantic fidelity, not only file creation, bytes, or process success;
- measure the actual hot path named by a performance claim;
- keep dynamic growth bounded and lifecycle-owned;
- use one operation/program path across direct, CLI, HTTP, MCP, editor, CI, and release where applicable.

Meaningful repository workflows belong in typed `system/` programs. A `scripts/` directory is not the implementation architecture.

## Documentation

Keep documentation semantically dense.

The README explains purpose, ownership, composition, and proof. It should not accumulate current test counts, completion percentages, branch state, or hand-maintained inventories that code can derive.

A fenced YAML block may project checkable architecture metadata from the prose. It is not a second authority.

`AGENTS.md` and `CLAUDE.md` remain ordinary files with byte parity. Do not replace them with symlinks. When their content changes, update both identically and verify parity mechanically.

## Verification

No implementation command set is authoritative yet. Do not copy commands from the old repository or invent a root build workflow before `system/` and the root bootstrap are designed.

The checked-in foundation must eventually satisfy the root-pinned toolchain matrix:

- primary native project checking;
- repository TypeScript 6 language-service qualification while Astro-class tooling requires it;
- scoped Astro/embedded-language qualification;
- scoped compiler-API/semantic-ABI interpretation;
- declaration emission and packed-artifact resolution;
- focused positive and negative probes for algebras, brands, ports, `RefinePort` versus `RebindPort`, additive composition, safe refinement, closed requirement and binding tuples, signature composition, causality, envelopes, the canonical Type ABI graph, coverage, and attestations, carried as named laws in `types.laws.ts` and each proven non-vacuous by reversal;
- zero runtime exports and no ambient globals;
- parseable README YAML;
- byte-identical ordinary `AGENTS.md` and `CLAUDE.md` files;
- LF text and no symlinks.

As implementation lands, canonical repository workflows should converge on the root `liteship` executable and typed system programs rather than separate local, CI, and release implementations.

## Milestone discipline

When Eassa confirms a phase milestone, prepare a compact handoff and start a fresh chat for the next waterfall phase. Approved artifacts, not conversation history, are project memory.
