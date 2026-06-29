[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeStateBody

# Interface: QuantizeStateBody

Defined in: [vite/src/css-quantize.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L75)

The parsed body of one `@quantize` state: bare declarations that apply
to the boundary element selector (the documented flat form) plus
nested per-selector rules (the adaptive per-element form).

## Properties

### ariaAttrs?

> `readonly` `optional` **ariaAttrs?**: `Record`\<`string`, `string`\>

Defined in: [vite/src/css-quantize.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L101)

Authored per-state ARIA/data attributes from a nested `@aria { … }`
segment (e.g. `aria-expanded: false; role: button`). Quotes are stripped.
Validated downstream by `ARIACompiler` against `BoundaryAttribute.isAllowedKey`
(`aria-*` / `role`). Absent when the state declares no `@aria` block.

Derived from `castAttrs.aria` and kept as a parallel field so existing
ARIA consumers/tests read it unchanged.

***

### bareProps

> `readonly` **bareProps**: `Record`\<`string`, `string`\>

Defined in: [vite/src/css-quantize.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L77)

Declarations written directly inside the state (flat form).

***

### castAttrs?

> `readonly` `optional` **castAttrs?**: `Partial`\<`Record`\<`CastTarget`, `Record`\<`string`, `string`\>\>\>

Defined in: [vite/src/css-quantize.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L91)

Authored per-state non-CSS cast attributes, keyed by cast target. Each
entry holds the raw `{ key: value }` declarations from a nested
`@<target> { … }` segment (quotes stripped). Generalized from the
original `@aria`-only form so adding a cast target is a registration in
[CAST\_TARGETS](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/boundary-manifest.ts), not a new field. Targets the state did not author
are absent; the field itself is absent when no cast segment was authored.

Downstream each target routes through its compiler arm via `dispatch`
(ARIA → `ARIACompiler`, GLSL → `GLSLCompiler`, WGSL → `WGSLCompiler`).

***

### rules

> `readonly` **rules**: readonly [`QuantizeNestedRule`](QuantizeNestedRule.md)[]

Defined in: [vite/src/css-quantize.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L79)

Nested `<selector> { ... }` rules written inside the state.
