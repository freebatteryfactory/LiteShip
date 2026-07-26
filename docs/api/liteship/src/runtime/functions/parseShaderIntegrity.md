[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / parseShaderIntegrity

# Function: parseShaderIntegrity()

> **parseShaderIntegrity**(`raw`): [`ShaderIntegrity`](../interfaces/ShaderIntegrity.md) \| `null`

Defined in: web/dist/security/shader-integrity.d.ts:57

Parse a `sha256-<base64>` SRI integrity string into a [ShaderIntegrity](../interfaces/ShaderIntegrity.md).
Returns `null` for a missing / empty / malformed value (e.g. an unsupported
algorithm, non-base64 payload, or a digest of the wrong length) — the caller
treats a `null` parse as "no usable pin", which the secure-by-default policy
refuses for an external fetch. A sha256 digest is exactly 32 bytes (64 hex).

## Parameters

### raw

`string` \| `null` \| `undefined`

## Returns

[`ShaderIntegrity`](../interfaces/ShaderIntegrity.md) \| `null`
