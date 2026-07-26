[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / hasTag

# Function: hasTag()

> **hasTag**\<`Tag`\>(`u`, `tag`): `u is TaggedError<Tag>`

Defined in: [error/src/contract.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L131)

Narrowing guard for a specific tag — the data-oriented replacement for
`instanceof SomeError`. `hasTag(e, 'ParseError')` narrows `e` to the
`ParseError` variant.

## Type Parameters

### Tag

`Tag` *extends* `string`

## Parameters

### u

`unknown`

### tag

`Tag`

## Returns

`u is TaggedError<Tag>`
