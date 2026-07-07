[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / siteCarriesPlaceholderMarker

# Function: siteCarriesPlaceholderMarker()

> **siteCarriesPlaceholderMarker**(`site`): `boolean`

Defined in: [gauntlet/src/gates/skip-allowlist.ts:156](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L156)

Does `site` (a skip's normalized title / source line) carry a PLACEHOLDER MARKER — the
tell of an unfinished-work stub? A skip whose site matches is NON-sanctionable and
NON-signable: it stays BLOCKING (the always-blocking no-placeholder floor), and the
standards weakening partition must never convert it to a signed weakening even via the
owner-signable capability-gate category. A placeholder can NEVER be signed away.

Pure + dependency-free. Applied to the RAW or normalized line interchangeably (the marker
survives whitespace collapse). The legit capability-gate sites — named by capability, not
by a TODO — never match.

## Parameters

### site

`string`

## Returns

`boolean`
