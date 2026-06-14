[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / aiCastSummarizeCapsule

# Variable: aiCastSummarizeCapsule

> `const` **aiCastSummarizeCapsule**: [`CapsuleDef`](../interfaces/CapsuleDef.md)\<`"pureTransform"`, \{ `budgetA`: `number`; `budgetB`: `number`; `inputs`: readonly `string`[]; \}, `unknown`, `unknown`\>

Defined in: [core/src/capsules/ai-cast-summarize.ts:134](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsules/ai-cast-summarize.ts#L134)

Declared capsule for the AI cast summarizer. Registered in the module-level
catalog at import time; walked by the factory compiler. The generated property
test feeds schema-seeds, `run` seals a real graph and summarizes it at two
budgets, and the invariants assert determinism / budget honesty / monotonicity
/ node-count honesty over the REAL summaries.
