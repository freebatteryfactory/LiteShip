[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / StyleLayer

# Interface: StyleLayer

Defined in: [core/src/authoring/style.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/style.ts#L34)

One layer of a [Style](../variables/Style.md): a flat property bag plus optional pseudo
selectors (`:hover`, `::before`, …) and structured `box-shadow` layers.

## Properties

### boxShadow?

> `readonly` `optional` **boxShadow?**: readonly [`ShadowLayer`](ShadowLayer.md)[]

Defined in: [core/src/authoring/style.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/style.ts#L37)

***

### properties

> `readonly` **properties**: `Record`\<`string`, `string`\>

Defined in: [core/src/authoring/style.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/style.ts#L35)

***

### pseudo?

> `readonly` `optional` **pseudo?**: `Record`\<`string`, `Record`\<`string`, `string`\>\>

Defined in: [core/src/authoring/style.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/style.ts#L36)
