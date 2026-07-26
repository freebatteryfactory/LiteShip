[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / standardResultOf

# Function: standardResultOf()

> **standardResultOf**\<`A`\>(`result`): `Result`\<`A`\>

Defined in: core/dist/schema/standard.d.ts:53

Map a kernel [KernelDecodeResult](../type-aliases/KernelDecodeResult.md) to a Standard Schema V1 validate
result: a success carries `{ value }`; a failure carries `{ issues }` whose
every entry is `{ message, path:[{key}, …] }` — the decode path lowered to
Standard's `PathSegment` list, so a consumer sees the exact offending field.
The `message` is the issue's machine `code` (the stable, decoder-owned reason).

## Type Parameters

### A

`A`

## Parameters

### result

[`KernelDecodeResult`](../type-aliases/KernelDecodeResult.md)\<`A`\>

## Returns

`Result`\<`A`\>
