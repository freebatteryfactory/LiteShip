[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ApplyVerifiablePatchResult

# Type Alias: ApplyVerifiablePatchResult

> **ApplyVerifiablePatchResult** = \{ `_tag`: `"applied"`; `appliedDigest`: `AddressedDigest`; `envelope`: [`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md); `rung`: [`DpuRung`](DpuRung.md); \} \| \{ `_tag`: `"refused"`; `verification`: `Exclude`\<[`VerifiablePatchVerification`](VerifiablePatchVerification.md), \{ `_tag`: `"verified"`; \}\>; \} \| \{ `_tag`: `"sanitizedEmpty"`; `envelope`: [`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md); \}

Defined in: [web/src/dpu/watch-and-prepare.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L71)

Outcome of applying a verifiable patch. `applied` carries the digest of the
DOM serialization actually rendered (post-sanitization); `sanitizedEmpty`
reports — loudly, without touching the DOM — that sanitization would strip
the entire fragment (e.g. `<script>…</script>`), so "applied" would have
advertised a verified patch over unchanged stale content.

## Union Members

### Type Literal

\{ `_tag`: `"applied"`; `appliedDigest`: `AddressedDigest`; `envelope`: [`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md); `rung`: [`DpuRung`](DpuRung.md); \}

#### \_tag

> `readonly` **\_tag**: `"applied"`

#### appliedDigest

> `readonly` **appliedDigest**: `AddressedDigest`

sha256 digest of `target.innerHTML` after apply — what the DOM attribute attests.

#### envelope

> `readonly` **envelope**: [`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md)

#### rung

> `readonly` **rung**: [`DpuRung`](DpuRung.md)

***

### Type Literal

\{ `_tag`: `"refused"`; `verification`: `Exclude`\<[`VerifiablePatchVerification`](VerifiablePatchVerification.md), \{ `_tag`: `"verified"`; \}\>; \}

***

### Type Literal

\{ `_tag`: `"sanitizedEmpty"`; `envelope`: [`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md); \}
