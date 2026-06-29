[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / satelliteAttrs

# Function: satelliteAttrs()

> **satelliteAttrs**(`props`): `Record`\<`string`, `string`\>

Defined in: [astro/src/Satellite.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Satellite.ts#L102)

Generate the HTML attributes for a satellite container div.
Used by framework integrations (Astro, etc.) to render the satellite wrapper.

The returned record maps directly to DOM attributes -- spread it onto your
container element and the client directive picks up the rest.

## Parameters

### props

[`SatelliteProps`](../interfaces/SatelliteProps.md)

## Returns

`Record`\<`string`, `string`\>
