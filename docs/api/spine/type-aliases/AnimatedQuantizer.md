[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / AnimatedQuantizer

# Type Alias: AnimatedQuantizer

> **AnimatedQuantizer** = `object`

Defined in: [\_spine/quantizer.d.ts:186](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L186)

## Methods

### make()

> **make**\<`B`\>(`quantizer`, `transitions`, `outputs?`, `options?`): [`OwnedAnimatedQuantizer`](OwnedAnimatedQuantizer.md)\<`B`\>

Defined in: [\_spine/quantizer.d.ts:205](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L205)

#### Type Parameters

##### B

`B` *extends* [`Boundary`](../interfaces/Boundary.md)\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### quantizer

[`ReactiveQuantizer`](../interfaces/ReactiveQuantizer.md)\<`B`\>

##### transitions

[`TransitionMap`](TransitionMap.md)\<[`StateUnion`](StateUnion.md)\<`B`\>\>

##### outputs?

`Record`\<`string`, `Record`\<`string`, `string` \| `number`\>\>

Omitted: derived from a LiveQuantizer's `config.outputs.css` tables.

##### options?

Optional frame-clock injection; omitted, drives an internal ~60fps 16ms loop.

###### scheduler?

[`Scheduler`](../interfaces/Scheduler.md)

#### Returns

[`OwnedAnimatedQuantizer`](OwnedAnimatedQuantizer.md)\<`B`\>
