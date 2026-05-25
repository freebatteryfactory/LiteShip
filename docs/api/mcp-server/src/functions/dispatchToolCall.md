[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / dispatchToolCall

# Function: dispatchToolCall()

> **dispatchToolCall**(`call`): `Promise`\<[`McpToolResult`](../interfaces/McpToolResult.md)\>

Defined in: [mcp-server/src/dispatch.ts:130](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L130)

Dispatch a tools/call through the shared registry dispatcher. The structured
`arguments` object passes through as the invocation args verbatim (nested
objects preserved — no `String(v)` / `[object Object]` flattening), and the
resulting `CapsuleCommandResult.payload` is returned as `structuredContent`.
The text content is a faithful JSON mirror of that same payload — never
captured stdout.

## Parameters

### call

[`McpToolCall`](../interfaces/McpToolCall.md)

## Returns

`Promise`\<[`McpToolResult`](../interfaces/McpToolResult.md)\>
