[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeNestedRule

# Interface: QuantizeNestedRule

Defined in: [vite/src/css-quantize.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L56)

A nested rule inside a `@quantize` state: a CSS selector plus the
property map applied to it when the state is active.

## Properties

### props

> `readonly` **props**: `Record`\<`string`, `string`\>

Defined in: [vite/src/css-quantize.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L60)

`{ cssProp: value }` declarations inside the nested rule.

***

### selector

> `readonly` **selector**: `string`

Defined in: [vite/src/css-quantize.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L58)

CSS selector exactly as authored (e.g. `.grid`, `.hero__title`).
