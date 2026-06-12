[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / McpAppManifest

# Interface: McpAppManifest

Defined in: [compiler/src/mcp-app-manifest.ts:89](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L89)

The MCP-app manifest: a projection over all real MCP / MCP-Apps surfaces.

## Properties

### appResources

> `readonly` **appResources**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:98](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L98)

D5 live app resources (`ui://liteship/app/…`).

***

### capabilities

> `readonly` **capabilities**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: [compiler/src/mcp-app-manifest.ts:92](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L92)

***

### namespacePolicy

> `readonly` **namespacePolicy**: `object`

Defined in: [compiler/src/mcp-app-manifest.ts:103](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L103)

The product-owned namespace contract (D3/D4/D5/D6).

#### appPrefix

> `readonly` **appPrefix**: `"ui://liteship/app/"`

#### resourcePrefix

> `readonly` **resourcePrefix**: `"liteship://"`

#### uiPrefix

> `readonly` **uiPrefix**: `"ui://liteship/"`

***

### prompts

> `readonly` **prompts**: readonly [`ManifestPromptView`](ManifestPromptView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:99](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L99)

***

### protocolVersion

> `readonly` **protocolVersion**: `string`

Defined in: [compiler/src/mcp-app-manifest.ts:91](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L91)

***

### resources

> `readonly` **resources**: readonly [`ManifestResourceView`](ManifestResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:94](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L94)

***

### resultEnvelope

> `readonly` **resultEnvelope**: `object`

Defined in: [compiler/src/mcp-app-manifest.ts:101](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L101)

Named reference to the D1 result-envelope policy (a constant, not re-derived logic).

#### receiptMetaKey

> `readonly` **receiptMetaKey**: `"liteship/result"`

#### structuredContentIsPayload

> `readonly` **structuredContentIsPayload**: `true`

***

### serverInfo

> `readonly` **serverInfo**: `object`

Defined in: [compiler/src/mcp-app-manifest.ts:90](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L90)

#### name

> `readonly` **name**: `string`

#### version

> `readonly` **version**: `string`

***

### tools

> `readonly` **tools**: readonly [`ManifestToolView`](ManifestToolView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:93](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L93)

***

### uiResources

> `readonly` **uiResources**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: [compiler/src/mcp-app-manifest.ts:96](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/mcp-app-manifest.ts#L96)

D4 static UI resources — kept distinct from [appResources](#appresources) (D5 live).
