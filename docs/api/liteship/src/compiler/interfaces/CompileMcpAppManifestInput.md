[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / CompileMcpAppManifestInput

# Interface: CompileMcpAppManifestInput

Defined in: compiler/dist/mcp-app-manifest.d.ts:75

Inputs to [compileMcpAppManifest](../functions/compileMcpAppManifest.md) — all supplied as plain data by the
caller (server/tests). The four collection surfaces are optional; a server
with no resources/UI/prompts omits them and the manifest carries `[]`.

## Properties

### appResources?

> `readonly` `optional` **appResources?**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: compiler/dist/mcp-app-manifest.d.ts:89

D5 live app resources; defaults to `[]`.

***

### capabilities

> `readonly` **capabilities**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: compiler/dist/mcp-app-manifest.d.ts:81

***

### prompts?

> `readonly` `optional` **prompts?**: readonly [`ManifestPromptView`](ManifestPromptView.md)[]

Defined in: compiler/dist/mcp-app-manifest.d.ts:91

D3 prompts; defaults to `[]`.

***

### protocolVersion

> `readonly` **protocolVersion**: `string`

Defined in: compiler/dist/mcp-app-manifest.d.ts:80

***

### resources?

> `readonly` `optional` **resources?**: readonly [`ManifestResourceView`](ManifestResourceView.md)[]

Defined in: compiler/dist/mcp-app-manifest.d.ts:85

D3 JSON resources; defaults to `[]`.

***

### serverInfo

> `readonly` **serverInfo**: `object`

Defined in: compiler/dist/mcp-app-manifest.d.ts:76

#### name

> `readonly` **name**: `string`

#### version

> `readonly` **version**: `string`

***

### toolDescriptors

> `readonly` **toolDescriptors**: readonly `CapsuleCommandDescriptor`[]

Defined in: compiler/dist/mcp-app-manifest.d.ts:83

The MCP-exposed command descriptors (e.g. `mcpExposedDescriptors()`).

***

### uiResources?

> `readonly` `optional` **uiResources?**: readonly [`ManifestUiResourceView`](ManifestUiResourceView.md)[]

Defined in: compiler/dist/mcp-app-manifest.d.ts:87

D4 static UI resources; defaults to `[]`.
