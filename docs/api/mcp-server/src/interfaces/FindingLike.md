[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / FindingLike

# Interface: FindingLike

Defined in: [mcp-server/src/lsp/types.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L52)

The structural finding the projections read. The real `@czap/gauntlet`
`Finding` is assignable to this (same field names + types). Declaring it here
— instead of importing the engine type — keeps `@czap/mcp-server` free of a
`@czap/gauntlet` dependency (the lean-server invariant). The injected runner
supplies values that satisfy this shape.

## Properties

### detail

> `readonly` **detail**: `string`

Defined in: [mcp-server/src/lsp/types.ts:57](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L57)

***

### level

> `readonly` **level**: [`FindingLevel`](../type-aliases/FindingLevel.md)

Defined in: [mcp-server/src/lsp/types.ts:55](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L55)

***

### location?

> `readonly` `optional` **location?**: [`FindingLocationLike`](FindingLocationLike.md)

Defined in: [mcp-server/src/lsp/types.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L58)

***

### remediation?

> `readonly` `optional` **remediation?**: [`FindingRemediationLike`](../type-aliases/FindingRemediationLike.md)

Defined in: [mcp-server/src/lsp/types.ts:59](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L59)

***

### ruleId

> `readonly` **ruleId**: `string`

Defined in: [mcp-server/src/lsp/types.ts:53](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L53)

***

### severity

> `readonly` **severity**: [`FindingSeverity`](../type-aliases/FindingSeverity.md)

Defined in: [mcp-server/src/lsp/types.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L54)

***

### title

> `readonly` **title**: `string`

Defined in: [mcp-server/src/lsp/types.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L56)
