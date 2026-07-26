[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / compileMcpAppManifest

# Function: compileMcpAppManifest()

> **compileMcpAppManifest**(`input`): [`McpAppManifest`](../interfaces/McpAppManifest.md)

Defined in: compiler/dist/mcp-app-manifest.d.ts:125

Compile the MCP-app manifest. Pure + total: tools are projected from
`toolDescriptors`; resources/prompts/UI surfaces pass through verbatim; the
envelope + namespace policies are constants. No I/O, no clock, no invention.

## Parameters

### input

[`CompileMcpAppManifestInput`](../interfaces/CompileMcpAppManifestInput.md)

## Returns

[`McpAppManifest`](../interfaces/McpAppManifest.md)
