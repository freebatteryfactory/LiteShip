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
- Gate identity, scope, disposition, and the failure classes a gate claims to detect.
- Gate qualification, the detection witness, and the qualified gate.
- The gate outcome algebra, in which unknown cannot pass.
- Earned assurance authority.
- Findings, degradation, and the assurance receipt.
- Exactly two children: `00_audit` acquires, `01_gauntlet` evaluates.

## Does not own

- `Proposition`, `Decision`, `Evidence`, or `Truth`. `00_core/06_evidence` owns all four, and every one of them is already generic in the axis assurance needed.
- `AuthorityRecord`, `AuthorityGraph`, `CanonicalImport`, `Explanation`, or `InspectionQuery`. `00_core/18_inspection` owns them, and its module comment already assigns their *production* to system assurance.
- `TypeAbiSurface`, `TypeAbiAttestation`, `TypeAbiCoverage`, or the toolchain matrix. Root `types.d.ts` owns them.
- A facts product. `Explanation` already carries facts, and `02_targets` recorded what a wrapper that restates what it wraps costs.
- Any repository program, command, or runner. That is `system/03_programs`, which does not exist yet.

## Subtraction is the design

This home's entire discipline is declaring less than it wants to.

The obvious version of an assurance layer declares an evidence type, a proposition language, a decision shape, an authority graph, and a fact vocabulary. Every one of those already has an owner upstream, and every one of them is already generic in exactly the axis that made it look domain-specific:

- `Proposition<Atom>` takes the atom. Assurance contributes `AssurancePredicate` and gets Strong Kleene semantics identical to the ones the application language uses. A law pins the identity, so a future edit that starts writing a private `and`/`or`/`not` here fails to compile rather than forking the repository's logic in two.
- `Decision<Subject, Failure>` takes the subject. Assurance supplies one.
- `Evidence<Value>` already separates unavailable, pending, ready, and failed — which is precisely what "missing evidence stays visible" requires, written years before anyone needed it here.

What is genuinely new is the idea of a gate that must earn its authority. That is what this file declares, and almost nothing else.

## A gate must earn the right to block

`DetectionWitness`, `QualifiedGate`, and `GateQualification` carry the one durable idea from the deleted harness.

Five hundred and seventy-one mutation scripts and a bespoke runner were an implementation, and implementations are quarry. The relation they were reaching for is this:

> A guard that has never been observed failing is indistinguishable from a guard that cannot fail.

This repository has written laws in both categories, repeatedly, minutes apart from each other — a `keyof` blind to an empty population, a union tested against one arm's shape, an exactness assertion read off an alias that survived the carrier dropping its parameter. Every one of them passed. Every one of them proved nothing.

So `QualifiedGate` requires a non-empty `detects` and a non-empty `witnesses`. A qualified gate with no demonstrated detection is unrepresentable, not merely discouraged.

`GateQualification` keeps `untested` and `refuted` apart rather than collapsing to a boolean, because a gate that was tested and failed to notice its own failure class is a more dangerous state than one nobody has tested, and it is the state that most looks like safety.

## Unknown does not pass

`GateOutcome`'s `satisfied` arm intersects its decision with `{ truth: 'true' }`. A gate whose evidence was unavailable resolves to `unknown` under Strong Kleene, and that shape cannot be constructed in the pass arm.

Fail-closed is therefore a type here, not a promise in a comment. The distinction matters because the previous arrangement's fail-closed behaviour lived in a runner, and a runner is one refactor away from failing open at three in the morning.

## A gate states what it does not cover

`GateScope.excluded` is required and may be empty.

Required, because a gate that reports on a sample, a top-N, or a subset without saying so reads downstream as complete coverage. May be empty, because covering everything is an honest statement worth being able to make. An absent member would be indistinguishable from never having considered scope at all.

## Why audit and gauntlet are separate

Not tidiness, and not package nostalgia.

Acquisition needs a compiler lane, a filesystem, and source control. Evaluation needs none of those and runs anywhere the facts can be shipped. Fusing them drags the heaviest dependency in the repository into every context that merely wants to read a decision — an editor, a pre-commit path, a deployment check.

The split also makes the lean/rich distinction expressible: `01_gauntlet` declares the evidence profile a gate requires, so a gate needing rich evidence under a lean run resolves to indeterminate — visible, and blocking if its disposition says so — rather than silently not running. Silently not running is how a checked repository becomes an unchecked one without anybody deciding to.

## Laws

- The assurance proposition is core's `Proposition` at the assurance atom, and the assurance decision is core's `Decision` at the assurance subject.
- A satisfied gate carries a resolved decision; unknown is not assignable into the pass arm, and the pass arm is not the full `Truth` union.
- Earned authority carries qualified gates with non-empty witnesses, never bare gate references, and names the snapshot it was earned over.
- Qualification separates untested from refuted, and refuted names the classes it failed to detect.
- A gate scope states its complement, as a required member that may be empty.

## Proof obligations

Runtime and repository claims a type cannot express:

- That a detection witness genuinely turned its gate red, rather than being asserted by the gate it qualifies.
- That the mutation a witness names was applied to the subject the gate reads, and not to an unrelated file that happened to break the build.
- That a gate's declared scope matches the population it actually visited.
- That findings are traceable to the acquired facts they concluded from.
- That an assurance receipt's address commits to its findings, so a receipt cannot be edited after the authority it grants is consumed.

## Implementation boundary

Architecture only. No implementation exists or is authorized. The deleted harness is quarry in Git history, not a port target: relocating it here would move the corpse and call it architecture.

## Machine-checkable projection

```yaml
home:
  path: system/01_assurance
  title: "Assurance: Claims About the Repository Itself"
  maturity: umbrella-and-children-specified
  implementation: absent
  child_homes:
  - 00_audit
  - 01_gauntlet
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - assurance-contributes-an-atom-never-a-second-logic
  - core-owns-evidence-decision-proposition-truth
  - inspection-owns-the-authority-graph-assurance-produces-it
  - a-gate-earns-authority-through-demonstrated-detection
  - untested-and-refuted-are-not-one-boolean
  - unknown-never-passes-a-gate
  - a-gate-states-its-complement
  - audit-acquires-gauntlet-evaluates
  - no-facts-wrapper
  - the-deleted-harness-is-quarry-not-a-port-target
  production_authority: false
```
