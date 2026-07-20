[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / adaptiveAttrs

# Function: adaptiveAttrs()

> **adaptiveAttrs**(`props`): `Record`\<`string`, `string`\>

Defined in: [astro/src/Adaptive.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L103)

Generate the HTML attributes for an adaptive container div.
Used by framework integrations (Astro, etc.) to render the adaptive wrapper.

The returned record maps directly to DOM attributes -- spread it onto your
container element and the client directive picks up the rest.

## Parameters

### props

[`AdaptiveProps`](../interfaces/AdaptiveProps.md)

## Returns

`Record`\<`string`, `string`\>
