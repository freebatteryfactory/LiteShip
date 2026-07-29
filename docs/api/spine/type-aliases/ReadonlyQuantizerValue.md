[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / ReadonlyQuantizerValue

# Type Alias: ReadonlyQuantizerValue\<T\>

> **ReadonlyQuantizerValue**\<`T`\> = `T` *extends* (...`args`) => `unknown` ? `T` : `T` *extends* `string` \| `number` \| `boolean` \| `bigint` \| `symbol` \| `null` \| `undefined` ? `T` : `T` *extends* readonly `unknown`[] ? `{ readonly [K in keyof T]: ReadonlyQuantizerValue<T[K]> }` : `T` *extends* `object` ? `{ readonly [K in keyof T]: ReadonlyQuantizerValue<T[K]> }` : `T`

Defined in: [\_spine/quantizer.d.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L22)

Recursive immutable snapshot applied to retained quantizer values.

## Type Parameters

### T

`T`
