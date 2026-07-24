[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AdaptiveSpec

# Interface: AdaptiveSpec\<B\>

Defined in: [core/src/authoring/adaptive.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L124)

The authored intent of an adaptive: exactly the five sibling constructor
configs, one field each. `lowerAdaptive` feeds each field to its constructor
verbatim — `boundary` to [defineBoundary](../functions/defineBoundary.md), `style` to [defineStyle](../functions/defineStyle.md)
(with the constructed boundary spliced in), `quantize` to `defineQuantizer`
(the explicitly supplied `@liteship/quantizer` owner), each `tokens` entry to [defineToken](../functions/defineToken.md), and
`theme` to [defineTheme](../functions/defineTheme.md). Nothing here is re-shaped, so the lowering is a
pure delegation.

## Type Parameters

### B

`B` *extends* `AdaptiveBoundarySpec` = `AdaptiveBoundarySpec`

## Properties

### boundary

> `readonly` **boundary**: `B`

Defined in: [core/src/authoring/adaptive.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L126)

[defineBoundary](../functions/defineBoundary.md) config — the constraint the adaptive tracks.

***

### quantize?

> `readonly` `optional` **quantize?**: `AdaptiveQuantizeOptions`\<`NoInfer`\<`B`\>\[`"at"`\]\[`number`\]\[`1`\]\>

Defined in: [core/src/authoring/adaptive.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L130)

Optional `defineQuantizer` options (`outputs` + optional `tier`/`spring`/`force`).

***

### style

> `readonly` **style**: `Omit`\<`Parameters`\<*typeof* [`defineStyle`](../functions/defineStyle.md)\>\[`0`\], `"boundary"`\>

Defined in: [core/src/authoring/adaptive.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L128)

[defineStyle](../functions/defineStyle.md) config WITHOUT `boundary` (the boundary is spliced in by the lowering).

***

### theme?

> `readonly` `optional` **theme?**: `object`

Defined in: [core/src/authoring/adaptive.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L134)

Optional [defineTheme](../functions/defineTheme.md) config.

#### meta?

> `readonly` `optional` **meta?**: `Record`\<`string`, \{ `label`: `string`; `mode`: `"light"` \| `"dark"`; \}\>

#### name

> `readonly` **name**: `string`

#### tokens

> `readonly` **tokens**: `Record`\<`string`, `Record`\<`V`\[`number`\] & `string`, `unknown`\>\>

#### variants

> `readonly` **variants**: readonly \[`string`, `string`\]

***

### tier?

> `readonly` `optional` **tier?**: [`CapTier`](../type-aliases/CapTier.md)

Defined in: [core/src/authoring/adaptive.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L136)

Capability tier [Adaptive.explain](Adaptive.md#explain) reports; defaults to `'styled'`.

***

### tokens?

> `readonly` `optional` **tokens?**: readonly `object`[]

Defined in: [core/src/authoring/adaptive.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L132)

Optional design tokens, each a [defineToken](../functions/defineToken.md) config.
