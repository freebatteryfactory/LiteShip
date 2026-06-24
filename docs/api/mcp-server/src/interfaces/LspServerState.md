[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / LspServerState

# Interface: LspServerState

Defined in: [mcp-server/src/lsp/server.ts:100](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L100)

The server's mutable lifecycle state. Composition-over-inheritance: this is a
DATA record threaded through [handle](../functions/handleLspMessage.md), not an object with methods. The
findings from the last `czap/check` are cached so a follow-up `codeAction`
request resolves remediations against the same fold the diagnostics came from
(the §CodeAction.diagnostics back-link must reference the published squiggle).

## Properties

### initialized

> `readonly` **initialized**: `boolean`

Defined in: [mcp-server/src/lsp/server.ts:102](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L102)

Set by `initialize`; a request before it is a protocol violation (§Lifecycle).

***

### lastFindings

> `readonly` **lastFindings**: readonly [`FindingLike`](FindingLike.md)[]

Defined in: [mcp-server/src/lsp/server.ts:106](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L106)

The findings from the most recent gauntlet run, keyed for codeAction resolution.

***

### shuttingDown

> `readonly` **shuttingDown**: `boolean`

Defined in: [mcp-server/src/lsp/server.ts:104](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L104)

Set by `shutdown`; a non-`exit` request after it must error (§Lifecycle: -32600).
