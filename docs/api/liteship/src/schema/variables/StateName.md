[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / StateName

# Variable: StateName

> **StateName**: \<`S`\>(`value`) => [`StateName`](../type-aliases/StateName.md)\<`S`\>

Defined in: core/dist/schema/brands.d.ts:20

Wrap a plain string as a StateName.

A state name is serialized into the `data-liteship` state token and used as a
CSS/selector-addressable label, so it must be a non-empty token with no
whitespace (e.g. `mobile`, `sm`, `desktop`).

## Type Parameters

### S

`S` *extends* `string`

## Parameters

### value

`S`

## Returns

[`StateName`](../type-aliases/StateName.md)\<`S`\>

## Throws

`ValidationError` when `value` is empty or contains whitespace.
