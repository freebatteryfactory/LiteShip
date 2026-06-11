[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeNestedRule

# Interface: QuantizeNestedRule

Defined in: [vite/src/css-quantize.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L30)

A nested rule inside a `@quantize` state: a CSS selector plus the
property map applied to it when the state is active.

## Properties

### props

> `readonly` **props**: `Record`\<`string`, `string`\>

Defined in: [vite/src/css-quantize.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L34)

`{ cssProp: value }` declarations inside the nested rule.

***

### selector

> `readonly` **selector**: `string`

Defined in: [vite/src/css-quantize.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L32)

CSS selector exactly as authored (e.g. `.grid`, `.hero__title`).
