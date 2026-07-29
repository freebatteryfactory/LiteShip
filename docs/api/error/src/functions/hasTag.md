[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [error/src](../README.md) / hasTag

# Function: hasTag()

> **hasTag**\<`Tag`\>(`u`, `tag`): `u is TaggedError<Tag>`

Defined in: [error/src/contract.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L132)

Structural narrowing guard for a specific tag — the data-oriented replacement
for `instanceof`. From `unknown`, it proves only the open
[TaggedError](../interfaces/TaggedError.md) contract (`_tag` + `message`); validate a concrete variant
before reading variant-specific fields such as `ParseError.source`.

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
