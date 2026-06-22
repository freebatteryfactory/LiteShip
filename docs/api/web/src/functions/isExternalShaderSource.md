[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / isExternalShaderSource

# Function: isExternalShaderSource()

> **isExternalShaderSource**(`shaderSrc`): `boolean`

Defined in: [web/src/security/shader-integrity.ts:230](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L230)

Does `shaderSrc` denote an EXTERNAL (network-fetched) shader, as opposed to an
inline source string? Mirrors the runtime's own fetch decision (`/`-absolute,
protocol-relative `//`, or scheme-absolute `http(s):`). An inline GLSL/WGSL
source — a multi-line shader body — is NOT external.

## Parameters

### shaderSrc

`string`

## Returns

`boolean`
