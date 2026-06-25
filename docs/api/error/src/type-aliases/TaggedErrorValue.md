[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / TaggedErrorValue

# Type Alias: TaggedErrorValue\<Tag, Fields\>

> **TaggedErrorValue**\<`Tag`, `Fields`\> = `Error` & [`TaggedError`](../interfaces/TaggedError.md)\<`Tag`\> & `Readonly`\<`Fields`\>

Defined in: [error/src/contract.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/contract.ts#L39)

A [TaggedError](../interfaces/TaggedError.md) value that is also a platform `Error` — what every
factory built on [taggedError](../functions/taggedError.md) returns. Carries a real stack trace
and answers `instanceof Error`, while remaining a tagged data record.

## Type Parameters

### Tag

`Tag` *extends* `string`

### Fields

`Fields` *extends* `object`
