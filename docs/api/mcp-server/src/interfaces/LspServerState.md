[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / LspServerState

# Interface: LspServerState

Defined in: [mcp-server/src/lsp/server.ts:206](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L206)

The server's mutable lifecycle state. Composition-over-inheritance: this is a
DATA record threaded through [handle](../functions/handleLspMessage.md), not an object with methods. The
findings from the last `liteship/check` are cached so a follow-up `codeAction`
request resolves remediations against the same fold the diagnostics came from
(the §CodeAction.diagnostics back-link must reference the published squiggle).

## Properties

### initialized

> `readonly` **initialized**: `boolean`

Defined in: [mcp-server/src/lsp/server.ts:208](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L208)

Set by `initialize`; a request before it is a protocol violation (§Lifecycle).

***

### lastFindings

> `readonly` **lastFindings**: readonly [`FindingLike`](FindingLike.md)[]

Defined in: [mcp-server/src/lsp/server.ts:214](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L214)

The findings from the most recent gauntlet run, keyed for codeAction resolution.

***

### shuttingDown

> `readonly` **shuttingDown**: `boolean`

Defined in: [mcp-server/src/lsp/server.ts:210](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L210)

Set by `shutdown`; a non-`exit` request after it must error (§Lifecycle: -32600).

***

### workspaceRootUri?

> `readonly` `optional` **workspaceRootUri?**: `string`

Defined in: [mcp-server/src/lsp/server.ts:212](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L212)

File URI supplied by the initialize handshake; relative Findings resolve beneath it.
