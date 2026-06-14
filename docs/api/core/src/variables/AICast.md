[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AICast

# Variable: AICast

> `const` **AICast**: `object`

Defined in: [core/src/ai-cast.ts:567](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L567)

The AI cast namespace — the framework PRIMITIVE that casts a [DocumentGraph](../interfaces/DocumentGraph.md)
OUT to a model-facing [AIContext](../interfaces/AIContext.md), validates the patch / UI tree the model
proposes back IN (minting the [ValidatedProposal](../interfaces/ValidatedProposal.md) security envelope), and
exposes (never invokes) the host-authorized apply step.

"LiteShip teaches graphs how to speak to models; products decide whether model
suggestions become action."

## Type Declaration

### applyValidatedPatch

> **applyValidatedPatch**: (`graph`, `proposal`) => [`DocumentGraph`](../interfaces/DocumentGraph.md)

Apply a VALIDATED graph-patch proposal to a graph. This is the host-authorized
mutation step the framework EXPOSES but NEVER calls itself. Its signature
DEMANDS a [ValidatedProposal](../interfaces/ValidatedProposal.md) — which only [validateGraphPatchProposal](#validategraphpatchproposal)
can mint — so there is no path from raw model output to mutation that skips
validation. Before applying, it re-asserts the apply token binds to the exact
payload (defense-in-depth against post-validation tampering).

Re-addresses through the one kernel ([GraphPatch.apply](GraphPatch.md#apply) → `sealGraph`), so
the result is indistinguishable from a graph authored fresh.

#### Parameters

##### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

##### proposal

[`ValidatedProposal`](../interfaces/ValidatedProposal.md)\<[`GraphPatch`](../interfaces/GraphPatch.md)\>

#### Returns

[`DocumentGraph`](../interfaces/DocumentGraph.md)

### castContext

> **castContext**: (`graph`, `options`) => [`AIContext`](../interfaces/AIContext.md)

Cast a [DocumentGraph](../interfaces/DocumentGraph.md) OUT to a deterministic, content-addressed
[AIContext](../interfaces/AIContext.md): a token-budgeted summary, the advertised output contracts
(GraphPatch always; GeneratedUITree when a catalog is supplied), and a prose
system prompt. NO model is called — this only BUILDS the context a producer
would feed to one.

Determinism: same graph + same options ⇒ byte-identical context ⇒ same `id`.

#### Parameters

##### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

##### options?

[`CastContextOptions`](../interfaces/CastContextOptions.md) = `{}`

#### Returns

[`AIContext`](../interfaces/AIContext.md)

### generatedUIProposalSchema

> **generatedUIProposalSchema**: (`catalog`) => [`ProposalSchema`](../interfaces/ProposalSchema.md)

The output contract advertised for "propose a GeneratedUITree". Enumerates the
host catalog's registered component names so the model proposes only nodes the
host can render — the cast-OUT face of genui's `validateGeneratedUITree`
(cast-IN). This is the genui INSTANCE of the same propose→validate→envelope
discipline.

#### Parameters

##### catalog

`ComponentCatalog`

#### Returns

[`ProposalSchema`](../interfaces/ProposalSchema.md)

### graphPatchProposalSchema

> **graphPatchProposalSchema**: (`base`) => [`ProposalSchema`](../interfaces/ProposalSchema.md)

The output contract advertised for "propose a GraphPatch". This is the cast-OUT
face of the SAME `GraphPatch` the framework validates cast-IN — the model fills
exactly the shape [GraphPatch.validate](GraphPatch.md#validate) reads. Closure is structural: a
payload that satisfies this schema is a candidate `GraphPatch`; the validator
then re-runs the structural integrity check on its apply result.

`base` is pinned to the context's graph so the model proposes a delta against
the graph it was shown.

#### Parameters

##### base

`ContentAddress`

#### Returns

[`ProposalSchema`](../interfaces/ProposalSchema.md)

### summarizeGraph

> **summarizeGraph**: (`graph`, `tokenBudget`) => [`GraphSummary`](../interfaces/GraphSummary.md)

Project a [DocumentGraph](../interfaces/DocumentGraph.md) to a token-budgeted [GraphSummary](../interfaces/GraphSummary.md). Walks
nodes in topological order (REUSING [linearizeGraph](../functions/linearizeGraph.md); falls back to the
graph's own node order if the graph is cyclic — `linearizeGraph` returns the
partial sort plus the cycle, and a budgeted summary must still be emittable for
an in-progress/invalid graph). Emits one line per node until the next line
would exceed the budget. DETERMINISTIC: same graph + same budget ⇒ same
summary ⇒ same content address.

#### Parameters

##### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

##### tokenBudget?

`number` = `DEFAULT_TOKEN_BUDGET`

#### Returns

[`GraphSummary`](../interfaces/GraphSummary.md)

### validateGeneratedUIProposal

> **validateGeneratedUIProposal**: (`node`, `catalog`, `validate`) => [`ProposalResult`](../type-aliases/ProposalResult.md)\<`GeneratedUINode`\>

Validate a model-proposed GeneratedUINode against a host catalog using
the host's genui validator, then MINT a [ValidatedProposal](../interfaces/ValidatedProposal.md). The genui
instance of the SAME envelope discipline — same gate, same minting, same
unforgeable token — so a UI tree cannot reach a host renderer un-validated any
more than a GraphPatch can reach a host mutator un-validated.

The validator is injected (not imported) to keep the cast core free of the
genui renderer dependency; pass `validateGeneratedUITree` from `@czap/genui`.

#### Parameters

##### node

`GeneratedUINode`

##### catalog

`ComponentCatalog`

##### validate

[`GeneratedUIValidator`](../type-aliases/GeneratedUIValidator.md)

#### Returns

[`ProposalResult`](../type-aliases/ProposalResult.md)\<`GeneratedUINode`\>

### validateGraphPatchProposal

> **validateGraphPatchProposal**: (`graph`, `patch`) => [`ProposalResult`](../type-aliases/ProposalResult.md)\<[`GraphPatch`](../interfaces/GraphPatch.md)\>

Validate a model-proposed [GraphPatch](GraphPatch.md) against the graph it was cast from,
then MINT a [ValidatedProposal](../interfaces/ValidatedProposal.md) on success. This is the ONLY way to obtain
a graph-patch proposal a host can apply.

It runs [GraphPatch.validate](GraphPatch.md#validate) (which previews the apply and re-checks
structural integrity — no cycles, no dangling edges) AND re-pins the patch's
`base` to the graph (a proposal must apply to the graph the model was shown).
Only when BOTH pass does it call `mintValidated` — so an unvalidated patch can
never become a `ValidatedProposal`.

#### Parameters

##### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

##### patch

[`GraphPatch`](../interfaces/GraphPatch.md)

#### Returns

[`ProposalResult`](../type-aliases/ProposalResult.md)\<[`GraphPatch`](../interfaces/GraphPatch.md)\>

## Example

```ts
import { AICast, GraphPatch } from '@czap/core';

const ctx = AICast.castContext(graph, { tokenBudget: 512 }); // cast OUT
// ... a producer feeds ctx.systemPrompt + ctx.proposalSchemas to a model,
//     which returns a candidate GraphPatch `patch` ...
const checked = AICast.validateGraphPatchProposal(graph, patch); // cast IN
if (checked.ok) {
  // a SEPARATE host authority decides to admit it:
  const next = AICast.applyValidatedPatch(graph, checked.proposal);
}
```
