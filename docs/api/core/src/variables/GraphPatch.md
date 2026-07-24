[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphPatch

# Variable: GraphPatch

> **GraphPatch**: `object`

Defined in: [core/src/graph/graph-patch.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-patch.ts#L65)

GraphPatch namespace — the tagged-delta mutation surface over
[DocumentGraph](../interfaces/DocumentGraph.md). Propose a delta, apply/preview it (re-addressing through
the one kernel), validate the would-be result, diff two graphs, and mint a
receipt / detect concurrent forks.

## Type Declaration

### apply

> **apply**: (`graph`, `patch`) => [`DocumentGraph`](../interfaces/DocumentGraph.md)

Apply a patch's ops to a graph, then RE-ADDRESS via [sealGraph](../functions/sealGraph.md) so the
result's `id`/`digest` reflect the new content. Node ops key on the node `id`
(content address); edge ops key on the structural triple. `update` is a
remove-then-add of the carried node (its id already encodes the new payload).
Idempotent per op kind: removing an absent node/edge is a no-op; adding an
existing one dedups.

#### Parameters

##### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

##### patch

[`GraphPatch`](../interfaces/GraphPatch.md)

#### Returns

[`DocumentGraph`](../interfaces/DocumentGraph.md)

### decode

> **decode**: (`value`) => [`GraphPatch`](../interfaces/GraphPatch.md)

VERSION-AWARE, FAIL-CLOSED reader for an UNTRUSTED GraphPatch value (a patch
lowered from persisted JSON / a model proposal). [apply](#apply) trusts its
`patch` argument's `_version`; a host that reconstructs a patch from outside
the program must run it through THIS gate first, so a future-version
(`_version: 2`) patch is rejected with ONE canonical tagged `ParseError`
— never silently misparsed and replayed as a v1 delta. Scope is intentionally
the `_tag`/`_version` ENVELOPE only (the deeper op-shape validation lives in
[validate](#validate), which re-runs structural integrity on the apply result).

#### Parameters

##### value

`unknown`

#### Returns

[`GraphPatch`](../interfaces/GraphPatch.md)

#### Throws

`ParseError` (`source: 'GraphPatch'`) when the value is not a
  record, carries the wrong `_tag`, or an unsupported `_version`.

### diff

> **diff**: (`a`, `b`) => [`GraphPatch`](../interfaces/GraphPatch.md)

Structural differ: the tagged delta that carries `a` to `b`. Nodes diff by
`id` set difference (a payload change is a remove+add of the same logical cell,
collapsed into one `update` op when family + logical key match); edges diff by
structural triple. `apply(a, diff(a, b))` deep-equals `b` (round-trip).

#### Parameters

##### a

[`DocumentGraph`](../interfaces/DocumentGraph.md)

##### b

[`DocumentGraph`](../interfaces/DocumentGraph.md)

#### Returns

[`GraphPatch`](../interfaces/GraphPatch.md)

### forkOf

> **forkOf**: (`local`, `patchReceipts`) => [`MergeResult`](../interfaces/MergeResult.md)

Concurrent-patch fork detection, composed onto [DAG.merge](DAG.md#merge): ingest a set
of patch receipts into a receipt DAG; `merge` enforces the single-writer
anti-fork rule and reports whether the head diverged. Use when two patches
race off a shared `base` and you must decide if they forked the chain.

#### Parameters

##### local

[`ReceiptDAG`](../interfaces/ReceiptDAG.md)

##### patchReceipts

readonly [`ReceiptEnvelope`](../interfaces/ReceiptEnvelope.md)[]

#### Returns

[`MergeResult`](../interfaces/MergeResult.md)

### patchId

> **patchId**: (`patch`) => `ContentAddress`

The receipt subject id for a patch: a content address over `{ base, ops }`, so
structurally-equal patches share a receipt subject (the mutation's identity,
minted through the one kernel — distinct from the sha256 receipt byte law).

#### Parameters

##### patch

[`GraphPatch`](../interfaces/GraphPatch.md)

#### Returns

`ContentAddress`

### preview

> **preview**: (`graph`, `patch`) => [`DocumentGraph`](../interfaces/DocumentGraph.md)

Preview a patch — [apply](#apply) without committing. Same bytes as `apply`,
named for the intent: callers use `preview` to inspect/validate a candidate
result without implying it has been persisted.

#### Parameters

##### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

##### patch

[`GraphPatch`](../interfaces/GraphPatch.md)

#### Returns

[`DocumentGraph`](../interfaces/DocumentGraph.md)

### propose

> **propose**: (`base`, `ops`) => [`GraphPatch`](../interfaces/GraphPatch.md)

Propose a patch from a `base` graph and an op list, stamping `resultId` by
previewing the apply. The patch is a pure value — proposing never mutates
`base`.

#### Parameters

##### base

[`DocumentGraph`](../interfaces/DocumentGraph.md)

##### ops

readonly [`PatchOp`](../type-aliases/PatchOp.md)[]

#### Returns

[`GraphPatch`](../interfaces/GraphPatch.md)

### receipt

> **receipt**: (`patch`, `options?`) => `Promise`\<[`ReceiptEnvelope`](../interfaces/ReceiptEnvelope.md)\>

Compose the patch's `resultId` onto the [Receipt](Receipt.md) byte law: a single
genesis-or-linked envelope whose payload is a [TypedRef](TypedRef.md) over the
mutation, subject-keyed by the patch identity. Async (`Promise`-returning)
because the receipt byte law hashes via `crypto.subtle` (SHA-256) — the same
async kernel `Receipt.createEnvelope` rides on; folding it to a sync value
would force a second, divergent hashing path. `timestamp`/`previous` default to
a genesis stamp; pass them to chain this patch onto a prior receipt.

#### Parameters

##### patch

[`GraphPatch`](../interfaces/GraphPatch.md)

##### options?

###### previous?

`string` \| readonly `string`[]

###### timestamp?

[`HLCBrand`](../interfaces/HLCBrand.md)

#### Returns

`Promise`\<[`ReceiptEnvelope`](../interfaces/ReceiptEnvelope.md)\>

### validate

> **validate**: (`graph`, `patch`) => \{ `ok`: `true`; \} \| \{ `errors`: readonly `PlanValidationError`[]; `ok`: `false`; \}

Validate a patch by RE-RUNNING [validateGraph](../functions/validateGraph.md) on its apply result:
structural integrity (no cycles, no dangling edge endpoints) of the graph the
patch WOULD produce. A patch that introduces a cycle or a dangling edge fails
here, before anyone commits it.

#### Parameters

##### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

##### patch

[`GraphPatch`](../interfaces/GraphPatch.md)

#### Returns

\{ `ok`: `true`; \} \| \{ `errors`: readonly `PlanValidationError`[]; `ok`: `false`; \}

## Example

```ts
import { GraphPatch } from '@liteship/core';

const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node }]);
const next = GraphPatch.apply(base, patch);          // re-addressed: next.id !== base.id
const check = GraphPatch.validate(base, patch);      // { ok: true } | { ok: false, errors }
const back = GraphPatch.diff(base, next);            // apply(base, back) deep-equals next
```
