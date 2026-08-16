# CLI Wire: Argv In, Two Streams and an Exit Code Out

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_wires/cli/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Project one crossing into a command invocation, keeping the answer separable from the diagnostics and the exit code honest about what happened.

## Owns

- The stream distinction, named by role rather than by file descriptor.
- What one crossing writes and where.
- The exit algebra: seven arms, of which one is shell success.
- The disposition, which pins both the receipt outcome and the exit arm on every arm.

## Does not own

- Argv parsing, terminal capability, signals, or the process. `01_hosts/server` owns those.
- The program population. `system/03_programs` owns that downstream.
- Colour, progress, or interactivity.

## This is where dogfooding is true or a slogan

`WireCaller` has an arm for a system program and confers nothing. Here is where that has to hold, because here is where the temptation is strongest: `release` is *our* program, and giving it a shorter path than an application operation gets is one afternoon's convenience away.

The exposure, admission, and exchange types are not parameterized by the caller. There is no arm that unlocks anything. A system program crossing this wire takes the identical path, which is checkable rather than promised.

## The exit code is one integer carrying two questions

Did the crossing work, and did the operation approve? A shell sees `0` and continues.

`CliExit` has seven arms because seven distinguishable things happen — the four outcomes an operation can reach, two boundary outcomes, and one caller-selected result threshold:

- **success** — the crossing completed and the operation succeeded.
- **refusedByOperation** — the crossing completed and the operation said no. The tool worked; the answer is no. A human must not be shown a stack trace and a shell must not treat this as a crash.
- **failed** — the crossing completed and the operation errored.
- **cancelled** — the crossing completed and the operation was cancelled. Not a failure by it and not a refusal by it.
- **usage** — nothing ran. Bad arguments, unknown command.
- **interrupted** — the operation ran and its answer never made it out. The process died between the side effect and the flush, and a wrapper script must not retry this blindly.
- **threshold** — the operation succeeded and its answer arrived, but a caller-selected CLI acceptance policy rejected that answer for this invocation. Doctor `--ci` is the first consumer: `caution` remains the report verdict while the shell receives nonzero.

Collapsing `refusedByOperation` into `usage` is the ordinary shape — one nonzero code for everything that is not success — and it tells a user who typed a correct command that they typed it wrong.

### Crossing and exit are one decision

One `answered` arm beside an independently selected exit would let the operation receipt and process exit disagree.

A receipt reading `failed` must not compose beside `exit: success`, and failed or cancelled operations must not fabricate an answer value merely to inhabit a shared completed arm.

Each completed outcome has its own arm pinning the receipt outcome and exit together. `succeeded` is the only arm carrying an answer value, so the answer stream is absent where there is nothing to put on it rather than present and fabricated.

The threshold arm is also completed and carries the successful answer. It does not add an operation outcome. That distinction is load-bearing: turning a strict acceptance policy into `failed` would falsify the receipt, while returning shell success would ignore the policy the caller selected.

The exit algebra answers transport and operation questions together; neither is a free sibling of the other.

## Separate answer and diagnostic streams

The answer is machine-readable and goes one way; diagnostics are for a human and go the other. A single diagnostic on the answer stream corrupts every downstream parse, and the failure is silent, intermittent, and appears only when something went wrong — which is when the pipeline mattered.

Both members pin their stream to a literal, so the separation is construction rather than a convention someone remembers at three in the morning.

## Laws

- The exit is a projection of the operation's outcome: each completed arm's exit is the one honest answer for its outcome, and success is unreachable from the failed arm, the cancelled arm, a crossing that never ran, and one whose answer was lost.
- A completed arm carries the receipt outcome it names, so the exit is pinned to a transport that said what happened; and only the succeeded arm has an answer stream.
- The answer and the diagnostics carry different literal streams, with an anti-vacuity partner in case the stream type collapses to one value.
- The seven exit arms stay seven, and the operation outcome algebra remains four; the threshold arm is pinned to a successful receipt so policy cannot rewrite history.
- A disposition is exact over its operation.
- The migration disposition projects core's exact report and typed failure without changing stream or exit semantics.

## Proof obligations

Runtime claims a type cannot express:

- That the process actually exited with a code corresponding to the arm it selected.
- That nothing wrote to the answer stream outside the answer member — a library printing a deprecation notice defeats this at runtime and no type can see it.
- That a system program received no privilege this wire does not offer an application operation.
- That an interrupted crossing's side effects are discoverable afterward.

## Implementation

None.
