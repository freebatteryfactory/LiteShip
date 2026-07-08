[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ScrollTimelineIntent

# Interface: ScrollTimelineIntent

Defined in: [core/src/scroll-timeline.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scroll-timeline.ts#L46)

Sealed scroll-timeline intent — data over graph, no behavior authority.

## Extends

- [`ScrollTimelineIntentInput`](ScrollTimelineIntentInput.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"ScrollTimelineIntent"`

Defined in: [core/src/scroll-timeline.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scroll-timeline.ts#L47)

***

### axis?

> `readonly` `optional` **axis?**: [`ScrollTimelineAxis`](../type-aliases/ScrollTimelineAxis.md)

Defined in: [core/src/scroll-timeline.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scroll-timeline.ts#L37)

#### Inherited from

[`ScrollTimelineIntentInput`](ScrollTimelineIntentInput.md).[`axis`](ScrollTimelineIntentInput.md#axis)

***

### from

> `readonly` **from**: `Readonly`\<`Record`\<`string`, `number` \| `string`\>\>

Defined in: [core/src/scroll-timeline.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scroll-timeline.ts#L39)

#### Inherited from

[`ScrollTimelineIntentInput`](ScrollTimelineIntentInput.md).[`from`](ScrollTimelineIntentInput.md#from)

***

### policy

> `readonly` **policy**: [`RevealPolicy`](RevealPolicy.md)

Defined in: [core/src/scroll-timeline.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scroll-timeline.ts#L42)

#### Inherited from

[`ScrollTimelineIntentInput`](ScrollTimelineIntentInput.md).[`policy`](ScrollTimelineIntentInput.md#policy)

***

### range

> `readonly` **range**: readonly \[`string`, `string`\]

Defined in: [core/src/scroll-timeline.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scroll-timeline.ts#L38)

#### Inherited from

[`ScrollTimelineIntentInput`](ScrollTimelineIntentInput.md).[`range`](ScrollTimelineIntentInput.md#range)

***

### target

> `readonly` **target**: `string`

Defined in: [core/src/scroll-timeline.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scroll-timeline.ts#L36)

#### Inherited from

[`ScrollTimelineIntentInput`](ScrollTimelineIntentInput.md).[`target`](ScrollTimelineIntentInput.md#target)

***

### to

> `readonly` **to**: `Readonly`\<`Record`\<`string`, `number` \| `string`\>\>

Defined in: [core/src/scroll-timeline.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scroll-timeline.ts#L40)

#### Inherited from

[`ScrollTimelineIntentInput`](ScrollTimelineIntentInput.md).[`to`](ScrollTimelineIntentInput.md#to)

***

### transition

> `readonly` **transition**: [`RevealTransition`](RevealTransition.md)

Defined in: [core/src/scroll-timeline.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scroll-timeline.ts#L41)

#### Inherited from

[`ScrollTimelineIntentInput`](ScrollTimelineIntentInput.md).[`transition`](ScrollTimelineIntentInput.md#transition)
