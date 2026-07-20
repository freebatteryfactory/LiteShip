[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ExplainPayload

# Type Alias: ExplainPayload

> **ExplainPayload** = `object`

Defined in: [command/src/commands/explain.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L131)

Structured payload returned by the explain command.

## Properties

### diagnostic

> `readonly` **diagnostic**: [`ExplainDiagnostic`](../interfaces/ExplainDiagnostic.md) \| `null`

Defined in: [command/src/commands/explain.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L134)

***

### kind

> `readonly` **kind**: `"diagnostic"` \| `"symbol"` \| `"unresolved"`

Defined in: [command/src/commands/explain.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L133)

***

### query

> `readonly` **query**: `string`

Defined in: [command/src/commands/explain.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L132)

***

### symbol

> `readonly` **symbol**: [`ExplainSymbol`](ExplainSymbol.md) \| `null`

Defined in: [command/src/commands/explain.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L135)
