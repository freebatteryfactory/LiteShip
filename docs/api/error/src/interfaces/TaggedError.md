[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / TaggedError

# Interface: TaggedError\<Tag\>

Defined in: [error/src/contract.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/contract.ts#L27)

The open structural contract every error in the algebra satisfies.

This is a CONTRACT (a shape: "has these fields"), not a base class. Both
LiteShip's built-in variants and any downstream variant are plain readonly
records carrying a string discriminant (`_tag`) and a human `message`.

## Extended by

- [`ValidationError`](ValidationError.md)
- [`ParseError`](ParseError.md)
- [`IoError`](IoError.md)
- [`HostCapabilityError`](HostCapabilityError.md)
- [`InvariantViolationError`](InvariantViolationError.md)
- [`NotFoundError`](NotFoundError.md)
- [`UnsupportedError`](UnsupportedError.md)
- [`IntegrityError`](IntegrityError.md)

## Type Parameters

### Tag

`Tag` *extends* `string` = `string`

## Properties

### \_tag

> `readonly` **\_tag**: `Tag`

Defined in: [error/src/contract.ts:29](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/contract.ts#L29)

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

***

### message

> `readonly` **message**: `string`

Defined in: [error/src/contract.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/contract.ts#L31)

Human-readable summary. Doubles as the transport `Error.message`.
