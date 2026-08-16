# Bootstrap: The Contract the Root Executable Satisfies

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `system/04_bootstrap/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Say what must be true before any program runs, that every program is reachable, and that a dispatch releases what it acquired however it ended.

## Owns

- The registry, total over the roster.
- The capability row an entry point binds.
- The invocation envelope.
- The dispatch outcome, and the bootstrap receipt.

## Does not own

- The entry point file. That stays at the repository root, which claims it; this home owns only the contract that file satisfies.
- Argv grammar, exit codes, or streams. `02_wires/cli` owns those, and a bootstrap that parsed its own command language would be a second wire wearing a smaller hat.
- The programs. `03_programs` declares them; this home only requires that all of them are present.
- Telemetry. A receipt carrying timings, logs, or an environment capture would be an explanation product, and `00_core/18_inspection` owns explanation.

## The registry is total over the roster

`ProgramRegistry` is a mapped type over `SystemProgramDefinitions`. Registering all but one does not compile. Registering an unrostered program does not compile either, because there is no key for it.

Each entry is the program's **contract**, not a placeholder exact only over its name. A broad `SystemProgram<Name>` entry would erase the input, output, failure, and requirements that dispatch must preserve.

Deriving from the definition map means the `release` entry *is* `ReleaseProgram`, whose input is a qualified candidate. The guarantee is the dispatch path rather than an exact signature sitting beside a broad registry entry. A law refuses the broad `SystemProgram<'release'>` form.

Existence alone is insufficient: one live program could be paired with another program's contract. The registry therefore checks every key-to-contract pairing independently.

## Disposal is unconditional, and names what was held

Every arm of `DispatchOutcome` carries a `DisposalReceipt`.

A dispatch that could not start still acquired the capabilities the entry point bound. An entry point that releases only on the success path is the defect that appears as a leaked handle three hours into a CI run, and it is invisible in every test that passes.

The receipt names the **capability row**, not the workspace. The workspace reference is what a run is about, while the capability handles are what bootstrap owns and must release. A workspace-shaped disposal receipt would say nothing about leaked filesystem or process handles.

`DispatchOutcome` has no `unregistered` arm. An envelope carries a roster-typed program reference, so an unresolvable name produces no envelope, dispatch, or receipt. The CLI wire owns that boundary refusal and its `usage` exit.

## Bootstrap parses nothing, and carries what parsing produced

`InvocationEnvelope` carries a workspace, a program reference, the decoded input, and a caller. No argv, no flags, no command string.

Bootstrap cannot invoke an operation without its input. Parsing belongs to the wire, while the decoded product travels in the envelope at the selected program's exact input type.

The program is named by reference rather than by string, so an envelope for a program the roster does not contain cannot be constructed. A `program: string` would make every envelope substitutable and defer identity checking to runtime.

The outcome carries the CLI wire's `CliDisposition` whole at the selected program's computed operation identity. A free operation parameter beside the envelope name would allow a `release` envelope to carry a disposition for `ship`.

The caller rides along and confers nothing — which is the point of carrying it somewhere it can be seen doing nothing.

## Laws

- The registry's key set is the name union; each entry is the program of its own name; neither another program nor the broad form substitutes.
- Every dispatch arm releases the capability row it acquired, checked by name on both arms and refusing the workspace as the subject, with the arm count pinned so a third cannot arrive without one.
- The envelope carries no argv, flags, or command and does carry a decoded input; the outcome carries no exit, and the disposition is the wire's, whole, at the program's own operation identity.
- An envelope is exact over the program it names.
- A receipt reports on the program its envelope names, refusing the same disposition read against another program's identity.

## Proof obligations

Runtime claims a type cannot express:

- That disposal actually ran. The receipt says a release happened; only the host can say the handle closed.
- That the capabilities bound at the edge are the ones each program's requirements name. The binding calculus checks the shape; whether the supplied filesystem is a filesystem is a host fact.
- That no program is reachable by a path that skips this contract — that the entry point is the only entry point.

## Implementation

None. The physical entry point does not exist yet, and when it does it will be one file at the repository root satisfying this contract.
