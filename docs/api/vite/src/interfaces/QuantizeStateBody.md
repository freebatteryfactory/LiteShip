[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeStateBody

# Interface: QuantizeStateBody

Defined in: [vite/src/css-quantize.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L42)

The parsed body of one `@quantize` state: bare declarations that apply
to the boundary element selector (the documented flat form) plus
nested per-selector rules (the adaptive per-element form).

## Properties

### bareProps

> `readonly` **bareProps**: `Record`\<`string`, `string`\>

Defined in: [vite/src/css-quantize.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L44)

Declarations written directly inside the state (flat form).

***

### rules

> `readonly` **rules**: readonly [`QuantizeNestedRule`](QuantizeNestedRule.md)[]

Defined in: [vite/src/css-quantize.ts:46](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L46)

Nested `<selector> { ... }` rules written inside the state.
