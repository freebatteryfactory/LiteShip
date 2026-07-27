[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / rawIndexF32

# Function: rawIndexF32()

> **rawIndexF32**(`thresholds`, `value`): `number`

Defined in: [core/src/wasm/boundary-f32.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/wasm/boundary-f32.ts#L43)

The single f32-canonical state-index kernel.

Returns the index of the state a `value` falls into: the largest `i` where
`thresholds[i] <= value` (in f32), or `0` when the value is below every
threshold. Thresholds are assumed strictly ascending (guaranteed by
`defineBoundary`). Uses an unrolled fast path for small arrays (≤4) and binary
search beyond — both equivalent to a linear reverse-scan for sorted input, so
`EVALUATE_THRESHOLDS_SOURCE` (the worker blob twin, a linear reverse-scan) and
`fallbackKernels.batchBoundaryEval` agree with this on every input.

This is THE numeric semantics for boundary evaluation across the whole repo:
scalar (`Boundary.evaluate`/`evaluateResult`), the JS batch fallback, the
worker inline string, and the host startup twin all route through it (or its
string mirror). Cross-path agreement is locked by
`tests/property/boundary-evaluator-parity.prop.test.ts`.

## Parameters

### thresholds

`ArrayLike`\<`number`\>

### value

`number`

## Returns

`number`
