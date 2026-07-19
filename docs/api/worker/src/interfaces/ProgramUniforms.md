[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / ProgramUniforms

# Interface: ProgramUniforms

Defined in: core/dist/motion/transition-program.d.ts:171

The uniform payload a `sampleProgram` sample projects to: formatted CSS + GPU-bound WGSL scalars.

## Properties

### css

> `readonly` **css**: `Record`\<`string`, `string`\>

Defined in: core/dist/motion/transition-program.d.ts:173

Every animated `cssVar` formatted for a CSS custom-property / style write.

***

### wgsl

> `readonly` **wgsl**: `Record`\<`string`, `number`\>

Defined in: core/dist/motion/transition-program.d.ts:175

GPU-bound numeric props (kind `number`/`opacity`) keyed by their WGSL struct field.
