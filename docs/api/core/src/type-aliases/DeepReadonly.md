[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DeepReadonly

# Type Alias: DeepReadonly\<T\>

> **DeepReadonly**\<`T`\> = `T` *extends* (...`args`) => `unknown` ? `T` : `T` *extends* `string` \| `number` \| `boolean` \| `bigint` \| `symbol` \| `null` \| `undefined` ? `T` : `T` *extends* readonly `unknown`[] ? `{ readonly [K in keyof T]: DeepReadonly<T[K]> }` : `T` *extends* `object` ? `{ readonly [K in keyof T]: DeepReadonly<T[K]> }` : `T`

Defined in: [core/src/schema/types.ts:11](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/types.ts#L11)

Recursively make arrays and object properties readonly while preserving callable values.

## Type Parameters

### T

`T`
