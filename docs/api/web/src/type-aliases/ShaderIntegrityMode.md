[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ShaderIntegrityMode

# Type Alias: ShaderIntegrityMode

> **ShaderIntegrityMode** = `"required-for-external"` \| `"lenient"`

Defined in: [web/src/security/shader-integrity.ts:219](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L219)

Whether a shader fetched from `shaderSrc` REQUIRES an integrity pin under the
secure-by-default policy. The decision is deliberately simple and explicit:

  • An EXTERNAL shader (one actually fetched over the network — a `/`-absolute,
    protocol-relative, or scheme-absolute URL) REQUIRES a pin. An external fetch
    with NO pin is REFUSED: the bytes cross a network boundary you cannot trust
    to be untampered, so an unverified external shader must never reach the GPU.
  • An INLINE shader (the source string IS the shader — no fetch) needs no pin:
    there is no network boundary to verify, the bytes are the author's own.

`mode` lets a host RELAX this (`'lenient'`: a missing pin on an external fetch is
allowed — the pre-pin behavior) or keep the secure default (`'required-for-external'`).
It does NOT offer a mode that requires a pin on inline source (there is nothing
to verify) — the policy surface is intentionally narrow.
