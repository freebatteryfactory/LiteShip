[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / ApplyVerifiablePatchResult

# Type Alias: ApplyVerifiablePatchResult

> **ApplyVerifiablePatchResult** = \{ `_tag`: `"applied"`; `appliedDigest`: [`AddressedDigest`](../../evidence/type-aliases/AddressedDigest.md); `envelope`: [`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md); `tier`: [`DpuTier`](DpuTier.md); \} \| \{ `_tag`: `"refused"`; `verification`: `Exclude`\<[`VerifiablePatchVerification`](VerifiablePatchVerification.md), \{ `_tag`: `"verified"`; \}\>; \} \| \{ `_tag`: `"sanitizedEmpty"`; `envelope`: [`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md); \}

Defined in: web/dist/watch-and-prepare.d.ts:75

Outcome of applying a verifiable patch. `applied` carries the digest of the
DOM serialization actually rendered (post-sanitization); `sanitizedEmpty`
reports — loudly, without touching the DOM — that sanitization would strip
the entire fragment (e.g. `<script>…</script>`), so "applied" would have
advertised a verified patch over unchanged stale content.

## Union Members

### Type Literal

\{ `_tag`: `"applied"`; `appliedDigest`: [`AddressedDigest`](../../evidence/type-aliases/AddressedDigest.md); `envelope`: [`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md); `tier`: [`DpuTier`](DpuTier.md); \}

#### \_tag

> `readonly` **\_tag**: `"applied"`

#### appliedDigest

> `readonly` **appliedDigest**: [`AddressedDigest`](../../evidence/type-aliases/AddressedDigest.md)

sha256 digest of `target.innerHTML` after apply — what the DOM attribute attests.

#### envelope

> `readonly` **envelope**: [`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md)

#### tier

> `readonly` **tier**: [`DpuTier`](DpuTier.md)

***

### Type Literal

\{ `_tag`: `"refused"`; `verification`: `Exclude`\<[`VerifiablePatchVerification`](VerifiablePatchVerification.md), \{ `_tag`: `"verified"`; \}\>; \}

***

### Type Literal

\{ `_tag`: `"sanitizedEmpty"`; `envelope`: [`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md); \}
