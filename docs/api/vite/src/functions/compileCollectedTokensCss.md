[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / compileCollectedTokensCss

# Function: compileCollectedTokensCss()

> **compileCollectedTokensCss**(`tokens`): `string`

Defined in: [vite/src/token-manifest.ts:258](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/token-manifest.ts#L258)

Compile all collected tokens into one CSS sheet: `@property` registrations
(when applicable) plus a single merged `:root { … }` block.

## Parameters

### tokens

[`TokenManifest`](../type-aliases/TokenManifest.md)

## Returns

`string`
