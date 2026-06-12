[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / viewportContainmentRule

# Function: viewportContainmentRule()

> **viewportContainmentRule**(`names`): `string` \| `null`

Defined in: [vite/src/css-quantize.ts:419](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L419)

Build the single `:root` containment rule for a sheet's viewport-based
boundaries: a `container-type` declaration plus every collected
container name in CSS's space-separated multi-name form, so each
compiled `@container <name> (...)` query finds its container.

Width-only sheets keep `container-type: inline-size`. The
`viewport-height` name — the only height-axis name the containment
path can collect (sanitized from `viewport.height`) — upgrades the
rule to `container-type: size`, because `inline-size` containment
leaves `(height ...)` queries unevaluable. Size containment computes
`:root`'s block size as if it had no content, so the rule pins it to
`100dvh` — the same dynamic-viewport measure the runtime's
`readSignalValue('viewport.height')` reads.

Returns `null` when no viewport container names were collected
(non-viewport boundaries declare their own containers; see the
`container-not-declared` diagnostic).

## Parameters

### names

`Iterable`\<`string`\>

## Returns

`string` \| `null`
