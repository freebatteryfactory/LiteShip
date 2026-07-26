[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / DEFAULT\_MOTION\_SPRING

# Variable: DEFAULT\_MOTION\_SPRING

> `const` **DEFAULT\_MOTION\_SPRING**: `SpringConfigShape`

Defined in: core/dist/motion/easing.d.ts:65

The ONE spring config both the CSS `linear()` path and the JS floor default to
when a spring easing is authored without explicit parameters. Kept here (not in
`@liteship/compiler`) so the native compiler (`resolveEasing`) and the runtime
sampler ([sampleRuntimeEasing](../functions/sampleRuntimeEasing.md)) read the SAME default — Law 4: one kernel,
never forked.
