[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / StreamRecoverySubstrate

# Interface: StreamRecoverySubstrate

Defined in: [web/src/stream/recovery-substrate.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L34)

Host-supplied gap-replay substrate for one streamed artifact.

## Extended by

- [`ResolvedStreamRecoverySubstrate`](ResolvedStreamRecoverySubstrate.md)

## Properties

### cellStore

> `readonly` **cellStore**: `StateCellStoreShape`

Defined in: [web/src/stream/recovery-substrate.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L40)

The host's StateCell store for discrete crossing replay.

***

### graphQueryUrl

> `readonly` **graphQueryUrl**: `string`

Defined in: [web/src/stream/recovery-substrate.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L36)

The host's QUERY read-leg endpoint (`graphQueryRoute` mount point).

***

### mutationClient

> `readonly` **mutationClient**: [`StreamRecoveryMutationClient`](../type-aliases/StreamRecoveryMutationClient.md)

Defined in: [web/src/stream/recovery-substrate.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L38)

The host's mutation client — supplies the local base and receives the adopted graph.
