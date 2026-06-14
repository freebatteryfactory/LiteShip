[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / aiCastProposalCapsule

# Variable: aiCastProposalCapsule

> `const` **aiCastProposalCapsule**: [`CapsuleDef`](../interfaces/CapsuleDef.md)\<`"pureTransform"`, \{ `base`: readonly `string`[]; `ops`: readonly (\{ `input`: `string`; `kind`: `"add"`; \} \| \{ `index`: `number`; `kind`: `"remove"`; \})[]; \}, `unknown`, `unknown`\>

Defined in: core/src/capsules/ai-cast-proposal.ts:155

Declared capsule for the AI cast proposal envelope. Registered in the
module-level catalog at import time; walked by the factory compiler. The
generated property test feeds schema-seeds, `run` seals a real graph, proposes
+ validates a real patch (the sole mint path), and probes the apply / tamper /
determinism laws over the REAL minted envelope. The invariants assert those
verdicts plus the rejection-never-mints law.
