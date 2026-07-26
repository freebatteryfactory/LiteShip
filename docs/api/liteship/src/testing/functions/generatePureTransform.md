[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / generatePureTransform

# Function: generatePureTransform()

> **generatePureTransform**(`cap`, `ctx?`): [`HarnessOutput`](../interfaces/HarnessOutput.md)

Defined in: core/dist/harness/pure-transform.d.ts:276

Generate the test + bench file contents for a `pureTransform` capsule.
The emitted files are strings; the repo compiler writes them to
`tests/generated/<name>.{test,bench}.ts`.

## Parameters

### cap

`CapsuleDef`\<`"pureTransform"`, `unknown`, `unknown`, `unknown`\>

### ctx?

[`HarnessContext`](../interfaces/HarnessContext.md)

## Returns

[`HarnessOutput`](../interfaces/HarnessOutput.md)
