[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / ShaderIntegrity

# Interface: ShaderIntegrity

Defined in: web/dist/security/shader-integrity.d.ts:7

A parsed, author-pinned shader integrity expectation — the result of
[parseShaderIntegrity](../functions/parseShaderIntegrity.md) over a `sha256-<base64>` SRI attribute. Carries the
algorithm and the expected digest in lowercase hex (the comparison form), plus
the raw SRI string for diagnostics.

## Properties

### algo

> `readonly` **algo**: `"sha256"`

Defined in: web/dist/security/shader-integrity.d.ts:9

The hash algorithm. Only `sha256` is supported (the kernel's algorithm).

***

### expectedHex

> `readonly` **expectedHex**: `string`

Defined in: web/dist/security/shader-integrity.d.ts:11

The expected digest as 64 lowercase hex chars (decoded from the SRI base64).

***

### raw

> `readonly` **raw**: `string`

Defined in: web/dist/security/shader-integrity.d.ts:13

The raw `sha256-<base64>` SRI string, preserved for diagnostics.
