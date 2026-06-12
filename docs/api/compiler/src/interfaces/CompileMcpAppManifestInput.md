[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CompileMcpAppManifestInput

# Interface: CompileMcpAppManifestInput

Defined in: [compiler/src/mcp-app-manifest.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L72)

Inputs to [compileMcpAppManifest](../functions/compileMcpAppManifest.md) — all supplied as plain data by the
caller (server/tests). The four collection surfaces are optional; a server
with no resources/UI/prompts omits them and the manifest carries `[]`.

## Properties

### appResources?

> `readonly` `optional` **appResources?**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:83](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L83)

D5 live app resources; defaults to `[]`.

***

### capabilities

> `readonly` **capabilities**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: [compiler/src/mcp-app-manifest.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L75)

***

### prompts?

> `readonly` `optional` **prompts?**: readonly [`ManifestPromptView`](ManifestPromptView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:85](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L85)

D3 prompts; defaults to `[]`.

***

### protocolVersion

> `readonly` **protocolVersion**: `string`

Defined in: [compiler/src/mcp-app-manifest.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L74)

***

### resources?

> `readonly` `optional` **resources?**: readonly [`ManifestResourceView`](ManifestResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L79)

D3 JSON resources; defaults to `[]`.

***

### serverInfo

> `readonly` **serverInfo**: `object`

Defined in: [compiler/src/mcp-app-manifest.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L73)

#### name

> `readonly` **name**: `string`

#### version

> `readonly` **version**: `string`

***

### toolDescriptors

> `readonly` **toolDescriptors**: readonly `CapsuleCommandDescriptor`[]

Defined in: [compiler/src/mcp-app-manifest.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L77)

The MCP-exposed command descriptors (e.g. `mcpExposedDescriptors()`).

***

### uiResources?

> `readonly` `optional` **uiResources?**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:81](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L81)

D4 static UI resources; defaults to `[]`.
