[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ReadonlyConfigValue

# Type Alias: ReadonlyConfigValue\<T\>

> **ReadonlyConfigValue**\<`T`\> = `T` *extends* (...`args`) => `unknown` ? `T` : `T` *extends* `string` \| `number` \| `boolean` \| `bigint` \| `symbol` \| `null` \| `undefined` ? `T` : `T` *extends* readonly `unknown`[] ? `{ readonly [K in keyof T]: ReadonlyConfigValue<T[K]> }` : `T` *extends* `object` ? `{ readonly [K in keyof T]: ReadonlyConfigValue<T[K]> }` : `T`

Defined in: [\_spine/config.d.ts:9](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L9)

Recursive immutable snapshot applied to retained project-configuration values.

## Type Parameters

### T

`T`
