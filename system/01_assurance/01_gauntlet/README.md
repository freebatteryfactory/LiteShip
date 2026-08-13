# Gauntlet: Evidence Evaluation

Status: architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `system/01_assurance/01_gauntlet/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Read facts against the checks one invocation asked for, and produce one result recording what happened.

## Owns

- The gate definition: scope, the facts it reads, its proposition, the failure classes it claims, and the evidence profile it requires. Not its consequence.
- The gate evaluation, including the facts actually read.
- The evidence profile distinction.
- The run specification: which checks this invocation asked for, and which of them it requires.
- The evaluation population derived from that specification, and the assurance result.
- The evaluated gate: a definition at an exact revision, paired with where each of its claims' demonstrations stand.
- Consumer gate identity, so extension arrives through the same path rather than beside it.

## Does not own

- Any acquisition. No compiler lane, no filesystem, no source control appears here, and their absence from the run product is a law.
- Gate identity, scope, outcome, findings, or the demonstration vocabulary as *types* — those are the assurance umbrella's, shared with `00_audit`.
- Command parsing, exit codes, or output rendering. Those are the CLI wire's, and the wire does not exist yet.

## Gauntlet acquires nothing

`AssuranceResult` carries no `surfaces`, no `graph`, no `probes`, no `interpreter`, and no `files`, and a law checks all five by name.

That is what makes evaluation portable. A run consumes an audit product, which is addressed and shippable, so a decision can be read in an editor, a pre-commit path, or a deployment check without dragging a compiler installation into any of them.

## A gate with no inputs is the pure vacuous gate

`GateDefinition.reads` is non-empty because a gate that reads nothing decides nothing and cannot fail.

That is not a theoretical concern in this repository. It is the exact shape of every vacuous law found here so far — a `keyof` over an empty population, a union tested against one arm, an exactness check read off an alias. All of them passed. None of them could have failed. A gate whose input population is empty is that defect with the subject changed.

`GateDefinition.claims` is non-empty for the mirror reason. Qualification compares a claim to a witness; a gate that claims nothing can never be refuted, which makes it permanently unqualifiable rather than trivially trustworthy.

## Consequence belongs to the invocation, not to the check

A gate definition used to declare itself `blocking`, `warning`, or `advisory` for all time. That made a factual check permanently managerial, and it is wrong on its face: the same check is required by release, shown in an editor, informative in a diagnostic view, and possibly not run at all by a narrow local command. What a check *is* does not change. What an invocation *requires* does.

`AssuranceRunSpec` is that invocation's input — an exact identity, a non-empty check population, and `required | informational` per entry. Two arms, not three, and deliberately not the retired triple under new spelling. An invocation either needs an answer to proceed or wants to hear it. Severity of a finding stays on `Diagnostic`, where a vocabulary for it already exists.

`Finding` carries no disposition either. A finding reports what happened; how one caller treats it is a lookup into that caller's spec, and a copy here would let two runs of one check produce findings that disagree about their own consequence.

This is not a permission framework. It is a function argument. Publishing has stricter prerequisites than showing repository diagnostics, so the two name different specs — and a passing result over the editor's spec is not assignable where a release-grade one is required, because the result is exact over the spec it ran.

## A result carries what was requested, not what happened to run

`AssuranceResult.evaluations` is one evaluation per planned check, positionally, each about that check's gate.

The previous member was `readonly GateEvaluation[]`, which could be empty. That is the difference between *what was requested ran* and *something ran*, and the second reads downstream as a clean result — the specific habit that let a fifty-one-entry control plane report on the subset it reached for its entire existence.

A homomorphic mapping over the spec's check tuple preserves arity, so a three-check spec admits exactly three evaluations; the per-position `infer` makes them the right three, so five evaluations of one gate cannot stand in for five checks. On the passing arm, every position whose consequence is the literal `required` narrows to an evaluation whose outcome is in the `satisfied` arm. That is what makes `passed` mean something rather than being a tag someone chose.

Where the consequence is not a literal — the broad spec, where nobody has yet said what this run requires — no position is pinned. That is correct permissiveness, not a hole: a type should not invent an answer nobody has given.

## The verdict has no middle

`GauntletVerdict` is `passed | blocked`. There is deliberately no `passed-with-warnings`.

That arm is how a blocking gate becomes a suggestion over time: the arm appears for one legitimate reason, then accumulates, and eventually the blocking population is empty and nobody decided that. Informational findings ride inside `passed`, where they are visible and require nothing. A blocking gate that refuted or could not resolve produces `blocked`, and `blocked` carries the evaluations that caused it, so a refusal names its causes rather than being a bare exit code.

## Lean and rich are declared, not inferred

`EvidenceProfile` distinguishes a run with a full audit behind it from one without.

A gate declares the profile it requires. Under a lean run, a gate needing rich evidence resolves to indeterminate — visible, and refused if the invocation required that check — instead of quietly not running. Quietly not running is how a checked repository becomes an unchecked one without anybody deciding to, and it is more or less what happened when the previous harness became slow enough that nobody ran the expensive banks.

## The one idea that survived

A check is worth nothing until evidence shows it detects the failure class it claims.

Everything else about the deleted mutation infrastructure was implementation: the runner, the fifteen banks, the five hundred and thirty-eight mutation entries, the temporary-directory staging, the generated tsconfig. Implementations are quarry. This relation is architecture, the assurance umbrella owns its vocabulary, and this home is where a claim, its proof, and its evaluation become one population — bound to the exact rule revision, so editing a check invalidates its old demonstration by construction rather than by anybody remembering to.

## Laws

- A gate reads a non-empty fact population and claims a non-empty failure-class population; neither may widen to a plain array.
- The verdict is passed or blocked, with no middle arm, and blocked names the evaluations that blocked.
- A gate definition and its evaluation are exact over gate identity, and the broad form does not substitute.
- A claim and its proof are one population: fewer proofs than claims, and a proof of the wrong claim, are both refused.
- The evaluated gate carries that correlated population, checked against a written-out tuple rather than against the mapping that produced it.
- A required check in a passing result carries a gate whose every claim is demonstrated, not merely one whose proof evidence was acquired.
- Proof is bound to the exact rule revision, read through the proof entries rather than through the definition beside them.
- A gauntlet run carries no surfaces, graph, probes, interpreter, or files.
- A result carries one evaluation per planned check, positionally; a shorter population, a repeated gate, and an unbounded array are all refused.
- A passing result's required positions are pinned to the satisfied outcome; a merely existing evaluation cannot occupy one, and a satisfied one can.
- A result is exact over its specification as well as its snapshot, and the broad specification does not substitute for a named one.
- The arms of the result actually carry those mapped populations, checked against written-out tuples rather than against the mapping that produced them.
- No standing consequence lives on a gate definition or on a finding, by name as well as by structure.

The second-to-last law is there because the ones above it were not enough. They proved the mapping operators behave correctly in isolation, and — measured — widening the result's `evaluations` back to a plain array left every one of them green. An operator proved away from its consumer is the same defect as a value proved away from its carrier.

## Proof obligations

Runtime and repository claims a type cannot express:

- That a gate read exactly the facts it declared and no others.
- That a gate needing rich evidence under a lean run resolved to indeterminate rather than being skipped.
- That the evaluations a result carries were produced by running the checks its specification named, in that order.
- That a consumer-supplied gate travels the same evaluation path as a repository gate, with no privileged internal route.
- That the specification a result names is the one the caller supplied, rather than one the run assembled for itself.
- That an evaluation's recorded facts are the ones present in the audit product it names.

## Implementation boundary

Architecture only. No implementation exists or is authorized.
