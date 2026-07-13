[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ResolvedStreamRecoverySubstrate

# Interface: ResolvedStreamRecoverySubstrate

Defined in: [web/src/stream/recovery-substrate.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L44)

Substrate plus the live receipt buffer, as consumed by the stream directive.

## Extends

- [`StreamRecoverySubstrate`](StreamRecoverySubstrate.md)

## Properties

### cellStore

> `readonly` **cellStore**: `StateCellStoreShape`

Defined in: [web/src/stream/recovery-substrate.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L40)

The host's StateCell store for discrete crossing replay.

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`cellStore`](StreamRecoverySubstrate.md#cellstore)

***

### graphQueryUrl

> `readonly` **graphQueryUrl**: `string`

Defined in: [web/src/stream/recovery-substrate.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L36)

The host's QUERY read-leg endpoint (`graphQueryRoute` mount point).

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`graphQueryUrl`](StreamRecoverySubstrate.md#graphqueryurl)

***

### mutationClient

> `readonly` **mutationClient**: [`StreamRecoveryMutationClient`](../type-aliases/StreamRecoveryMutationClient.md)

Defined in: [web/src/stream/recovery-substrate.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L38)

The host's mutation client — supplies the local base and receives the adopted graph.

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`mutationClient`](StreamRecoverySubstrate.md#mutationclient)

***

### patchReceiptEntries

> `readonly` **patchReceiptEntries**: readonly `PatchReceiptEntry`[]

Defined in: [web/src/stream/recovery-substrate.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L46)

LIVE bounded buffer — receipt frames recorded after binding are visible at recovery time.
