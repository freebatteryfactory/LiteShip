[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / AstroLoggerLike

# Interface: AstroLoggerLike

Defined in: [astro/src/diagnostics-bridge.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/diagnostics-bridge.ts#L26)

Structural shape of Astro's integration logger (`AstroIntegrationLogger`):
`warn` / `error` each take a single message string. Kept structural so this
module needs no value import from `astro`.

## Methods

### error()

> **error**(`message`): `void`

Defined in: [astro/src/diagnostics-bridge.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/diagnostics-bridge.ts#L28)

#### Parameters

##### message

`string`

#### Returns

`void`

***

### warn()

> **warn**(`message`): `void`

Defined in: [astro/src/diagnostics-bridge.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/diagnostics-bridge.ts#L27)

#### Parameters

##### message

`string`

#### Returns

`void`
