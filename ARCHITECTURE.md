# LiteShip architecture

The structural map: what the pieces are and how they fit. This doc explains the system on its own — the ADRs record _why_ each choice was made, but you shouldn't need them to understand it.

**LiteShip is a multimedia-native adaptive UI compiler/runtime — not a component library.**

_LiteShip — distributed as `@liteship/*` packages on npm._

LiteShip's packages were originally published under the `@czap` scope (CZAP: content-zoned adaptive projection, the engine's original name); the scope, the `data-czap-*` wire prefix, and `CZAP_*` identifiers were retired wholesale in v0.19.

Prose vocabulary: [GLOSSARY.md](./GLOSSARY.md).

- Mental model: [`ASTRO-STATIC-MENTAL-MODEL.md`](./ASTRO-STATIC-MENTAL-MODEL.md), [`AUTHORING-MODEL.md`](./AUTHORING-MODEL.md), and [`ASTRO-RUNTIME-MODEL.md`](./ASTRO-RUNTIME-MODEL.md).
- Public surfaces: [`PACKAGE-SURFACES.md`](./PACKAGE-SURFACES.md) and [`docs/api/`](./docs/api/) (TypeDoc-generated from source TSDoc).
- Decisions: [`docs/adr/`](./docs/adr/), where each non-obvious choice has a record.
- Status: [`STATUS.md`](./STATUS.md), live gates, perf, watch items.

## System shape

Core grammar: `signal -> boundary -> named state -> target output`. `@liteship/core` owns the language; host packages rig it to browsers, Astro, edge, workers, video, CLI, and AI-tooling surfaces. Worth noting: the grammar holds across all of them. Hosts do not define boundary semantics; every projection target reads the same content-addressed definition. The `signal` end is itself a source of truth: `SignalSource` (`@liteship/core`) is the one signal vocabulary every domain reads — viewport, scroll, pointer, media, and live `audio` (amplitude/beat) — rather than re-parsing input strings per host.

## Document graph (the IR)

That "same content-addressed definition" is one data structure: the **document graph**, `@liteship/core`'s keystone IR. Authored boundaries, tokens, themes, and styles seal into a graph of typed nodes — eight families (`signal`, `entity`, `component`, `pose`, `transition`, `projection`, `policy`, `export`) — each addressed by the content hash of its canonical bytes (CBOR + FNV-1a, [ADR-0003](./docs/adr/0003-content-addressing.md)). `sealNode` / `sealGraph` mint those addresses; `validateGraph` and `linearizeGraph` check and order them. Every cast target — CSS, GLSL, WGSL, ARIA, AI manifest, video — reads from the same sealed graph, so "computed from a content address of the definition" is literal: change a node, its address changes, and only the casts that depend on it recompute. `GraphPatch` is the typed delta over a graph (propose -> validate -> apply -> re-seal); the editor and the AI cast both mutate through it, never by hand. As of 0.4.0 the sealed graph is a **runtime** surface too, not only a build-time/editor one: `loadGraphRuntime` (`@liteship/astro`) lowers a serialized graph onto the live cast pipeline and `castGraphDelta` re-casts only the changed cells on a patch — fed live by the scene→live bridge (`bridgeSceneToGraph`) and the AI-apply seam (`admitGraphPatchProposal`). Full rationale: [ADR-0015](./docs/adr/0015-document-graph-ir.md).

## AI cast

The same graph casts _out_ to a model. `AICast.castContext` turns a sealed graph into a token-budgeted `AIContext` (a deterministic summary plus a tool schema); a model's reply returns as a `GraphPatch` proposal that must clear `validateGraphPatchProposal` before `applyValidatedPatch` will touch the graph. Validation mints a `ValidatedProposal` carrying an unforgeable `ApplyToken` — there is no path from raw model output to a graph mutation that skips it (`mintValidated` is denied at the package subpath; see `packages/core/package.json` `"./validated-output": null`). The primitive is pure: zero network, zero provider imports. The framework owns the envelope; the host owns the model call and the authority to apply. See [ADR-0015](./docs/adr/0015-document-graph-ir.md) and `packages/core/src/ai-cast.ts`.

## The mutation channel

The return leg. SSE pushes server→client; the channel is the other direction — a client (a human sorting, filtering, or editing) proposes a `GraphPatch` and the server validates it against its own current graph before applying, the SAME refuse-seam the AI cast uses (`validateGraphPatchProposal -> applyValidatedPatch`), now driven by a remote client over HTTP. `handleGraphMutation` (`@liteship/core`) is transport-agnostic — decode → load → validate → apply → save over a host-owned `GraphStore` — and returns exactly one of `applied` (the new sealed graph), `refused` (the patch did not validate), or `error` (a store failure); it never throws. So `GraphPatch` is the one mutation door for a third caller too: the editor, the AI cast, and now a remote client all mutate through it, none skipping validation. Optimistic concurrency is free — a patch cast against a stale base, or two clients racing the same base, is refused by a compare-and-swap on `saveGraph`, never lost. The host owns the store, the route, and thus the authority ([ADR-0015](./docs/adr/0015-document-graph-ir.md)); `@liteship/astro`'s `graphMutationRoute` wraps the handler into an Astro API route (requiring `application/json` so a cross-site simple-request can't smuggle a patch past the CORS preflight), injecting no route of its own. Full rationale: [ADR-0030](./docs/adr/0030-client-server-mutation-channel.md).

`createGraphMutationClient` (`@liteship/core`) is the DOM-free client-side state machine for that channel: it holds the current base, serializes submits, advances on `applied`, and uses structured `staleBase: true` refusals to reload through a host-owned `refreshBase` before re-proposing. `bindGraphForm` (`@liteship/web`) is the small DOM rig around it: submit captures `FormData`, the host projects it to patch ops, and the binding reflects only `data-liteship-mutation-state` plus a `liteship:mutation` event. It is not a form generator or data-grid.

`adoptAppliedGraph` (`@liteship/astro/runtime`) closes the loop back into a live graph runtime. A graph returned by a mutation endpoint is still treated as unknown wire data, re-proved through `verifyAppliedGraph`, then advanced through the same `castGraphDelta` runtime seam used by AI proposals and scene bridges. Full rationale: [ADR-0031](./docs/adr/0031-form-mutation-binding-primitive.md).

**Stream recovery — the forward leg, bounded end-to-end** ([#133](https://github.com/freebatteryfactory/LiteShip/issues/133)). SSE pushes server→client; when the connection drops, a missed _discrete state crossing_ must not silently vanish. The default floor is snapshot re-sync (re-fetch HTML + discrete signals; continuous transients never replay). Graph-backed streams add a value-bearing path over the SAME QUERY read leg the mutation channel exposes: **emit → attest → replay**. The authority mints a `DiscreteStateTransition` receipt on each real crossing (`mintTransition(prev, next, { base, resultId })` — the next-state value lives in the receipt, minted, never inferred from a node) through the ONE receipt hash law (`TypedRef → Receipt.createEnvelope → sha256`, byte-identical to `GraphPatch.receipt`; Law 4) and emits it as an SSE `{ type: 'receipt', … }` frame. The client attests every frame before buffering — fail-closed decode, `Receipt.hashEnvelope` self-consistency, and the `${base}#${cell}` subject law (Law 15) — so a forged or mis-subjected frame is refused, not replayed. On recovery the client QUERYs the read leg, re-adopts the authoritative graph (`runGraphNativeGapReplay`), then applies the buffered crossings to a `StateCell` store by generation (the generation guard makes a stale/duplicate transition a no-op). The host owns the substrate: `@liteship/astro`'s `client:stream` directive constructs the store + `createGraphMutationClient` and registers them via `registerStreamRecoverySubstrate` when the element opts in (`data-liteship-stream-graph`), disposing on teardown and re-arming on view-transition reinit. Runnable cookbook: `examples/showcase` (`/stream-recovery`). See [ASTRO-RUNTIME-MODEL.md](./ASTRO-RUNTIME-MODEL.md) `### stream`.

## Edge delivery (0.9 seams)

**Workers static boundary CSS** ([ADR-0025](./docs/adr/0025-workers-static-assets-boundary-css.md)): precompiled boundary outputs ship as immutable `/_liteship/<id>/<hash>.css` Workers Static Assets; SSR selects the tier URL instead of inlining bytes on every request. See also [HOSTING.md](./HOSTING.md) and [ASTRO-RUNTIME-MODEL.md](./ASTRO-RUNTIME-MODEL.md).

**Docs MCP bundle** ([`docs-bundle-id.ts`](./packages/astro/src/docs-bundle-id.ts)): sealed `docs:bundle` manifest + `loadDocsMcpBundle` integrity (`bundleId` recomputed at load).

**DPU adopt-under** ([#120](https://github.com/freebatteryfactory/LiteShip/issues/120)): `applyVerifiablePatchAndAdopt` wires stamped HTML patches to `mutationClient.adopt` after CAS verification.

**API docs build** ([ADR-0038](./docs/adr/0038-typedoc-monolith-canonical.md)): monolith `docs:build` is canonical; sharded build is experimental only.

**Receipt-DAG compaction** ([ADR-0026](./docs/adr/0026-dag-compaction.md)): `ReceiptDAG.pruneToBound` caps per-session DAG growth while retaining the canonical linear tail — long-lived streams do not grow without bound.

**Cell value→wire boundary** ([ADR-0027](./docs/adr/0027-cell-value-dom-boundary.md)): reactive primitives publish through the wire/compositor seam; DOM writes stay in host adapters. Continuous transients never patch the graph per frame.

**Responsive-media effective-candidate law** ([#140](https://github.com/freebatteryfactory/LiteShip/issues/140)): `selectCandidates(intent, caps)` in `@liteship/core` is the ONE function every responsive-media output derives from — `src`, `srcset`, each `<source>`, the preload `imagesrcset`, the CSS `image-set()`, and the content-addressed cache-key digest all enumerate the same set. Under `Save-Data` the whole set is capped to the light/floor variant, so a high-DPR Save-Data client is never advertised a heavy candidate through ANY artifact (the projection honors `resolveResponsiveMedia`'s own promise). `@liteship/astro`'s `liteshipMiddleware` wires it into a production host path — `Astro.locals.liteship.responsiveMedia(intent)` derives caps from the request's Client Hints and merges the responsive `Vary` axis (`Sec-CH-DPR, Save-Data`) into the response; `@liteship/cloudflare`'s `cloudflareMiddleware` inherits both. Runnable routes: `examples/showcase` `/responsive-media`, `examples/cloudflare-astro` `/`.

## One source, N targets

Two invariants share a shape: ONE authored source is provably read by every target, so the surfaces cannot silently diverge.

- **Dual export — shared DIGEST** ([`dual-export.ts`](./packages/stage/src/dual-export.ts)): one `DocumentGraph` casts to a static Astro page AND a video, both derived from the same `DocumentGraph.digest`, joined under one parent merge receipt. Each `ExportNode` is a reader of the graph.
- **Motion parity — shared KERNEL** ([ADR-0040](./docs/adr/0040-cross-target-motion-parity.md)): one authored motion program renders identically across browser CSS, browser runtime, scene, stage, remotion, and worker because EVERY non-CSS target samples the ONE kernel `sampleProgram` (`@liteship/core`) and the declarative CSS `@keyframes` are generated from the SAME kernel. A DIFFERENTIAL ORACLE (`tests/unit/core/motion-parity.test.ts`) pins every target to the reference within a documented epsilon (the browser-CSS leg compared against the SAME 32-sample `linear()` approximation, never the continuous spring). Authored-motion sampling is ADDITIVE to `@liteship/scene`'s video-crossfade `_blend`, never a merge. The oracle is the reader that makes each thin per-target adapter load-bearing.

## Package DAG

```text
@liteship/_spine -> @liteship/core
@liteship/canonical -> @liteship/core (bytes implementation; re-exported at core boundary)
@liteship/canonical -> @liteship/genui -> @liteship/web / @liteship/astro / @liteship/mcp-server
@liteship/core -> quantizer / compiler / detect / web / worker / remotion / assets / scene
core + scene -> stage                              (dual-export: one graph -> static page + video)
compiler -> vite -> astro
detect -> edge -> astro
edge + astro -> cloudflare
web + worker -> astro
scene -> astro                                     (0.4.0: scene->live bridge + the client:svg egress, on the live runtime)
core + assets -> command -> cli -> mcp-server   (command also -> mcp-server directly)
@liteship/error                                        (foundational tagged-error leaf; adopted stack-wide, zero @liteship/* deps)
error -> @liteship/gauntlet                            (lean rigor engine: gates/findings/assurance; NO typescript — oracles host-injected)
canonical + error + gauntlet -> @liteship/audit        (builds the gauntlet's repo-IR + injects LiteShip oracles; deps typescript)
```

`@liteship/command` is the shared command registry both `@liteship/cli` and `@liteship/mcp-server`
dispatch through — not a direct `cli -> mcp-server` edge. `@liteship/error` is the
foundational tagged-error leaf the stack adopts (its own zero-`@liteship`-dep leaf). The
lean `@liteship/gauntlet` (the rigor engine, ADR-0023) carries no `typescript`; `@liteship/audit`
builds the IR it defines and injects the LiteShip oracles (ADR-0012), so audit deps
`@liteship/canonical` / `@liteship/error` / `@liteship/gauntlet`.

Plus `crates/liteship-compute/`, the Rust `#![no_std]` WASM hot-path kernels.

## Packages

API docs per package live at [`docs/api/<name>/`](./docs/api/); import guidance at [`PACKAGE-SURFACES.md`](./PACKAGE-SURFACES.md).

<!-- BEGIN PACKAGES (generated by scripts/gen-docs.ts from package.json descriptions + scripts/lib/doc-registry.ts — edit those, then run `pnpm run docs:gen`) -->
| Package | Description |
| --- | --- |
| [`@liteship/core`](./packages/core) | The heart of LiteShip: define UI boundaries, tokens, themes, and signals once as a content-addressed graph, then drive the engine that keeps every rendered output in sync. |
| [`@liteship/canonical`](./packages/canonical) | The content-addressing kernel for LiteShip: canonical CBOR encoding and stable digests so the same definition always hashes to the same address. |
| [`@liteship/error`](./packages/error) | The one error algebra for LiteShip: build tagged error values that work as thrown Errors and as errors-as-values (a Result err-arm), and compose your own variants on top with zero dependencies. |
| [`@liteship/genui`](./packages/genui) | Render AI-generated UI safely in LiteShip: validate a model's proposed component tree against a host-owned catalog and draw only trusted, whitelisted components. |
| [`@liteship/quantizer`](./packages/quantizer) | Turn continuous signals into a few named UI states for LiteShip: evaluate boundaries, animate the transitions between states, and gate motion by device tier. |
| [`@liteship/compiler`](./packages/compiler) | Compile one LiteShip boundary definition into many outputs at once — CSS, GLSL, WGSL, ARIA, AI descriptions, and Tailwind — so every target stays in sync. |

Add a host integration when you wire LiteShip into a build pipeline:

| Package | Description |
| --- | --- |
| [`@liteship/vite`](./packages/vite) | The Vite plugin for LiteShip: compile `@token`, `@theme`, `@style`, and `@quantize` blocks into native CSS and hot-reload boundary definitions as you edit. |
| [`@liteship/astro`](./packages/astro) | The Astro integration for LiteShip: render adaptive UI as islands with the `client:satellite` directive and resolve device tiers on the server for first paint. |
| [`@liteship/edge`](./packages/edge) | Choose the right UI state at the CDN edge for LiteShip: read Client Hints into a device tier, serve a content-addressed boundary cache, and compile the theme for first paint. |
| [`@liteship/cloudflare`](./packages/cloudflare) | Run LiteShip on Cloudflare Workers: a site adapter with a KV-backed edge cache and the Astro middleware glue that caches boundaries at the edge. |

Reach for the rest only when the surface meaning justifies the runtime escalation:

| Package | Description |
| --- | --- |
| [`@liteship/web`](./packages/web) | The browser runtime for LiteShip: apply CSS, streamed HTML, worker output, and LLM chunks to a live DOM with focus- and scroll-preserving morphing. |
| [`@liteship/detect`](./packages/detect) | Detect device capabilities for LiteShip: probe GPU tier, CPU, memory, motion preference, and network, then map them to the tiers that select which UI state renders. |
| [`@liteship/worker`](./packages/worker) | Move LiteShip's heavy work off the main thread: compositor and render workers plus a lock-free ring buffer that stream state and frames without janking the UI. |
| [`@liteship/remotion`](./packages/remotion) | Use LiteShip inside Remotion: React hooks and composition helpers that drive video frames and shader surfaces from the same boundary state used everywhere else. |
| [`@liteship/scene`](./packages/scene) | Author video timelines for LiteShip: a typed scene and track model built on the entity-component substrate in `@liteship/core`. |
| [`@liteship/assets`](./packages/assets) | Manage media assets for LiteShip: declare audio, video, and image assets and read cached analysis such as waveforms, beat markers, and onsets. |
| [`@liteship/stage`](./packages/stage) | Export one LiteShip document graph to many carriers: prove a single source renders to both a static Astro page and a video, joined under one receipt. |
| [`@liteship/cli`](./packages/cli) | The `liteship` command-line tool for LiteShip: JSON-in, JSON-out verbs built for AI agents, with a human-friendly terminal mode. |
| [`@liteship/mcp-server`](./packages/mcp-server) | The Model Context Protocol server for LiteShip: exposes the `liteship` commands and capsule catalog as MCP tools that AI assistants can call. |
| [`@liteship/_spine`](./packages/_spine) | Install-only TypeScript declaration spine for LiteShip: the shared type anchor that `@liteship/core` and `@liteship/scene` reference from their published `.d.ts` — there is nothing to import at runtime. |

You don't install these directly — they back the CLI, the MCP server, and the release tooling:

| Package | Description |
| --- | --- |
| [`@liteship/command`](./packages/command) | The shared command registry behind LiteShip's tooling: one source of command definitions that both the `liteship` CLI and the MCP server project from. |
| [`@liteship/audit`](./packages/audit) | Audit a LiteShip project's structure, integrity, and public surface: a downstream-installable engine that builds a model of the repository and runs configurable checks over it. |
| [`@liteship/gauntlet`](./packages/gauntlet) | The rigor engine behind LiteShip's release gates: define quality gates that report findings and earn blocking power only by proving themselves against their own fixtures. |
<!-- END PACKAGES -->

## Graceful degradation

Fast paths fall back honestly past their regime — `DirtyFlags` past 31 keys (`packages/core/src/dirty.ts`), `Boundary.evaluate` past 4 thresholds (`packages/core/src/boundary-f32.ts:51`).

## Architectural decisions

Full index + accepted set (0001–0040; 0034 reserved): [`docs/adr/README.md`](./docs/adr/README.md).

Capsule factory + video stack: [CAPSULE-FACTORY.md](./CAPSULE-FACTORY.md).

## Where to start

- New contributors: [mental model](./ASTRO-STATIC-MENTAL-MODEL.md), [GLOSSARY](./GLOSSARY.md), [ADR-0001](./docs/adr/0001-namespace-pattern.md), [ADR-0002](./docs/adr/0002-zero-alloc.md).
- Using primitives: [api/core/](./docs/api/core/).
- Adding a projection target: [ADR-0006](./docs/adr/0006-compiler-dispatch.md), `packages/compiler/src/dispatch.ts`.
- Host integration: [HOSTING.md](./HOSTING.md).
