[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ShaderIntegrity

# Interface: ShaderIntegrity

Defined in: [web/src/security/shader-integrity.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L36)

A parsed, author-pinned shader integrity expectation — the result of
[parseShaderIntegrity](../functions/parseShaderIntegrity.md) over a `sha256-<base64>` SRI attribute. Carries the
algorithm and the expected digest in lowercase hex (the comparison form), plus
the raw SRI string for diagnostics.

## Properties

### algo

> `readonly` **algo**: `"sha256"`

Defined in: [web/src/security/shader-integrity.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L38)

The hash algorithm. Only `sha256` is supported (the kernel's algorithm).

***

### expectedHex

> `readonly` **expectedHex**: `string`

Defined in: [web/src/security/shader-integrity.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L40)

The expected digest as 64 lowercase hex chars (decoded from the SRI base64).

***

### raw

> `readonly` **raw**: `string`

Defined in: [web/src/security/shader-integrity.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L42)

The raw `sha256-<base64>` SRI string, preserved for diagnostics.
