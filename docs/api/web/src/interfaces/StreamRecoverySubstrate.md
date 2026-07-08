[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / StreamRecoverySubstrate

# Interface: StreamRecoverySubstrate

Defined in: [web/src/stream/recovery-substrate.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L26)

Host-supplied gap-replay substrate for one streamed artifact.

## Extended by

- [`ResolvedStreamRecoverySubstrate`](ResolvedStreamRecoverySubstrate.md)

## Properties

### cellStore

> `readonly` **cellStore**: `StateCellStoreShape`

Defined in: [web/src/stream/recovery-substrate.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L32)

The host's StateCell store for discrete crossing replay.

***

### graphQueryUrl

> `readonly` **graphQueryUrl**: `string`

Defined in: [web/src/stream/recovery-substrate.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L28)

The host's QUERY read-leg endpoint (`graphQueryRoute` mount point).

***

### mutationClient

> `readonly` **mutationClient**: [`StreamRecoveryMutationClient`](../type-aliases/StreamRecoveryMutationClient.md)

Defined in: [web/src/stream/recovery-substrate.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L30)

The host's mutation client — supplies the local base and receives the adopted graph.
