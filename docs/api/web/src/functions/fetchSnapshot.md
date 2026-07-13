[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / fetchSnapshot

# Function: fetchSnapshot()

> **fetchSnapshot**(`artifactId`, `config?`): `Effect`\<\{ `html`: `string`; `lastEventId`: `string`; `signals`: `unknown`; `type`: `"snapshot"`; \}, `LiteShipError`\>

Defined in: [web/src/stream/recovery.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L107)

Fetch a full snapshot (html + signals + cursor) for graph-native re-sync.

## Parameters

### artifactId

`string`

### config?

`Partial`\<`Pick`\<[`ResumptionConfig`](../interfaces/ResumptionConfig.md), `"snapshotUrl"` \| `"endpointPolicy"`\>\>

## Returns

`Effect`\<\{ `html`: `string`; `lastEventId`: `string`; `signals`: `unknown`; `type`: `"snapshot"`; \}, `LiteShipError`\>
