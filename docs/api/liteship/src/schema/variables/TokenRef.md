[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / TokenRef

# Variable: TokenRef

> **TokenRef**: \<`N`\>(`value`) => [`TokenRef`](../type-aliases/TokenRef.md)\<`N`\>

Defined in: core/dist/schema/brands.d.ts:34

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
