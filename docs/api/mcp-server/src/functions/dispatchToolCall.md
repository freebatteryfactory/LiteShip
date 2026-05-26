[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / dispatchToolCall

# Function: dispatchToolCall()

> **dispatchToolCall**(`call`): `Promise`\<[`McpToolResult`](../interfaces/McpToolResult.md)\>

Defined in: [mcp-server/src/dispatch.ts:239](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L239)

Dispatch a tools/call through the shared registry dispatcher. The structured
`arguments` object passes through verbatim (nested objects preserved — no
`[object Object]` flattening). The result envelope (CUT D1):
  - `structuredContent` = the command PAYLOAD (what D2's outputSchema describes);
  - `_meta[liteship/result]` = the LiteShip receipt (command, content-addressed
    resultId, timestamp, verdict?/exitCode?) — provenance, not payload;
  - `content[0].text` = JSON mirror of the payload (compatibility, never stdout);
  - `isError` reflects a tool-execution failure (NOT a JSON-RPC protocol error).

## Parameters

### call

[`McpToolCall`](../interfaces/McpToolCall.md)

## Returns

`Promise`\<[`McpToolResult`](../interfaces/McpToolResult.md)\>
