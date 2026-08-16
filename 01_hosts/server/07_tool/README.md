# Server Native Tools

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/07_tool/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own native-tool provider authority: exact tool profiles with versions and determinism evidence, tool-correlated typed invocations, declared sandbox scope, cancellation, receipts, and lifecycle.

## Owns

- Content-addressed executable, configuration, and environment identity for one admitted profile.
- The tool profile: exact identity, version, determinism arm.
- Tool-correlated invocation: invoking tool A provably yields an execution of A, carrying the actual input value beside its typed contracts and a declared sandbox — never ambient scope — and yielding an actual result: a produced value with its receipt, or a failure.
- The deployment-admitted tool roster grounding.
- That grounding carries one addressed, non-empty population of exact tool profiles; it is not an interchangeable admitted marker.

## Does not own

- Any tool's semantic domain — what ffmpeg means to media is media's business; that it runs sandboxed with a typed contract is this home's. Process mechanics — composed from `01_process` by requirement row.

## Laws

- The exact profile identity survives the provider path — request, execution, and the operation between them. Threading only the tool left two distinct admitted profiles of the same binary interchangeable at every consumer, which is the whole content of a reproducibility claim about a native encoder.
- A tool profile names its bytes, configuration, and environment. A name and version string beside an empty determinism tag could not distinguish a pinned static build from whatever happened to be on `PATH`.
- Reproducibility is the core evidence grammar over this profile's own reference. There is no local determinism type.
- An invocation cannot claim another tool; invocation is tool-correlated.
- An invocation carries contracts and a declared sandbox.
- An execution is receipted and owned.

## Proof obligations

- Sandbox scopes are honored; determinism claims hold at runtime.

`system/01_assurance`; spawn-versus-pool crossover is empirical.
