[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / EdgeTier

# Type Alias: EdgeTier

> **EdgeTier** = `object`

Defined in: [\_spine/edge.d.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L49)

## Methods

### detectTier()

> **detectTier**(`headers`): [`EdgeTierResult`](../interfaces/EdgeTierResult.md)

Defined in: [\_spine/edge.d.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L50)

#### Parameters

##### headers

`Headers` \| [`ClientHintsHeaders`](../interfaces/ClientHintsHeaders.md)

#### Returns

[`EdgeTierResult`](../interfaces/EdgeTierResult.md)

***

### tierDataAttributes()

> **tierDataAttributes**(`result`): `string`

Defined in: [\_spine/edge.d.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L52)

#### Parameters

##### result

[`EdgeTierResult`](../interfaces/EdgeTierResult.md)

#### Returns

`string`

***

### tierDataAttributesMap()

> **tierDataAttributesMap**(`result`): `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [\_spine/edge.d.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L53)

#### Parameters

##### result

[`EdgeTierResult`](../interfaces/EdgeTierResult.md)

#### Returns

`Readonly`\<`Record`\<`string`, `string`\>\>

***

### tierFromParsed()

> **tierFromParsed**(`caps`): [`EdgeTierResult`](../interfaces/EdgeTierResult.md)

Defined in: [\_spine/edge.d.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L51)

#### Parameters

##### caps

[`ExtendedDeviceCapabilities`](../interfaces/ExtendedDeviceCapabilities.md)

#### Returns

[`EdgeTierResult`](../interfaces/EdgeTierResult.md)
