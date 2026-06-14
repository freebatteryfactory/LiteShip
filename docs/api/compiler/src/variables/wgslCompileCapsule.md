[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / wgslCompileCapsule

# Variable: wgslCompileCapsule

> `const` **wgslCompileCapsule**: `CapsuleDef`\<`"pureTransform"`, \{ `fields`: readonly `string`[]; `states`: readonly `string`[]; `values`: readonly readonly `number`[][]; \}, `unknown`, `unknown`\>

Defined in: [compiler/src/capsules/wgsl-compile.ts:120](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/capsules/wgsl-compile.ts#L120)

Declared capsule for the WGSL compiler. The generated property test feeds
schema-seeds; `run` builds a real Boundary + state maps and calls
`WGSLCompiler.compile`; the invariants assert the state_index / determinism /
per-state-stateBindings / type-promotion LAWS over the REAL compile output.
