[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / compileQuantizeBlock

# Function: compileQuantizeBlock()

> **compileQuantizeBlock**(`block`, `boundary`): `string`

Defined in: [vite/src/css-quantize.ts:291](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L291)

Compile a parsed [QuantizeBlock](../interfaces/QuantizeBlock.md) plus its resolved
[Boundary.Shape](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md) into CSS `@container` query rules. Delegates
to the canonical `CSSCompiler` to avoid duplicating threshold-to-query
logic.

## Parameters

### block

[`QuantizeBlock`](../interfaces/QuantizeBlock.md)

### boundary

[`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)

## Returns

`string`
