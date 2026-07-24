[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RequireAtLeastOne

# Type Alias: RequireAtLeastOne\<T, Keys\>

> **RequireAtLeastOne**\<`T`, `Keys`\> = `Pick`\<`T`, `Exclude`\<keyof `T`, `Keys`\>\> & `{ [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }`\[`Keys`\]

Defined in: [core/src/schema/types.ts:7](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/types.ts#L7)

Require at least one selected key of `T`.

## Type Parameters

### T

`T`

### Keys

`Keys` *extends* keyof `T` = keyof `T`
