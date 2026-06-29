[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / runLspStdio

# Function: runLspStdio()

> **runLspStdio**(`runGauntlet`, `input?`, `output?`): `Promise`\<`void`\>

Defined in: [mcp-server/src/lsp/stdio.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/stdio.ts#L42)

Run the LSP stdio loop until the input stream closes OR `exit` is received.
The gauntlet runner is INJECTED so the engine (and the heavy audit IR build it
depends on) stays in the CLI host; this driver never imports it. Returns once the
loop ends so the bootstrap can `process.exit` cleanly.

## Parameters

### runGauntlet

[`LspGauntletRunner`](../type-aliases/LspGauntletRunner.md)

### input?

`Readable` = `process.stdin`

### output?

`Writable` = `process.stdout`

## Returns

`Promise`\<`void`\>
