[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / computeShaderIntegrity

# Function: computeShaderIntegrity()

> **computeShaderIntegrity**(`content`): `string`

Defined in: [web/src/security/shader-integrity.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L147)

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
