[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / StateName

# Variable: StateName

> **StateName**: \<`S`\>(`value`) => [`StateName`](../type-aliases/StateName.md)\<`S`\>

Defined in: [core/src/schema/brands.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/brands.ts#L36)

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
