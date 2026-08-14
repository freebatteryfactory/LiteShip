# Audit: Evidence Acquisition

Status: architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `system/01_assurance/00_audit/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Read the repository and produce facts. Open the type program, walk the source homes, resolve imports, canonicalize the public surface, and hand the result to `01_gauntlet`.

## Owns

- Probe identity and reference.
- The acquired fact: what was observed about which subject, by which probe.
- The structural twin observation: two declarations that are structurally identical and differently sourced.
- Probe coverage.
- The type-program interpreter and import-resolver capability holes, and the exact audit prerequisite row.
- The audit product.

## Does not own

- `TypeAbiSurface` or `TypeAbiAttestation`. Root `types.d.ts` owns both; audit produces instances.
- `AuthorityGraph`, `AuthorityRecord`, or `CanonicalImport`. `00_core/18_inspection` owns them; audit produces instances.
- Any gate, finding, or conclusion. Those belong to `01_gauntlet` and the assurance umbrella, and their absence from the audit product is a law.
- A roster of which checks will read a fact. See below.
- A compiler. The interpreter is an injected capability naming its root-assigned lane.

## Audit decides nothing

The boundary is worth stating flatly because it is the one that erodes, and it erodes one convenience member at a time, each individually reasonable.

`AuditProduct` carries no `verdict`, no `findings`, no `authority`, no `outcome`, and no `passed`. A law checks all five by name. The moment acquisition can conclude, the split has collapsed and the heaviest dependency in the repository follows every decision everywhere it goes.

## Producing other people's vocabulary

Every member of the audit product is a type owned upstream, assembled here. That is the whole shape of this home.

It also makes the home's own most likely defect its subject matter. A local interface with the same members as `AuthorityGraph` would satisfy any name check and be exactly the twin this home exists to find — committed by the detector. The laws therefore compare structurally against the owners rather than by name.

## Every fact has a consumer

`AcquiredFact.consumers` was required and non-empty, and it is deleted.

The failure mode it aimed at is real: acquisition drifts into a growing pile of interesting measurements nobody reads, which looks like thoroughness, costs like a subsystem, and is how thirteen probes and fifteen mutation banks came to exist beside a set of laws that were never wired to most of them.

But the member did not prevent it. A tuple of gate references inside an evidence product is a reverse index with no relation to what it names — free to list checks outside the run, free to omit checks inside it, answerable to nothing, and read by nobody but its own law. Opposite it sat `GateDefinition.reads`, the same relationship written from the other direction and traversed from neither.

Both are gone. The one declaration of what a check reasons about is its proposition. Whether every acquired fact has a reader is now a proof obligation, which is where a claim that only a traversal can establish belongs.

## A probe that could not run stays visible

`AcquiredFact.value` is `Evidence`, not a bare value, so a probe that ran and found nothing, a probe that could not run, and a probe that failed remain three distinct states all the way to the consumer. `ProbeCoverage` carries the same distinction at the run level, and has no `skipped` arm.

## The interpreter must name its lane

The root toolchain policy assigns roles, and `semantic-abi` and `analysis-api` may sit on a different lane than `primary-check` for as long as the native compiler exposes no *stable* programmatic API — 7.0.2 ships `typescript/unstable/*`, including a `Checker`, and unstable is the vendor's own word. That is a stated root policy with an explicit retirement trigger.

What must not happen again is the previous response to that gap. Lacking the API, the deleted harness hand-rolled lexical scanners over comment-stripped source — a second parser with none of a parser's guarantees, checking claims about type identity by matching text. Requiring `TypeProgramInterpreter` as a hole means an implementation that wants to read source has to name the lane it read with, and the attestation it produces carries that lane's fingerprint.

`ImportResolver` exists for the same reason at a smaller scale: what a specifier actually names is a resolution question, and text matching cannot answer it.

## Laws

- An acquired fact names at least one consumer, as a non-empty population that cannot become a plain array.
- The audit product's surfaces, attestations, and graph are structurally the upstream owners' types.
- The audit product carries no verdict, findings, authority, outcome, or pass flag.
- Every relative import edge resolves, and none crosses a band downstream, a peer boundary, a sibling boundary, or closes a cycle. Enforced by `import-boundary.mjs` in the root `check`, not by a type.
- An acquired fact carries no roster of the checks that will read it, under that name or an obvious substitute.
- Probe coverage distinguishes complete from partial, has no skipped arm, and fact values remain `Evidence`.

## Proof obligations

Runtime and repository claims a type cannot express:

- That the canonicalized surface reflects the source at the snapshot's revision.
- That the interpreter lane named in an attestation is the lane that actually produced the surface.
- That a public form the canonicalizer could not interpret appears in coverage rather than being dropped from the population.
- That a structural twin observation compared genuine declaration sites, not two aliases of one declaration.
- That import resolution followed the module graph rather than matching specifier text.

## The import boundary is implemented, and here is why it is a script

`import-boundary.mjs` is the second executable byte in this repository, beside `zero-runtime.mjs`, and both live here because acquiring repository facts is what this home is for.

The compiler cannot decide this and no configuration makes it able to. Direction, peerage, sibling exclusion, and acyclicity are claims about *where* a declaration lives, not about what it means — and TypeScript resolved every specifier correctly, reported nothing, and carried a cycle in `02_wires/` for the entire life of that layer. One program, type-only imports, green build.

Project references would catch some of it, and the cost was measured rather than assumed. References enforce direction at *project* granularity, so a violation inside one project is invisible: catching `astro -> vite` needs astro and vite to be separate projects, and catching an umbrella/child cycle needs those separate too. Reaching what one script does would take roughly one tsconfig per home. Fourteen configurations before a measured need is the reflex that gave the predecessor twenty-three packages; sixty is not an improvement on it.

### The bands are derived, never listed

A top-level directory's ordinal prefix *is* its band. `02_targets` and `02_wires` are both band 2, therefore peers, and the root README says so in as many words.

A scratchpad draft of this audit carried a hand-written rank table that gave them 3 and 4. It had invented an order the architecture denies, so `02_wires -> 02_targets` passed as a lawful downstream import — a second model of the repository living inside the tool whose job is noticing second models of the repository. Deriving the band did more than tidy it: with the two roots at different ranks, *peer* was not a relationship the audit could express at all.

### Numbered children waterfall; unnumbered children are peers

The first working draft reported a hundred and four violations, of which ninety-eight were `00_core/01_encoding -> 00_core/00_error` and its kin — the ordinary numbered waterfall, and the most common lawful edge in the repository.

A layer's children come in two kinds and one rule cannot cover both. Numbered children (`00_error` through `18_inspection`, `00_workspace` through `02_release`) are a waterfall: higher may import lower, never the reverse. Unnumbered children (`astro`, `vite`, `cloudflare`; `web`, `worker`, `edge`, `server`) are peers with no order between them, so no import between them is lawful in either direction. Two numbered segments at the same band are peers too, which is what `02_targets` and `02_wires` are.

So the check walks both paths until they diverge and classifies at the first differing segment. When one path is an ancestor of the other, it says nothing — direction is not the question for an umbrella reaching into its own child. Whether anything comes back is, and `CYCLE` answers it.

### Cycles needed no taxonomy

A shared-vocabulary umbrella importing a child it supplies is a cycle. A topology file importing children that never import it back is not. A compile-only fixture importing several children is not, because nothing imports the fixture.

Three cases, one rule, no roles and no exception list — which matters, because an exception list is how the previous control plane justified itself. There are no waivers, no severities, and no baseline of known-acceptable findings. A violation is a violation and the exit code says so. If one is wrong, the rule is wrong and the rule gets fixed.

### Measured

Every class refused: downstream, peer, sibling, cycle, unresolved. Every real edge in the tree admitted, including the six shapes most likely to be false positives — the numbered waterfall in core and in system, system reaching upstream into core, both compile-only files importing children, and an umbrella reaching into its own child.

## Lint covers the executables, and nothing else needs it

`.oxlintrc.json` at the root is a linter configuration and never a formatter. A formatter that escapes slashes differently across Windows and macOS has already cost this project a codebase, and no script here carries `--fix`.

The repository is declaration-only except for the two `.mjs` files in this home, so the entire class of defect a linter exists for — unreachable code, loose equality, floating promises, shadowed bindings — can only occur in them. They are the files that check everything else, which is exactly why they are worth linting: a broken checker reports confidently and wrongly.

Measured before enabling, against eight planted defects:

- The default `correctness` set produces **zero** findings on this tree and catches three of eight.
- Adding `suspicious` and `pedantic` catches all eight and produces **ninety-four** findings on code written deliberately — fifty-six of them `ban-types` firing on the `& {}` in root's `Simplify`, which is the standard idiom and load-bearing, and twenty-nine `max-lines`, which is a preference about file length rather than a defect.

So: `correctness` in full, plus the seven specific rules that each found something real — `eqeqeq`, `no-self-compare`, `no-array-constructor`, `require-unicode-regexp`, `prefer-at`, `prefer-string-replace-all`, `prefer-import-meta-properties`. That configuration catches six of the eight planted defects with zero findings on the tree. The two it misses, an unreachable branch and an async callback passed to `forEach`, need rules that bring noise, and six with no false positives is worth more than eight with ninety-four.

### The ninety-four were triaged badly the first time

The first pass dismissed them from a summary of rule names, on the strength of one inspected instance: `ban-types` firing on the `& {}` in root's `Simplify`, which is the standard idiom and load-bearing. Fifty-six findings, one look, one conclusion.

Reading all of them says something else. Exactly **one** was `Simplify`. **Forty-eight** were algebra arms written `none: {}`, `terminated: {}`, `withdrawn: {}` — against forty-three already written `Record<never, never>`. A near-even split between two spellings of one concept, drifting, in a repository whose whole thesis is that a fact has one owner and one spelling.

The two are the same type: `Record<never, never>` *is* `{}` after instantiation, which is why every law kept passing through the conversion. So it was never a bug. It was the defect class this repository exists to remove, sitting in ninety-one places, invisible to the compiler because both spellings mean the same thing — and dismissed on inspection of one of them.

All forty-eight normalized. Eight legitimate `{}` uses remain, and `ban-types` is therefore **not** enabled: `Simplify`'s intersection, the `{} extends Pick<Value, Key>` optionality idiom in three places, two empty type-parameter defaults, an accumulator seed, and one conditional tail. A rule that cannot run clean would need a waiver, and there is no waiver mechanism here and will not be one.

Nothing prevents the drift recurring. That is stated rather than solved, because the alternatives are a regex over source text and an exception list, and this repository has already deleted one of each.

Of the rest: twenty-nine `max-lines` are a three-hundred-line cap on declaration files carrying heavy documentation, which is a preference and not a defect. Two `no-useless-undefined` want an explicit `return undefined` removed from a function whose absence value is load-bearing, where explicit reads better. Four `require-unicode-regexp`, one `prefer-at`, one `prefer-string-replace-all`, and one `prefer-import-meta-properties` were real, all in this home's two executables, all fixed rather than waived.

## Implementation boundary

No product runtime implementation exists here.

Two repository-control implementations do: `zero-runtime.mjs`, which emits the project and rejects any file that is not `export {};`, and `import-boundary.mjs`. Both are `.mjs` so they sit outside the population they audit, and both run in the root `check`. That the number is two rather than one is worth watching — the previous arrangement grew one reasonable file at a time — but each answers a question the compiler provably cannot, and neither issues authority or carries a waiver.
