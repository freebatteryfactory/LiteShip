[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / AstroLoggerLike

# Interface: AstroLoggerLike

Defined in: astro/dist/diagnostics-bridge.d.ts:23

Structural shape of Astro's integration logger (`AstroIntegrationLogger`):
`warn` / `error` each take a single message string. Kept structural so this
module needs no value import from `astro`.

## Methods

### error()

> **error**(`message`): `void`

Defined in: astro/dist/diagnostics-bridge.d.ts:25

#### Parameters

##### message

`string`

#### Returns

`void`

***

### warn()

> **warn**(`message`): `void`

Defined in: astro/dist/diagnostics-bridge.d.ts:24

#### Parameters

##### message

`string`

#### Returns

`void`
