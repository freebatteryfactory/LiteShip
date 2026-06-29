[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / ariaCompileCapsule

# Variable: ariaCompileCapsule

> `const` **ariaCompileCapsule**: `CapsuleDef`\<`"pureTransform"`, \{ `entries`: readonly readonly `object`[][]; `states`: readonly `string`[]; \}, `unknown`, `unknown`\>

Defined in: [compiler/src/capsules/aria-compile.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/capsules/aria-compile.ts#L128)

Declared capsule for the ARIA compiler. The generated property test feeds
schema-seeds; `run` builds a real Boundary + attribute maps and calls
`ARIACompiler.compile`; the invariants assert the coverage / determinism /
allowed-keys-only LAWS over the REAL compile output.
