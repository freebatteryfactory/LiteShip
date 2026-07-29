[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/testing](../README.md) / generatePolicyGate

# Function: generatePolicyGate()

> **generatePolicyGate**(`cap`, `ctx?`): [`HarnessOutput`](../interfaces/HarnessOutput.md)

Defined in: core/dist/harness/policy-gate.d.ts:40

Generate the test + bench file contents for a `policyGate` capsule.

Disposition is resolved at COMPILE TIME (see the module docstring). This
generator emits ONE clean real test, or THROWS a tagged `UnsupportedError`
so `capsule:compile` fails loud (wire-or-fail) — never an `it.skip`.

## Parameters

### cap

`CapsuleDef`\<`"policyGate"`, `unknown`, `unknown`, `unknown`\>

### ctx?

[`HarnessContext`](../interfaces/HarnessContext.md)

## Returns

[`HarnessOutput`](../interfaces/HarnessOutput.md)
