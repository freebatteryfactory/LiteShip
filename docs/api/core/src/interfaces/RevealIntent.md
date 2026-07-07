[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RevealIntent

# Interface: RevealIntent

Defined in: [core/src/reveal.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L63)

Sealed reveal intent — data over graph, no behavior authority.

## Extends

- [`RevealIntentInput`](RevealIntentInput.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"RevealIntent"`

Defined in: [core/src/reveal.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L64)

***

### from

> `readonly` **from**: `Readonly`\<`Record`\<`string`, `number` \| `string`\>\>

Defined in: [core/src/reveal.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L56)

#### Inherited from

[`RevealIntentInput`](RevealIntentInput.md).[`from`](RevealIntentInput.md#from)

***

### policy

> `readonly` **policy**: [`RevealPolicy`](RevealPolicy.md)

Defined in: [core/src/reveal.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L59)

#### Inherited from

[`RevealIntentInput`](RevealIntentInput.md).[`policy`](RevealIntentInput.md#policy)

***

### target

> `readonly` **target**: `string`

Defined in: [core/src/reveal.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L54)

#### Inherited from

[`RevealIntentInput`](RevealIntentInput.md).[`target`](RevealIntentInput.md#target)

***

### to

> `readonly` **to**: `Readonly`\<`Record`\<`string`, `number` \| `string`\>\>

Defined in: [core/src/reveal.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L57)

#### Inherited from

[`RevealIntentInput`](RevealIntentInput.md).[`to`](RevealIntentInput.md#to)

***

### transition

> `readonly` **transition**: [`RevealTransition`](RevealTransition.md)

Defined in: [core/src/reveal.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L58)

#### Inherited from

[`RevealIntentInput`](RevealIntentInput.md).[`transition`](RevealIntentInput.md#transition)

***

### trigger

> `readonly` **trigger**: [`RevealTrigger`](../type-aliases/RevealTrigger.md)

Defined in: [core/src/reveal.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L55)

#### Inherited from

[`RevealIntentInput`](RevealIntentInput.md).[`trigger`](RevealIntentInput.md#trigger)
