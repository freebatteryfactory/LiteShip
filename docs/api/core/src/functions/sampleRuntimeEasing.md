[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / sampleRuntimeEasing

# Function: sampleRuntimeEasing()

> **sampleRuntimeEasing**(`easing`): `EasingFnShape`

Defined in: [core/src/easing.ts:376](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/easing.ts#L376)

Build the `(t) => value` sampler for a [RuntimeEasing](../interfaces/RuntimeEasing.md) descriptor.

This is the RUNTIME half of the one-kernel law (Law 4): the `spring` arm
delegates to `Easing.spring` — the EXACT function `Easing.springToLinearCSS`
samples to build the CSS `linear()` timing function — so a browser scrubbing
the JS floor and a browser running native CSS `linear()` read one identical
curve. `linear`/`ease` map to `Easing.linear` / `Easing.ease`
(the latter being `cubic-bezier(0.25, 0.1, 0.25, 1)`, i.e. CSS `ease`).

## Parameters

### easing

[`RuntimeEasing`](../interfaces/RuntimeEasing.md)

## Returns

`EasingFnShape`
