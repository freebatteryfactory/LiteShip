# Audit: Evidence Acquisition

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

A hand-rolled source-text parser cannot establish type identity or module semantics. Requiring `TypeProgramInterpreter` as a hole means any implementation that reads source names the compiler lane it used, and the resulting attestation carries that lane's fingerprint.

`ImportResolver` exists for the same reason at a smaller scale: what a specifier actually names is a resolution question, and text matching cannot answer it.

## Laws

- An acquired fact names at least one consumer, as a non-empty population that cannot become a plain array.
- The audit product's surfaces, attestations, and graph are structurally the upstream owners' types.
- The audit product carries no verdict, findings, authority, outcome, or pass flag.
- Every relative import edge resolves, and none crosses a band downstream, a peer boundary, a sibling boundary, or closes a cycle. Enforced by `import-boundary.ts` in the root `check`, not by a type.
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

`import-boundary.ts` and `zero-runtime.ts` live here because acquiring repository facts is what this home is for.

The compiler cannot decide this and no configuration makes it able to. Direction, peerage, sibling exclusion, and acyclicity are claims about *where* a declaration lives, not about what it means. TypeScript may resolve every specifier while a forbidden architectural cycle remains.

Project references enforce direction at *project* granularity, so they cannot see a forbidden edge inside one project. Matching this audit with references would require splitting every independently governed home into its own compiler project, duplicating repository topology in compiler configuration.

### The bands are derived, never listed

A top-level directory's ordinal prefix *is* its band. `02_targets` and `02_wires` are both band 2, therefore peers, and the root README says so in as many words.

A hand-written rank table would create a second dependency graph and could invent an order the architecture denies. Deriving the band from the path makes peerage expressible and keeps the audit subordinate to the physical topology.

### Numbered children waterfall; unnumbered children are peers

A layer's children come in two kinds and one rule cannot cover both. Numbered children (`00_error` through `18_inspection`, `00_workspace` through `02_release`) are a waterfall: higher may import lower, never the reverse. Unnumbered children (`astro`, `vite`, `cloudflare`; `web`, `worker`, `edge`, `server`) are peers with no order between them, so no import between them is lawful in either direction. Two numbered segments at the same band are peers too, which is what `02_targets` and `02_wires` are.

So the check walks both paths until they diverge and classifies at the first differing segment. When one path is an ancestor of the other, it says nothing — direction is not the question for an umbrella reaching into its own child. Whether anything comes back is, and `CYCLE` answers it.

### Cycles needed no taxonomy

A shared-vocabulary umbrella importing a child it supplies is a cycle. A topology file importing children that never import it back is not. A compile-only fixture importing several children is not, because nothing imports the fixture.

Three cases use one rule with no roles or exception list. There are no waivers, severities, or baseline of accepted findings. If a reported edge is lawful, the classification rule is wrong and must be corrected.

### Import syntax comes from the compiler

A regular expression over `from '...'` would miss side-effect imports, dynamic imports, double-quoted specifiers, `import = require`, and other lawful module forms. It would also confuse source text with syntax.

The audit uses the compiler's lexer through `createScanner` from `typescript/unstable/ast`. A specifier is a string literal in module position: after `from`, directly after `import`, or as the first argument of `import(` or `require(`. Comments and template literals are tokens the scanner already classifies. The retirement trigger is a stable compiler API, not another parser.

### The graders are graded

No hand-written repository algorithm may decide that the tree passes without permanent evidence that it rejects the intended defect *and* accepts a lawful neighbour.

`audit.test.ts` holds that evidence. The algorithms are exported as pure functions with the commands as thin wrappers behind `import.meta.main`, so importing one does not emit a project or walk a filesystem. The end-to-end cases build a small tree in a temporary directory and run the real command against it, so the exit code is part of what is checked.

No manifest, registry, mutation bank, score, or waiver table. The standard runner executes the lawful and refusing cases directly.

The self-tests cover downstream, peer, sibling, cycle, and unresolved refusals; lawful waterfall, system-upstream, compile-only, and umbrella-child edges; and every admitted import form against comments, template literals, member calls, and bare strings.

## Lint covers repository executables

`.oxlintrc.json` at the root is a linter configuration and never a formatter. No audit script carries `--fix`; repository checks report defects and do not rewrite their subject.

The specification is declaration-only. The executable repository-control TypeScript in this home can carry the defects a linter exists for — unreachable code, loose equality, floating promises, shadowed bindings — and checks everything else, which is exactly why it is worth linting: a broken checker reports confidently and wrongly.

The configuration enables `correctness` plus individually qualified rules that detect repository defects without requiring waivers. Preference-only rules such as file-length limits remain disabled. `ban-types` remains disabled because the root calculus lawfully uses `{}` in conditional and normalization idioms; empty algebra arms use `Record<never, never>` by convention, not by a source-text checker.

## Implementation boundary

Each audit executable must derive its answer from the repository bytes it observes and demonstrate both an admitted and a rejecting case.

Repository-control implementations do: `zero-runtime.ts`, which emits the project and rejects any file that is not `export {};`; `import-boundary.ts`; and `declarations.ts`. They sit in a separate TypeScript compiler population from the specification they audit, and all run in the root `check`. Each answers a question the compiler provably cannot, and none issues authority or carries a waiver.

They are typechecked by `tsconfig.system.json` under the same strict posture the specification uses. Node 24.12 or newer erases the TypeScript syntax when executing them, while `tsc` remains the authority that checks it. Typing them for the first time turned up two real unchecked-index sites in the cycle walker and the band comparison, both now guarded rather than asserted away.

## The declaration lane

`declarations.ts` emits from `tsconfig.spec.json` — the specification alone, laws excluded by population — and inspects the result. Non-empty output, no compile-only module in the surface, no exported `Assert` alias whatever file it came from, no declaration importing a `.laws.js` or `.type-test.js` module, two independent emits byte-identical, and the emitted tree typechecking on its own as a consumer receives it.

It does not trust the file naming, for the same reason `zero-runtime.ts` does not trust `erasableSyntaxOnly`: a convention and a flag are both claims, and a claim is not evidence.

It found a real defect on its first run. The root calculus is authored as `types.d.ts`, so it is an *input* declaration and the compiler never re-emits it — every emitted file imported from a `../types.js` that was not in the output, and the surface a consumer would have received resolved nothing. The lane now copies it in, which is what packaging does, and the consumer check reads the whole surface rather than a subset of it.

Canaried: a law planted in a semantic `types.ts` is reported and exits nonzero.
