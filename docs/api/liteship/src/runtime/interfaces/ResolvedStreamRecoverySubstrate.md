[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / ResolvedStreamRecoverySubstrate

# Interface: ResolvedStreamRecoverySubstrate

Defined in: web/dist/stream/recovery-substrate.d.ts:31

Substrate plus the live receipt buffer, as consumed by the stream directive.

## Extends

- [`StreamRecoverySubstrate`](StreamRecoverySubstrate.md)

## Properties

### cellStore

> `readonly` **cellStore**: [`StateCellStoreShape`](../../reactive/interfaces/StateCellStoreShape.md)

Defined in: web/dist/stream/recovery-substrate.d.ts:28

The host's StateCell store for discrete crossing replay.

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`cellStore`](StreamRecoverySubstrate.md#cellstore)

***

### graphQueryUrl

> `readonly` **graphQueryUrl**: `string`

Defined in: web/dist/stream/recovery-substrate.d.ts:24

The host's QUERY read-leg endpoint (`graphQueryRoute` mount point).

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`graphQueryUrl`](StreamRecoverySubstrate.md#graphqueryurl)

***

### mutationClient

> `readonly` **mutationClient**: [`StreamRecoveryMutationClient`](../type-aliases/StreamRecoveryMutationClient.md)

Defined in: web/dist/stream/recovery-substrate.d.ts:26

The host's mutation client — supplies the local base and receives the adopted graph.

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`mutationClient`](StreamRecoverySubstrate.md#mutationclient)

***

### patchReceiptEntries

> `readonly` **patchReceiptEntries**: readonly [`PatchReceiptEntry`](../../graph/interfaces/PatchReceiptEntry.md)[]

Defined in: web/dist/stream/recovery-substrate.d.ts:33

LIVE bounded buffer — receipt frames recorded after binding are visible at recovery time.
