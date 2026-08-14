# Bootstrap: The Contract the Root Executable Satisfies

Status: architecture specified; implementation absent

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

Each entry is the program's **contract**, not a placeholder wearing its name. It used to be `SystemProgram<Name>` — exact over the name and broad over everything that matters — so the `release` entry a bootstrap actually held accepted `unknown`, while an exact `ReleaseSignature` sat one home away describing the real contract. Both declarations were correct and they were about different things.

Deriving from the definition map means the `release` entry *is* `ReleaseProgram`, whose input is a qualified candidate. The guarantee stopped being adjacent to the dispatch path and became the dispatch path. A law pins that the broad `SystemProgram<'release'>` is no longer the same type as the registry entry, which is the line that used to read `true`.

That last refinement exists because of a specific near-miss. The wire topology named its children by surface, which meant a deleted child broke the import, and it looked sufficient. It was not: pointing `http` at `DirectWireTypeSurface` compiled, and only an unused-import warning noticed. A mis-wired entry is the likelier defect of the two — a child gets deleted deliberately and loudly, while an entry gets copy-pasted and edited in one of its two positions. It is checked here before anyone has had the chance to make it.

## Disposal is unconditional, and names what was held

Every arm of `DispatchOutcome` carries a `DisposalReceipt`.

A dispatch that could not start still acquired the capabilities the entry point bound. An entry point that releases only on the success path is the defect that appears as a leaked handle three hours into a CI run, and it is invisible in every test that passes.

The receipt names the **capability row**, not the workspace. It named the workspace first, and that was a general receipt shape being available rather than workspace disposal meaning anything: the workspace reference is what a run is *about*, and the handles are what a bootstrap actually holds. A receipt claiming the workspace was released is silent about the filesystem and process handles, which are the ones that leak.

Two arms, not three. `unregistered` sat here on the reasoning that a runtime lookup can be handed a name that failed to resolve. It cannot get this far — an envelope carries a roster-typed program reference, so an unresolvable name produces no envelope, and with no envelope there is no dispatch and no receipt. That refusal is the CLI wire's `rejected` arm with a `usage` exit. Keeping an arm for it here was the boundary refusal leaking one layer downstream and being answered twice.

## Bootstrap parses nothing, and carries what parsing produced

`InvocationEnvelope` carries a workspace, a program reference, the decoded input, and a caller. No argv, no flags, no command string.

The input was missing, and that was not restraint. A bootstrap cannot invoke an operation without the operation's input, so an envelope carrying only a reference described something no dispatch could perform. Parsing belongs to the wire; its *product* has to arrive somewhere. The input is typed as the selected program's input, so an envelope for `release` cannot carry what `audit` accepts.

The program is named by reference rather than by string, so an envelope for a program the roster does not contain cannot be constructed at all. A `program: string` would have made every envelope substitutable and moved the check to runtime, which is where the previous arrangement kept it.

The outcome carries the CLI wire's `CliDisposition` whole rather than a summary of it, at the selected program's own operation identity. That identity used to be a free parameter beside the envelope's name with nothing relating them, so a receipt could pair an envelope for `release` with a disposition reporting on `ship` — both halves individually exact, about two different things, which is what made it invisible. A program's operation identity is computed from its name, so the relation was always available and simply not taken.

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
