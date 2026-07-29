[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / TypedValue

# Type Alias: TypedValue

> **TypedValue** = \{ `k`: `"number"`; `v`: `number`; \} \| \{ `k`: `"opacity"`; `v`: `number`; \} \| \{ `k`: `"length"`; `unit`: `"px"` \| `"rem"` \| `"%"` \| `"vw"` \| `"vh"`; `v`: `number`; \} \| \{ `k`: `"angle"`; `unit`: `"deg"` \| `"rad"` \| `"turn"`; `v`: `number`; \} \| \{ `components`: readonly `number`[]; `k`: `"color"`; `space`: [`ColorSpace`](ColorSpace.md); \} \| \{ `k`: `"transform"`; `parts`: readonly [`TransformPart`](../interfaces/TransformPart.md)[]; \}

Defined in: core/dist/motion/interpolate.d.ts:17

Typed value union — interpolate within-kind only.
