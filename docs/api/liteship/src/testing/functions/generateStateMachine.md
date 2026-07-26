[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / generateStateMachine

# Function: generateStateMachine()

> **generateStateMachine**(`cap`, `ctx?`): [`HarnessOutput`](../interfaces/HarnessOutput.md)

Defined in: core/dist/harness/state-machine.d.ts:26

Generate the test + bench file contents for a `stateMachine` capsule.
A runtime-backed machine drives via its build+tick handle; a field-driven
machine drives its real `step`. With neither a runtime driver nor an
importable binding the generator THROWS a tagged `UnsupportedError`
(wire-or-fail) rather than emitting a placeholder.

## Parameters

### cap

`CapsuleDef`\<`"stateMachine"`, `unknown`, `unknown`, `unknown`\>

### ctx?

[`HarnessContext`](../interfaces/HarnessContext.md)

## Returns

[`HarnessOutput`](../interfaces/HarnessOutput.md)
