[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / QuantizeNestedRule

# Interface: QuantizeNestedRule

Defined in: vite/dist/css-quantize.d.ts:30

A nested rule inside a `@quantize` state: a CSS selector plus the
property map applied to it when the state is active.

## Properties

### props

> `readonly` **props**: `Record`\<`string`, `string`\>

Defined in: vite/dist/css-quantize.d.ts:34

`{ cssProp: value }` declarations inside the nested rule.

***

### selector

> `readonly` **selector**: `string`

Defined in: vite/dist/css-quantize.d.ts:32

CSS selector exactly as authored (e.g. `.grid`, `.hero__title`).
