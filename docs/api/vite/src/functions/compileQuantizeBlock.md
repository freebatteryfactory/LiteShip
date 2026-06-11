[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / compileQuantizeBlock

# Function: compileQuantizeBlock()

> **compileQuantizeBlock**(`block`, `boundary`): `string`

Defined in: [vite/src/css-quantize.ts:333](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L333)

Compile a parsed [QuantizeBlock](../interfaces/QuantizeBlock.md) plus its resolved
[Boundary.Shape](#) into CSS `@container` query rules. Delegates
to the canonical `CSSCompiler` to avoid duplicating threshold-to-query
logic.

Bare declarations keep the default `.czap-boundary` selector; nested
rules each compile to their own selector inside the state's
`@container` block. For viewport-based boundaries the output also
declares `:root` as the named query container; other inputs emit a
`container-not-declared` diagnostic naming the declaration to add.

## Parameters

### block

[`QuantizeBlock`](../interfaces/QuantizeBlock.md)

### boundary

[`Shape`](#)

## Returns

`string`
