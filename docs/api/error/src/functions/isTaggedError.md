[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [error/src](../README.md) / isTaggedError

# Function: isTaggedError()

> **isTaggedError**(`u`): `u is TaggedError<string>`

Defined in: [error/src/contract.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L117)

Structural guard: is `u` any value conforming to [TaggedError](../interfaces/TaggedError.md)?
Works across realms and on plain records (not just `Error` instances),
because it checks the shape, not the prototype.

## Parameters

### u

`unknown`

## Returns

`u is TaggedError<string>`
