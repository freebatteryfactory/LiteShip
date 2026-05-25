[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / McpToolResult

# Interface: McpToolResult

Defined in: [mcp-server/src/dispatch.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L73)

MCP tools/call result envelope. `structuredContent` is the command PAYLOAD
(what a D2 `outputSchema` will describe); LiteShip result identity rides in
`_meta` under RECEIPT\_META\_KEY (provenance, not the semantic result);
`content[0].text` is a compatibility JSON mirror of the payload.

## Properties

### \_meta?

> `readonly` `optional` **\_meta?**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: [mcp-server/src/dispatch.ts:78](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L78)

MCP-open metadata; carries the LiteShip receipt under the reverse-DNS key.

***

### content

> `readonly` **content**: readonly `object`[]

Defined in: [mcp-server/src/dispatch.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L74)

***

### isError

> `readonly` **isError**: `boolean`

Defined in: [mcp-server/src/dispatch.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L76)

***

### structuredContent

> `readonly` **structuredContent**: `unknown`

Defined in: [mcp-server/src/dispatch.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L75)
