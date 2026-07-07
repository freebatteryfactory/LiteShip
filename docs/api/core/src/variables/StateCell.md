[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / StateCell

# Variable: StateCell

> **StateCell**: `object`

Defined in: [core/src/state-cell.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L27)

StateCell — frozen authority snapshot helpers.

## Type Declaration

### isReplayable

> **isReplayable**: (`cell`) => `boolean`

Whether a cell may enter graph patch / receipt replay paths.

#### Parameters

##### cell

[`StateCell`](../interfaces/StateCell.md)

#### Returns

`boolean`

### snapshot

> **snapshot**: (`name`, `kind`, `authority`, `state`, `stateIndex`, `dirtyEpoch`, `generation`, `value?`) => [`StateCell`](../interfaces/StateCell.md) = `makeCell`

Build a frozen snapshot directly (tests, hydration, receipts).

#### Parameters

##### name

`string`

##### kind

[`StateCellKind`](../type-aliases/StateCellKind.md)

##### authority

[`StateAuthority`](../type-aliases/StateAuthority.md)

##### state

`string`

##### stateIndex

`number`

##### dirtyEpoch

`number`

##### generation

`number`

##### value?

`number`

#### Returns

[`StateCell`](../interfaces/StateCell.md)

### fromResolved()

> **fromResolved**(`entry`, `authority?`, `states?`): [`StateCell`](../interfaces/StateCell.md)

Build from a worker/bootstrap resolved-state entry.

#### Parameters

##### entry

[`ResolvedStateSnapshot`](../interfaces/ResolvedStateSnapshot.md)

##### authority?

[`StateAuthority`](../type-aliases/StateAuthority.md) = `'quantizer'`

##### states?

readonly `string`[] = `...`

#### Returns

[`StateCell`](../interfaces/StateCell.md)
