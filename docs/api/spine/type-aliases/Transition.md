[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / Transition

# Type Alias: Transition

> **Transition** = `object`

Defined in: [\_spine/quantizer.d.ts:164](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L164)

## Methods

### for()

#### Call Signature

> **for**\<`B`\>(`quantizer`, `config`): `Transition`\<`B`\>

Defined in: [\_spine/quantizer.d.ts:170](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L170)

##### Type Parameters

###### B

`B` *extends* [`Boundary`](../interfaces/Boundary.md)\<`string`, readonly \[`string`, `string`\]\>

##### Parameters

###### quantizer

[`Quantizer`](../interfaces/Quantizer.md)\<`B`\>

###### config

[`TransitionMap`](TransitionMap.md)\<[`StateUnion`](StateUnion.md)\<`B`\>\>

##### Returns

`Transition`\<`B`\>

#### Call Signature

> **for**\<`B`\>(`boundary`, `config`): `Transition`\<`B`\>

Defined in: [\_spine/quantizer.d.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L171)

##### Type Parameters

###### B

`B` *extends* [`Boundary`](../interfaces/Boundary.md)\<`string`, readonly \[`string`, `string`\]\>

##### Parameters

###### boundary

`B`

###### config

[`TransitionMap`](TransitionMap.md)\<[`StateUnion`](StateUnion.md)\<`B`\>\>

##### Returns

`Transition`\<`B`\>
