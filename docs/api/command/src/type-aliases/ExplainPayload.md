[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / ExplainPayload

# Type Alias: ExplainPayload

> **ExplainPayload** = `object`

Defined in: [command/src/commands/explain.ts:139](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L139)

Structured payload returned by the explain command.

## Properties

### diagnostic

> `readonly` **diagnostic**: [`ExplainDiagnostic`](../interfaces/ExplainDiagnostic.md) \| `null`

Defined in: [command/src/commands/explain.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L142)

***

### kind

> `readonly` **kind**: `"diagnostic"` \| `"symbol"` \| `"unresolved"`

Defined in: [command/src/commands/explain.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L141)

***

### query

> `readonly` **query**: `string`

Defined in: [command/src/commands/explain.ts:140](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L140)

***

### symbol

> `readonly` **symbol**: [`ExplainSymbol`](../interfaces/ExplainSymbol.md) \| `null`

Defined in: [command/src/commands/explain.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L143)
