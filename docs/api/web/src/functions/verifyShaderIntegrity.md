[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / verifyShaderIntegrity

# Function: verifyShaderIntegrity()

> **verifyShaderIntegrity**(`content`, `expected`): [`IntegrityResult`](../type-aliases/IntegrityResult.md)

Defined in: [web/src/security/shader-integrity.ts:211](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L211)

Verify that `content` (the fetched shader BYTES, as text) matches the
author-pinned `expected` digest. The CONTENT sanitizer on the shader data path:
the runtime compiles the `verified` content this returns, so a value that
reaches `gl.shaderSource` / `createShaderModule` has provably passed this check.

  • `expected === null` → `{ _tag: 'absent' }` (no pin supplied).
  • the sha256 of the UTF-8 content matches → `{ _tag: 'verified', content, … }`.
  • it does NOT match → `{ _tag: 'mismatch', … }` (a SECURITY event).

Deterministic: the same `content` + `expected` always yield the same result
(UTF-8 `TextEncoder` bytes → the kernel sha256 → a fixed hex digest). Never
throws — the caller branches on the `_tag`.

## Parameters

### content

`string`

The fetched shader source text (the untrusted bytes).

### expected

[`ShaderIntegrity`](../interfaces/ShaderIntegrity.md) \| `null`

The parsed author-pinned hash, or `null` when none was supplied.

## Returns

[`IntegrityResult`](../type-aliases/IntegrityResult.md)
