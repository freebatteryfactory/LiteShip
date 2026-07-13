[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSCompileResult

# Interface: CSSCompileResult

Defined in: [compiler/src/css.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L92)

Output of [CSSCompiler.compile](../variables/CSSCompiler.md#compile).

`raw` is the serialized form of `containerRules`, pre-joined so most
consumers can inject it directly into a `<style>` element without a
separate serialize call.

## Properties

### containerRules

> `readonly` **containerRules**: readonly [`CSSContainerRule`](CSSContainerRule.md)[]

Defined in: [compiler/src/css.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L94)

Structured container rules, one per non-empty state.

***

### raw

> `readonly` **raw**: `string`

Defined in: [compiler/src/css.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L96)

Pre-serialized CSS text ready for injection.

***

### selector?

> `readonly` `optional` **selector?**: `string`

Defined in: [compiler/src/css.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L105)

The boundary selector this result was compiled against (mirrors the
`selector` argument to [CSSCompiler.compile](../variables/CSSCompiler.md#compile); default
`.czap-boundary`). Carried so [CSSCompiler.serialize](../variables/CSSCompiler.md#serialize) re-wraps
conditional-group bare declarations with the same selector as `raw`.
Optional for back-compat with hand-constructed results, which fall back
to the default selector.
