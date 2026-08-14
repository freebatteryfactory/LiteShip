# CLI Wire: Argv In, Two Streams and an Exit Code Out

Status: architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_wires/cli/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Project one crossing into a command invocation, keeping the answer separable from the diagnostics and the exit code honest about what happened.

## Owns

- The stream distinction, named by role rather than by file descriptor.
- What one crossing writes and where.
- The exit algebra: four arms, of which one is success.
- The disposition, which pins an exit arm per crossing arm wherever only one is honest.

## Does not own

- Argv parsing, terminal capability, signals, or the process. `01_hosts/server` owns those.
- The program population. `system/03_programs` will own that, and it does not exist yet.
- Colour, progress, or interactivity.

## This is where dogfooding is true or a slogan

`WireCaller` has an arm for a system program and confers nothing. Here is where that has to hold, because here is where the temptation is strongest: `release` is *our* program, and giving it a shorter path than an application operation gets is one afternoon's convenience away.

The exposure, admission, and exchange types are not parameterized by the caller. There is no arm that unlocks anything. A system program crossing this wire takes the identical path, which is checkable rather than promised.

## The exit code is one integer carrying two questions

Did the crossing work, and did the operation approve? A shell sees `0` and continues.

`CliExit` has four arms because four distinguishable things happen:

- **success** — the crossing completed and the operation succeeded.
- **refusedByOperation** — the crossing completed and the operation said no. The tool worked; the answer is no. A human must not be shown a stack trace and a shell must not treat this as a crash.
- **usage** — nothing ran. Bad arguments, unknown command.
- **interrupted** — the operation ran and its answer never made it out. The process died between the side effect and the flush, and a wrapper script must not retry this blindly.

Collapsing `refusedByOperation` into `usage` is the ordinary shape — one nonzero code for everything that is not success — and it tells a user who typed a correct command that they typed it wrong.

The answered arm is deliberately *not* pinned to success. An operation that refused arrived perfectly well, and forcing success there is the CLI form of a `200` hiding a rejection.

## Two streams are one channel if anybody mixes them

The answer is machine-readable and goes one way; diagnostics are for a human and go the other. A single diagnostic on the answer stream corrupts every downstream parse, and the failure is silent, intermittent, and appears only when something went wrong — which is when the pipeline mattered.

Both members pin their stream to a literal, so the separation is construction rather than a convention someone remembers at three in the morning.

## Laws

- Success is unreachable from a crossing that never ran and from one whose answer was lost.
- A completed crossing may still exit `refusedByOperation`, and may not exit `usage`.
- The answer and the diagnostics carry different literal streams, with an anti-vacuity partner in case the stream type collapses to one value.
- The four exit arms stay four, and the outcome algebra they project is pinned alongside them, so a fifth outcome arm makes the question visible here.
- A disposition is exact over its operation.

## Proof obligations

Runtime claims a type cannot express:

- That the process actually exited with a code corresponding to the arm it selected.
- That nothing wrote to the answer stream outside the answer member — a library printing a deprecation notice defeats this at runtime and no type can see it.
- That a system program received no privilege this wire does not offer an application operation.
- That an interrupted crossing's side effects are discoverable afterward.

## Implementation

None.
