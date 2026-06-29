[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / collectSvgAttrs

# Function: collectSvgAttrs()

> **collectSvgAttrs**(`world`): `Effect`\<[`SvgAttrsFrame`](../type-aliases/SvgAttrsFrame.md)\>

Defined in: [scene/src/systems/svg-egress.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/systems/svg-egress.ts#L49)

Pure egress core — query the world for persisted `_svgAttrs` components
and collect them into an entity-keyed map. Reads only the persisted ECS
component (the durable half of SVGSystem's dual-write), so it observes
exactly what later ticks / external readers would see. Never touches the
DOM.

Queries `VideoSource` (SVGSystem's own query domain) plus `_svgAttrs`, so
the result is keyed identically to the entities SVGSystem walked and only
contains entities the system has actually composed attrs for.

## Parameters

### world

`WorldShape`

## Returns

`Effect`\<[`SvgAttrsFrame`](../type-aliases/SvgAttrsFrame.md)\>
