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

`graphMutationRoute(store)` wraps `@liteship/core`'s `handleGraphMutation`: decode the proposed
`GraphPatch` → validate it against `store.loadGraph()` → apply → `store.saveGraph(next)`.
**200** on apply (body = the new sealed graph), **409** on stale-base/lost-update refusal
(body includes `staleBase: true`), **422** on invalid proposal refusal. The host owns `store`
(the authority boundary); LiteShip owns the gate.

**Client** (`src/pages/index.astro`):

```ts
import { createGraphMutationClient } from '@liteship/core';
import { bindGraphForm } from '@liteship/web';

const client = createGraphMutationClient({ url: '/api/graph', base, refreshBase });

bindGraphForm(form, {
  client,
  toOps: (data, base) => [{ op: 'add', family: 'signal', node: signal(base.meta, data.get('axis')) }],
});

form.addEventListener('liteship:mutation', (event) => {
  // event.detail is the channel response; the form also carries data-liteship-mutation-state.
});
```

## What it demonstrates

- **The primitive flow.** The form captures `FormData`, `bindGraphForm` runs host-owned
  `toOps`, `createGraphMutationClient` proposes/sends, and the form emits `liteship:mutation`
  while reflecting `data-liteship-mutation-state`.
- **Optimistic concurrency for free.** A patch cast against a stale base (`patch.base` no
  longer matches the server's `graph.id`) is **refused** with `staleBase: true` and HTTP
  **409**. The client primitive can recover by calling the host-owned `refreshBase`, then
  re-proposing against the new graph.
- **One truth.** Only a validated patch mutates the server graph, which re-addresses to a
  new content hash. A refused patch leaves it byte-identical.
- **Raw channel still exists.** The page keeps a `sendGraphMutation` button that sends a
  deliberately stale patch so the low-level refusal shape remains visible.
- **Host owns persistence.** Swap the in-memory `store` (`src/server/graph-store.ts`) for
  KV / a DB / a per-session store — the channel doesn't change.

## Run it

```sh
pnpm --filter @liteship/example-mutation-roundtrip dev
```

Open the page, submit the form, and watch the server graph id advance through the client
primitive. Click the raw stale button to see a 409 refusal, or the recovery button to see
the client refresh and re-propose. You can still hit the endpoint directly:

```sh
curl -sX POST localhost:4321/api/graph -H 'content-type: application/json' \
  --data '{"patch": <a GraphPatch envelope>}'
```
