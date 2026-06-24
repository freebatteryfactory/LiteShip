[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / IntegrityResult

# Type Alias: IntegrityResult

> **IntegrityResult** = \{ `_tag`: `"verified"`; `algo`: `"sha256"`; `content`: `string`; `digestHex`: `string`; \} \| \{ `_tag`: `"mismatch"`; `actualHex`: `string`; `algo`: `"sha256"`; `expectedHex`: `string`; \} \| \{ `_tag`: `"absent"`; \}

Defined in: [web/src/security/shader-integrity.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L58)

The outcome of [verifyShaderIntegrity](../functions/verifyShaderIntegrity.md). A discriminated `_tag` the caller
branches on — the runtime proceeds ONLY on `'verified'`.

  • `'verified'` — the fetched bytes hash to the author-pinned digest. Carries
    the VERIFIED content so the caller compiles the value that PASSED THROUGH
    this check (the taint-breaking sanitizer output), not the raw fetched bytes.
  • `'mismatch'` — the bytes do NOT match the pin. This is a SECURITY EVENT: the
    shader was tampered with / the origin was compromised. Carries both digests
    so the caller can report precisely what diverged.
  • `'absent'` — no integrity hash was supplied. Whether this REFUSES depends on
    the policy ([decideShaderIntegrity](../functions/decideShaderIntegrity.md)); secure-by-default refuses an
    external fetch with no pin.
