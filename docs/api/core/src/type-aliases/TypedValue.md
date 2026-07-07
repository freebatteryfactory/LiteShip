[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TypedValue

# Type Alias: TypedValue

> **TypedValue** = \{ `k`: `"number"`; `v`: `number`; \} \| \{ `k`: `"opacity"`; `v`: `number`; \} \| \{ `k`: `"length"`; `unit`: `"px"` \| `"rem"` \| `"%"` \| `"vw"` \| `"vh"`; `v`: `number`; \} \| \{ `k`: `"angle"`; `unit`: `"deg"` \| `"rad"` \| `"turn"`; `v`: `number`; \} \| \{ `k`: `"transform"`; `parts`: readonly [`TransformPart`](../interfaces/TransformPart.md)[]; \}

Defined in: [core/src/interpolate.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpolate.ts#L19)

Typed value union — interpolate within-kind only.
