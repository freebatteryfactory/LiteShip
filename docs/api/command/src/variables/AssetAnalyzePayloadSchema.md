[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AssetAnalyzePayloadSchema

# Variable: AssetAnalyzePayloadSchema

> `const` **AssetAnalyzePayloadSchema**: `Struct`\<\{ `assetId`: `String`; `cached`: `Boolean`; `markerCount`: `Number`; `projection`: `Union`\<readonly \[`Literal`\<`"beat"`\>, `Literal`\<`"onset"`\>, `Literal`\<`"waveform"`\>\]\>; \}\>

Defined in: [command/src/commands/asset.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/asset.ts#L23)

Structured payload returned by asset.analyze — ONE Effect Schema is the source
of both [AssetAnalyzePayload](../type-aliases/AssetAnalyzePayload.md) and the descriptor's `outputSchema`.
