[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ReplayableRecoveryCell

# Type Alias: ReplayableRecoveryCell

> **ReplayableRecoveryCell** = [`StateCell`](../interfaces/StateCell.md) & `object`

Defined in: [core/src/reactive/stream-recovery.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/stream-recovery.ts#L18)

Only discrete/replayable cells may enter graph-native recovery paths (#133).

## Type Declaration

### kind

> `readonly` **kind**: `"discrete"`

### replayable

> `readonly` **replayable**: `true`
