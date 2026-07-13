# czap showcase

> **New to LiteShip?** This is the everything-at-once demo, not the starting point.
> Climb the [examples ladder](../README.md) first — it builds up to what's shown here.

One app, the cast family together: worker, GPU, stream, and LLM client
directives, five pages driven from the same boundary/token/theme definitions.

When installing from npm (outside the monorepo), pin `@czap/*` packages at `^0.9.0`.

## Run it

```bash
pnpm install
pnpm dev
```

## What to look for, page by page

- **`/`** — the CSS state mirror: one `layout` boundary drives the grid, and the
  status readout renders purely off `data-czap-state`. Resize and watch both move
  together — same definition, no drift between them.
- **`/gpu`** — `client:gpu` drives a shader uniform (the cel shader in
  `public/shaders/cel.frag`) from the same boundary that styles the page. The
  capability tier gates it: constrained devices keep the CSS path instead of
  janking through a shader they can't afford.
- **`/worker`** — boundary evaluation off the main thread over an SPSC ring
  buffer. The panel shows exactly what the worker directive writes back —
  `data-czap-state` — flipping on resize while the main thread stays free.
- **`/stream`** — `client:stream` over a real SSE endpoint (`/api/feed`):
  patches morph into the live DOM with focus and scroll preserved.
- **`/stream-recovery`** — the graph-native recovery cookbook (#133): the
  **emit → attest → replay** loop. The SSE route (`src/pages/api/graph-feed.ts`)
  mints an attested `DiscreteStateTransition` receipt on a real
  `StateCellStore.applyDiscrete` crossing and emits it as a
  `{ type: 'receipt', … }` frame; the client attests it (hash + `${base}#${cell}`
  subject law) and, on a reconnect gap, QUERYs `/api/graph`, re-adopts the graph,
  and replays the missed crossing by generation — no lost discrete state, no full
  snapshot. Opt in with `data-czap-stream-graph` + the SSR-inlined base graph and
  cell registrations; a plain stream keeps the snapshot floor.
- **`/chat`** — `client:llm` streaming over `/api/chat` with tier-gated
  rendering, plus the generated-UI path (`data-czap-genui`): `_genui` chunks
  render through a host-owned catalog — the model proposes, the catalog
  renders, no model HTML ever touches the DOM.

The SSE API routes (`src/pages/api/feed.ts`, `src/pages/api/graph-feed.ts`,
`src/pages/api/chat.ts`) are real streams, not buffered bodies — the comments in
each explain why that distinction matters for reconnect semantics. The recovery
read leg (`src/pages/api/graph.ts`) and the deterministic authority it shares
(`src/server/stream-graph.ts`) are the QUERY + emit halves of the loop.
