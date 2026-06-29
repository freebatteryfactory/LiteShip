[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSCompileResult

# Interface: CSSCompileResult

Defined in: [compiler/src/css.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L73)

Output of [CSSCompiler.compile](../variables/CSSCompiler.md#compile).

`raw` is the serialized form of `containerRules`, pre-joined so most
consumers can inject it directly into a `<style>` element without a
separate serialize call.

## Properties

### containerRules

> `readonly` **containerRules**: readonly [`CSSContainerRule`](CSSContainerRule.md)[]

Defined in: [compiler/src/css.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L75)

Structured container rules, one per non-empty state.

***

### raw

> `readonly` **raw**: `string`

Defined in: [compiler/src/css.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L77)

Pre-serialized CSS text ready for injection.
