[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / EdgeTier

# Type Alias: EdgeTier

> **EdgeTier** = `object`

Defined in: [\_spine/edge.d.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L69)

## Methods

### detectTier()

> **detectTier**(`headers`): [`EdgeTierResult`](../interfaces/EdgeTierResult.md)

Defined in: [\_spine/edge.d.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L70)

#### Parameters

##### headers

`Headers` \| [`ClientHintsHeaders`](../interfaces/ClientHintsHeaders.md)

#### Returns

[`EdgeTierResult`](../interfaces/EdgeTierResult.md)

***

### tierDataAttributes()

> **tierDataAttributes**(`result`): `string`

Defined in: [\_spine/edge.d.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L72)

#### Parameters

##### result

[`CapabilityTierProjection`](../interfaces/CapabilityTierProjection.md)

#### Returns

`string`

***

### tierDataAttributesMap()

> **tierDataAttributesMap**(`result`): `Readonly`\<`Record`\<`` `data-liteship-${CapAxis}` ``, `string`\>\>

Defined in: [\_spine/edge.d.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L73)

#### Parameters

##### result

[`CapabilityTierProjection`](../interfaces/CapabilityTierProjection.md)

#### Returns

`Readonly`\<`Record`\<`` `data-liteship-${CapAxis}` ``, `string`\>\>

***

### tierFromEvidence()

> **tierFromEvidence**(`parsed`): [`EdgeTierResult`](../interfaces/EdgeTierResult.md)

Defined in: [\_spine/edge.d.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L71)

#### Parameters

##### parsed

[`ClientHintsEvidence`](../interfaces/ClientHintsEvidence.md)

#### Returns

[`EdgeTierResult`](../interfaces/EdgeTierResult.md)
