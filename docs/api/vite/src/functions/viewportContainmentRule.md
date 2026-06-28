[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / viewportContainmentRule

# Function: viewportContainmentRule()

> **viewportContainmentRule**(`names`, `selector?`): `string` \| `null`

Defined in: [vite/src/css-quantize.ts:515](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L515)

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

`selector` is the element the containment is declared on — `:root` by
default. A host whose layout can't have `:root` be a container (a
size-contained `:root` removes it from its parent's size calc, which a
fixed/absolute viewport-locked wrapper conflicts with) sets the plugin's
`quantize.container` to a named selector (e.g. `.czap-vp`) and is then
responsible for sizing that element to the viewport. Width-only sheets
stay `inline-size`; a `viewport-height` name upgrades to `size` + a
`100dvh` block-size on the chosen selector.

## Parameters

### names

`Iterable`\<`string`\>

### selector?

`string` = `':root'`

## Returns

`string` \| `null`
