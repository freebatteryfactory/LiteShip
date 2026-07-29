[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / StreamRecoveryOptions

# Interface: StreamRecoveryOptions

Defined in: web/dist/stream/recovery.d.ts:43

Configuration for [bindRequestSnapshotRecovery](../variables/bindRequestSnapshotRecovery.md) and [runGraphNativeRecovery](../variables/runGraphNativeRecovery.md).

When `graphQueryUrl`, `mutationClient`, `cellStore`, and `patchReceiptEntries` are all
present, recovery prefers `runGraphNativeGapReplay` from `@liteship/core` (#133-full)
over the interim HTML snapshot path. Snapshot remains the permanent floor when any
of those are absent.

## Properties

### artifactId

> `readonly` **artifactId**: `string`

Defined in: web/dist/stream/recovery.d.ts:44

***

### cellStore?

> `readonly` `optional` **cellStore?**: [`StateCellStore`](../../reactive/interfaces/StateCellStore.md)

Defined in: web/dist/stream/recovery.d.ts:51

StateCell store for discrete gap-replay (#133-full). Required with [patchReceiptEntries](#patchreceiptentries).

***

### domStale?

> `readonly` `optional` **domStale?**: () => `boolean`

Defined in: web/dist/stream/recovery.d.ts:63

Whether the rendered DOM is KNOWN-STALE (F-REC-3). Recovery is usually
triggered by a rejected morph, which leaves the DOM stale even after
gap-replay corrects the graph + cell store. When this returns `true`,
[runGraphNativeRecovery](../variables/runGraphNativeRecovery.md) applies fresh snapshot HTML on a successful
QUERY (`ok`/`not_modified`) instead of early-returning — so a valid-graph or
304 read still CONVERGES the DOM. Absent/`false` preserves the gap-replay
fast path (no snapshot fetch when the DOM is already fresh).

#### Returns

`boolean`

***

### drainPendingReceipts?

> `readonly` `optional` **drainPendingReceipts?**: () => `Promise`\<`void`\>

Defined in: web/dist/stream/recovery.d.ts:73

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

Defined in: web/dist/stream/recovery.d.ts:47

***

### graphQueryUrl?

> `readonly` `optional` **graphQueryUrl?**: `string`

Defined in: web/dist/stream/recovery.d.ts:46

***

### handlers

> `readonly` **handlers**: [`StreamRecoveryHandlers`](StreamRecoveryHandlers.md)

Defined in: web/dist/stream/recovery.d.ts:49

***

### mutationClient?

> `readonly` `optional` **mutationClient?**: [`StreamRecoveryMutationClient`](../type-aliases/StreamRecoveryMutationClient.md)

Defined in: web/dist/stream/recovery.d.ts:48

***

### patchReceiptEntries?

> `readonly` `optional` **patchReceiptEntries?**: readonly [`PatchReceiptEntry`](../../graph/interfaces/PatchReceiptEntry.md)[]

Defined in: web/dist/stream/recovery.d.ts:53

Transition/receipt chain spanning the missed gap (#133-full).

***

### snapshotUrl?

> `readonly` `optional` **snapshotUrl?**: `string`

Defined in: web/dist/stream/recovery.d.ts:45
