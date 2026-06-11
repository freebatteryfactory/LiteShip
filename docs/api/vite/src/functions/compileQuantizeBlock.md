[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / compileQuantizeBlock

# Function: compileQuantizeBlock()

> **compileQuantizeBlock**(`block`, `boundary`, `sheet?`): `string`

Defined in: [vite/src/css-quantize.ts:398](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L398)

Compile a parsed [QuantizeBlock](../interfaces/QuantizeBlock.md) plus its resolved
[Boundary.Shape](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md) into CSS `@container` query rules. Delegates
to the canonical `CSSCompiler` to avoid duplicating threshold-to-query
logic.

Bare declarations keep the default `.czap-boundary` selector; nested
rules each compile to their own selector inside the state's
`@container` block.

Containment: pass a shared [QuantizeSheetContext](../interfaces/QuantizeSheetContext.md) when
compiling multiple blocks from one stylesheet — viewport container
names are collected on it and the caller emits ONE aggregated `:root`
rule via [viewportContainmentRule](viewportContainmentRule.md) (`container-name` is a
replaced property, so per-block `:root` rules would overwrite each
other). Without a context, a viewport-based block inlines its own
`:root` rule (single-block convenience form). Non-viewport inputs
emit a `container-not-declared` diagnostic naming the declaration to
add.

## Parameters

### block

[`QuantizeBlock`](../interfaces/QuantizeBlock.md)

### boundary

[`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)

### sheet?

[`QuantizeSheetContext`](../interfaces/QuantizeSheetContext.md)

## Returns

`string`
