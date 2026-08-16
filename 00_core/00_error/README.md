# Errors and Diagnostics

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `00_error/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Provide the executable failure algebra that composes the root `Result`, tagged coproduct, issue, and data-path shapes into predictable LiteShip errors and diagnostics.

## Owns

- `ok`, `err`, and result guards.
- Secure tagged-error construction on real platform `Error` values.
- Exhaustive and open tagged-error matching.
- The definition, invariant, and host-defect error families, and the validation result carrier.
- Stable diagnostic identity, source location, evidence, and structured remediation actions.
- Rendering contracts for concise human output, detailed human output, and lossless agent output.

## Does not own

- Domain-specific failure variants owned by later homes.
- Wire-specific status codes or terminal formatting.
- Logging sinks, telemetry transports, or host consoles.
- A monolithic eagerly loaded catalog required by every `Result` user.

## Semantic contracts

Expected domain failure is data. Invalid authored definitions may raise synchronously through an ergonomic `define*` surface, but the underlying validator returns the same typed failure as a `Result`. Internal invariant violations and unexpected raw host defects may raise structured errors.

A diagnostic carries the complete machine object. Default human rendering answers what failed, where, why, and the first safe action. Agent projection retains every field and remediation alternative.

## Laws

- One `Result` shape exists across core, hosts, targets, wires, and system.
- Error variants are tagged data, not a subclass hierarchy.
- Structured fields are installed without prototype mutation.
- A field supplied by a caller cannot replace the tag, message, or diagnostic identity.
- Expected operation, compile, decode, persistence, and wire failure does not cross its contract as an untyped throw.
- A diagnostic code has one owner and one deterministic explanation.
- Remediation never invents an unsafe command.

## Operation vocabulary

- `ok` and `err` construct result arms.
- `match` handles a closed failure algebra exhaustively.
- `inspect` returns the structured diagnostic.
- `explain` projects cause, evidence, and remediation.
- `raise` is reserved for definition and invariant boundaries that intentionally use the platform throw channel.

## Proof obligations

- A `__proto__` field cannot detach a tagged error from `Error.prototype`.
- Adding a closed-union variant breaks every incomplete exhaustive match.
- Open matchers continue to accept downstream variants through an explicit fallback.
- The throwing and result-returning definition paths report the same failure identity and fields.
- Human and agent renderers preserve the same diagnostic code and subject.
- Importing result helpers does not evaluate the complete diagnostic catalog.

## Implementation boundary

Constructors, catalogs, and renderers must preserve the same diagnostic identity, structured remediation, and human/machine projections; security and cross-projection behavior remain empirical proof obligations.

Porting the old secure composer and result behaviour, defining the diagnostic-family extension mechanism, and measuring loading and rendering cost are implementation obligations this architecture already authorizes.
