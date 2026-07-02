[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / serializeBoundaryOutput

# Function: serializeBoundaryOutput()

> **serializeBoundaryOutput**(`output`): `string`

Defined in: [vite/src/boundary-manifest.ts:476](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/boundary-manifest.ts#L476)

Serialize one deduplicated boundary output into the bytes emitted as a static
CSS asset. Theme `:root` CSS is deliberately absent: themes are a
request-time axis and stay inline/tiny, while these assets remain
theme-agnostic and content-hashed.

## Parameters

### output

`CompiledOutputs`

## Returns

`string`
