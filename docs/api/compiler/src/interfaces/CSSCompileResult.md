[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSCompileResult

# Interface: CSSCompileResult

Defined in: [compiler/src/css.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L89)

Output of [CSSCompiler.compile](../variables/CSSCompiler.md#compile).

`raw` is the serialized form of `containerRules`, pre-joined so most
consumers can inject it directly into a `<style>` element without a
separate serialize call.

## Properties

### containerRules

> `readonly` **containerRules**: readonly [`CSSContainerRule`](CSSContainerRule.md)[]

Defined in: [compiler/src/css.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L91)

Structured container rules, one per non-empty state.

***

### raw

> `readonly` **raw**: `string`

Defined in: [compiler/src/css.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L93)

Pre-serialized CSS text ready for injection.
