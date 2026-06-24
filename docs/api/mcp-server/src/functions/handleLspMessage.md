[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / handleLspMessage

# Function: handleLspMessage()

> **handleLspMessage**(`rawLine`, `state`, `runGauntlet`): `Promise`\<\{ `result`: [`LspHandleResult`](../interfaces/LspHandleResult.md); `state`: [`LspServerState`](../interfaces/LspServerState.md); \}\>

Defined in: [mcp-server/src/lsp/server.ts:125](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/server.ts#L125)

Handle one parsed LSP message. PURE over (raw line, state, runner) → next
state + result — the only effect is invoking the injected `runGauntlet`
(itself the host's `node:fs` fold). Returns the new state so the driver
threads it; never mutates the passed state.

Protocol violations throw tagged errors that map to JSON-RPC error responses
(never a silent drop): a request before `initialize`, a malformed param shape,
an unknown method. The §Lifecycle ordering (initialize → … → shutdown → exit)
is enforced.

## Parameters

### rawLine

`string`

### state

[`LspServerState`](../interfaces/LspServerState.md)

### runGauntlet

[`LspGauntletRunner`](../type-aliases/LspGauntletRunner.md)

## Returns

`Promise`\<\{ `result`: [`LspHandleResult`](../interfaces/LspHandleResult.md); `state`: [`LspServerState`](../interfaces/LspServerState.md); \}\>
