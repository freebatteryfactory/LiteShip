[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ResolvedStreamRecoverySubstrate

# Interface: ResolvedStreamRecoverySubstrate

Defined in: [web/src/stream/recovery-substrate.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L36)

Substrate plus the live receipt buffer, as consumed by the stream directive.

## Extends

- [`StreamRecoverySubstrate`](StreamRecoverySubstrate.md)

## Properties

### cellStore

> `readonly` **cellStore**: `StateCellStoreShape`

Defined in: [web/src/stream/recovery-substrate.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L32)

The host's StateCell store for discrete crossing replay.

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`cellStore`](StreamRecoverySubstrate.md#cellstore)

***

### graphQueryUrl

> `readonly` **graphQueryUrl**: `string`

Defined in: [web/src/stream/recovery-substrate.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L28)

The host's QUERY read-leg endpoint (`graphQueryRoute` mount point).

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`graphQueryUrl`](StreamRecoverySubstrate.md#graphqueryurl)

***

### mutationClient

> `readonly` **mutationClient**: [`StreamRecoveryMutationClient`](../type-aliases/StreamRecoveryMutationClient.md)

Defined in: [web/src/stream/recovery-substrate.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L30)

The host's mutation client — supplies the local base and receives the adopted graph.

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`mutationClient`](StreamRecoverySubstrate.md#mutationclient)

***

### patchReceiptEntries

> `readonly` **patchReceiptEntries**: readonly `PatchReceiptEntry`[]

Defined in: [web/src/stream/recovery-substrate.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L38)

LIVE bounded buffer — receipt frames recorded after binding are visible at recovery time.
