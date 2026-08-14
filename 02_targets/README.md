# Targets: Ecosystem Integration Surfaces

Status: `astro/`, `vite/`, and `cloudflare/` authored; the Astro/Vite seam and direct mode were proved by probes that lived in the deleted `verification/` tree and have no replacement in this repository; implementation absent

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

Composition ownership is worth stating plainly, because the alternative was tried and rejected. Participation and the producer used to carry a composition of their own, which meant an outcome for composition A could hold participants stamped with composition B — exact local generics beside a broad public carrier, the same failure the host layer paid four folds to close. Threading the composition generic through both populations would have made the mismatch illegal. Removing the copy makes it **unrepresentable**, which is the stronger of the two and the smaller change.

Selection is an altitude, not a flag. `TargetCompositionId` identifies a *selected* composition, so nothing that never reached selection may carry one: a refusal is identified by a `TargetAttemptId`, and slot claimants are `SlotClaim` values rather than `ArtifactProducer` values. A claim says what offered; a producer says what produced. Their payloads are identical, so only their tags keep them apart — and a law compares them structurally, because comments do not constrain the compiler.

The composition outcome is what projects into core's existing `Explanation`. There is no separate facts product — an earlier draft had one, and it let a refused outcome sit beside a non-empty production array, which defeated the law forbidding exactly that. A wrapper that restates what it wraps is not an abstraction.

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

The reason is that ecosystem usage and distribution dependency are not semantic authority. "Astro uses Vite" does not put Vite above Astro. The predecessor repository fused those three claims into single package edges and paid for it precisely: the one target that imported a sibling lost its independent story entirely, while the two that imported none kept theirs.

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

Astro genuinely uses Vite. Neither may import the other, because ecosystem usage and distribution dependency are not semantic authority — the rule that saved this umbrella from the predecessor's Cloudflare package, which imported a framework sibling and lost its independent story entirely.

The consequence is that the seam between them is a set of choices made twice. Astro declares a socket without naming who fills it; Vite declares a facility "taken without reference to any requester"; and until now nothing imported both, so whether the supplier actually fit the socket was an untested belief held by two files that had never met.

`types.laws.ts` is that test, and it is a separate file for a reason that was learned the hard way. The composition first landed inside `types.ts`, on the reasoning that the parent is the one place that may see both children. That reasoning was half right and the half that was wrong closed a cycle: the children import this umbrella for participation, producer, and slot vocabulary, so an umbrella importing them back to check their composition makes `02_targets/types.ts -> astro/03_build/types.ts -> 02_targets/types.ts`. TypeScript accepts it — type-only imports, one program — which is why it had to be caught by reading.

`system/types.ts` does import its children and is not the same case, though it was cited as the precedent. That file owns topology and nothing else, and no system child imports it, so nothing flows back. The distinguishing property is not *parent* but *owns vocabulary the children consume*.

So the umbrella imports no child, and the fixture is compile-only: it owns no target semantics, declares no facility, request, or disposition of its own, emits nothing, and is imported by nobody. A local replica would prove that a copy fits a socket, which is the defect `system/01_assurance/00_audit` exists to detect, committed by the proof. Every type in it is the real one.

The positive case needs no assertion. `AstroBuildFacilityRequirement` constrains its fourth parameter to Astro's facility at exact axes, so naming Vite's facility as the filler either compiles or does not. It compiles.

### Independent conformance, not coincidence

Astro declares a requirement. Vite independently exposes a facility. At this exact composition, Vite conforms. There is no shared upstream contract making that true, which is precisely why the fixture has to exist — but "conformance without a shared contract" is an ordinary architectural fact, not cosmic roulette, and calling it coincidence belongs to the investigation history rather than to the architecture.

An earlier draft carried a second law asserting the two request types, the two disposition algebras, and the two slot aliases were pairwise equal. Measuring retired it on both counts.

It was redundant: the facility constraint alone goes red when Vite widens its slot demands, gains a disposition arm, renames a disposition arm, or when Astro renames a request member. Four mutations, four failures, no equality law involved.

And it was wrong. `project` is a `Signature`, whose input slot is a parameter position and therefore contravariant, so a supplier whose request needs *fewer* members than the socket offers stays assignable — correctly. Dropping a member from Vite's request leaves the composition compiling, exactly as it should. The equality law would have called that a divergence and turned red on a legal change.

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
- The outcome projects into core's one `Explanation` and declares no explanation vocabulary of its own. `explanation`, `facts`, `report`, and `rendered` are checked by name, because a wrapper is one member away at all times — and an earlier draft's facts product let a refused outcome sit beside a non-empty production array while the law forbidding that held one object inward.
- Every product carries the identity of the phase it belongs to. A refusal holds an attempt and no composition; a failure holds the selected composition and the participation that failed, and never falls back to an attempt. The two reference kinds stay distinct populations, so nothing changes phase by swapping which one it holds.

## Proof obligations

These are runtime claims, not unfinished work. A type cannot express any of them, so they are named here to mark the boundary of what compiling proves:

- That a runtime producer actually wrote the bytes the artifact addresses.
- That two producers never race for one artifact slot in a live composition.
- That an artifact whose ancestry could not be resolved is distinguishable at runtime from one that legitimately resolved to nothing.
