[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSCompileResult

# Interface: CSSCompileResult

Defined in: [compiler/src/css.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L72)

Output of [CSSCompiler.compile](../variables/CSSCompiler.md#compile).

`raw` is the serialized form of `containerRules`, pre-joined so most
consumers can inject it directly into a `<style>` element without a
separate serialize call.

## Properties

### containerRules

> `readonly` **containerRules**: readonly [`CSSContainerRule`](CSSContainerRule.md)[]

Defined in: [compiler/src/css.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L74)

Structured container rules, one per non-empty state.

***

### raw

> `readonly` **raw**: `string`

Defined in: [compiler/src/css.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L76)

Pre-serialized CSS text ready for injection.
