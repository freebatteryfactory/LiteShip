[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / LiteShipError

# Type Alias: LiteShipError

> **LiteShipError** = [`ValidationError`](../interfaces/ValidationError.md) \| [`ParseError`](../interfaces/ParseError.md) \| [`IoError`](../interfaces/IoError.md) \| [`HostCapabilityError`](../interfaces/HostCapabilityError.md) \| [`InvariantViolationError`](../interfaces/InvariantViolationError.md) \| [`NotFoundError`](../interfaces/NotFoundError.md) \| [`UnsupportedError`](../interfaces/UnsupportedError.md) \| [`IntegrityError`](../interfaces/IntegrityError.md)

Defined in: [error/src/variants.ts:249](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts#L249)

The core LiteShip error coproduct — the union of the built-in variants.

This is the algebra's CLOSED set. Downstream projects extend by composing,
not editing: `type AppError = LiteShipError | MyDomainError`. Every helper
in the `contract` module operates on the open [TaggedError](../interfaces/TaggedError.md) contract,
so a widened union keeps full `matchTag`/`hasTag`/`raise` support.
