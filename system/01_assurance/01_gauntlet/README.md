# Gauntlet: Evidence Evaluation and Earned Authority

Status: architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `system/01_assurance/01_gauntlet/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Read facts and produce findings, a verdict, and the authority a release is allowed to consume.

## Owns

- The gate definition: scope, the facts it reads, its proposition, its disposition, the failure classes it claims, and the evidence profile it requires.
- The gate evaluation, including the facts actually read.
- The evidence profile distinction.
- The gauntlet verdict and the gauntlet run.
- Consumer gate identity, so extension arrives through the same path rather than beside it.

## Does not own

- Any acquisition. No compiler lane, no filesystem, no source control appears here, and their absence from the run product is a law.
- Gate identity, scope, qualification, outcome, or authority as *types* — those are the assurance umbrella's, shared with `00_audit`.
- Command parsing, exit codes, or output rendering. Those are the CLI wire's, and the wire does not exist yet.

## Gauntlet acquires nothing

`GauntletRun` carries no `surfaces`, no `graph`, no `probes`, no `interpreter`, and no `files`, and a law checks all five by name.

That is what makes evaluation portable. A run consumes an audit product, which is addressed and shippable, so a decision can be read in an editor, a pre-commit path, or a deployment check without dragging a compiler installation into any of them.

## A gate with no inputs is the pure vacuous gate

`GateDefinition.reads` is non-empty because a gate that reads nothing decides nothing and cannot fail.

That is not a theoretical concern in this repository. It is the exact shape of every vacuous law found here so far — a `keyof` over an empty population, a union tested against one arm, an exactness check read off an alias. All of them passed. None of them could have failed. A gate whose input population is empty is that defect with the subject changed.

`GateDefinition.claims` is non-empty for the mirror reason. Qualification compares a claim to a witness; a gate that claims nothing can never be refuted, which makes it permanently unqualifiable rather than trivially trustworthy.

## The verdict has no middle

`GauntletVerdict` is `passed | blocked`. There is deliberately no `passed-with-warnings`.

That arm is how a blocking gate becomes a suggestion over time: the arm appears for one legitimate reason, then accumulates, and eventually the blocking population is empty and nobody decided that. Advisory findings ride inside `passed`, where they are visible and carry no authority. A blocking gate that refuted or could not resolve produces `blocked`, and `blocked` carries the evaluations that caused it, so a refusal names its causes rather than being a bare exit code.

## Lean and rich are declared, not inferred

`EvidenceProfile` distinguishes a run with a full audit behind it from one without.

A gate declares the profile it requires. Under a lean run, a gate needing rich evidence resolves to indeterminate — visible, and blocking if its disposition says so — instead of quietly not running. Quietly not running is how a checked repository becomes an unchecked one without anybody deciding to, and it is more or less what happened when the previous harness became slow enough that nobody ran the expensive banks.

## The one idea that survived

A gate cannot earn authority until evidence shows it detects the failure class it claims.

Everything else about the deleted mutation infrastructure was implementation: the runner, the fifteen banks, the five hundred and seventy-one scripts, the temporary-directory staging, the generated tsconfig. Implementations are quarry. This relation is architecture, it lives in the assurance umbrella as `GateQualification` and `DetectionWitness`, and this home is where a definition binds its claim to its evaluation.

## Laws

- A gate reads a non-empty fact population and claims a non-empty failure-class population; neither may widen to a plain array.
- The verdict is passed or blocked, with no middle arm, and blocked names the evaluations that blocked.
- A gate definition and its evaluation are exact over gate identity, and the broad form does not substitute.
- A gauntlet run carries no surfaces, graph, probes, interpreter, or files.

## Proof obligations

Runtime and repository claims a type cannot express:

- That a gate read exactly the facts it declared and no others.
- That a gate needing rich evidence under a lean run resolved to indeterminate rather than being skipped.
- That the blocking population of a run is derived from dispositions rather than curated.
- That a consumer-supplied gate travels the same evaluation path as a repository gate, with no privileged internal route.
- That an evaluation's recorded facts are the ones present in the audit product it names.

## Implementation boundary

Architecture only. No implementation exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: system/01_assurance/01_gauntlet
  title: "Gauntlet: Evidence Evaluation and Earned Authority"
  maturity: architecture-specified
  implementation: absent
  child_homes: []
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - gauntlet-evaluates-and-acquires-nothing
  - a-gate-with-no-inputs-is-the-vacuous-gate
  - a-gate-claims-a-failure-class-or-is-unqualifiable
  - the-verdict-has-no-passed-with-warnings-arm
  - lean-and-rich-are-declared-not-inferred
  - missing-evidence-is-indeterminate-never-skipped
  - consumer-gates-use-the-same-path
  production_authority: false
```
