[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / CSSCompileResult

# Interface: CSSCompileResult

Defined in: compiler/dist/css.d.ts:79

Output of [CSSCompiler.compile](../variables/CSSCompiler.md#compile).

`raw` is the serialized form of `containerRules`, pre-joined so most
consumers can inject it directly into a `<style>` element without a
separate serialize call.

## Properties

### containerRules

> `readonly` **containerRules**: readonly [`CSSContainerRule`](CSSContainerRule.md)[]

Defined in: compiler/dist/css.d.ts:81

Structured container rules, one per non-empty state.

***

### raw

> `readonly` **raw**: `string`

Defined in: compiler/dist/css.d.ts:83

Pre-serialized CSS text ready for injection.

***

### selector?

> `readonly` `optional` **selector?**: `string`

Defined in: compiler/dist/css.d.ts:92

The boundary selector this result was compiled against (mirrors the
`selector` argument to [CSSCompiler.compile](../variables/CSSCompiler.md#compile); default
`.liteship-boundary`). Carried so [CSSCompiler.serialize](../variables/CSSCompiler.md#serialize) re-wraps
conditional-group bare declarations with the same selector as `raw`.
Optional for back-compat with hand-constructed results, which fall back
to the default selector.
