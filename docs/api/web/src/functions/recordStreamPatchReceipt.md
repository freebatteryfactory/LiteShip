[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / recordStreamPatchReceipt

# Function: recordStreamPatchReceipt()

> **recordStreamPatchReceipt**(`artifactId`, `frame`): `Promise`\<`boolean`\>

Defined in: [web/src/stream/recovery-substrate.ts:177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L177)

Record a receipt frame from the SSE stream into the artifact's live buffer.
Async because the attestation-check recomputes the sha256 receipt hash
(`crypto.subtle`). Returns `true` when recorded. Frames for unregistered
artifacts are ignored (no substrate → snapshot floor, nothing to feed);
frames that fail attestation warn loudly and are NOT buffered.

## Parameters

### artifactId

`string`

### frame

`unknown`

## Returns

`Promise`\<`boolean`\>
