[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / StreamRecoveryHandlers

# Interface: StreamRecoveryHandlers

Defined in: [web/src/stream/recovery.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L25)

Host callbacks for applying a recovered snapshot.

## Properties

### applyDiscreteSignal

> `readonly` **applyDiscreteSignal**: (`payload`) => `void`

Defined in: [web/src/stream/recovery.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L27)

#### Parameters

##### payload

`unknown`

#### Returns

`void`

***

### applyHtml

> `readonly` **applyHtml**: (`html`) => `Promise`\<`void`\>

Defined in: [web/src/stream/recovery.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L26)

#### Parameters

##### html

`string`

#### Returns

`Promise`\<`void`\>
