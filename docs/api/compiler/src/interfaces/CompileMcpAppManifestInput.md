[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CompileMcpAppManifestInput

# Interface: CompileMcpAppManifestInput

Defined in: [compiler/src/mcp-app-manifest.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L68)

Inputs to [compileMcpAppManifest](../functions/compileMcpAppManifest.md) — all supplied as plain data by the caller (server/tests).

## Properties

### appResources

> `readonly` **appResources**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L76)

***

### capabilities

> `readonly` **capabilities**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: [compiler/src/mcp-app-manifest.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L71)

***

### prompts

> `readonly` **prompts**: readonly [`ManifestPromptView`](ManifestPromptView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L77)

***

### protocolVersion

> `readonly` **protocolVersion**: `string`

Defined in: [compiler/src/mcp-app-manifest.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L70)

***

### resources

> `readonly` **resources**: readonly [`ManifestResourceView`](ManifestResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L74)

***

### serverInfo

> `readonly` **serverInfo**: `object`

Defined in: [compiler/src/mcp-app-manifest.ts:69](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L69)

#### name

> `readonly` **name**: `string`

#### version

> `readonly` **version**: `string`

***

### toolDescriptors

> `readonly` **toolDescriptors**: readonly `CapsuleCommandDescriptor`[]

Defined in: [compiler/src/mcp-app-manifest.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L73)

The MCP-exposed command descriptors (e.g. `mcpExposedDescriptors()`).

***

### uiResources

> `readonly` **uiResources**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L75)
