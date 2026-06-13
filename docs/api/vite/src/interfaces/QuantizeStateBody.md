[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeStateBody

# Interface: QuantizeStateBody

Defined in: [vite/src/css-quantize.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L43)

The parsed body of one `@quantize` state: bare declarations that apply
to the boundary element selector (the documented flat form) plus
nested per-selector rules (the adaptive per-element form).

## Properties

### ariaAttrs?

> `readonly` `optional` **ariaAttrs?**: `Record`\<`string`, `string`\>

Defined in: [vite/src/css-quantize.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L54)

Authored per-state ARIA/data attributes from a nested `@aria { … }`
segment (e.g. `aria-expanded: false; role: button`). Quotes are stripped.
Validated downstream by `ARIACompiler` against `BoundaryAttribute.isAllowedKey`
(`aria-*` / `role`). Absent when the state declares no `@aria` block.

***

### bareProps

> `readonly` **bareProps**: `Record`\<`string`, `string`\>

Defined in: [vite/src/css-quantize.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L45)

Declarations written directly inside the state (flat form).

***

### rules

> `readonly` **rules**: readonly [`QuantizeNestedRule`](QuantizeNestedRule.md)[]

Defined in: [vite/src/css-quantize.ts:47](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L47)

Nested `<selector> { ... }` rules written inside the state.
