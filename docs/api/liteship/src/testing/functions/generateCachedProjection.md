[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / generateCachedProjection

# Function: generateCachedProjection()

> **generateCachedProjection**(`cap`, `ctx?`): [`HarnessOutput`](../interfaces/HarnessOutput.md)

Defined in: core/dist/harness/cached-projection.d.ts:38

Generate the test + bench file contents for a `cachedProjection` capsule.

Disposition is resolved at COMPILE TIME (see the module docstring). This
generator never decides derivability at test time and never emits a defensive
runtime `throw`-if-missing branch: it emits ONE clean real test, or THROWS a
tagged `UnsupportedError` so `capsule:compile` fails loud (wire-or-fail).

## Parameters

### cap

`CapsuleDef`\<`"cachedProjection"`, `unknown`, `unknown`, `unknown`\>

### ctx?

[`HarnessContext`](../interfaces/HarnessContext.md)

## Returns

[`HarnessOutput`](../interfaces/HarnessOutput.md)
