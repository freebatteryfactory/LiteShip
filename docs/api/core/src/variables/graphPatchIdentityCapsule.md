[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / graphPatchIdentityCapsule

# Variable: graphPatchIdentityCapsule

> `const` **graphPatchIdentityCapsule**: [`CapsuleDef`](../interfaces/CapsuleDef.md)\<`"pureTransform"`, \{ `a`: \{ `edges`: readonly readonly \[`number`, `number`\][]; `inputs`: readonly `string`[]; \}; `b`: \{ `edges`: readonly readonly \[`number`, `number`\][]; `inputs`: readonly `string`[]; \}; \}, `unknown`, `unknown`\>

Defined in: [core/src/capsules/graph-patch-identity.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsules/graph-patch-identity.ts#L174)

Declared capsule for the GraphPatch round-trip identity. Registered in the
module-level catalog at import time; walked by the factory compiler. The
generated property test feeds schema-seeds, `run` seals two real graphs and
computes `diff`→`apply`, and the invariants assert the round-trip / validity /
id-consistency over the SEALED graphs.
