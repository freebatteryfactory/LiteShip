[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / runGraphNativeRecovery

# Function: runGraphNativeRecovery()

> **runGraphNativeRecovery**(`options`): `Promise`\<`void`\>

Defined in: [web/src/stream/recovery.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L143)

Full graph-native recovery (#133).

Prefer QUERY + patch/receipt discrete replay when the host supplies the full
substrate (`graphQueryUrl` + `mutationClient` + `cellStore` + `patchReceiptEntries`).
Otherwise fall through to interim snapshot re-sync (permanent floor).

## Parameters

### options

[`StreamRecoveryOptions`](../interfaces/StreamRecoveryOptions.md)

## Returns

`Promise`\<`void`\>
