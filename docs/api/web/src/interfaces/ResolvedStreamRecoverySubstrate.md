[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / ResolvedStreamRecoverySubstrate

# Interface: ResolvedStreamRecoverySubstrate

Defined in: [web/src/stream/recovery-substrate.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L50)

Substrate plus the live receipt buffer, as consumed by the stream directive.

## Extends

- [`StreamRecoverySubstrate`](StreamRecoverySubstrate.md)

## Properties

### cellStore

> `readonly` **cellStore**: [`StateCellStore`](../../../liteship/src/reactive/interfaces/StateCellStore.md)

Defined in: [web/src/stream/recovery-substrate.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L46)

The host's StateCell store for discrete crossing replay.

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`cellStore`](StreamRecoverySubstrate.md#cellstore)

***

### chainValidation?

> `readonly` `optional` **chainValidation?**: [`ChainValidationOptions`](../../../liteship/src/evidence/interfaces/ChainValidationOptions.md)

Defined in: [web/src/stream/recovery-substrate.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L63)

Checkpoint-attestation retention (issue #150). Present after the bounded
buffer evicted a prefix: `base` is the evicted watermark receipt's hash (the
`previous` of the first retained entry) and `checkpoint` is the genesis-shaped
`DAG.checkpoint` attestation minted over the dropped region AT EVICTION TIME
(the only moment the dropped envelopes are still in hand). Threading it into
gap replay lets the retained suffix pass `validateChainDetailed` without its
dropped prefix — previously a long-lived session's replay failed `not_genesis`
and every missed crossing silently degraded to the snapshot floor.

***

### graphQueryUrl

> `readonly` **graphQueryUrl**: `string`

Defined in: [web/src/stream/recovery-substrate.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L42)

The host's QUERY read-leg endpoint (`graphQueryRoute` mount point).

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`graphQueryUrl`](StreamRecoverySubstrate.md#graphqueryurl)

***

### mutationClient

> `readonly` **mutationClient**: [`StreamRecoveryMutationClient`](../type-aliases/StreamRecoveryMutationClient.md)

Defined in: [web/src/stream/recovery-substrate.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L44)

The host's mutation client — supplies the local base and receives the adopted graph.

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`mutationClient`](StreamRecoverySubstrate.md#mutationclient)

***

### patchReceiptEntries

> `readonly` **patchReceiptEntries**: readonly [`PatchReceiptEntry`](../../../liteship/src/graph/interfaces/PatchReceiptEntry.md)[]

Defined in: [web/src/stream/recovery-substrate.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L52)

LIVE bounded buffer — receipt frames recorded after binding are visible at recovery time.
