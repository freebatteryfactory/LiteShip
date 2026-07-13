[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ResolvedStreamRecoverySubstrate

# Interface: ResolvedStreamRecoverySubstrate

Defined in: [web/src/stream/recovery-substrate.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L37)

Substrate plus the live receipt buffer, as consumed by the stream directive.

## Extends

- [`StreamRecoverySubstrate`](StreamRecoverySubstrate.md)

## Properties

### cellStore

> `readonly` **cellStore**: `StateCellStoreShape`

Defined in: [web/src/stream/recovery-substrate.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L33)

The host's StateCell store for discrete crossing replay.

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`cellStore`](StreamRecoverySubstrate.md#cellstore)

***

### graphQueryUrl

> `readonly` **graphQueryUrl**: `string`

Defined in: [web/src/stream/recovery-substrate.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L29)

The host's QUERY read-leg endpoint (`graphQueryRoute` mount point).

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`graphQueryUrl`](StreamRecoverySubstrate.md#graphqueryurl)

***

### mutationClient

> `readonly` **mutationClient**: [`StreamRecoveryMutationClient`](../type-aliases/StreamRecoveryMutationClient.md)

Defined in: [web/src/stream/recovery-substrate.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L31)

The host's mutation client — supplies the local base and receives the adopted graph.

#### Inherited from

[`StreamRecoverySubstrate`](StreamRecoverySubstrate.md).[`mutationClient`](StreamRecoverySubstrate.md#mutationclient)

***

### patchReceiptEntries

> `readonly` **patchReceiptEntries**: readonly `PatchReceiptEntry`[]

Defined in: [web/src/stream/recovery-substrate.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L39)

LIVE bounded buffer — receipt frames recorded after binding are visible at recovery time.
