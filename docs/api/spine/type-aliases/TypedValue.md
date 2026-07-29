[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / TypedValue

# Type Alias: TypedValue

> **TypedValue** = \{ `k`: `"number"`; `v`: `number`; \} \| \{ `k`: `"opacity"`; `v`: `number`; \} \| \{ `k`: `"length"`; `unit`: `"px"` \| `"rem"` \| `"%"` \| `"vw"` \| `"vh"`; `v`: `number`; \} \| \{ `k`: `"angle"`; `unit`: `"deg"` \| `"rad"` \| `"turn"`; `v`: `number`; \} \| \{ `components`: readonly `number`[]; `k`: `"color"`; `space`: [`ColorSpace`](ColorSpace.md); \} \| \{ `k`: `"transform"`; `parts`: readonly [`TransformPart`](../interfaces/TransformPart.md)[]; \}

Defined in: [\_spine/core.d.ts:1371](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1371)

Runtime value whose unit or color space is explicit in the type.
