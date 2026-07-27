[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / fetchSnapshot

# Variable: fetchSnapshot

> `const` **fetchSnapshot**: (`artifactId`, `config?`) => `Promise`\<`SnapshotResponse`\>

Defined in: web/dist/stream/recovery.d.ts:76

Fetch a full snapshot (html + signals + cursor) for graph-native re-sync.

## Parameters

### artifactId

`string`

### config?

`Partial`\<`Pick`\<[`ResumptionConfig`](../interfaces/ResumptionConfig.md), `"snapshotUrl"` \| `"endpointPolicy"`\>\>

## Returns

`Promise`\<`SnapshotResponse`\>
