[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [create-liteship/src](../README.md) / RunIo

# Interface: RunIo

Defined in: [create-liteship/src/index.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/index.ts#L37)

Output sinks, injectable for tests (default: process stdout/stderr).

## Properties

### err

> `readonly` **err**: (`text`) => `void`

Defined in: [create-liteship/src/index.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/index.ts#L39)

#### Parameters

##### text

`string`

#### Returns

`void`

***

### out

> `readonly` **out**: (`text`) => `void`

Defined in: [create-liteship/src/index.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/index.ts#L38)

#### Parameters

##### text

`string`

#### Returns

`void`

***

### prompt?

> `readonly` `optional` **prompt?**: (`question`) => `Promise`\<`string`\>

Defined in: [create-liteship/src/index.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/index.ts#L41)

Answers a prompt; default reads one line from stdin when it is a TTY.

#### Parameters

##### question

`string`

#### Returns

`Promise`\<`string`\>
