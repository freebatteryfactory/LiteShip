[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / ClientHints

# Type Alias: ClientHints

> **ClientHints** = `object`

Defined in: [\_spine/edge.d.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L40)

## Methods

### acceptCHHeader()

> **acceptCHHeader**(): `string`

Defined in: [\_spine/edge.d.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L43)

#### Returns

`string`

***

### criticalCHHeader()

> **criticalCHHeader**(): `string`

Defined in: [\_spine/edge.d.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L44)

#### Returns

`string`

***

### parseClientHints()

> **parseClientHints**(`headers`): [`ExtendedDeviceCapabilities`](../interfaces/ExtendedDeviceCapabilities.md)

Defined in: [\_spine/edge.d.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L42)

#### Parameters

##### headers

`Headers` \| [`ClientHintsHeaders`](../interfaces/ClientHintsHeaders.md)

#### Returns

[`ExtendedDeviceCapabilities`](../interfaces/ExtendedDeviceCapabilities.md)

***

### parseEvidence()

> **parseEvidence**(`headers`): [`ClientHintsEvidence`](../interfaces/ClientHintsEvidence.md)

Defined in: [\_spine/edge.d.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L41)

#### Parameters

##### headers

`Headers` \| [`ClientHintsHeaders`](../interfaces/ClientHintsHeaders.md)

#### Returns

[`ClientHintsEvidence`](../interfaces/ClientHintsEvidence.md)

***

### responsiveMediaCapabilities()

> **responsiveMediaCapabilities**(`headersOrCaps`): [`ResponsiveMediaCapabilities`](../interfaces/ResponsiveMediaCapabilities.md)

Defined in: [\_spine/edge.d.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L46)

#### Parameters

##### headersOrCaps

[`ExtendedDeviceCapabilities`](../interfaces/ExtendedDeviceCapabilities.md) \| `Headers` \| [`ClientHintsHeaders`](../interfaces/ClientHintsHeaders.md)

#### Returns

[`ResponsiveMediaCapabilities`](../interfaces/ResponsiveMediaCapabilities.md)

***

### responsiveMediaVaryHeader()

> **responsiveMediaVaryHeader**(): `string`

Defined in: [\_spine/edge.d.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L49)

#### Returns

`string`

***

### varyCHHeader()

> **varyCHHeader**(): `string`

Defined in: [\_spine/edge.d.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L45)

#### Returns

`string`
