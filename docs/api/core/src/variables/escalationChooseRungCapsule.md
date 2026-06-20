[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / escalationChooseRungCapsule

# Variable: escalationChooseRungCapsule

> `const` **escalationChooseRungCapsule**: [`CapsuleDef`](../interfaces/CapsuleDef.md)\<`"policyGate"`, \{ `allocClass?`: `"zero"` \| `"bounded"` \| `"unbounded"`; `grants`: readonly (`"static"` \| `"styled"` \| `"reactive"` \| `"animated"` \| `"gpu"`)[]; `memoryMb?`: `number`; `p95Ms?`: `number`; `requires`: `"static"` \| `"styled"` \| `"reactive"` \| `"animated"` \| `"gpu"`; `site`: `"node"` \| `"browser"` \| `"worker"` \| `"edge"`; `sites`: readonly (`"node"` \| `"browser"` \| `"worker"` \| `"edge"`)[]; \}, \{ `effect`: `"allow"` \| `"deny"`; `reasons`: readonly `object`[]; \}, `unknown`\>

Defined in: [core/src/capsules/escalation-choose-rung.ts:198](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsules/escalation-choose-rung.ts#L198)

Declared policyGate capsule for the escalation chooser. Registered in the
module-level catalog at import time; walked by the factory compiler. The
generated traversal samples subjects from EscalationSubject, drives the
REAL `decide` (which seals a real policy and calls `chooseRung`), and the
invariants assert the minimal-downgrade / site-gate / verdict-shape laws over
the REAL verdict.
