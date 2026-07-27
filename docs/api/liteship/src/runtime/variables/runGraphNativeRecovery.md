[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / runGraphNativeRecovery

# Variable: runGraphNativeRecovery

> `const` **runGraphNativeRecovery**: (`options`) => `Promise`\<`void`\>

Defined in: web/dist/stream/recovery.d.ts:88

Full graph-native recovery (#133).

Prefer QUERY + patch/receipt discrete replay when the host supplies the full
substrate (`graphQueryUrl` + `mutationClient` + `cellStore` + `patchReceiptEntries`).
Otherwise fall through to interim snapshot re-sync (permanent floor).

## Parameters

### options

[`StreamRecoveryOptions`](../interfaces/StreamRecoveryOptions.md)

## Returns

`Promise`\<`void`\>
