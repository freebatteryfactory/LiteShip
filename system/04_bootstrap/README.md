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

`ProgramRegistry` is a mapped type over `SystemProgramRoster`. Registering ten of eleven does not compile. Registering a twelfth does not compile either, because there is no key for it.

Each entry is exact over its own name — `SystemProgram<'release'>`, not `SystemProgram` — so a registry that maps `release` to the `docs` program is refused.

That last refinement exists because of a specific near-miss. The wire topology named its children by surface, which meant a deleted child broke the import, and it looked sufficient. It was not: pointing `http` at `DirectWireTypeSurface` compiled, and only an unused-import warning noticed. A mis-wired entry is the likelier defect of the two — a child gets deleted deliberately and loudly, while an entry gets copy-pasted and edited in one of its two positions. It is checked here before anyone has had the chance to make it.

## Disposal is unconditional

Every arm of `DispatchOutcome` carries a `DisposalReceipt`.

A dispatch that never found its program still acquired the capabilities the entry point bound. So did a dispatch that could not start at all. An entry point that releases only on the success path is the defect that appears as a leaked handle three hours into a CI run, and it is invisible in every test that passes.

Three arms rather than two, and the third is the one worth arguing about. `unregistered` exists because the registry is total over the roster while a *runtime* lookup can still receive a name that failed to resolve at the wire — and reporting that as a program failure blames the program for the wire's refusal.

## Bootstrap parses nothing

`InvocationEnvelope` carries a workspace, a program reference, and a caller. No argv, no flags, no command string.

The program is named by reference rather than by string, so an envelope for a program the roster does not contain cannot be constructed at all. A `program: string` would have made every envelope substitutable and moved the check to runtime, which is where the previous arrangement kept it.

The outcome carries the CLI wire's `CliDisposition` whole rather than a summary of it. A bootstrap that reduced it to an exit code would be translating a translation, and the arm a shell sees would stop being the wire's decision.

The caller rides along and confers nothing — which is the point of carrying it somewhere it can be seen doing nothing.

## Laws

- The registry's key set is the name union; each entry is the program of its own name; neither another program nor the broad form substitutes.
- Every dispatch arm releases, checked by name on all three, with the arm count pinned so a fourth cannot arrive without one.
- The envelope carries no argv, flags, or command, and the outcome carries no exit; the disposition is the wire's, whole.
- An envelope is exact over the program it names.

## Proof obligations

Runtime claims a type cannot express:

- That disposal actually ran. The receipt says a release happened; only the host can say the handle closed.
- That the capabilities bound at the edge are the ones each program's requirements name. The binding calculus checks the shape; whether the supplied filesystem is a filesystem is a host fact.
- That no program is reachable by a path that skips this contract — that the entry point is the only entry point.
- That a `unregistered` outcome names something a user actually typed, rather than a lookup the implementation fumbled.

## Implementation

None. The physical entry point does not exist yet, and when it does it will be one file at the repository root satisfying this contract.
