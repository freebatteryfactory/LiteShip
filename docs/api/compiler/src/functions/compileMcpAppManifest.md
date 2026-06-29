[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / compileMcpAppManifest

# Function: compileMcpAppManifest()

> **compileMcpAppManifest**(`input`): [`McpAppManifest`](../interfaces/McpAppManifest.md)

Defined in: [compiler/src/mcp-app-manifest.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L130)

Compile the MCP-app manifest. Pure + total: tools are projected from
`toolDescriptors`; resources/prompts/UI surfaces pass through verbatim; the
envelope + namespace policies are constants. No I/O, no clock, no invention.

## Parameters

### input

[`CompileMcpAppManifestInput`](../interfaces/CompileMcpAppManifestInput.md)

## Returns

[`McpAppManifest`](../interfaces/McpAppManifest.md)
