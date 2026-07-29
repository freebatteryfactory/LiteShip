[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / McpAppManifest

# Interface: McpAppManifest

Defined in: compiler/dist/mcp-app-manifest.d.ts:94

The MCP-app manifest: a projection over all real MCP / MCP-Apps surfaces.

## Properties

### appResources

> `readonly` **appResources**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: compiler/dist/mcp-app-manifest.d.ts:106

D5 live app resources (`ui://liteship/app/…`).

***

### capabilities

> `readonly` **capabilities**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: compiler/dist/mcp-app-manifest.d.ts:100

***

### namespacePolicy

> `readonly` **namespacePolicy**: `object`

Defined in: compiler/dist/mcp-app-manifest.d.ts:114

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

Defined in: compiler/dist/mcp-app-manifest.d.ts:107

***

### protocolVersion

> `readonly` **protocolVersion**: `string`

Defined in: compiler/dist/mcp-app-manifest.d.ts:99

***

### resources

> `readonly` **resources**: readonly [`ManifestResourceView`](ManifestResourceView.md)[]

Defined in: compiler/dist/mcp-app-manifest.d.ts:102

***

### resultEnvelope

> `readonly` **resultEnvelope**: `object`

Defined in: compiler/dist/mcp-app-manifest.d.ts:109

Named reference to the D1 result-envelope policy (a constant, not re-derived logic).

#### receiptMetaKey

> `readonly` **receiptMetaKey**: `"liteship/result"`

#### structuredContentIsPayload

> `readonly` **structuredContentIsPayload**: `true`

***

### serverInfo

> `readonly` **serverInfo**: `object`

Defined in: compiler/dist/mcp-app-manifest.d.ts:95

#### name

> `readonly` **name**: `string`

#### version

> `readonly` **version**: `string`

***

### tools

> `readonly` **tools**: readonly [`ManifestToolView`](ManifestToolView.md)[]

Defined in: compiler/dist/mcp-app-manifest.d.ts:101

***

### uiResources

> `readonly` **uiResources**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: compiler/dist/mcp-app-manifest.d.ts:104

D4 static UI resources — kept distinct from [appResources](#appresources) (D5 live).
