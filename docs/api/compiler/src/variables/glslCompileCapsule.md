[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / glslCompileCapsule

# Variable: glslCompileCapsule

> `const` **glslCompileCapsule**: `CapsuleDef`\<`"pureTransform"`, \{ `fields`: readonly `string`[]; `states`: readonly `string`[]; `values`: readonly readonly `number`[][]; \}, `unknown`, `unknown`\>

Defined in: [compiler/src/capsules/glsl-compile.ts:147](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/capsules/glsl-compile.ts#L147)

Declared capsule for the GLSL compiler. Registered at import time; walked by
the factory compiler. The generated property test feeds schema-seeds, `run`
builds a real Boundary + state maps and calls `GLSLCompiler.compile`, and the
invariants assert the u_state / determinism / per-state-completeness /
int-type LAWS over the REAL compile output.
