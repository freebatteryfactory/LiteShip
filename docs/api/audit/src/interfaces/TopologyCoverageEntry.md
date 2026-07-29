[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / TopologyCoverageEntry

# Interface: TopologyCoverageEntry

Defined in: [audit/src/types.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L41)

Per-package evidence that an injected topology policy was applied.

## Properties

### coverage

> `readonly` **coverage**: `"clean"` \| `"policy-absent"`

Defined in: [audit/src/types.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L44)

`clean` when a topology policy governs this package; `policy-absent` when none exists.

***

### package

> `readonly` **package**: `string`

Defined in: [audit/src/types.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L42)
