[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / SchemaDecoder

# Type Alias: SchemaDecoder\<A, I\>

> **SchemaDecoder**\<`A`, `I`\> = (`schema`, `value`) => [`KernelDecodeResult`](KernelDecodeResult.md)\<`A`\>

Defined in: core/dist/schema/standard.d.ts:42

A strict decoder: schema + `unknown` → typed-or-issues (the shape of `decode`).

## Type Parameters

### A

`A`

### I

`I`

## Parameters

### schema

[`Schema`](../interfaces/Schema.md)\<`A`, `I`\>

### value

`unknown`

## Returns

[`KernelDecodeResult`](KernelDecodeResult.md)\<`A`\>
