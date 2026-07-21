[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AdaptiveSpec

# Interface: AdaptiveSpec

Defined in: [core/src/authoring/adaptive.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L102)

The authored intent of an adaptive: exactly the five sibling constructor
configs, one field each. `defineAdaptive` feeds each field to its constructor
verbatim — `boundary` to [defineBoundary](../functions/defineBoundary.md), `style` to [defineStyle](../functions/defineStyle.md)
(with the constructed boundary spliced in), `quantize` to `defineQuantizer`
(the injected `@liteship/quantizer` seam), each `tokens` entry to [defineToken](../functions/defineToken.md), and
`theme` to [defineTheme](../functions/defineTheme.md). Nothing here is re-shaped, so the lowering is a
pure delegation.

## Properties

### boundary

> `readonly` **boundary**: `object`

Defined in: [core/src/authoring/adaptive.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L104)

[defineBoundary](../functions/defineBoundary.md) config — the constraint the adaptive tracks.

#### at

> `readonly` **at**: readonly \[readonly \[`number`, `string`\], readonly \[`number`, `string`\]\]

#### hysteresis?

> `readonly` `optional` **hysteresis?**: `number`

#### input

> `readonly` **input**: `string`

#### spec?

> `readonly` `optional` **spec?**: [`BoundarySpec`](BoundarySpec.md)

***

### quantize?

> `readonly` `optional` **quantize?**: `AdaptiveQuantizeOptions`

Defined in: [core/src/authoring/adaptive.ts:108](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L108)

Optional `defineQuantizer` options (`outputs` + optional `tier`/`spring`/`force`).

***

### style

> `readonly` **style**: `Omit`\<`Parameters`\<*typeof* [`defineStyle`](../functions/defineStyle.md)\>\[`0`\], `"boundary"`\>

Defined in: [core/src/authoring/adaptive.ts:106](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L106)

[defineStyle](../functions/defineStyle.md) config WITHOUT `boundary` (the boundary is spliced in by the lowering).

***

### theme?

> `readonly` `optional` **theme?**: `object`

Defined in: [core/src/authoring/adaptive.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L112)

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

Defined in: [core/src/authoring/adaptive.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L114)

Capability tier [Adaptive.explain](Adaptive.md#explain) reports; defaults to `'styled'`.

***

### tokens?

> `readonly` `optional` **tokens?**: readonly `object`[]

Defined in: [core/src/authoring/adaptive.ts:110](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L110)

Optional design tokens, each a [defineToken](../functions/defineToken.md) config.
