[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / StreamRecoveryOptions

# Interface: StreamRecoveryOptions

Defined in: [web/src/stream/recovery.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L39)

Configuration for [bindRequestSnapshotRecovery](../functions/bindRequestSnapshotRecovery.md) and [runGraphNativeRecovery](../functions/runGraphNativeRecovery.md).

When `graphQueryUrl`, `mutationClient`, `cellStore`, and `patchReceiptEntries` are all
present, recovery prefers `runGraphNativeGapReplay` from `@czap/core` (#133-full)
over the interim HTML snapshot path. Snapshot remains the permanent floor when any
of those are absent.

## Properties

### artifactId

> `readonly` **artifactId**: `string`

Defined in: [web/src/stream/recovery.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L40)

***

### cellStore?

> `readonly` `optional` **cellStore?**: `StateCellStoreShape`

Defined in: [web/src/stream/recovery.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L47)

StateCell store for discrete gap-replay (#133-full). Required with [patchReceiptEntries](#patchreceiptentries).

***

### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: [`RuntimeEndpointPolicy`](RuntimeEndpointPolicy.md)

Defined in: [web/src/stream/recovery.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L43)

***

### graphQueryUrl?

> `readonly` `optional` **graphQueryUrl?**: `string`

Defined in: [web/src/stream/recovery.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L42)

***

### handlers

> `readonly` **handlers**: [`StreamRecoveryHandlers`](StreamRecoveryHandlers.md)

Defined in: [web/src/stream/recovery.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L45)

***

### mutationClient?

> `readonly` `optional` **mutationClient?**: [`StreamRecoveryMutationClient`](../type-aliases/StreamRecoveryMutationClient.md)

Defined in: [web/src/stream/recovery.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L44)

***

### patchReceiptEntries?

> `readonly` `optional` **patchReceiptEntries?**: readonly `PatchReceiptEntry`[]

Defined in: [web/src/stream/recovery.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L49)

Patch/receipt chain spanning the missed gap (#133-full).

***

### snapshotUrl?

> `readonly` `optional` **snapshotUrl?**: `string`

Defined in: [web/src/stream/recovery.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L41)
