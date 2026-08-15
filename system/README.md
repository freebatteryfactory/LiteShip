# System: Unnumbered Control Plane

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `system/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Operate on the repository and the product architecture without becoming part of application runtime composition.

Core answers what a program means. Hosts answer how unresolved physical behaviour exists. Targets attach that to an ecosystem. System answers a different kind of question entirely: what is this repository, is it what it claims to be, and is this build fit to ship.

## Why this home is unnumbered

The numbers express a dependency band in the product waterfall. System is not a band — it is orthogonal to all of them. It may consume root, core, hosts, targets, and wires because it is downstream and observational. No product home may depend on it, in any direction, ever.

That rule is the whole reason the layer exists as a layer rather than as tooling. Tooling that inspects a repository tends to grow its own model of that repository, and a model nobody compares to the original diverges silently. Everything here observes something that already has an owner.

## What this home cost before it existed

`system/` was named in the layout from the beginning and authored last. In the gap, its responsibilities were built anyway — under a root `verification/` directory with its own `package.json`, its own TypeScript installation, a runner, mutation banks, gates, gate self-tests, and probes, plus a `scripts/` directory holding a pre-commit shim.

Both sat outside the governed roots, so every census the repository ran on itself ignored them. `AGENTS.md` had forbidden a `scripts/` directory in prose before either existed, and prose does not run. The repository spent five hundred and eighty laws ensuring every fact had exactly one owner while the machinery enforcing that rule had none.

Both were removed at `fix(layout): remove shadow control-plane roots`. Their capabilities are quarried from Git history as this layer is authored. The capability is the preservation unit; the folder never was.

Two consequences are worth stating because they shaped the types here rather than merely embarrassing the previous arrangement:

- The **TypeScript compiler configuration itself** had ended up inside `verification/`. It belonged to the repository root, which had claimed that authority in prose since the first commit and owned no bytes of it. It now lives at root, where the claim is true.
- The reason `verification/` hand-rolled lexical scanners over stripped source is a compiler-API gap, and the gap must be stated precisely because the looser version of it is false. TypeScript 7.0.2 ships `typescript/unstable/*`, including a `Checker`; what it does not ship is a *stable* programmatic API contract, and `unstable` is the vendor's own word. The retirement trigger is stability, not existence. `00_audit` answers the gap by requiring an interpreter capability that names the lane it read with, so an attestation carries that lane's fingerprint — not by writing a second parser with none of a parser's guarantees.

## Owns

- Workspace identity, observation, and the immutable repository snapshot.
- The assurance vocabulary, its acquisition child, and its evaluation child.
- Distributable and release meaning, including the passing assurance result a shipment must consume.
- The program population, and the contract each program satisfies.
- The bootstrap contract the root executable realizes.

## Does not own

- Any product semantics. Meaning, admission, transactions, and projections are core's.
- Physical capability. Filesystem, source control, and compiler access are declared as holes here and supplied by `01_hosts/server`.
- Protocol or invocation translation. That is `02_wires/`, including the generic CLI wire through which system programs will be projected.
- The root package identity, the pinned compiler, the compiler options, the public export membrane, or the executable entrypoint file. Those are the repository root's, and the root claims them in `README.md` §3.
- A second model of the repository. Every home here points at something already owned upstream.

## The population is five

`03_programs/` and `04_bootstrap/` were named in the layout for a long time, and both now exist. What they were waiting on was never a schedule: a program projects through a wire, so its contract could not be written honestly before a wire contract existed. `02_wires/cli` landed and the dependency cleared.

That distinction is the whole reason they were named and empty rather than built early. The previous arrangement built its equivalent anyway, under a `verification/` directory, before anything it needed existed.

- `03_programs/` owns the program population and the contract each one satisfies. Nine are earned and rostered: `doctor`, `audit`, `gauntlet`, `verify`, `build`, `migrate`, `package`, `release`, and `ship`. `benchmark` and `docs` remain intended names without invented output contracts. Definitions live in one authority, not one subfolder per verb, and identity is computed from the map rather than declared per program.

  A concrete `release` program must supply an **exact** `AssuranceRunSpec`, never the broad default. The broad form is an erased catalog shape that deliberately accepts results from several exact specifications, which is right for a catalog and wrong for a shipment. Nothing in the type prevents a program from defaulting; the program must not.
- `04_bootstrap/` owns the semantic contract the root executable realizes: process capability requirements, registry composition, the invocation envelope, dispatch outcome, disposal, and the bootstrap receipt. It carries the CLI wire's disposition whole rather than summarizing it, so the arm a shell sees stays the wire's decision. The physical entrypoint file stays at the root; this home owns only the contract that file satisfies.

`SystemTypeTopology` names five homes because five exist. It named three when three existed, and the rule was never a count: a name in that tuple is a promise the compiler checks, and a name for an unwritten home is a promise nothing can keep. That is the same shape `01_hosts` refused for as long as only one host physically existed.

**Workspace discovery is not a twelfth program.** The root README once listed it first among the system programs. It is an authority that `00_workspace` owns and that `doctor`, `verify`, `build`, and `package` consume. Exposing it through a program or an editor wire later is ordinary; making it its own orchestration engine would have meant two places that answer "what repository is this".

## Assurance is where TypeScript stops

Everything that genuinely exceeds assignability lives in `01_assurance/`, and nowhere else.

The compiler cannot decide which directory declared a structurally identical type, whether an authority was imported from its canonical owner or copied inline, whether a target imported a sibling, whether a README roster matches the physical directories, or whether a gate would have noticed the defect it guards. Those questions are real. They are not type checking, and the mistake was never asking them — it was answering them from a second root.

## This file asserted nothing, and a canary said that was wrong

`system/types.ts` now contains exactly one `Assert`, and the paragraph below explaining why zero was correct was itself an untested claim sitting in a document full of tested ones.

It was half right. The name union *is* derived from the tuple, so `SystemHomeName` cannot disagree with it and a parity law would check a derivation against itself. That part stands, and five such laws were deleted for it.

What it missed is that the derivation was never the exposed part. An entry can carry the wrong surface. Wiring `03_programs` to `BootstrapTypeSurface` compiled, and the only thing that noticed was `noUnusedLocals` complaining about an import nobody read — found by canarying the two new homes, and the identical gap the wire topology had one commit earlier, found the identical way.

A mis-wired entry is the likelier defect by far. A home is deleted deliberately and loudly; an entry is copy-pasted and edited in one of its two positions, quietly, while adding the next one.

So `EachEntryNamesItsOwnHomesSurface` compares each entry against a right-hand side written independently of the topology, and pins the population so a home added here and nowhere else fails rather than passing unexamined. That is not decoration to satisfy a heading, which is what the paragraph below was written to refuse — it is a gap a canary found in the claim itself.

The original reasoning, kept because the half that was right is still the reason there is one law here and not six:

This heading used to read **Laws** and list seven of them. Not one was in the file. Two were proof obligations wearing the wrong hat, two described types in child homes that assert them locally, two have since been deleted along with the vocabulary they were about, and one was a parity law that no longer has anything to compare.

That last one is the interesting case, because it is the reason this file has nothing to assert. `SystemHomeName` is `SystemTypeTopology[number]['name']` — the name union is *derived from* the tuple rather than written beside it. A law checking that the two agree would be checking a derivation against itself. Five such laws were deleted when the topology was derived, and a parity law is a confession that a fact was written twice.

A topology file whose whole job is to derive one population from one tuple has nothing left to be wrong about locally. Adding assertions to satisfy a heading would be decoration, and decoration that compiles is the most expensive kind.

The local facts, such as they are:

- The topology names five homes. Each entry carries the type surface its home exports, so a roster entry cannot outlive the home it names.
- The name union, the lookup, and the ergonomic surface all derive from that one tuple.

What the child homes assert about themselves is in their own READMEs, which is where a law belongs: next to the declaration it constrains.

## Proof obligations

These are runtime or repository claims. A type cannot express them, and naming them here marks the boundary of what compiling proves:

- That no product source file imports from `system/`, in any transitive path.
- That the observed root census matches the roots the architecture declares, with every ungoverned root reported rather than skipped.
- That a workspace snapshot's digests were read from the revision it names, on a working tree whose state it recorded honestly.
- That a detection witness genuinely turned its check red, rather than being asserted by the check it demonstrates — and that its refusal came from the relationship the attribution witness names, rather than from syntax, an unresolved import, a module-format mismatch, or an unrelated rule firing.
- That published artifacts correspond to the candidate whose passing result qualified them.
- That no product home imports `system/`, which the first obligation states and no compiler configuration currently enforces. The import-boundary mechanism is being settled by canary rather than assumed.

The obligations are `system/01_assurance` claims about the repository, which means this layer's own correctness is the one thing it cannot be the sole judge of. That is not a defect to engineer around; it is why the receipts are addressed and the authority names its snapshot.

## Implementation

No product runtime implementation exists in this layer.

The repository-control implementations do: they live in `01_assurance/00_audit/`, and they are the only executable bytes in the repository. That number staying small is a thing to watch, not a rule to enforce — the previous arrangement grew one reasonable file at a time.

Everything else remains type architecture: program and bootstrap contracts now consume the completed wire declarations, and no product runtime body exists here.
