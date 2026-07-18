[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [canonical/src](../README.md) / sha256Hex

# Function: sha256Hex()

> **sha256Hex**(`input`): `string`

Defined in: [canonical/src/addressed-digest.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/addressed-digest.ts#L39)

SHA-256 of `input` as PLAIN lowercase hex — no `sha256:` label. The hex HALF
of [addressedDigestOf](addressedDigestOf.md)'s `integrity_digest`, for slug consumers that
need a bare digest string. The labeled `sha256:`-prefixed receipt form
(identity-law #3, ADR-0011) stays SEPARATE — this is not a merge of it.
String inputs are hashed as their UTF-8 bytes.

## Parameters

### input

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

## Returns

`string`
