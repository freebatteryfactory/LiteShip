# Targets: Ecosystem Integration Surfaces

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Attach already-defined LiteShip meaning and already-defined host capability to an external ecosystem's configuration, registration, build, render, development, and deployment surfaces.

Core answers what a program means. Hosts answer how unresolved physical behaviour exists. Targets answer how an ecosystem installs, registers, transforms, emits, or deploys those. Targets are semantically thin and operationally complete — thin meaning subordinate in authority, not small.

## Owns

- Ecosystem target identity and reference.
- Target configuration identity, and its relation to an exact revision.
- Target composition identity and reference — the identity of a *selected* composition.
- Target attempt identity and reference — the pre-selection coordinate, so a refusal need not borrow the identity of a composition it never became.
- Slot claims, the pre-selection mirror of producers.
- Artifact slot identity — what a composition requires something to fill.
- The participation relation binding one target to one exact configuration revision.
- The production relation over core's exact `Artifact`.
- The producer choice, including the arm where no ecosystem target was involved at all.
- The altitude distinction between rejection and failure.
- The deployable application: one entry artifact plus its assets, producer-agnostic by construction.

Every fact has exactly one owner. Participation owns target and configuration revision; the producer owns participation; production owns the artifact and the slot; **the outcome alone owns composition identity**. Nothing is carried twice, so there is no parity law anywhere in this home and nothing that can drift.

Composition ownership is worth stating plainly. If participation and producers each carried a composition, an outcome for composition A could hold participants stamped with composition B. Threading the composition through every copy would only relate duplicated facts; removing the copies makes mismatch **unrepresentable**.

Selection is an altitude, not a flag. `TargetCompositionId` identifies a *selected* composition, so nothing that never reached selection may carry one: a refusal is identified by a `TargetAttemptId`, and slot claimants are `SlotClaim` values rather than `ArtifactProducer` values. A claim says what offered; a producer says what produced. Their payloads are identical, so only their tags keep them apart — and a law compares them structurally, because comments do not constrain the compiler.

The composition outcome is what projects into core's existing `Explanation`. There is no separate facts product because it could place a refused outcome beside a non-empty production array. A wrapper that restates what it wraps is not an abstraction.

## Does not own

- Artifact identity, address, digest, media type, or ancestry grammar. `00_core/14_compiler` and `00_core/01_encoding` own those.
- A source relation. `00_core/14_compiler` owns the one.
- An explanation product. `00_core/18_inspection` owns the one envelope.
- A universal lifecycle taxonomy, target context, plugin interface, or hook table.
- Per-target payloads of any kind.
- Any child's configuration shape, decoder, or admission.
- Per-child internal topology. Each child owns its own home roster; this umbrella owns only which children exist, which is `TargetChildRoster`: `astro`, `vite`, `cloudflare`.
- Deployment mechanics, platform resources, or credentials. `02_targets/cloudflare` owns the deployment relation; the umbrella owns only the application it consumes.

## Why children do not import one another

Not the host argument. Host children are disjoint — no physical execution is simultaneously web and server — and that reasoning does not transfer. Astro genuinely uses Vite and genuinely deploys through Cloudflare; all three may be live in one build, and that is supported.

The reason is that ecosystem usage and distribution dependency are not semantic authority. "Astro uses Vite" does not put Vite above Astro. A sibling import would shape one target around another and erase its independent direct path.

The exclusion does not physically prevent anyone from later writing a producer-neutral path by hand. It prevents something subtler — once one target imports another, that shape becomes structurally normal, the producer-neutral seam is never named, and the alternative stops being visible to the architecture rather than stopping being possible.

A child names what it needs in upstream vocabulary and exposes what it offers independently. A later composition point imports both and proves the binding.

## The first join, and what it cost to make it mean anything

`astro/03_build` declares a build-facility hole; `vite/01_projection` exposes a facility; neither imports or names the other. A composition point importing both public surfaces binds them through `BindingsFor`, with no casts and no local replica, and that it compiles is the first evidence relation-shaped composition works at all — before it, the model was approved and unproven.

The composition point is assurance, not architecture, and assurance has no home yet. It was proved at tags `astro-vite-seam` through `media-live-export-closure`; the bootstrap harness that carried it was removed rather than allowed to become a permanent root, and the capability returns when `system/` is authored.

Two ways of writing the requirement were rejected first, both of which compile and neither of which proves anything. A **free** contract parameter lets any supplier satisfy the hole by nominating itself. A parameter constrained by the **broad** instantiation is the same failure wearing a constraint, since broadening is what the broad form permits. The requirement is therefore generic over the exact axes, with the supplier constrained by those: the parameter names *who* filled the socket, never *what the socket means*.

One consequence was found by measurement rather than reasoning, and it generalises beyond this seam. **An exactness axis carried only inside a `Signature` input is unprovable.** The input is stored as `(input: Input) => void` and is therefore contravariant, so a supplier that accepts a broader request stays assignable and the broadening mutation survives. Every axis that must be exact is also a covariant member of the facility itself.

## The deployment contract, and why it waited

Its representation was deferred on the grounds that naming it early would pre-decide both its cardinality and its form. Cloudflare's denominator earned it, and the choice was not free. **One artifact** cannot express a worker script beside the static files it serves. **A bare non-empty set** loses which member is the entry, so a consumer guesses or a convention gets invented. **A manifest of references** is a second artifact vocabulary — the thing this home refuses everywhere else. **An entry plus assets** is what remains, and it is what a deployment actually consumes. `assets` may be empty; a worker with no static files is an ordinary deployment.

The producers live on the artifacts, and `ArtifactProducer` already covers both arms — so an application assembled by an ecosystem target and one assembled by hosts alone are the same type, with nothing for a consumer to branch on.

## Direct mode is an acceptance test, not a feature

A consumer of a produced artifact must not be able to ask which framework produced it. `ArtifactProducer` therefore carries an empty `direct-composition` arm — no target, no participation, no configuration, and no composition of its own — and `DirectProductionNeedsNoTargetContext` pins every one of those absences.

The test the architecture must keep passing: a composition of hosts alone can produce what a framework-produced artifact would, and the consuming path does not branch. If anything resembling `withoutAstro`, `astro?: boolean`, or a separate direct route appears, the contract is in the wrong place.

That test was run. `02_targets/cloudflare/03_deployment` is the first consumer that takes both, and a composition point passed a framework-produced application and a host-only-produced application through **one function** into the same request type. Until that compiled, the arm was representable but unexercised. Like the seam above, the proof is assurance awaiting `system/`.

## Where the children meet

Astro genuinely uses Vite. Neither may import the other, because ecosystem usage and distribution dependency are not semantic authority; their relationship is proved at a downstream composition point.

The consequence is that Astro declares a socket without naming who fills it and Vite declares a facility without reference to a requester. A downstream composition must import both real surfaces and prove that the supplier fits the socket.

`types.laws.ts` owns that compile-use composition. It cannot live in `types.ts` because the children import umbrella vocabulary; importing children back from the umbrella would close a cycle that TypeScript permits for type-only edges.

`system/types.ts` may import its children because no system child imports it. The distinguishing property is not *parent* but *owns vocabulary the children consume*.

So the umbrella imports no child, and the fixture is compile-only: it owns no target semantics, declares no facility, request, or disposition of its own, emits nothing, and is imported by nobody. A local replica would prove that a copy fits a socket, which is the defect `system/01_assurance/00_audit` exists to detect, committed by the proof. Every type in it is the real one.

The positive case needs no assertion. `AstroBuildFacilityRequirement` constrains its fourth parameter to Astro's facility at exact axes, so naming Vite's facility as the filler either compiles or does not. It compiles.

### Independent conformance

Astro declares a requirement. Vite independently exposes a facility. There is no shared upstream contract making conformance automatic, so the fixture must prove the exact relationship.

No parity law compares request types, disposition algebras, or slot aliases. Each derives from its owner, so equality would test a derivation against itself or preserve a duplicated fact.

`project` is a `Signature`, whose input slot is contravariant, so a supplier whose request needs fewer members than the socket offers remains assignable. A pairwise equality law would reject that lawful conformance and duplicate checks already carried by the facility constraint.

A law that freezes two spellings into agreement is not checking a relationship. It is asserting that nobody will ever legally differ.

## Laws

- An ecosystem target reference is exact over the target it names.
- An ecosystem target is not a compiler projection target. The two meanings sit one tier apart under one English word, and the longer name exists to keep them apart.
- Participation binds an exact target, configuration identity, and configuration revision; differing on any axis produces a participation that cannot substitute. The revision is checked, not merely parameterised — a generic no law reads can be deleted without anything turning red.
- The outcome is the sole owner of composition identity: no participation, producer, produced artifact, or failure carries one.
- An outcome pins the exact composition it reports on, and two compositions are not interchangeable.
- Attempt and composition are distinct reference kinds, compared against literal kind strings rather than against their own aliases.
- A refusal carries an attempt and never a selected composition.
- The Astro socket, filled by the real Vite facility, binds that exact supplier through root's own binding calculus; a supplier broadening participation, slots, or producer does not fill it, and the lawful pairing still does.
- Type surfaces are inspection summaries consumed by the parent topology, not export membranes. The semantic API is a module's exports at their owner path, and a composition imports those directly.
- A claim is not a producer. Their payloads are identical, so the law compares them structurally.
- Failure carries the exact participation that failed, not merely its target.
- A produced artifact binds core's artifact rather than restating it. Address, digest, media type, source revision, source relation, source map, configuration, and composition are absent by law — their presence would mean either a second artifact vocabulary or a second copy of a fact the producer already owns.
- A produced artifact pins the exact slot it fills.
- Target production reuses participation rather than restating its parts.
- Production is expressible with no ecosystem target **and no target configuration**. The configuration absence matters as much as the target absence: a direct production required to name an ecosystem configuration is an ecosystem-shaped path wearing a different label.
- An ambiguous-slot rejection names every lawful *claimant* kind, so a direct candidate is describable in the conflict it took part in.
- Failure names the participant and stops; the composition belongs to the outcome carrying it.
- The umbrella carries no per-target member and no lifecycle phase. `payload`, `context`, and `hooks` are checked by name, because a junk drawer does not become constitutional by removing Astro from its label.
- Rejection and failure stay distinct, and neither carries production.
- A composed outcome has at least one participant.
- The outcome projects into core's one `Explanation` and declares no explanation vocabulary of its own. `explanation`, `facts`, `report`, and `rendered` are checked by name because any wrapper could let a refused outcome sit beside a non-empty production array while the inner law still held.
- Every product carries the identity of the phase it belongs to. A refusal holds an attempt and no composition; a failure holds the selected composition and the participation that failed, and never falls back to an attempt. The two reference kinds stay distinct populations, so nothing changes phase by swapping which one it holds.

## Proof obligations

These are runtime claims, not unfinished work. A type cannot express any of them, so they are named here to mark the boundary of what compiling proves:

- That a runtime producer actually wrote the bytes the artifact addresses.
- That two producers never race for one artifact slot in a live composition.
- That an artifact whose ancestry could not be resolved is distinguishable at runtime from one that legitimately resolved to nothing.
