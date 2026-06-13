[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / GraphPatch

# GraphPatch

GraphPatch namespace — the tagged-delta mutation surface over
[DocumentGraph](../../interfaces/DocumentGraph.md). Propose a delta, apply/preview it (re-addressing through
the one kernel), validate the would-be result, diff two graphs, and mint a
receipt / detect concurrent forks.

## Example

```ts
import { GraphPatch } from '@czap/core';

const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node }]);
const next = GraphPatch.apply(base, patch);          // re-addressed: next.id !== base.id
const check = GraphPatch.validate(base, patch);      // { ok: true } | { ok: false, errors }
const back = GraphPatch.diff(base, next);            // apply(base, back) deep-equals next
```

## Type Aliases

- [EdgeOp](type-aliases/EdgeOp.md)
- [NodeOp](type-aliases/NodeOp.md)
- [Op](type-aliases/Op.md)
