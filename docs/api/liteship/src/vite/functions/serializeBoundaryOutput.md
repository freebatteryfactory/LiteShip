[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / serializeBoundaryOutput

# Function: serializeBoundaryOutput()

> **serializeBoundaryOutput**(`output`): `string`

Defined in: vite/dist/boundary-manifest.d.ts:78

Serialize one deduplicated boundary output into the bytes emitted as a static
CSS asset. Theme `:root` CSS is deliberately absent: themes are a
request-time axis and stay inline/tiny, while these assets remain
theme-agnostic and content-hashed.

## Parameters

### output

`CompiledOutputs`

## Returns

`string`
