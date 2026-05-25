[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / listTools

# Function: listTools()

> **listTools**(): readonly `object`[]

Defined in: [mcp-server/src/dispatch.ts:221](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/dispatch.ts#L221)

MCP tool catalog — projected from the ONE canonical command catalog in
@czap/command (the mcpExposed subset). No hand-maintained parallel table:
this is the same descriptor source the CLI's `describe`/`completion`/`help`
project, so MCP `tools/list` and `czap describe --format=mcp` agree by
construction.

## Returns

readonly `object`[]
