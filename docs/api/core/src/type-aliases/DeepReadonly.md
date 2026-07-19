[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DeepReadonly

# Type Alias: DeepReadonly\<T\>

> **DeepReadonly**\<`T`\> = `T` *extends* infer U[] ? `ReadonlyArray`\<`DeepReadonly`\<`U`\>\> : `T` *extends* `Record`\<`string`, `unknown`\> ? `{ readonly [K in keyof T]: DeepReadonly<T[K]> }` : `T`

Defined in: [core/src/internal/type-level.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/internal/type-level.ts#L56)

Deep readonly

## Type Parameters

### T

`T`
