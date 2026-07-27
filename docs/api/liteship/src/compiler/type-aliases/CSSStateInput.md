[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / CSSStateInput

# Type Alias: CSSStateInput

> **CSSStateInput** = `Record`\<`string`, `string`\> \| [`CSSStateBody`](../interfaces/CSSStateBody.md)

Defined in: compiler/dist/css.d.ts:71

Per-state input accepted by [CSSCompiler.compile](../variables/CSSCompiler.md#compile): either a flat
property map (the documented bare-props form, back-compat) or a
[CSSStateBody](../interfaces/CSSStateBody.md) carrying nested selector rules.
