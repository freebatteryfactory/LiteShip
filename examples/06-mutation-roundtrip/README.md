# 06 — The client→server round-trip

LiteShip's stream is server→client (SSE). This is **the return leg**: the client proposes
a change to the graph, and the server validates it against its own truth before applying.
It's the same refuse-seam as `05-ai-patch-refused` — `validateGraphPatchProposal →
applyValidatedPatch` — now bidirectional and human-driven (sort / filter / edit).

## The whole thing

**Server** (`src/pages/api/graph.ts`) — one line:

```ts
export const POST: APIRoute = ({ request }) => graphMutationRoute(store)(request);
```

`graphMutationRoute(store)` wraps `@czap/core`'s `handleGraphMutation`: decode the proposed
`GraphPatch` → validate it against `store.loadGraph()` → apply → `store.saveGraph(next)`.
**200** on apply (body = the new sealed graph), **422** on refusal (body = the reasons).
The host owns `store` (the authority boundary); LiteShip owns the gate.

**Client** (`src/pages/index.astro`):

```ts
import { GraphPatch, sendGraphMutation } from '@czap/core';

const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node }]);
const res = await sendGraphMutation('/api/graph', patch);
// res.status === 'applied'  → res.graph is the new server truth
// res.status === 'refused'  → res.errors, and the server graph is byte-identical
```

## What it demonstrates

- **Optimistic concurrency for free.** A patch cast against a stale base (`patch.base` no
  longer matches the server's `graph.id`) is **refused** — the same base-mismatch check the
  AI seam runs. Click "Propose a stale patch" and watch it bounce.
- **One truth.** Only a validated patch mutates the server graph, which re-addresses to a
  new content hash. A refused patch leaves it byte-identical.
- **Host owns persistence.** Swap the in-memory `store` (`src/server/graph-store.ts`) for
  KV / a DB / a per-session store — the channel doesn't change.

## Run it

```sh
pnpm --filter @czap/example-mutation-roundtrip dev
```

Open the page, click the buttons, watch the server graph id advance on a valid patch and
hold on a refused one. Or hit the endpoint directly:

```sh
curl -sX POST localhost:4321/api/graph -H 'content-type: application/json' \
  --data '{"patch": <a GraphPatch envelope>}'
```
