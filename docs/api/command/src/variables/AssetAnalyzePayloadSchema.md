[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AssetAnalyzePayloadSchema

# Variable: AssetAnalyzePayloadSchema

> `const` **AssetAnalyzePayloadSchema**: `object`

Defined in: [command/src/commands/asset.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/asset.ts#L23)

The descriptor `outputSchema` for asset.analyze — hand-written JSON-Schema,
byte-parity-pinned against the parity fixture. [AssetAnalyzePayload](../type-aliases/AssetAnalyzePayload.md) is
its plain-TS mirror.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.assetId

> `readonly` **assetId**: `object`

#### properties.assetId.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.cached

> `readonly` **cached**: `object`

#### properties.cached.type

> `readonly` **type**: `"boolean"` = `'boolean'`

#### properties.markerCount

> `readonly` **markerCount**: `object`

#### properties.markerCount.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.projection

> `readonly` **projection**: `object`

#### properties.projection.enum

> `readonly` **enum**: readonly \[`"beat"`, `"onset"`, `"waveform"`\] = `PROJECTIONS`

### required

> `readonly` **required**: readonly \[`"assetId"`, `"projection"`, `"markerCount"`, `"cached"`\]

### type

> `readonly` **type**: `"object"` = `'object'`
