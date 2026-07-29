[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / RuntimeWritePlan

# Interface: RuntimeWritePlan

Defined in: core/dist/motion/interpret-transition.d.ts:114

Runtime leaf-write plan — the permanent floor when native CSS is unavailable.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: core/dist/motion/interpret-transition.d.ts:116

***

### easing

> `readonly` **easing**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: core/dist/motion/interpret-transition.d.ts:126

The easing descriptor the JS floor samples (`sampleRuntimeEasing`). Self-describing
so the floor never depends on a driver to hand it a curve — and read from the
SAME authored source (`TransitionNode.easing`) the native CSS path compiles into
`linear()`, so the two floors sample one identical `Easing.spring` (Law 4).

***

### fromState

> `readonly` **fromState**: [`StateName`](../../schema/type-aliases/StateName.md)

Defined in: core/dist/motion/interpret-transition.d.ts:118

***

### properties

> `readonly` **properties**: readonly [`RuntimeWriteProperty`](RuntimeWriteProperty.md)[]

Defined in: core/dist/motion/interpret-transition.d.ts:115

***

### routing

> `readonly` **routing**: `EdgeType`

Defined in: core/dist/motion/interpret-transition.d.ts:117

***

### toState

> `readonly` **toState**: [`StateName`](../../schema/type-aliases/StateName.md)

Defined in: core/dist/motion/interpret-transition.d.ts:119

***

### windows?

> `readonly` `optional` **windows?**: readonly [`RuntimeWriteWindow`](RuntimeWriteWindow.md)[]

Defined in: core/dist/motion/interpret-transition.d.ts:134

Per-window sub-samplers for a composed [TransitionProgram](../type-aliases/TransitionProgram.md) (from
`interpretProgram`). Present ⇒ the floor scrubs each window at its own local
eased progress (a multi-step chain); absent ⇒ the flat `properties`/`easing`
single-tween path. The composite `durationMs`/`fromState`/`toState` describe the
whole program.
