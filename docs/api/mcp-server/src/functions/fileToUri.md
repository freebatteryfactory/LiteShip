[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / fileToUri

# Function: fileToUri()

> **fileToUri**(`file`, `workspaceRootUri?`): `string`

Defined in: [mcp-server/src/lsp/diagnostic.ts:213](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/diagnostic.ts#L213)

Convert a finding path to its document URI. Repo-relative paths resolve below
the initialized workspace root; absolute paths and existing URIs retain their
own authority. The default root preserves the historical pure projection for
callers that intentionally operate without an LSP workspace.

## Parameters

### file

`string`

### workspaceRootUri?

`string` = `'file:///'`

## Returns

`string`
