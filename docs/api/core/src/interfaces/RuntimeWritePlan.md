[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RuntimeWritePlan

# Interface: RuntimeWritePlan

Defined in: [core/src/interpret-transition.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L76)

Runtime leaf-write plan — the permanent floor when native CSS is unavailable.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [core/src/interpret-transition.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L78)

***

### easing

> `readonly` **easing**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: [core/src/interpret-transition.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L88)

The easing descriptor the JS floor samples (`sampleRuntimeEasing`). Self-describing
so the floor never depends on a driver to hand it a curve — and read from the
SAME authored source (`TransitionNode.easing`) the native CSS path compiles into
`linear()`, so the two floors sample one identical `Easing.spring` (Law 4).

***

### fromState

> `readonly` **fromState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/interpret-transition.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L80)

***

### properties

> `readonly` **properties**: readonly [`RuntimeWriteProperty`](RuntimeWriteProperty.md)[]

Defined in: [core/src/interpret-transition.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L77)

***

### routing

> `readonly` **routing**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [core/src/interpret-transition.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L79)

***

### toState

> `readonly` **toState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/interpret-transition.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L81)

***

### windows?

> `readonly` `optional` **windows?**: readonly [`RuntimeWriteWindow`](RuntimeWriteWindow.md)[]

Defined in: [core/src/interpret-transition.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L96)

Per-window sub-samplers for a composed [TransitionProgram](../type-aliases/TransitionProgram.md) (from
`interpretProgram`). Present ⇒ the floor scrubs each window at its own local
eased progress (a multi-step chain); absent ⇒ the flat `properties`/`easing`
single-tween path. The composite `durationMs`/`fromState`/`toState` describe the
whole program.
