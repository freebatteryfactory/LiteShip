[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / Transition

# Variable: Transition

> **Transition**: `object`

Defined in: [quantizer/src/transition.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/transition.ts#L56)

Transition resolver namespace.

`Transition.for(quantizer, map)` (or `Transition.for(boundary, map)`)
produces a Transition that looks up animation parameters by
`from->to` state pairs. Consumed by [AnimatedQuantizer](../namespaces/AnimatedQuantizer/README.md) for
interpolation setup.

## Type Declaration

### for

> `readonly` **for**: \{\<`B`\>(`quantizer`, `transitionConfig`): [`Transition`](../interfaces/Transition.md)\<`B`\>; \<`B`\>(`boundary`, `transitionConfig`): [`Transition`](../interfaces/Transition.md)\<`B`\>; \} = `createTransition`

Build a Transition resolver for the given quantizer or boundary and transition map.

#### Call Signature

> \<`B`\>(`quantizer`, `transitionConfig`): [`Transition`](../interfaces/Transition.md)\<`B`\>

Build a Transition resolver for a given quantizer (or bare boundary) and
transition map.

Resolution order:
  1. Exact match: `"stateA->stateB"`
  2. Wildcard: `"*"`
  3. Fallback: instant transition (duration: 0)

##### Type Parameters

###### B

`B` *extends* [`Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>

##### Parameters

###### quantizer

[`Quantizer`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Quantizer.md)\<`B`\>

###### transitionConfig

[`TransitionMap`](../type-aliases/TransitionMap.md)\<`StateUnion`\<`B`\>\>

##### Returns

[`Transition`](../interfaces/Transition.md)\<`B`\>

#### Call Signature

> \<`B`\>(`boundary`, `transitionConfig`): [`Transition`](../interfaces/Transition.md)\<`B`\>

Build a Transition resolver for a given quantizer (or bare boundary) and
transition map.

Resolution order:
  1. Exact match: `"stateA->stateB"`
  2. Wildcard: `"*"`
  3. Fallback: instant transition (duration: 0)

##### Type Parameters

###### B

`B` *extends* [`Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>

##### Parameters

###### boundary

`B`

###### transitionConfig

[`TransitionMap`](../type-aliases/TransitionMap.md)\<`StateUnion`\<`B`\>\>

##### Returns

[`Transition`](../interfaces/Transition.md)\<`B`\>
