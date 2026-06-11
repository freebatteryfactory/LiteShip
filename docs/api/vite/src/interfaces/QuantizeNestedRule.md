[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeNestedRule

# Interface: QuantizeNestedRule

Defined in: [vite/src/css-quantize.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L31)

A nested rule inside a `@quantize` state: a CSS selector plus the
property map applied to it when the state is active.

## Properties

### props

> `readonly` **props**: `Record`\<`string`, `string`\>

Defined in: [vite/src/css-quantize.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L35)

`{ cssProp: value }` declarations inside the nested rule.

***

### selector

> `readonly` **selector**: `string`

Defined in: [vite/src/css-quantize.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L33)

CSS selector exactly as authored (e.g. `.grid`, `.hero__title`).
