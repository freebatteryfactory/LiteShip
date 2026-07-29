[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / StreamRecoverySubstrate

# Interface: StreamRecoverySubstrate

Defined in: web/dist/stream/recovery-substrate.d.ts:22

Host-supplied gap-replay substrate for one streamed artifact.

## Extended by

- [`ResolvedStreamRecoverySubstrate`](ResolvedStreamRecoverySubstrate.md)

## Properties

### cellStore

> `readonly` **cellStore**: [`StateCellStore`](../../reactive/interfaces/StateCellStore.md)

Defined in: web/dist/stream/recovery-substrate.d.ts:28

The host's StateCell store for discrete crossing replay.

***

### graphQueryUrl

> `readonly` **graphQueryUrl**: `string`

Defined in: web/dist/stream/recovery-substrate.d.ts:24

The host's QUERY read-leg endpoint (`graphQueryRoute` mount point).

***

### mutationClient

> `readonly` **mutationClient**: [`StreamRecoveryMutationClient`](../type-aliases/StreamRecoveryMutationClient.md)

Defined in: web/dist/stream/recovery-substrate.d.ts:26

The host's mutation client — supplies the local base and receives the adopted graph.
