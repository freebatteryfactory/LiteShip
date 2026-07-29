[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / StreamRecoveryOptions

# Interface: StreamRecoveryOptions

Defined in: [web/src/stream/recovery.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L58)

Configuration for [bindRequestSnapshotRecovery](../functions/bindRequestSnapshotRecovery.md) and [runGraphNativeRecovery](../functions/runGraphNativeRecovery.md).

When `graphQueryUrl`, `mutationClient`, `cellStore`, and `patchReceiptEntries` are all
present, recovery prefers `runGraphNativeGapReplay` from `@liteship/core` (#133-full)
over the interim HTML snapshot path. Snapshot remains the permanent floor when any
of those are absent.

## Properties

### artifactId

> `readonly` **artifactId**: `string`

Defined in: [web/src/stream/recovery.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L59)

***

### cellStore?

> `readonly` `optional` **cellStore?**: [`StateCellStore`](../../../liteship/src/reactive/interfaces/StateCellStore.md)

Defined in: [web/src/stream/recovery.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L66)

StateCell store for discrete gap-replay (#133-full). Required with [patchReceiptEntries](#patchreceiptentries).

***

### chainValidation?

> `readonly` `optional` **chainValidation?**: () => [`ChainValidationOptions`](../../../liteship/src/evidence/interfaces/ChainValidationOptions.md) \| `undefined`

Defined in: [web/src/stream/recovery.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L75)

Checkpoint-attestation retention for an evicted buffer prefix (issue #150) —
a THUNK because recovery binds once while evictions keep happening: it is
resolved at recovery time so the retained suffix validates against the
CURRENT watermark checkpoint, never a bind-time snapshot.

#### Returns

[`ChainValidationOptions`](../../../liteship/src/evidence/interfaces/ChainValidationOptions.md) \| `undefined`

***

### domStale?

> `readonly` `optional` **domStale?**: () => `boolean`

Defined in: [web/src/stream/recovery.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L85)

Whether the rendered DOM is KNOWN-STALE (F-REC-3). Recovery is usually
triggered by a rejected morph, which leaves the DOM stale even after
gap-replay corrects the graph + cell store. When this returns `true`,
[runGraphNativeRecovery](../functions/runGraphNativeRecovery.md) applies fresh snapshot HTML on a successful
QUERY (`ok`/`not_modified`) instead of early-returning — so a valid-graph or
304 read still CONVERGES the DOM. Absent/`false` preserves the gap-replay
fast path (no snapshot fetch when the DOM is already fresh).

#### Returns

`boolean`

***

### drainPendingReceipts?

> `readonly` `optional` **drainPendingReceipts?**: () => `Promise`\<`void`\>

Defined in: [web/src/stream/recovery.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L95)

Await any in-flight receipt-frame attestation before recovery reads the buffer.
`recordStreamPatchReceipt` is async — it recomputes the sha256 hash to attest a
frame BEFORE appending it — so a receipt that arrives just before a morph
rejection may still be hashing when recovery fires; gap replay would then run
against a buffer missing that just-received crossing. Draining first serializes
the two: every receipt received before the trigger is buffered before the QUERY
reads it. Absent, recovery proceeds immediately (the interim floor is unaffected).

#### Returns

`Promise`\<`void`\>

***

### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: [`RuntimeEndpointPolicy`](RuntimeEndpointPolicy.md)

Defined in: [web/src/stream/recovery.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L62)

***

### graphQueryUrl?

> `readonly` `optional` **graphQueryUrl?**: `string`

Defined in: [web/src/stream/recovery.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L61)

***

### handlers

> `readonly` **handlers**: [`StreamRecoveryHandlers`](StreamRecoveryHandlers.md)

Defined in: [web/src/stream/recovery.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L64)

***

### mutationClient?

> `readonly` `optional` **mutationClient?**: [`StreamRecoveryMutationClient`](../type-aliases/StreamRecoveryMutationClient.md)

Defined in: [web/src/stream/recovery.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L63)

***

### patchReceiptEntries?

> `readonly` `optional` **patchReceiptEntries?**: readonly [`PatchReceiptEntry`](../../../liteship/src/graph/interfaces/PatchReceiptEntry.md)[]

Defined in: [web/src/stream/recovery.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L68)

Transition/receipt chain spanning the missed gap (#133-full).

***

### snapshotUrl?

> `readonly` `optional` **snapshotUrl?**: `string`

Defined in: [web/src/stream/recovery.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L60)
