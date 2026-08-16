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

## Why repository observation stays downstream

Repository-control machinery is governed by the same topology it inspects. Compiler configuration belongs to the root, and audits belong under `system/01_assurance`; an ungoverned tooling root would be invisible to its own census.

TypeScript exposes unstable programmatic checker APIs but no stable programmatic API contract. `00_audit` therefore requires an interpreter capability that names the exact lane it read with, so every attestation carries that lane's fingerprint. It does not substitute a source-text parser for the compiler.

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

## Children

A program projects through a wire, so program and bootstrap contracts depend on the wire contracts they consume.

- `03_programs/` owns the program population and the contract each one satisfies: `doctor`, `audit`, `gauntlet`, `verify`, `build`, `migrate`, `package`, `release`, and `ship`. Benchmark and docs generation are absent until exact output contracts and consumers exist. Definitions live in one authority, not one subfolder per verb, and identity is computed from the map rather than declared per program.

  A concrete `release` program must supply an **exact** `AssuranceRunSpec`, never the broad default. The broad form is an erased catalog shape that deliberately accepts results from several exact specifications, which is right for a catalog and wrong for a shipment. Nothing in the type prevents a program from defaulting; the program must not.
- `04_bootstrap/` owns the semantic contract the root executable realizes: process capability requirements, registry composition, the invocation envelope, dispatch outcome, disposal, and the bootstrap receipt. It carries the CLI wire's disposition whole rather than summarizing it, so the arm a shell sees stays the wire's decision. The physical entrypoint file stays at the root; this home owns only the contract that file satisfies.

`SystemTypeTopology` names each child by the type surface that child exports. A name in that tuple is a compiler-checked relationship, not a second directory inventory.

**Workspace discovery is not a program.** It is an authority that `00_workspace` owns and that `doctor`, `verify`, `build`, and `package` consume. A second orchestration engine for discovery would create two owners for the question "what repository is this".

## Assurance is where TypeScript stops

Everything that genuinely exceeds assignability lives in `01_assurance/`, and nowhere else.

The compiler cannot decide which directory declared a structurally identical type, whether an authority was imported from its canonical owner or copied inline, whether a target imported a sibling, whether a README roster matches the physical directories, or whether a gate would have noticed the defect it guards. Those repository questions belong to assurance rather than a second type model.

## Topology law

`SystemHomeName` and lookups derive from `SystemTypeTopology`, so no parity law restates that derivation. The independent risk is a row paired with another child's surface. `EachEntryNamesItsOwnHomesSurface` compares every row against an independently written expectation and pins the admitted child population.

The local facts are:

- Each topology entry carries the type surface its home exports, so a roster entry cannot outlive or impersonate the home it names.
- The name union, the lookup, and the ergonomic surface all derive from that one tuple.

What the child homes assert about themselves is in their own READMEs, which is where a law belongs: next to the declaration it constrains.

## Proof obligations

These are runtime or repository claims. A type cannot express them, and naming them here marks the boundary of what compiling proves:

- That no product source file imports from `system/`, in any transitive path.
- That the observed root census matches the roots the architecture declares, with every ungoverned root reported rather than skipped.
- That a workspace snapshot's digests were read from the revision it names, on a working tree whose state it recorded honestly.
- That a detection witness genuinely turned its check red, rather than being asserted by the check it demonstrates — and that its refusal came from the relationship the attribution witness names, rather than from syntax, an unresolved import, a module-format mismatch, or an unrelated rule firing.
- That published artifacts correspond to the candidate whose passing result qualified them.
- That no product home imports `system/`; the import-boundary audit enforces this over resolved source edges and proves lawful and rejecting neighbours.

The obligations are `system/01_assurance` claims about the repository, which means this layer's own correctness is the one thing it cannot be the sole judge of. That is not a defect to engineer around; it is why the receipts are addressed and the authority names its snapshot.

## Implementation

Repository programs compose the declared authorities; they do not create a second product model.

Repository-control executables live in `01_assurance/00_audit/`. Each must own a repository fact that TypeScript cannot express, remain typechecked, and prove both lawful and rejecting cases.

Program and bootstrap realizations must consume the declared wire and operation contracts rather than restating them.
