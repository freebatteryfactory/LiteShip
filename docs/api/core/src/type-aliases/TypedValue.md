[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TypedValue

# Type Alias: TypedValue

> **TypedValue** = \{ `k`: `"number"`; `v`: `number`; \} \| \{ `k`: `"opacity"`; `v`: `number`; \} \| \{ `k`: `"length"`; `unit`: `"px"` \| `"rem"` \| `"%"` \| `"vw"` \| `"vh"`; `v`: `number`; \} \| \{ `k`: `"angle"`; `unit`: `"deg"` \| `"rad"` \| `"turn"`; `v`: `number`; \} \| \{ `components`: readonly `number`[]; `k`: `"color"`; `space`: [`ColorSpace`](ColorSpace.md); \} \| \{ `k`: `"transform"`; `parts`: readonly [`TransformPart`](../interfaces/TransformPart.md)[]; \}

Defined in: [core/src/interpolate.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpolate.ts#L22)

Typed value union — interpolate within-kind only.
