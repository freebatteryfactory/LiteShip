[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CompileMcpAppManifestInput

# Interface: CompileMcpAppManifestInput

Defined in: [compiler/src/mcp-app-manifest.ts:65](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L65)

Inputs to [compileMcpAppManifest](../functions/compileMcpAppManifest.md) — all supplied as plain data by the caller (server/tests).

## Properties

### appResources

> `readonly` **appResources**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L73)

***

### capabilities

> `readonly` **capabilities**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: [compiler/src/mcp-app-manifest.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L68)

***

### prompts

> `readonly` **prompts**: readonly [`ManifestPromptView`](ManifestPromptView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L74)

***

### protocolVersion

> `readonly` **protocolVersion**: `string`

Defined in: [compiler/src/mcp-app-manifest.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L67)

***

### resources

> `readonly` **resources**: readonly [`ManifestResourceView`](ManifestResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L71)

***

### serverInfo

> `readonly` **serverInfo**: `object`

Defined in: [compiler/src/mcp-app-manifest.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L66)

#### name

> `readonly` **name**: `string`

#### version

> `readonly` **version**: `string`

***

### toolDescriptors

> `readonly` **toolDescriptors**: readonly `CapsuleCommandDescriptor`[]

Defined in: [compiler/src/mcp-app-manifest.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L70)

The MCP-exposed command descriptors (e.g. `mcpExposedDescriptors()`).

***

### uiResources

> `readonly` **uiResources**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L72)
