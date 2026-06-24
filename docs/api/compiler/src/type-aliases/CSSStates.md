[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSStates

# Type Alias: CSSStates

> **CSSStates** = `Readonly`\<`Record`\<`string`, [`CSSStateInput`](CSSStateInput.md)\>\>

Defined in: [compiler/src/dispatch.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/dispatch.ts#L33)

Per-state CSS inputs keyed by state name: each value is either a flat
property map or a structured [CSSStateBody](../interfaces/CSSStateBody.md) carrying nested selector
rules — exactly what [CSSCompiler.compile](../variables/CSSCompiler.md#compile) accepts (so `dispatch` can
faithfully replace a direct compile call, including the manifest's body form).
