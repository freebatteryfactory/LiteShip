[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / ProgramUniforms

# Interface: ProgramUniforms

Defined in: [core/src/motion/transition-program.ts:712](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L712)

The uniform payload a `sampleProgram` sample projects to: formatted CSS + GPU-bound WGSL scalars.

## Properties

### css

> `readonly` **css**: `Record`\<`string`, `string`\>

Defined in: [core/src/motion/transition-program.ts:714](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L714)

Every animated `cssVar` formatted for a CSS custom-property / style write.

***

### wgsl

> `readonly` **wgsl**: `Record`\<`string`, `number`\>

Defined in: [core/src/motion/transition-program.ts:716](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L716)

GPU-bound numeric props (kind `number`/`opacity`) keyed by their WGSL struct field.
