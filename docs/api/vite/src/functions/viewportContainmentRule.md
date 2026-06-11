[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / viewportContainmentRule

# Function: viewportContainmentRule()

> **viewportContainmentRule**(`names`): `string` \| `null`

Defined in: [vite/src/css-quantize.ts:334](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L334)

Build the single `:root` containment rule for a sheet's viewport-based
boundaries: `container-type: inline-size` plus every collected
container name in CSS's space-separated multi-name form, so each
compiled `@container <name> (...)` query finds its container.

Returns `null` when no viewport container names were collected
(non-viewport boundaries declare their own containers; see the
`container-not-declared` diagnostic).

## Parameters

### names

`Iterable`\<`string`\>

## Returns

`string` \| `null`
