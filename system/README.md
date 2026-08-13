# System: Unnumbered Control Plane

Status: wire-independent foundation authored — `00_workspace/`, `01_assurance/` with `00_audit/` and `01_gauntlet/`, and `02_release/`; `03_programs/` and `04_bootstrap/` deferred until `02_wires/` exists; implementation absent

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

`system/` was named in the layout from the beginning and authored last. In the gap, its responsibilities were built anyway — under a root `verification/` directory that grew to forty-six tracked entries with its own `package.json`, its own TypeScript installation, a runner, fifteen mutation banks, gates, gate self-tests, and twelve probes, plus a `scripts/` directory holding a pre-commit shim.

Both sat outside the governed roots, so every census the repository ran on itself ignored them. `AGENTS.md` had forbidden a `scripts/` directory in prose before either existed, and prose does not run. The repository spent five hundred and eighty laws ensuring every fact had exactly one owner while the machinery enforcing that rule had none.

Both were removed at `fix(layout): remove shadow control-plane roots`. Their capabilities are quarried from Git history as this layer is authored. The capability is the preservation unit; the folder never was.

Two consequences are worth stating because they shaped the types here rather than merely embarrassing the previous arrangement:

- The **TypeScript compiler configuration itself** had ended up inside `verification/`. It belonged to the repository root, which had claimed that authority in prose since the first commit and owned no bytes of it. It now lives at root, where the claim is true.
- The reason `verification/` hand-rolled lexical scanners over stripped source is that the pinned native compiler lane does not expose the programmatic API its authority checks needed. That gap is real and is recorded in the root toolchain policy with a retirement trigger. `00_audit` answers it by requiring an interpreter capability that names its lane, not by writing a second parser.

## Owns

- Workspace identity, observation, and the immutable repository snapshot.
- The assurance vocabulary, its acquisition child, and its evaluation child.
- Distributable and release meaning, including the authority a shipment must consume.

## Does not own

- Any product semantics. Meaning, admission, transactions, and projections are core's.
- Physical capability. Filesystem, source control, and compiler access are declared as holes here and supplied by `01_hosts/server`.
- Protocol or invocation translation. That is `02_wires/`, including the generic CLI wire through which system programs will be projected.
- The root package identity, the pinned compiler, the compiler options, the public export membrane, or the executable entrypoint file. Those are the repository root's, and the root claims them in `README.md` §3.
- A second model of the repository. Every home here points at something already owned upstream.

## The population is three, and three is not the end

`03_programs/` and `04_bootstrap/` are settled responsibilities with no folder yet.

- `03_programs/` will own the typed system-program contract and the program population: `build`, `verify`, `doctor`, `audit`, `gauntlet`, `benchmark`, `docs`, `migrate`, `package`, `release`, `ship`. Eleven definitions in one authority, not eleven subfolders. A program projects through a wire, so its contract cannot be written honestly before wire contracts exist.
- `04_bootstrap/` will own the semantic contract the root executable realizes: process capability requirements, registry composition, the invocation envelope, dispatch outcome, disposal, and the bootstrap receipt. It connects the generic CLI wire, so it has the same prerequisite. The physical entrypoint file stays at the root; this home owns only the contract that file satisfies.

`SystemTypeTopology` therefore names three homes. Naming five would produce the inventory nothing can verify — the same shape `01_hosts` refused for as long as only one host physically existed.

**Workspace discovery is not a twelfth program.** The root README once listed it first among the system programs. It is an authority that `00_workspace` owns and that `doctor`, `verify`, `build`, and `package` consume. Exposing it through a program or an editor wire later is ordinary; making it its own orchestration engine would have meant two places that answer "what repository is this".

## Assurance is where TypeScript stops

Everything that genuinely exceeds assignability lives in `01_assurance/`, and nowhere else.

The compiler cannot decide which directory declared a structurally identical type, whether an authority was imported from its canonical owner or copied inline, whether a target imported a sibling, whether a README roster matches the physical directories, or whether a gate would have noticed the defect it guards. Those questions are real. They are not type checking, and the mistake was never asking them — it was answering them from a second root.

## Laws

- System consumes product architecture; no product home imports system.
- Every system home observes an upstream authority rather than restating it.
- Physical access is an injected capability hole, never ambient.
- The system topology and its home-name union are one population, so a home added to one and not the other fails to compile.
- Assurance has exactly two children: `00_audit` acquires, `01_gauntlet` evaluates.
- A gate earns authority only through demonstrated detection.
- A release consumes authority; it never issues its own.

## Proof obligations

These are runtime or repository claims. A type cannot express them, and naming them here marks the boundary of what compiling proves:

- That no product source file imports from `system/`, in any transitive path.
- That the observed root census matches the roots the architecture declares, with every ungoverned root reported rather than skipped.
- That a workspace snapshot's digests were read from the revision it names, on a working tree whose state it recorded honestly.
- That a detection witness genuinely turned its gate red, rather than being asserted by the gate it qualifies.
- That published artifacts correspond to the candidate whose qualification authorized them.

The obligations are `system/01_assurance` claims about the repository, which means this layer's own correctness is the one thing it cannot be the sole judge of. That is not a defect to engineer around; it is why the receipts are addressed and the authority names its snapshot.

## Implementation boundary

Architecture only. No runtime implementation exists or is authorized anywhere in this layer, and none opens until the whole repository architecture closes and Eassa explicitly authorizes it.
