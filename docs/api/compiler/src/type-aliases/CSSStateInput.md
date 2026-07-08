[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSStateInput

# Type Alias: CSSStateInput

> **CSSStateInput** = `Record`\<`string`, `string`\> \| [`CSSStateBody`](../interfaces/CSSStateBody.md)

Defined in: [compiler/src/css.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L80)

Per-state input accepted by [CSSCompiler.compile](../variables/CSSCompiler.md#compile): either a flat
property map (the documented bare-props form, back-compat) or a
[CSSStateBody](../interfaces/CSSStateBody.md) carrying nested selector rules.
