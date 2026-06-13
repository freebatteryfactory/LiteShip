[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / EVALUATE\_THRESHOLDS\_SOURCE

# Variable: EVALUATE\_THRESHOLDS\_SOURCE

> `const` **EVALUATE\_THRESHOLDS\_SOURCE**: "/\*\*\n \* Evaluate which discrete state a value falls into based on thresholds.\n \* f32-canonical (Math.fround); thresholds sorted ascending; value below all\n \* thresholds maps to the first state.\n \*\n \* Canonical kernel: packages/core/src/boundary-f32.ts (rawIndexF32).\n \*\n \* @param \{number\[\]\} thresholds\n \* @param \{string\[\]\} states\n \* @param \{number\} value\n \* @returns \{string\}\n \*/\nfunction evaluateThresholds(thresholds, states, value) \{\n  const v = Math.fround(value);\n  for (let i = thresholds.length - 1; i \>= 0; i--) \{\n    if (v \>= Math.fround(thresholds\[i\])) \{\n      return states\[i\] \|\| states\[0\] \|\| \"\";\n    \}\n  \}\n  return states\[0\] \|\| \"\";\n\}"

Defined in: [core/src/boundary-f32.ts:95](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/boundary-f32.ts#L95)

Worker-blob twin of [rawIndexF32](../functions/rawIndexF32.md), as an inlinable JavaScript source string.

Worker blob scripts run in a classic Worker created from a Blob and cannot use
ES module imports, so the threshold-evaluation logic must be embedded as a
string. This is the single source of that string — `@czap/worker`'s
`render-worker` and `compositor` blob scripts both interpolate it, so they
cannot drift from each other. It is a linear reverse-scan, f32-canonical
(`Math.fround`) to match [rawIndexF32](../functions/rawIndexF32.md) and the deployed WASM kernel.

Stateless by design: the worker never owns hysteresis/transition state (the
host reconciles crossings via `apply-resolved-state`), so the signature is
`(thresholds, states, value)` with no previous-state argument.

The property test executes this string via `new Function(...)` and asserts it
agrees with `rawIndexF32` on every golden/edge vector — that execution IS the
anti-drift guarantee.
