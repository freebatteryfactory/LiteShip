# Compiler, Settlement, and Realization Planning

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `14_compiler/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the complete compiler-arm registry, migration, faithful settlement, exact residual requirement closure, runtime feature derivation, realization legality, structured cost vectors, backend profiles, artifacts, source maps, and explanations.

## Owns

- Compiler-arm contracts and the compiler-owned migration adapter catalog.
- Artifact and egress definitions.
- Settlement locations and execution backends as orthogonal decisions.
- Placement constraints, requirement satisfaction, and offer materialization.
- Realization offers, closed plans, and the contract for a live realization instance.
- Exact `RequirementClosure` and runtime-feature derivation.
- Legality propagation, structured rejection, and explicit production refusal.
- Cost vectors, hard budgets, optimization objectives, backend profiles, and candidate selection.
- Structured settlement reasons and decisions.
- Compiler results, diagnostics, and proof references.
- The one `SourceRelation` authority, stating how any generated representation relates to the revision it was authored from. `15_program` consumes this rather than declaring its own.
- Canonical `ArtifactReference`, so downstream layers relate artifacts to producers and predecessors without hand-authoring structurally identical cousins.

## Does not own

- Target lifecycle hooks.
- Host API realization.
- The TypeScript compiler API used by system assurance.
- A hand-edited hydration-tier table.
- A second quantizer disguised as a backend optimizer.

## Migration is the inward compiler authority

Compilation and migration are inverse faces under one compiler authority, but they do not share one forced signature. Compiler arms lower LiteShip meaning outward; migration adapters interpret admitted foreign meaning inward. `MigrationAdapterCatalog` is the one addressed, non-empty, discoverable adapter population.

An adapter coordinate has two parts: a stable lineage ID and an exact definition coordinate whose revision identity is bound to its content address. Discovery synchronously filters the catalog value it is given by the exact requested source profile and succeeds only with one indivisible `MigrationAdapterSelection`; unsupported profiles and ambiguous compatible populations are typed failures, with the ambiguous arm carrying the candidates the caller must disambiguate. Discovery never executes an adapter, acquires hidden physical input, or selects by registration order. Execution consumes the selected row whole and may wait on its physical realization, so adapter, source profile, output profile, definition revision, and compatibility decision cannot be reassembled as independent siblings. Multiple adapters may serve one profile; their coexistence is precisely why ambiguity is a failure rather than “first registered wins.”

`MigrationSource` has two arms. An artifact arrives already addressed. Inline schema-admitted canonical data receives an address during source admission, before adapter execution evidence is created. `MigrationSourceCoordinate` is therefore addressed in both arms.

Adapter-local success carries product and diagnostics together, including error diagnostics for source fragments that were dropped while the remaining meaning was admitted. Each loss carries its exact source location and non-empty core diagnostics, so cause, severity, and remediation stay in the shared deterministic prompt carrier rather than a parallel string. Adapter-local rejection is distinct from operational failure. Operational failure is a typed algebra whose every arm carries non-empty diagnostics; a possibly empty diagnostic array can never be the only explanation for no product.

The operation-level `MigrationReport` distinguishes admitted and rejected source. An admitted report carries its exact execution request whole, the addressed source coordinate produced by admission, an output-profile-correlated meaning bundle, dropped and approximated populations, diagnostics, and a proposed application. The proposal references the admission derived from that request inside an ordinary operation invocation; it never repeats source or bundle coordinates that could name another report's product. The surrounding `OperationReceipt` binds the report to the invocation; putting the receipt back inside its own output would be recursive, while copying only its ID into the report would create two receipt authorities that can disagree. A lawful empty product must occupy the explicit `empty` population arm and name the schema that admitted emptiness. An accidental empty array is not a product.

Migration never applies the produced meaning. `MigrationApplicationProposal` is consumed by a separate approved operation and carries a core diagnostic explaining that proposed action instead of an unstructured explanation string.

Compiler arms are semantically deterministic by definition over admitted input and explicit requirements. An arm that reads hidden time, entropy, evidence, or effects is not another compiler mode; those inputs must enter through named authority. Repeated physical emission is a separate claim made later against an exact compiler implementation profile, using the stage-specific reproducibility grammar rather than a boolean on the semantic arm.

## Requirement closure is the bundle law

The root typed-hole and exact requirement-row machinery determines what unresolved runtime authority remains after compilation.

The compiler:

1. resolves every requirement that can settle at build, platform, request, or another earlier location;
2. records the exact residual requirement row;
3. derives the transitive runtime feature closure needed to satisfy that row;
4. emits only those runtime features and their bindings;
5. refuses production when a required hole has no lawful realization.

A runtime feature is generic over a closed non-empty root `Hole` tuple, and its requirement identities are mechanically derived from those exact hole names. An empty residual requirement row means no LiteShip runtime is required. Runtime capability is derived from actual semantic need rather than from a fixed marketing tier.

## Settlement and backend selection

Settlement answers where a fact can first be known faithfully. Backend selection answers how remaining work executes.

Selection proceeds in two phases:

- monotone legality propagation eliminates candidates that violate availability, realm, authority, fidelity, lifecycle, security, requirement, or egress constraints;
- bounded cost selection enforces hard budgets, removes Pareto-dominated candidates, applies an explicit optimization objective, and records the structured reason.

Fidelity is a legality minimum, not a measured outcome: it requires either
exact projection or approximation under one addressed temporal or scene-owned
tolerance profile. Invertibility is a separate positive constraint. A bare
numeric tolerance and an `invertible: false` requirement are both illegal
shapes; domain profile values own their metrics, units, bounds, and addresses.

Quantization may classify or stabilize continuous evidence used by a plan. It does not replace constrained optimization. Backend candidates form a finite constrained choice set with multidimensional costs, not an ordered continuous state boundary.

A solver may serve as an assurance oracle on bounded fixtures. Normal compilation remains deterministic and explainable without depending on an opaque general solver.

## Realization planning

Settlement decides where a fact is known and how remaining work executes. Realization decides which physical provider fills each unresolved authority. These are different questions and use different objects.

A host declares a `RealizationOffer`: an exact non-empty row of upstream authorities it constructs atomically, an exact row of host-local prerequisites it needs to do so, its hard conditions, and a construction contract. The offer reuses the root `Signature` grammar rather than inventing a second one. It may only provide authorities imported from their semantic owners; it may never author a replacement contract under the same name.

The construction channel is sealed: a factory fails with exactly `RealizationFailure`, carrying a host-typed cause nested inside its arms. A host enriches the cause; it never substitutes the category, so a pre-candidate rejection — or anything else — cannot be declared as a factory's failure algebra. The offer also declares its lifecycle arm once, and that arm is carried by type through the declared materialization, the factory's output, and the resulting live instance: an owned offer cannot yield an unowned instance, and a materialization cannot claim a lifecycle its instance does not have. The owned arm directly exposes `OwnedResource`; disposal is never hidden behind a detached `resource` wrapper.

Selecting an offer is discharge, not merge. Root `ComposeSignatures` connects an output to an input and merges requirement rows; it has no relation saying that bindings produced by one signature satisfy requirements declared by another. Requirement discharge is compiler meaning and lives here.

The branch transition is:

```text
current unresolved requirements
  → remove the exact row this offer satisfies
  → merge the offer's exact prerequisites
  → continue until the branch closes
```

That merge is branch-local. Merging every alternative offer's prerequisites into one row would make every alternative mandatory at once, so a revision store backed by three candidate providers would demand a browser, a filesystem, and an edge binding simultaneously.

### Two rows, two meanings

`RequirementClosure.residual` is the immutable exact demand entering realization planning. `RealizationPlan.unresolved` is the branch-local worklist that shrinks as offers are applied.

Keeping them distinct is what preserves the bundle law. An empty *demand* means no runtime and no offer may be selected. An empty *worklist* at the end of a branch means the plan closed successfully and may carry substantial materialization. Collapsing the two names would make one of those two true statements look like a contradiction.

### Demand, provision, satisfaction, materialization

Four facts stay separate:

- **Demand** is the exact unresolved requirement row the semantic program needs.
- **Provides** is the exact non-empty row an offer constructs atomically.
- **Satisfies** is the intersection of current demand with `Provides`, and must be non-empty. An offer does not enter a plan because it might be useful later.
- **Materializes** is every physical consequence of selecting it: features, artifacts, resources, initialization, lifetime, and cost.

An offer that atomically provides a revision store, a snapshot store, and a change log while only the revision store is demanded satisfies one requirement. The other two do not become demand and are not exposed to consumers that never declared them, but the provider's full inseparable bytes, startup, memory, and lifetime still count. Requirements cause a realization to be selected; the selected realization determines the bundle actually paid for.

If a provider's pieces can genuinely be separated, model a shared base offer plus narrower offers. Do not declare it atomic and then account for it as though the atoms had seams.

### Termination and grounding

Qualification is a monotone fixed point over a finite catalog. It begins from selected grounding slots — authorities a host boundary can admit, declared in `01_hosts` — and repeatedly admits any lawful offer whose prerequisites are already reachable, together with its entire atomic provided row. The reachable set only grows and the catalog is finite, so it terminates, and it is order-independent when offer and requirement identities are canonical.

A plan's `selectedGroundings` row holds slot references, never bare requirement names. Grounding admits what already exists at the host boundary; an offer constructs what does not. If grounding were merely "an offer with an empty prerequisite row," a host could assert its entire surface as roots and the fixed point would be decorative. The planning-facing `GroundingId` lives here beside the offer identities because plans must name their roots and imports flow from hosts toward core; the declaration, origin, and admission contract live in `01_hosts`.

One slot identity passes through three states that never share a name: **declared** in a host catalog, **selected** by a plan, and — only when bootstrap admission succeeds at activation — **admitted** as a live `HostGroundingInstance` with its own provider identity. Availability is not selection, and selection is not admission: a catalog slot's boundary value may still be absent, malformed, wrong-realm, or refused by policy. The bootstrap owes fulfilled admission for every slot a plan selects, at activation, before any step constructs — and an admission refused there blocks materialization in the admission algebra rather than degrading into a missing binding or a construction failure. One definition denotes one root slot; a plan cannot use one slot twice invisibly.

A cycle in the offer catalog is lawful. Alternatives may be unused or externally grounded. What is illegal is a selected branch whose construction depends on a cycle nothing grounds, which is why the rejection arm is `ungrounded-cycle` rather than a blanket refusal of cyclic catalogs. Two authorities that genuinely require joint construction are one atomic offer providing both, not two mutually recursive offers with hidden initialization.

### Reachability is not planning

Reachability answers whether a capability can be obtained at all. Planning answers which complete lawful offer set should realize it. The first is a cheap complete fixed point. The second is a bounded search, and exhausting its bound is not a proof.

That distinction is why the compilation outcome has three arms rather than two:

- `planned` carries artifacts, the requirement closure, and an explained global realization decision whose selected candidate contains the closed plan — and the plan contains its settlement decisions;
- `unsatisfiable` carries a non-empty core and a proof, such as a capability absent from the reachability fixed point;
- `incomplete` carries arm-specific stopping state and structured rejections, and claims nothing about whether a plan exists.

Both refusal arms block production. Only one is a proof. This mirrors `TypeAbiCoverage`, where a form the canonicalizer could not interpret never becomes evidence of a clean surface.

Incomplete state is an algebra because different bounds stop with different facts. Search exhaustion leaves genuinely unresolved requirements and open branches. A Pareto or selection limit may stop with several fully closed lawful candidates and nothing unresolved at all; forcing that report through one product type would make the planner invent an unresolved requirement that does not exist, which is a small lie in exactly the place the architecture exists to prevent lying. An unsupported constraint names the form; an unavailable oracle carries its diagnostics and nothing else.

Compiler-operation failure — malformed input, a failed host capability, a recoverable fault in the compiler itself — is the surrounding typed `Result`, not a planning verdict.

### Recipe, step, instance

An offer is a reusable recipe. One plan may apply the same recipe twice — two regions, two workers, two tenants — and those applications must stay distinguishable, or "count the provider once" and "dispose it once" have no unit to count by. So there is a middle identity:

- `RealizationOffer` is the recipe, declared once per host capability.
- `RealizationStep` is one planned application of that recipe inside one plan, carrying its own applied materialization.
- `RealizationInstance` is the live provider a host creates from one step, carrying its own identity.

A step also records what it applies the recipe to: `StepInputBinding` classifies its offer input as plan-bound configuration (content-addressed, with its decode contract), invocation-bound (through an explicit named slot, with its contract), or none — an address proves which bytes; the contract proves what they mean. Selected groundings carry the same binding, so the plan says which bootstrap input fulfills which selected slot. The compiler also owns speculative preparation meaning: candidates pinned to source revisions, prepared work that is owned and disposable, and the committed/discarded/invalidated disposition algebra. A step naming only the recipe could not reconstruct which region a claim concerns or which join an island activates. Offers likewise have an erased `RealizationOfferDescriptor` — exact provides, requires, realms, locations, backends, constraints, lifecycle, and input classification — parallel to the grounding descriptor, so `RealizationCatalogAddress` truthfully covers both descriptor families.

A satisfaction names its selected satisfier, which is an algebra of the two ways a demanded requirement can be discharged: `grounded` by a selected grounding slot, or `realized` by a planned step — never by a recipe. Without the grounded arm, a requirement a host supplies directly would have no satisfaction edge: the root would exist, the plan would exist, and the relationship between them would be implied rather than represented, which is the oldest defect in this codebase wearing a smaller coat. Construction order is an order over steps; cost deduplicates by step. A plan holds its steps and nothing parallel to them, so there is no second array to drift out of agreement.

Failure carries the same identity discipline. A realization failure happens after selection, so every arm names the step that failed, not the recipe — two failures from two applications of one offer must stay distinguishable, or diagnostics, fallback, and provider accounting lose the unit they speak in. Arms that can only occur once a live provider exists — withdrawal, disposal — additionally name the instance. The offer is derived from the step and never independently restated.

Every requirement in the residual demand has exactly one selected satisfier. One grounding may satisfy several demanded requirements, as may one atomic step. Incidental provision never gains a satisfaction entry. That these hold over the erased plan — and that every named satisfier is actually among the plan's selected roots and steps — are assurance and implementation obligations; the type model owns the relationship, not the census.

### Three altitudes, three names

- `SettlementCandidate` is one location/backend alternative for a single semantic unit.
- `RealizationPlan` is one complete alternative branch for the whole compilation, holding references and descriptors only.
- `RealizationCandidate` is one lawful costed closed plan. A provider shared by several satisfied requirements is counted once per step, once per plan.

A rejected offer never becomes a candidate and therefore never receives a candidate reference. `SettlementDecision.candidates` stays non-empty: an undecidable unit lives in a refusal outcome rather than manufacturing an empty decision.

### The plan owns its choices; the outcome explains its selection

The per-unit settlement roster lives inside `RealizationPlan`, not beside it in the outcome. Backend selection introduces real prerequisites and materialization — worker, WebGPU, Wasm, server, and host-native choices help create the very closure the plan claims to have closed — so the cause is committed by the same address as the result. A sibling roster stored next to the candidate could select different backends while the plan stayed structurally valid, and both would look lawful from across the room.

Each settlement decision names its subject: the exact `SemanticLocation` it governs, using the identity authority core already owns. Seventeen decisions are seventeen answers, and each names its question — array position is never the hidden subject, because canonical meaning may not depend on ordering.

A plan also commits to its exact ancestry: the compilation revision it closes and the content-addressed `RealizationCatalogAddress` covering every offer and grounding descriptor it planned against. Persistent offer and grounding IDs name continuing things whose semantics can change under the same name; the catalog address names the exact revisions, so the same plan bytes cannot be reinterpreted under a silently revised catalog. Both refusal arms commit to the same catalog identity, because a refusal is also a claim about exactly one catalog.

Choosing among several closed costed candidates is itself a decision with a record: `RealizationDecision` carries the non-empty candidate roster, the selected reference, and a structured selection reason — only lawful, lowest cost after Pareto filtering, or an explained policy override. It is the global counterpart of the per-unit `SettlementDecision`. Three disciplines hold at both altitudes: the optimization objective is owned solely by the `lowest-cost` reason arm and may not appear on any other arm or decision product; an alternative eliminated as unlawful is explained through the rejections or violated constraints that refuted it, never named by a candidate reference it never earned; and a `lowest-cost` Pareto frontier is non-empty, because a unit with no lawful candidate produces no decision at all — it produces a refusal.

There is no fallback selection reason at either altitude. Every failure phase already has its home: pre-candidate illegality is rejection or violated constraints, search exhaustion is `incomplete`, compiler-operation failure is the outer `Result`, and post-selection construction, activation, withdrawal, or disposal failure is `RealizationFailure`. A runtime fallback that changes the selected plan would be a new decision under a replanning mechanism with its own receipts and causality — never a retroactive edit to why the original candidate was chosen. Neither refusal arm carries any production authority — no artifacts, decision, candidate, or settlement — under current names or retired ones.

### Plan data and live instances

A plan is canonical addressable data with no live functions, no open connections, and no owned resources. Materializing one selected step produces a `RealizationInstance` carrying its own provider identity, the step that created it, exact `BindingsFor<Provides>`, materialization evidence, and the same lifecycle arm its offer declared.

Several authorities backed by one physical provider share one instance and one lifetime, so that provider is disposed exactly once rather than once per binding it happens to back. `Signature` types the factory, `BindingsFor` proves the exact authorities, the instance owns the physical lifetime, and `ContextOf` supplies the ergonomic consumer view.

## Laws

- One compiler fleet authority exists.
- Adding an arm creates every declared downstream obligation.
- Migration discovers one candidate, executes that indivisible selected row, and produces a request-correlated addressed admitted-meaning report without applying it.
- Legality precedes cost.
- Settlement location and execution backend remain separate.
- Runtime features derive from exact residual requirements.
- Cost vectors remain multidimensional until an explicit objective selects among lawful candidates.
- Profile identity includes toolchain, backend, workload family, residency, and measured body.
- Physical reproducibility is qualified against an exact implementation profile and never inferred from semantic compiler identity alone.
- No planner silently weakens semantic or security invariants.
- Unsupported projection refuses.
- An offer provides imported owner authorities; it never authors a replacement.
- Requirement discharge is branch-local, never a global merge of alternatives.
- A selected offer satisfies at least one currently demanded requirement.
- The construction channel is sealed: a host types the nested cause, never the failure category.
- One declared lifecycle arm binds an offer's materialization, its factory output, and its instance.
- An offer is a recipe; a step is one application; order and cost speak in steps.
- A satisfaction names its satisfier: a selected grounding slot or a planned step, never a recipe.
- Selected groundings are declared-slot references, never asserted requirement names.
- Declared, selected, and admitted are three grounding states that never share a name.
- A failure names the step that failed, and a post-instance failure names the live provider.
- The settlement roster lives inside the addressed plan whose closure it created.
- A settlement decision names the exact semantic location it governs.
- A plan commits to its exact source revision and realization catalog; refusals commit to the catalog they judged.
- Shipping a plan is an explained decision over a non-empty candidate roster.
- A lowest-cost selection has a non-empty lawful frontier at both altitudes.
- The optimization objective has one owner: the lowest-cost reason arm, at both altitudes.
- An unlawful alternative is explained by what refuted it, never named as a candidate.
- No fallback arm exists in a selection reason; failure phases keep their own homes.
- A refusal outcome carries no production authority under any name, current or retired.
- Retired names and retired shortcuts stay retired: no `grounded`, no sibling `candidate`, no forbidden key at any type.
- Only a closed plan is costed; only a costed plan is settled.
- Exhausting a search bound is not an unsatisfiability proof.
- A stopped analysis reports the state its bound actually produced, arm by arm.
- One physical provider owns one lifetime regardless of how many authorities it backs.

## Operation vocabulary

- `compile` produces artifacts and residual programs.
- `migrate` parses and lowers foreign representations.
- `settle` chooses the earliest faithful location.
- `plan` chooses lawful realization, memory, and backend.
- `project` creates one target representation.
- `inspect` and `explain` expose requirements, candidates, costs, and reasons.

## Proof obligations

- Compiler-arm fleet completeness and downstream obligation derivation.
- One quantizer reaches CSS, GLSL/WGSL, ARIA, motion, and explanation without separate semantics.
- Migration source and adapter provenance, explicit lawful emptiness, non-empty failure diagnostics, and round-trip or explicit loss evidence.
- Empty residual requirements produce zero runtime feature closure.
- Runtime feature definitions preserve exact requirement identities from their root holes.
- Missing runtime bindings block production.
- Legality propagation and unsatisfiable-core explanation.
- Cost-profile anti-vacuity and exact measured-body checks.
- Pareto and objective selection determinism.
- Reference planner agrees with assurance solver fixtures where the oracle applies.
- Artifact references are exact over the artifact they name.
- An artifact is exact over its identity, projection target, and source revision, and differing on any one axis produces an artifact that cannot stand in for the original.
- The broad artifact form stays inhabited by several exact families, so one compilation's heterogeneous output remains representable.
- An artifact carries exactly one source authority: a required `SourceRelation`, with neither a sibling source field nor the retired optional map.
- Every source-relation arm commits to the exact revision it was authored from.
- Identity-preserving and deliberately-unmappable arms carry no map key; the mapped arm requires a source-map reference rather than any addressed bytes; refusing to map requires a non-empty statement of what cannot be recovered.
- Monotone qualification reaches a fixed point and is independent of traversal order.
- A selected plan is grounded, closed, topologically constructible, and free of ungrounded construction cycles.
- Plan identity is canonical: independent offers may be constructed concurrently without changing the plan address.
- An unsatisfiable outcome carries a genuine certificate; an exhausted bound is reported as incomplete instead.
- Complete inseparable materialization cost is accounted once per step and aggregated once per plan, including incidentally provided capabilities.
- The same offer applied twice yields two steps with distinct identities and one live provider each.
- Every requirement in the residual demand of a closed plan has exactly one selected satisfier, and no residual requirement disappears between demand and closure.
- Every satisfier a plan names is among that plan's selected groundings and steps; incidental provision never gains a satisfaction entry.
- Selected-input census: for every selected step and grounding, the input binding's classification and contract equal the selected descriptor's declared classification and input contract; `none` is lawful only where the declaration's input is genuinely empty; an intrinsic slot is never fulfilled by an external slot; a configured artifact decodes against exactly the declared contract.
- The bootstrap fulfills admission for every plan-selected grounding slot at activation before any step constructs.
- In every planned outcome, the selected plan, `RequirementClosure`, settlement decisions and their subjects, satisfactions, materialization, runtime-feature closure, and selected global candidate agree: the closure's residual equals the selected plan's `residualDemand`, its summaries derive mechanically from the plan's satisfiers and steps, and no requirement, feature, or materialization exists on one side while missing from the other.
- Backend-sensitive prerequisites used during branch closure derive from the exact settlement decisions committed inside that plan.
- Selected grounding slots are unique within one plan.
- The selected global candidate belongs to its decision's roster, and every Pareto-front reference belongs to the same roster.
- Every selected grounding and realization step lies on a transitive requirement path from the original residual demand, so nothing gratuitous materializes.
- Every selected step resolves through the exact catalog the plan committed to, and the plan's source revision, catalog, settlement subjects, closure, materialization, and candidate agree as one ancestry.
- Any emitted residual program derives its per-source settlement projection from the selected plan rather than independently restating it.
- Every reported violated constraint is traceable to the attempted location/backend alternative it eliminated.
- Incidental provision never becomes demand and never reaches a consumer that did not declare the hole.
- Provided authorities are canonical imports from their semantic owners rather than locally redeclared structural twins.
- A realization instance disposes its provider exactly once no matter how many authorities it backs.
- Pre-candidate rejection and post-selection failure remain semantically distinct; neither absorbs the other's cases.

The obligations concerning provenance, canonical ownership, erased-roster population and membership, and cross-object ancestry agreement are `system/01_assurance` claims; those concerning runtime behaviour — disposal, concurrency, admission at activation — belong to implementation fixtures. Neither set is a type law: TypeScript proves shape at the declaration boundary and nothing beyond it, so no positional count is kept here for a later edit to silently invalidate.

## Implementation boundary

The compiler-arm authority, migration adapter catalog and operation contract, requirement closure, planner contracts, cost model shape, and explanation are specified. Cost coefficients, profiles, calibration, and crossover thresholds are empirical.

Building the fleet registry, migrating old compiler arms and adapters, defining runtime feature records, and running real cross-backend profiles are implementation obligations. This home admits no fixed hydration tier and no second ranking mechanism.
