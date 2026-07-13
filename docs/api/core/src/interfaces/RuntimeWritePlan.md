[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RuntimeWritePlan

# Interface: RuntimeWritePlan

Defined in: [core/src/interpret-transition.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L89)

Runtime leaf-write plan — the permanent floor when native CSS is unavailable.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [core/src/interpret-transition.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L91)

***

### easing

> `readonly` **easing**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: [core/src/interpret-transition.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L101)

The easing descriptor the JS floor samples (`sampleRuntimeEasing`). Self-describing
so the floor never depends on a driver to hand it a curve — and read from the
SAME authored source (`TransitionNode.easing`) the native CSS path compiles into
`linear()`, so the two floors sample one identical `Easing.spring` (Law 4).

***

### fromState

> `readonly` **fromState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/interpret-transition.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L93)

***

### properties

> `readonly` **properties**: readonly [`RuntimeWriteProperty`](RuntimeWriteProperty.md)[]

Defined in: [core/src/interpret-transition.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L90)

***

### routing

> `readonly` **routing**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [core/src/interpret-transition.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L92)

***

### toState

> `readonly` **toState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/interpret-transition.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L94)

***

### windows?

> `readonly` `optional` **windows?**: readonly [`RuntimeWriteWindow`](RuntimeWriteWindow.md)[]

Defined in: [core/src/interpret-transition.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L109)

Per-window sub-samplers for a composed [TransitionProgram](../type-aliases/TransitionProgram.md) (from
`interpretProgram`). Present ⇒ the floor scrubs each window at its own local
eased progress (a multi-step chain); absent ⇒ the flat `properties`/`easing`
single-tween path. The composite `durationMs`/`fromState`/`toState` describe the
whole program.
