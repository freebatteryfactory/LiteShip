[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TokenRef

# Variable: TokenRef

> **TokenRef**: \<`N`\>(`value`) => [`TokenRef`](../type-aliases/TokenRef.md)\<`N`\>

Defined in: [core/src/schema/brands.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/brands.ts#L54)

Wrap a plain string as a TokenRef.

A token ref names a design token and is emitted into a CSS custom-property
name, so it must be a non-empty token with no whitespace (e.g. `primary`,
`color-surface`, `font-size-lg`).

## Type Parameters

### N

`N` *extends* `string`

## Parameters

### value

`N`

## Returns

[`TokenRef`](../type-aliases/TokenRef.md)\<`N`\>

## Throws

`ValidationError` when `value` is empty or contains whitespace.
