[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / applyResponsiveMediaVary

# Function: applyResponsiveMediaVary()

> **applyResponsiveMediaVary**(`headers`): `Headers`

Defined in: [astro/src/responsive-media.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/responsive-media.ts#L64)

Merge the responsive-media `Vary` axis (`Sec-CH-DPR, Save-Data`) into a response's
`Vary`, unioning rather than clobbering any pre-existing tokens (`Cookie`,
`Accept-Encoding`, app axes). A CDN then keys a Save-Data / high-DPR representation
apart from the normal one, so it cannot serve one for the other (Law 1).

## Parameters

### headers

`Headers`

## Returns

`Headers`
