[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / generateReceiptedMutation

# Function: generateReceiptedMutation()

> **generateReceiptedMutation**(`cap`, `ctx?`): [`HarnessOutput`](../interfaces/HarnessOutput.md)

Defined in: core/dist/harness/receipted-mutation.d.ts:46

Generate the test + bench file contents for a `receiptedMutation` capsule.

The generated checks are gated on compile-time probe results carried in
[HarnessContext](../interfaces/HarnessContext.md): `contractRoundTrippable` (both schemas sampleable),
`mutatePresent` (typed invocation channel), and `faultsDeclared` (a faults
table). Each gate either emits a REAL `it(...)` block or emits nothing with
a documented reason — never `it.skip`.

## Parameters

### cap

`CapsuleDef`\<`"receiptedMutation"`, `unknown`, `unknown`, `unknown`\>

### ctx?

[`HarnessContext`](../interfaces/HarnessContext.md)

## Returns

[`HarnessOutput`](../interfaces/HarnessOutput.md)
