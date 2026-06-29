[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SvgAttrsFrame

# Type Alias: SvgAttrsFrame

> **SvgAttrsFrame** = `ReadonlyMap`\<`string`, [`SvgAttrs`](../interfaces/SvgAttrs.md)\>

Defined in: [scene/src/systems/svg-egress.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/systems/svg-egress.ts#L36)

The serialized SVG egress frame: a snapshot mapping each video entity's
id to the `_svgAttrs` composed for it this tick. Entities that carry no
`_svgAttrs` (e.g. non-video tracks) are omitted. This is the
DOM-agnostic artifact — feed it to [applySvgAttrs](../functions/applySvgAttrs.md) for a live SVG
tree, or serialize/snapshot it directly in a headless render.
