[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / compileQuantizeBlock

# Function: compileQuantizeBlock()

> **compileQuantizeBlock**(`block`, `boundary`, `sheet?`): `string`

Defined in: vite/dist/css-quantize.d.ts:207

Compile a parsed [QuantizeBlock](../interfaces/QuantizeBlock.md) plus its resolved
[Boundary](../../type-aliases/Boundary.md) into CSS `@container` query rules. Delegates
to the canonical `CSSCompiler` to avoid duplicating threshold-to-query
logic.

Bare declarations keep the default `.liteship-boundary` selector; nested
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

[`Boundary`](../../type-aliases/Boundary.md)

### sheet?

[`QuantizeSheetContext`](../interfaces/QuantizeSheetContext.md)

## Returns

`string`
