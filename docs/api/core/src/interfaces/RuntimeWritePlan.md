[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RuntimeWritePlan

# Interface: RuntimeWritePlan

Defined in: [core/src/motion/interpret-transition.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L130)

Runtime leaf-write plan — the permanent floor when native CSS is unavailable.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [core/src/motion/interpret-transition.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L132)

***

### easing

> `readonly` **easing**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: [core/src/motion/interpret-transition.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L142)

The easing descriptor the JS floor samples (`sampleRuntimeEasing`). Self-describing
so the floor never depends on a driver to hand it a curve — and read from the
SAME authored source (`TransitionNode.easing`) the native CSS path compiles into
`linear()`, so the two floors sample one identical `Easing.spring` (Law 4).

***

### fromState

> `readonly` **fromState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/motion/interpret-transition.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L134)

***

### properties

> `readonly` **properties**: readonly [`RuntimeWriteProperty`](RuntimeWriteProperty.md)[]

Defined in: [core/src/motion/interpret-transition.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L131)

***

### routing

> `readonly` **routing**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [core/src/motion/interpret-transition.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L133)

***

### toState

> `readonly` **toState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/motion/interpret-transition.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L135)

***

### windows?

> `readonly` `optional` **windows?**: readonly [`RuntimeWriteWindow`](RuntimeWriteWindow.md)[]

Defined in: [core/src/motion/interpret-transition.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L150)

Per-window sub-samplers for a composed [TransitionProgram](../type-aliases/TransitionProgram.md) (from
`interpretProgram`). Present ⇒ the floor scrubs each window at its own local
eased progress (a multi-step chain); absent ⇒ the flat `properties`/`easing`
single-tween path. The composite `durationMs`/`fromState`/`toState` describe the
whole program.
