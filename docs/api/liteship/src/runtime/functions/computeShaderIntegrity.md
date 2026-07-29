[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / computeShaderIntegrity

# Function: computeShaderIntegrity()

> **computeShaderIntegrity**(`content`): `string`

Defined in: web/dist/security/shader-integrity.d.ts:49

Compute the author SRI pin (`sha256-<base64>`) for shader source text — the
source→hash producer paired with [parseShaderIntegrity](parseShaderIntegrity.md) /
[verifyShaderIntegrity](verifyShaderIntegrity.md). Uses the SAME sha256 content-address kernel
(`AddressedDigest`, not fnv1a): UTF-8 bytes → sha256 → SRI base64.
Deterministic: the same source always yields the same pin.

## Parameters

### content

`string`

## Returns

`string`
