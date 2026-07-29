[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/testing](../README.md) / generateSiteAdapter

# Function: generateSiteAdapter()

> **generateSiteAdapter**(`cap`, `ctx?`): [`HarnessOutput`](../interfaces/HarnessOutput.md)

Defined in: core/dist/harness/site-adapter.d.ts:89

Generate the test + bench (+ integration) file contents for a `siteAdapter`
capsule. When the driver resolved a [HarnessContext.siteAdapter](../interfaces/HarnessContext.md#siteadapter), both
checks are emitted real-in-lane; without it (no binding wired) the capsule
falls back to a typed self-reporting form — never an `it.skip` placeholder.

## Parameters

### cap

`CapsuleDef`\<`"siteAdapter"`, `unknown`, `unknown`, `unknown`\>

### ctx?

[`HarnessContext`](../interfaces/HarnessContext.md)

## Returns

[`HarnessOutput`](../interfaces/HarnessOutput.md)
