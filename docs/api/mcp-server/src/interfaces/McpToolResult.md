[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [mcp-server/src](../README.md) / McpToolResult

# Interface: McpToolResult

Defined in: [mcp-server/src/dispatch.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L69)

MCP tools/call result envelope. `structuredContent` is the command PAYLOAD
(what a D2 `outputSchema` will describe); LiteShip result identity rides in
`_meta` under [RECEIPT\_META\_KEY](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts) (provenance, not the semantic result);
`content[0].text` is a compatibility JSON mirror of the payload.

## Properties

### \_meta?

> `readonly` `optional` **\_meta?**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: [mcp-server/src/dispatch.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L74)

MCP-open metadata; carries the LiteShip receipt under the reverse-DNS key.

***

### content

> `readonly` **content**: readonly `object`[]

Defined in: [mcp-server/src/dispatch.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L70)

***

### isError

> `readonly` **isError**: `boolean`

Defined in: [mcp-server/src/dispatch.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L72)

***

### structuredContent

> `readonly` **structuredContent**: `unknown`

Defined in: [mcp-server/src/dispatch.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L71)
