[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / QuantizeSheetContext

# Interface: QuantizeSheetContext

Defined in: vite/dist/css-quantize.d.ts:144

Sheet-level aggregation context shared across every
[compileQuantizeBlock](../functions/compileQuantizeBlock.md) call for one stylesheet.

`container-name` is a replaced (non-accumulating) property: when two
viewport-based boundaries in the same sheet each emitted their own
`:root { container-name: X }` rule, the last rule won and the earlier
boundary's `@container` queries matched nothing. Aggregating the
names here lets the caller emit ONE `:root` rule in the
space-separated multi-name form
(`container-name: viewport-width viewport-height`) via
[viewportContainmentRule](../functions/viewportContainmentRule.md), so every query keeps a matching
container.

## Properties

### viewportContainerNames

> `readonly` **viewportContainerNames**: `Set`\<`string`\>

Defined in: vite/dist/css-quantize.d.ts:146

Viewport container names collected across the sheet's blocks.
