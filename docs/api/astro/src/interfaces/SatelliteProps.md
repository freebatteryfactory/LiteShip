[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / SatelliteProps

# Interface: SatelliteProps

Defined in: [astro/src/Satellite.ts:23](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L23)

Server-render props for a satellite container. Astro components
typically destructure these and pass them to [satelliteAttrs](../functions/satelliteAttrs.md).

## Properties

### aria?

> `readonly` `optional` **aria?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `string`\>\>\>\>

Defined in: [astro/src/Satellite.ts:47](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L47)

Authored per-state ARIA/data attributes (`@aria` blocks) for this boundary,
keyed by state then attribute. The `<Satellite>` component supplies this
automatically via a content-address join against the build manifest; pass
it explicitly when calling `satelliteAttrs` directly. The initial state's
attributes are SSR'd onto the element; the client updates them live.

***

### boundary?

> `readonly` `optional` **boundary?**: [`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>

Defined in: [astro/src/Satellite.ts:25](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L25)

Boundary whose state the satellite tracks.

***

### class?

> `readonly` `optional` **class?**: `string`

Defined in: [astro/src/Satellite.ts:29](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L29)

Extra CSS class names to merge with `czap-satellite`.

***

### component?

> `readonly` `optional` **component?**: [`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Component/type-aliases/Shape.md)\<[`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>, readonly `string`[]\>

Defined in: [astro/src/Satellite.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L27)

Component definition used to identify the satellite on the client.

***

### directive?

> `readonly` `optional` **directive?**: `false` \| `DirectiveName`

Defined in: [astro/src/Satellite.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L39)

Which client directive the boot scanner should activate for this
satellite (serialised into `data-czap-directive`). Defaults to
`'satellite'` when a boundary is present — a serialized boundary
with no evaluator is exactly the inert-island bug. Pass `false`
for a CSS-only shell that ships zero runtime.

***

### initialState?

> `readonly` `optional` **initialState?**: `string`

Defined in: [astro/src/Satellite.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L31)

Server-side initial state (serialised into `data-czap-state`).
