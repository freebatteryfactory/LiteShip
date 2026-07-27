[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / StaggerIntent

# Interface: StaggerIntent

Defined in: [core/src/motion/stagger.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/stagger.ts#L52)

Sealed stagger intent — data over graph, no behavior authority.

## Extends

- [`StaggerIntentInput`](StaggerIntentInput.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"StaggerIntent"`

Defined in: [core/src/motion/stagger.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/stagger.ts#L53)

***

### children

> `readonly` **children**: readonly [`StaggerChild`](StaggerChild.md)[]

Defined in: [core/src/motion/stagger.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/stagger.ts#L45)

#### Inherited from

[`StaggerIntentInput`](StaggerIntentInput.md).[`children`](StaggerIntentInput.md#children)

***

### policy

> `readonly` **policy**: [`RevealPolicy`](RevealPolicy.md)

Defined in: [core/src/motion/stagger.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/stagger.ts#L48)

#### Inherited from

[`StaggerIntentInput`](StaggerIntentInput.md).[`policy`](StaggerIntentInput.md#policy)

***

### stepMs

> `readonly` **stepMs**: `number`

Defined in: [core/src/motion/stagger.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/stagger.ts#L46)

#### Inherited from

[`StaggerIntentInput`](StaggerIntentInput.md).[`stepMs`](StaggerIntentInput.md#stepms)

***

### transition

> `readonly` **transition**: [`RevealTransition`](RevealTransition.md)

Defined in: [core/src/motion/stagger.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/stagger.ts#L47)

#### Inherited from

[`StaggerIntentInput`](StaggerIntentInput.md).[`transition`](StaggerIntentInput.md#transition)

***

### trigger

> `readonly` **trigger**: [`RevealTrigger`](../type-aliases/RevealTrigger.md)

Defined in: [core/src/motion/stagger.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/stagger.ts#L44)

#### Inherited from

[`StaggerIntentInput`](StaggerIntentInput.md).[`trigger`](StaggerIntentInput.md#trigger)
