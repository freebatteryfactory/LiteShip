[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / TopologyCoverageEntry

# Interface: TopologyCoverageEntry

Defined in: [audit/src/types.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L28)

Per-package evidence that an injected topology policy was applied.

## Properties

### coverage

> `readonly` **coverage**: `"clean"` \| `"policy-absent"`

Defined in: [audit/src/types.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L31)

`clean` when a topology policy governs this package; `policy-absent` when none exists.

***

### package

> `readonly` **package**: `string`

Defined in: [audit/src/types.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L29)
