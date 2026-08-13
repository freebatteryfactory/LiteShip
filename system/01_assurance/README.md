# Assurance: Claims About the Repository Itself

Status: umbrella and both children architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `system/01_assurance/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the shared vocabulary for the facts TypeScript's assignability cannot decide, and the two algorithms that acquire and evaluate them.

## Owns

- Assurance subjects: roots, homes, files, authorities, artifacts, and directed relations between them.
- The assurance atomic predicate, and the proposition and decision instantiated from core's generics at it.
- Gate identity, gate origin, scope, and the failure classes a gate claims to detect.
- The gate definition itself, at an exact revision, and the evidence profile it requires.
- The planned check and the run specification: which exact checks an invocation asked for, and which of them it requires.
- The evaluated gate and the demonstrated gate: a definition paired with where each of its claims' demonstrations stand.
- The gate outcome algebra, in which unknown cannot pass.
- The self-demonstration vocabulary: gate revision identity, specimen identity, witness roles, the four-role demonstration, and its outcome.
- Findings, which live inside the evaluation that produced them.
- Exactly two children: `00_audit` acquires, `01_gauntlet` evaluates.

## Does not own

- `Proposition`, `Decision`, `Evidence`, or `Truth`. `00_core/06_evidence` owns all four, and every one of them is already generic in the axis assurance needed.
- `AuthorityRecord`, `AuthorityGraph`, `CanonicalImport`, `Explanation`, or `InspectionQuery`. `00_core/18_inspection` owns them, and its module comment already assigns their *production* to system assurance.
- `TypeAbiSurface`, `TypeAbiAttestation`, `TypeAbiCoverage`, or the toolchain matrix. Root `types.d.ts` owns them.
- A facts product. `Explanation` already carries facts, and `02_targets` recorded what a wrapper that restates what it wraps costs.
- Any repository program, command, or runner. That is `system/03_programs`, which does not exist yet.

## Ordinary operation input lives where both children can reach it

The gate definition, the planned check, and the run specification were authored in `01_gauntlet` and moved here.

Not for tidiness. Audit acquires the evidence the requested checks ask about, so it needs the exact definitions and propositions a run named. Audit cannot import gauntlet — they are siblings, and sibling authority import is the defect this whole home exists to detect. Waiting until audit implementation would have produced the obvious workaround, which is a relay: gauntlet re-exporting, or the umbrella re-exporting gauntlet, either of which puts ownership somewhere the declaration is not.

The split is by what a thing *is*, not by who happened to write it first:

- Input vocabulary is here: definitions, planned checks, specifications, claim identities, specimen identities, and the demonstration vocabulary.
- Evaluation products are `01_gauntlet`'s: the gate evaluation, its satisfied and unsatisfied refinements, the positional mappings, and the assurance result.
- Acquisition products are `00_audit`'s: acquired facts, the interpreter and resolver requirements, the audit product, and probe coverage.

## Subtraction is the design

This home's entire discipline is declaring less than it wants to.

The obvious version of an assurance layer declares an evidence type, a proposition language, a decision shape, an authority graph, and a fact vocabulary. Every one of those already has an owner upstream, and every one of them is already generic in exactly the axis that made it look domain-specific:

- `Proposition<Atom>` takes the atom. Assurance contributes `AssurancePredicate` and gets Strong Kleene semantics identical to the ones the application language uses. A law pins the identity, so a future edit that starts writing a private `and`/`or`/`not` here fails to compile rather than forking the repository's logic in two.
- `Decision<Subject, Failure>` takes the subject. Assurance supplies one.
- `Evidence<Value>` already separates unavailable, pending, ready, and failed — which is precisely what "missing evidence stays visible" requires, written years before anyone needed it here.

What is genuinely new is the idea of a check that must demonstrate it can discriminate. That is what this file declares, and almost nothing else.

## A check must demonstrate that it discriminates

Five hundred and thirty-eight mutation entries and a bespoke runner were an implementation, and implementations are quarry. The relation they were reaching for is this:

> A guard that has never been observed failing is indistinguishable from a guard that cannot fail.

This repository has written laws in both categories, repeatedly, minutes apart from each other — a `keyof` blind to an empty population, a union tested against one arm's shape, an exactness assertion read off an alias that survived the carrier dropping its parameter. Every one of them passed. Every one of them proved nothing.

The first attempt at carrying that relation did not carry it. `QualifiedGate` had a non-empty `detects` and a non-empty `witnesses`, which looks like a claim bound to its evidence and is two independent tuples: a gate declaring it detects X while carrying a witness for Y was assignable, probe-confirmed. Nothing related a position in one to a position in the other, so the qualification was decorative — the same defect it existed to catch, committed by the catcher.

`ClaimDemonstration` binds them. One proof entry per declared claim, positionally, with the claim population as a type parameter so the correspondence is construction rather than convention.

## Four roles, in named slots

A demonstration requires `baseline`, `lawful`, `detection`, and `attribution`, each pinned to its own role literal.

Four different ways a self-test can be worthless:

- The check was already red for unrelated reasons — answered by `baseline`, an unmodified control that came out green.
- The check refuses everything in the neighbourhood — answered by `lawful`, a legal specimen close to the defect that was accepted.
- The check never noticed the defect — answered by `detection`, the injected failure class refused.
- The check went red for the wrong reason — answered by `attribution`, which names the semantic relationship the refusal is attributed to.

An array of four witness values can hold four baselines and congratulate itself. Named slots pinned to role literals cannot.

`attribution` is the one that resists being faked. A nonzero exit code, a syntax error, an unresolved import, and an unrelated rule firing all produce a red check; none of them can produce an `AssurancePredicate` naming the relationship the check polices. That is a type-level bar, not a full one — proof obligations below carry what remains.

## One gate identity, with origin as a member

`ConsumerGateId` was a second brand over the same carrier, so `GateDefinition<Id extends GateId>` could not be instantiated with one. The promise that consumer gates travel the same path as repository gates was not weakly enforced — it was impossible, and the type that existed to make extension first-class was the thing preventing it.

It is now `origin: repository | consumer` on the one definition. Origin is a member and not a type parameter on purpose: two definitions from different origins are the same type travelling the same path, which is the entire point. As a parameter it would be two paths again with better manners.

The law here is modest, and says so. It pins that origin is required, has exactly two arms, and has not widened to `string`. It cannot assert that no second identity brand exists anywhere — a type system has no way to say *no such declaration exists elsewhere*. That is a sole-ownership question and it belongs to the repository audit; it appears below as an obligation rather than being quietly implied here.

## A planned check names the exact revision, not just the gate

`GateId` survives edits. That is what makes a check the same check across time, and it is exactly why a plan naming only the gate is not enough: proof could concern revision A while the run executed revision B, both sharing one `GateId`, with the type seeing agreement precisely where the instrument changed.

So `PlannedCheck` carries the revision alongside the gate, and the evaluation, the proofs, and the repository result all thread it. Persistent identity is for discovery and continuity. It is not proof identity.

## A specimen is not a snapshot

`SpecimenReference` and `WorkspaceSnapshotReference` are different brands, mutually unassignable, and a law checks both directions.

A specimen is a fabricated world built to test whether the instrument discriminates. The repository snapshot is the subject the instrument is later pointed at. One coordinate meaning both would make *this check was demonstrated* and *this check was run on your code* the same claim, and a demonstration would be able to present itself as an evaluation.

## Untested is an absence, not an arm

`GateQualification` was `untested | qualified | refuted` — one algebra mixing *has anybody looked* with *what did they find*, which is a maturity badge riding on every evaluation.

Core's `Evidence` already separates those, and had for as long as this home has existed: `unavailable` when nobody produced a demonstration, `pending` while one runs, `ready` when it came out either way, `failed` when the demonstration machinery itself broke. Reuse the absence language that exists; do not invent a second one.

Deleting the qualification algebra outright would have lost something real, though. *Nobody tested this* and *this was tested and did not notice* are different worlds, and the second is more dangerous because it looks most like safety. It survives as `disproven`, inside the outcome, where it is evidence rather than status.

`disproven`, not `refuted`. `GateOutcome.refuted` already means the check found the repository wanting; this means the check was found wanting. One word for both would be the vocabulary collapsing at exactly the point it matters.

## Unknown does not pass

`GateOutcome`'s `satisfied` arm intersects its decision with `{ truth: 'true' }`. A gate whose evidence was unavailable resolves to `unknown` under Strong Kleene, and that shape cannot be constructed in the pass arm.

Fail-closed is therefore a type here, not a promise in a comment. The distinction matters because the previous arrangement's fail-closed behaviour lived in a runner, and a runner is one refactor away from failing open at three in the morning.

## A gate states what it does not cover

`GateScope.excluded` is required and may be empty.

Required, because a gate that reports on a sample, a top-N, or a subset without saying so reads downstream as complete coverage. May be empty, because covering everything is an honest statement worth being able to make. An absent member would be indistinguishable from never having considered scope at all.

## Why audit and gauntlet are separate

Not tidiness, and not package nostalgia.

Acquisition needs a compiler lane, a filesystem, and source control. Evaluation needs none of those and runs anywhere the facts can be shipped. Fusing them drags the heaviest dependency in the repository into every context that merely wants to read a decision — an editor, a pre-commit path, a deployment check.

The split also makes the lean/rich distinction expressible: `01_gauntlet` declares the evidence profile a gate requires, so a gate needing rich evidence under a lean run resolves to indeterminate — visible, and refused if the invocation required that check — rather than silently not running. Silently not running is how a checked repository becomes an unchecked one without anybody deciding to.

## Laws

- The assurance proposition is core's `Proposition` at the assurance atom, and the assurance decision is core's `Decision` at the assurance subject.
- A satisfied gate carries a resolved decision; unknown is not assignable into the pass arm, and the pass arm is not the full `Truth` union.
- A demonstration requires all four roles in named slots; a baseline witness cannot occupy the detection slot, and each role is pinned to the outcome it is allowed to have observed.
- Attribution names the semantic relationship it attributes a refusal to, and the other three roles carry no attribution payload.
- The demonstration outcome is demonstrated or disproven, with no untested arm; absence lives in core's `Evidence` instead.
- A specimen reference and a workspace snapshot reference are mutually unassignable.
- Qualification separates untested from refuted, and refuted names the classes it failed to detect.
- A gate scope states its complement, as a required member that may be empty.

## Proof obligations

Runtime and repository claims a type cannot express:

- That a detection witness genuinely turned its gate red, rather than being asserted by the gate it qualifies.
- That the mutation a witness names was applied to the subject the check reasons about, and not to an unrelated file that happened to break the build.
- That every fact acquisition produces has a check that reads it. `AcquiredFact.consumers` and `GateDefinition.reads` were the two halves of this written as data, and both were rosters nobody traversed. Only walking the propositions of a run against the facts it acquired can establish it.
- That a gate's declared scope matches the population it actually visited.
- That findings are traceable to the acquired facts they concluded from.
- That an attribution witness's refusal was caused by the relationship it names, rather than by syntax, an unresolved import, a module-format mismatch, or an unrelated rule firing. The type requires the claim to be made; only running the demonstration can confirm it.
- That a specimen was built to exercise the failure class the witness names.
- That a gate revision token corresponds to the definition bytes its content address names, and that a fresh token is minted when those bytes change. The type threads the token; it does not mint one, and nothing in it makes a stale token impossible.
- That no second gate-identity brand has been declared anywhere in the repository. Origin on the one definition removes the reason to declare one; only a sole-ownership audit can confirm nobody did.

## Implementation boundary

Architecture only. No implementation exists or is authorized. The deleted harness is quarry in Git history, not a port target: relocating it here would move the corpse and call it architecture.
