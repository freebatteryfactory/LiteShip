[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [mcp-server/src](../README.md) / FindingLike

# Interface: FindingLike

Defined in: [mcp-server/src/lsp/types.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L59)

The structural finding the projections read. The real `@liteship/gauntlet`
`Finding` is assignable to this (same field names + types). Declaring it here
— instead of importing the engine type — keeps `@liteship/mcp-server` free of a
`@liteship/gauntlet` dependency (the lean-server invariant). The injected runner
supplies values that satisfy this shape.

## Properties

### detail

> `readonly` **detail**: `string`

Defined in: [mcp-server/src/lsp/types.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L64)

***

### level

> `readonly` **level**: [`FindingLevel`](../type-aliases/FindingLevel.md)

Defined in: [mcp-server/src/lsp/types.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L62)

***

### location?

> `readonly` `optional` **location?**: [`FindingLocationLike`](FindingLocationLike.md)

Defined in: [mcp-server/src/lsp/types.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L65)

***

### remediation?

> `readonly` `optional` **remediation?**: [`FindingRemediationLike`](../type-aliases/FindingRemediationLike.md)

Defined in: [mcp-server/src/lsp/types.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L66)

***

### ruleId

> `readonly` **ruleId**: `string`

Defined in: [mcp-server/src/lsp/types.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L60)

***

### severity

> `readonly` **severity**: [`FindingSeverity`](../type-aliases/FindingSeverity.md)

Defined in: [mcp-server/src/lsp/types.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L61)

***

### title

> `readonly` **title**: `string`

Defined in: [mcp-server/src/lsp/types.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L63)
