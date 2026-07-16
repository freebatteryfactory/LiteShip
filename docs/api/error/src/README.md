[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / error/src

# error/src

`@czap/error` — the one LiteShip error algebra.

A composable, zero-dependency tagged-error coproduct. Errors are tagged DATA
values (no class hierarchy): differentiated by a `_tag` field, assembled by
union types, given behaviour by standalone functions, and thrown/failed as
real `Error` values (stack traces + `instanceof Error`) via [taggedError](functions/taggedError.md).

Two faces, one value:
- **Effect** packages: `Effect.fail(ValidationError(…))` +
  `Effect.catchTag('ValidationError', …)` — `catchTag` keys on `_tag`, so the
  plain records here are first-class Effect failures with no `effect` import.
- **Plain** packages: `throw ValidationError(…)` + `hasTag(e, 'ValidationError')`
  / `matchTag(e, …)` — same value, no `effect` dependency.

Each variant name is BOTH the type and the constructor (declaration merging),
mirroring the `@czap/core` brand idiom: `ValidationError` is a type in type
position and a factory in value position.

Extensible + global: a downstream project imports this package, composes its
own variants with [taggedError](functions/taggedError.md), widens the union, and reuses every
helper unchanged — zero rebuild, zero fork.

## Interfaces

- [Err](interfaces/Err.md)
- [HostCapabilityError](interfaces/HostCapabilityError.md)
- [IntegrityError](interfaces/IntegrityError.md)
- [InvariantViolationError](interfaces/InvariantViolationError.md)
- [IoError](interfaces/IoError.md)
- [NotFoundError](interfaces/NotFoundError.md)
- [Ok](interfaces/Ok.md)
- [ParseError](interfaces/ParseError.md)
- [TaggedError](interfaces/TaggedError.md)
- [UnsupportedError](interfaces/UnsupportedError.md)
- [ValidationError](interfaces/ValidationError.md)

## Type Aliases

- [LiteShipError](type-aliases/LiteShipError.md)
- [LiteShipErrorTag](type-aliases/LiteShipErrorTag.md)
- [Result](type-aliases/Result.md)
- [TaggedErrorValue](type-aliases/TaggedErrorValue.md)

## Variables

- [HostCapabilityError](variables/HostCapabilityError.md)
- [IntegrityError](variables/IntegrityError.md)
- [InvariantViolationError](variables/InvariantViolationError.md)
- [IoError](variables/IoError.md)
- [LITESHIP\_ERROR\_TAGS](variables/LITESHIP_ERROR_TAGS.md)
- [NotFoundError](variables/NotFoundError.md)
- [ParseError](variables/ParseError.md)
- [UnsupportedError](variables/UnsupportedError.md)
- [ValidationError](variables/ValidationError.md)

## Functions

- [assertNever](functions/assertNever.md)
- [err](functions/err.md)
- [getTag](functions/getTag.md)
- [hasTag](functions/hasTag.md)
- [isErr](functions/isErr.md)
- [isOk](functions/isOk.md)
- [isTaggedError](functions/isTaggedError.md)
- [matchTag](functions/matchTag.md)
- [matchTagOr](functions/matchTagOr.md)
- [ok](functions/ok.md)
- [raise](functions/raise.md)
- [taggedError](functions/taggedError.md)
