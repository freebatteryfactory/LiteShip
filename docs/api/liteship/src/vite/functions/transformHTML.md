[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / transformHTML

# Function: transformHTML()

> **transformHTML**(`source`, `fromFile`, `projectRoot`, `boundaryDir?`): `Promise`\<`string`\>

Defined in: vite/dist/html-transform.d.ts:19

Transform HTML source, replacing `data-liteship="name"` with resolved boundary JSON.

## Parameters

### source

`string`

The HTML/Astro source string

### fromFile

`string`

The file path of the source (for resolution context)

### projectRoot

`string`

The project root directory

### boundaryDir?

`string`

Optional boundary definition directory (the plugin's `dirs.boundary` override)

## Returns

`Promise`\<`string`\>

The transformed source, or the original if no transforms needed
