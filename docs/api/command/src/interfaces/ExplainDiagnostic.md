[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ExplainDiagnostic

# Interface: ExplainDiagnostic

Defined in: [command/src/commands/explain.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L72)

The resolved meaning of a diagnostic code — the `DiagnosticEntry` fields plus its [ExplainEmitter](ExplainEmitter.md).

## Properties

### area

> `readonly` **area**: `"error"` \| `"cli"` \| `"gauntlet"` \| `"audit"` \| `"schema"` \| `"check"` \| `"core"` \| `"compiler"` \| `"detect"` \| `"genui"` \| `"astro"` \| `"migrate"`

Defined in: [command/src/commands/explain.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L74)

***

### code

> `readonly` **code**: `string`

Defined in: [command/src/commands/explain.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L73)

***

### emitter

> `readonly` **emitter**: [`ExplainEmitter`](ExplainEmitter.md)

Defined in: [command/src/commands/explain.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L78)

***

### explanation

> `readonly` **explanation**: `string`

Defined in: [command/src/commands/explain.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L76)

***

### remediation

> `readonly` **remediation**: `string`

Defined in: [command/src/commands/explain.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L77)

***

### title

> `readonly` **title**: `string`

Defined in: [command/src/commands/explain.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L75)
