[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / documentGraphAddressCapsule

# Variable: documentGraphAddressCapsule

> `const` **documentGraphAddressCapsule**: [`CapsuleDef`](../interfaces/CapsuleDef.md)\<`"pureTransform"`, \{ `edges`: readonly readonly \[`number`, `number`\][]; `inputs`: readonly `string`[]; \}, `unknown`, `unknown`\>

Defined in: [core/src/capsules/document-graph-address.ts:145](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsules/document-graph-address.ts#L145)

Declared capsule for the DocumentGraph addressing kernel. Registered in the
module-level catalog at import time; walked by the factory compiler. The
generated property test feeds schema-seeds, `run` seals a real graph and reads
its address, and the invariants assert determinism / format / order-independence
over the REAL sealed address. The bench measures real addressing latency
(O(nodes) — scales with the arbitrary's graph sizes).
