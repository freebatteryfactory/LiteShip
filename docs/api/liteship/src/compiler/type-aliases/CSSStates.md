[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / CSSStates

# Type Alias: CSSStates

> **CSSStates** = `Readonly`\<`Record`\<`string`, [`CSSStateInput`](CSSStateInput.md)\>\>

Defined in: compiler/dist/dispatch.d.ts:23

Per-state CSS inputs keyed by state name: each value is either a flat
property map or a structured [CSSStateBody](../interfaces/CSSStateBody.md) carrying nested selector
rules — exactly what [CSSCompiler.compile](../variables/CSSCompiler.md#compile) accepts (so `dispatch` can
faithfully replace a direct compile call, including the manifest's body form).
