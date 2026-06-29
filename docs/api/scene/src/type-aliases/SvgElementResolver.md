[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SvgElementResolver

# Type Alias: SvgElementResolver

> **SvgElementResolver** = (`entityId`) => `SVGElement` \| `null` \| `undefined`

Defined in: [scene/src/systems/svg-egress.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/systems/svg-egress.ts#L67)

Resolve an entity id to the live `SVGElement` it drives. Callers own the
entity→element mapping (the scene engine never allocates DOM), so the
applicator stays free of any element-discovery policy. Return `null` /
`undefined` to skip an entity that has no element this frame.

## Parameters

### entityId

`string`

## Returns

`SVGElement` \| `null` \| `undefined`
