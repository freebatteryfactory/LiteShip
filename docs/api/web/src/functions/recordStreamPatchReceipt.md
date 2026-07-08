[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / recordStreamPatchReceipt

# Function: recordStreamPatchReceipt()

> **recordStreamPatchReceipt**(`artifactId`, `frame`): `boolean`

Defined in: [web/src/stream/recovery-substrate.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L115)

Record a receipt frame from the SSE stream into the artifact's live buffer.
Returns `true` when recorded. Frames for unregistered artifacts are ignored
(no substrate → snapshot floor, nothing to feed); malformed frames warn loudly
— a server emitting `receipt` events that do not parse as patch/receipt pairs
is a wiring bug, not a condition to launder.

## Parameters

### artifactId

`string`

### frame

`unknown`

## Returns

`boolean`
