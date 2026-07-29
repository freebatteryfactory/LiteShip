[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / TransitionMap

# Type Alias: TransitionMap\<S\>

> **TransitionMap**\<`S`\> = `object` & `` { readonly [K in `${S}->${S}`]?: TransitionConfig } ``

Defined in: [\_spine/quantizer.d.ts:157](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L157)

Sparse transition configuration indexed by source and destination state.

## Type Declaration

### \*?

> `readonly` `optional` **\*?**: [`TransitionConfig`](../interfaces/TransitionConfig.md)

## Type Parameters

### S

`S` *extends* `string` = `string`
