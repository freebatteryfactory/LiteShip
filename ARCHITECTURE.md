# LiteShip architecture

The structural map: what the pieces are and how they fit. This doc explains the system on its own — the ADRs record _why_ each choice was made, but you shouldn't need them to understand it.

**LiteShip is a multimedia-native adaptive UI compiler/runtime — not a component library.**

_LiteShip — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages on npm._

Prose vocabulary: [GLOSSARY.md](./GLOSSARY.md).

- Mental model: [`ASTRO-STATIC-MENTAL-MODEL.md`](./ASTRO-STATIC-MENTAL-MODEL.md), [`AUTHORING-MODEL.md`](./AUTHORING-MODEL.md), and [`ASTRO-RUNTIME-MODEL.md`](./ASTRO-RUNTIME-MODEL.md).
- Public surfaces: [`PACKAGE-SURFACES.md`](./PACKAGE-SURFACES.md) and [`docs/api/`](./docs/api/) (TypeDoc-generated from source TSDoc).
- Decisions: [`docs/adr/`](./docs/adr/), where each non-obvious choice has a record.
- Status: [`STATUS.md`](./STATUS.md), live gates, perf, watch items.

## System shape

Core grammar: `signal -> boundary -> named state -> target output`. `@czap/core` owns the language; host packages rig it to browsers, Astro, edge, workers, video, CLI, and AI-tooling surfaces. Worth noting: the grammar holds across all of them. Hosts do not define boundary semantics; every projection target reads the same content-addressed definition. The `signal` end is itself a source of truth: `SignalSource` (`@czap/core`) is the one signal vocabulary every domain reads — viewport, scroll, pointer, media, and live `audio` (amplitude/beat) — rather than re-parsing input strings per host.

## Document graph (the IR)

That "same content-addressed definition" is one data structure: the **document graph**, `@czap/core`'s keystone IR. Authored boundaries, tokens, themes, and styles seal into a graph of typed nodes — eight families (`signal`, `entity`, `component`, `pose`, `transition`, `projection`, `policy`, `export`) — each addressed by the content hash of its canonical bytes (CBOR + FNV-1a, [ADR-0003](./docs/adr/0003-content-addressing.md)). `sealNode` / `sealGraph` mint those addresses; `validateGraph` and `linearizeGraph` check and order them. Every cast target — CSS, GLSL, WGSL, ARIA, AI manifest, video — reads from the same sealed graph, so "computed from a content address of the definition" is literal: change a node, its address changes, and only the casts that depend on it recompute. `GraphPatch` is the typed delta over a graph (propose -> validate -> apply -> re-seal); the editor and the AI cast both mutate through it, never by hand. As of 0.4.0 the sealed graph is a **runtime** surface too, not only a build-time/editor one: `loadGraphRuntime` (`@czap/astro`) lowers a serialized graph onto the live cast pipeline and `castGraphDelta` re-casts only the changed cells on a patch — fed live by the scene→live bridge (`bridgeSceneToGraph`) and the AI-apply seam (`admitGraphPatchProposal`). Full rationale: [ADR-0015](./docs/adr/0015-document-graph-ir.md).

## AI cast

The same graph casts _out_ to a model. `AICast.castContext` turns a sealed graph into a token-budgeted `AIContext` (a deterministic summary plus a tool schema); a model's reply returns as a `GraphPatch` proposal that must clear `validateGraphPatchProposal` before `applyValidatedPatch` will touch the graph. Validation mints a `ValidatedProposal` carrying an unforgeable `ApplyToken` — there is no path from raw model output to a graph mutation that skips it (`mintValidated` is denied at the package subpath; see `packages/core/package.json` `"./validated-output": null`). The primitive is pure: zero network, zero provider imports. The framework owns the envelope; the host owns the model call and the authority to apply. See [ADR-0015](./docs/adr/0015-document-graph-ir.md) and `packages/core/src/ai-cast.ts`.

## The mutation channel

The return leg. SSE pushes server→client; the channel is the other direction — a client (a human sorting, filtering, or editing) proposes a `GraphPatch` and the server validates it against its own current graph before applying, the SAME refuse-seam the AI cast uses (`validateGraphPatchProposal -> applyValidatedPatch`), now driven by a remote client over HTTP. `handleGraphMutation` (`@czap/core`) is transport-agnostic — decode → load → validate → apply → save over a host-owned `GraphStore` — and returns exactly one of `applied` (the new sealed graph), `refused` (the patch did not validate), or `error` (a store failure); it never throws. So `GraphPatch` is the one mutation door for a third caller too: the editor, the AI cast, and now a remote client all mutate through it, none skipping validation. Optimistic concurrency is free — a patch cast against a stale base, or two clients racing the same base, is refused by a compare-and-swap on `saveGraph`, never lost. The host owns the store, the route, and thus the authority ([ADR-0015](./docs/adr/0015-document-graph-ir.md)); `@czap/astro`'s `graphMutationRoute` wraps the handler into an Astro API route (requiring `application/json` so a cross-site simple-request can't smuggle a patch past the CORS preflight), injecting no route of its own. Full rationale: [ADR-0030](./docs/adr/0030-client-server-mutation-channel.md).

`createGraphMutationClient` (`@czap/core`) is the DOM-free client-side state machine for that channel: it holds the current base, serializes submits, advances on `applied`, and uses structured `staleBase: true` refusals to reload through a host-owned `refreshBase` before re-proposing. `bindGraphForm` (`@czap/web`) is the small DOM rig around it: submit captures `FormData`, the host projects it to patch ops, and the binding reflects only `data-czap-mutation-state` plus a `czap:mutation` event. It is not a form generator or data-grid.

`adoptAppliedGraph` (`@czap/astro/runtime`) closes the loop back into a live graph runtime. A graph returned by a mutation endpoint is still treated as unknown wire data, re-proved through `verifyAppliedGraph`, then advanced through the same `castGraphDelta` runtime seam used by AI proposals and scene bridges. Full rationale: [ADR-0031](./docs/adr/0031-form-mutation-binding-primitive.md).

**Stream recovery — the forward leg, bounded end-to-end** ([#133](https://github.com/freebatteryfactory/LiteShip/issues/133)). SSE pushes server→client; when the connection drops, a missed _discrete state crossing_ must not silently vanish. The default floor is snapshot re-sync (re-fetch HTML + discrete signals; continuous transients never replay). Graph-backed streams add a value-bearing path over the SAME QUERY read leg the mutation channel exposes: **emit → attest → replay**. The authority mints a `DiscreteStateTransition` receipt on each real crossing (`mintTransition(prev, next, { base, resultId })` — the next-state value lives in the receipt, minted, never inferred from a node) through the ONE receipt hash law (`TypedRef → Receipt.createEnvelope → sha256`, byte-identical to `GraphPatch.receipt`; Law 4) and emits it as an SSE `{ type: 'receipt', … }` frame. The client attests every frame before buffering — fail-closed decode, `Receipt.hashEnvelope` self-consistency, and the `${base}#${cell}` subject law (Law 15) — so a forged or mis-subjected frame is refused, not replayed. On recovery the client QUERYs the read leg, re-adopts the authoritative graph (`runGraphNativeGapReplay`), then applies the buffered crossings to a `StateCell` store by generation (the generation guard makes a stale/duplicate transition a no-op). The host owns the substrate: `@czap/astro`'s `client:stream` directive constructs the store + `createGraphMutationClient` and registers them via `registerStreamRecoverySubstrate` when the element opts in (`data-czap-stream-graph`), disposing on teardown and re-arming on view-transition reinit. Runnable cookbook: `examples/showcase` (`/stream-recovery`). See [ASTRO-RUNTIME-MODEL.md](./ASTRO-RUNTIME-MODEL.md) `### stream`.

## Edge delivery (0.9 seams)

**Workers static boundary CSS** ([ADR-0025](./docs/adr/0025-workers-static-assets-boundary-css.md)): precompiled boundary outputs ship as immutable `/_czap/<id>/<hash>.css` Workers Static Assets; SSR selects the tier URL instead of inlining bytes on every request. See also [HOSTING.md](./HOSTING.md) and [ASTRO-RUNTIME-MODEL.md](./ASTRO-RUNTIME-MODEL.md).

**Docs MCP bundle** ([`docs-bundle-id.ts`](./packages/astro/src/docs-bundle-id.ts)): sealed `docs:bundle` manifest + `loadDocsMcpBundle` integrity (`bundleId` recomputed at load).

**DPU adopt-under** ([#120](https://github.com/freebatteryfactory/LiteShip/issues/120)): `applyVerifiablePatchAndAdopt` wires stamped HTML patches to `mutationClient.adopt` after CAS verification.

**API docs build** ([ADR-0038](./docs/adr/0038-typedoc-monolith-canonical.md)): monolith `docs:build` is canonical; sharded build is experimental only.

**Receipt-DAG compaction** ([ADR-0026](./docs/adr/0026-dag-compaction.md)): `ReceiptDAG.pruneToBound` caps per-session DAG growth while retaining the canonical linear tail — long-lived streams do not grow without bound.

**Cell value→wire boundary** ([ADR-0027](./docs/adr/0027-cell-value-dom-boundary.md)): reactive primitives publish through the wire/compositor seam; DOM writes stay in host adapters. Continuous transients never patch the graph per frame.

## One source, N targets

Two invariants share a shape: ONE authored source is provably read by every target, so the surfaces cannot silently diverge.

- **Dual export — shared DIGEST** ([`dual-export.ts`](./packages/stage/src/dual-export.ts)): one `DocumentGraph` casts to a static Astro page AND a video, both derived from the same `DocumentGraph.digest`, joined under one parent merge receipt. Each `ExportNode` is a reader of the graph.
- **Motion parity — shared KERNEL** ([ADR-0040](./docs/adr/0040-cross-target-motion-parity.md)): one authored motion program renders identically across browser CSS, browser runtime, scene, stage, remotion, and worker because EVERY non-CSS target samples the ONE kernel `sampleProgram` (`@czap/core`) and the declarative CSS `@keyframes` are generated from the SAME kernel. A DIFFERENTIAL ORACLE (`tests/unit/core/motion-parity.test.ts`) pins every target to the reference within a documented epsilon (the browser-CSS leg compared against the SAME 32-sample `linear()` approximation, never the continuous spring). Authored-motion sampling is ADDITIVE to `@czap/scene`'s video-crossfade `_blend`, never a merge. The oracle is the reader that makes each thin per-target adapter load-bearing.

## Package DAG

```text
@czap/_spine -> @czap/core
@czap/canonical -> @czap/core (bytes implementation; re-exported at core boundary)
@czap/canonical -> @czap/genui -> @czap/web / @czap/astro / @czap/mcp-server
@czap/core -> quantizer / compiler / detect / web / worker / remotion / assets / scene
core + scene -> stage                              (dual-export: one graph -> static page + video)
compiler -> vite -> astro
detect -> edge -> astro
edge + astro -> cloudflare
web + worker -> astro
scene -> astro                                     (0.4.0: scene->live bridge + the client:svg egress, on the live runtime)
core + assets -> command -> cli -> mcp-server   (command also -> mcp-server directly)
@czap/error                                        (foundational tagged-error leaf; adopted stack-wide, zero @czap/* deps)
error -> @czap/gauntlet                            (lean rigor engine: gates/findings/assurance; NO typescript — oracles host-injected)
canonical + error + gauntlet -> @czap/audit        (builds the gauntlet's repo-IR + injects LiteShip oracles; deps typescript)
```

`@czap/command` is the shared command registry both `@czap/cli` and `@czap/mcp-server`
dispatch through — not a direct `cli -> mcp-server` edge. `@czap/error` is the
foundational tagged-error leaf the stack adopts (its own zero-`@czap`-dep leaf). The
lean `@czap/gauntlet` (the rigor engine, ADR-0023) carries no `typescript`; `@czap/audit`
builds the IR it defines and injects the LiteShip oracles (ADR-0012), so audit deps
`@czap/canonical` / `@czap/error` / `@czap/gauntlet`.

Plus `crates/czap-compute/`, the Rust `#![no_std]` WASM hot-path kernels.

## Packages

API docs per package live at [`docs/api/<name>/`](./docs/api/); import guidance at [`PACKAGE-SURFACES.md`](./PACKAGE-SURFACES.md).

<!-- BEGIN PACKAGES (generated by scripts/gen-docs.ts from package.json descriptions + scripts/lib/doc-registry.ts — edit those, then run `pnpm run docs:gen`) -->

| Package                                   | Description                                                                                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@czap/core`](./packages/core)           | Primitives: Boundary, Token, Style, Theme, Signal, DocumentGraph + GraphPatch (the content-addressed IR), AI cast, Compositor, ECS, HLC, DAG, Plan, AVBridge                    |
| [`@czap/canonical`](./packages/canonical) | Self-contained bytes kernel: RFC 8949 §4.2.1 CBOR, FNV-1a labels, sync `AddressedDigest` (no Effect/spine in-package)                                                           |
| [`@czap/error`](./packages/error)         | Composable tagged-error algebra: a closed variant coproduct over an open `TaggedError` contract — value AND type, Effect- and throw-compatible (the foundational zero-dep leaf) |
| [`@czap/genui`](./packages/genui)         | Host-owned generated UI catalog: validate structured trees, render trusted components only (`genui:interaction` for actions)                                                    |
| [`@czap/quantizer`](./packages/quantizer) | `Q.from()` builder, boundary evaluation, animated transitions, motion-tier gating                                                                                               |
| [`@czap/compiler`](./packages/compiler)   | Multi-target output: CSS, GLSL, WGSL, ARIA, AI, Tailwind v4                                                                                                                     |

Add a host integration when you wire LiteShip into a build pipeline:

| Package                                     | Description                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [`@czap/vite`](./packages/vite)             | Vite 8 plugin: `@token` / `@theme` / `@style` / `@quantize` CSS transforms + HMR                      |
| [`@czap/astro`](./packages/astro)           | Astro 7 integration: `Satellite` component, `client:satellite` directive, `czapFetchLayer` edge layer |
| [`@czap/edge`](./packages/edge)             | CDN-edge: Client Hints, tier detection, KV boundary cache, theme compilation                          |
| [`@czap/cloudflare`](./packages/cloudflare) | Cloudflare Workers siteAdapter: KV boundary cache + Astro middleware glue                             |

Reach for the rest only when the surface meaning justifies the runtime escalation:

| Package                                     | Description                                                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@czap/web`](./packages/web)               | DOM runtime: Morph, SlotRegistry, SSE client, Physical state, LLM adapter, AudioWorklet                                                         |
| [`@czap/detect`](./packages/detect)         | Device capability probes, GPU tier, design/motion-tier mapping                                                                                  |
| [`@czap/worker`](./packages/worker)         | Off-thread: SPSC ring buffer, compositor worker, render worker, OffscreenCanvas                                                                 |
| [`@czap/remotion`](./packages/remotion)     | Remotion adapter: React hooks + composition helpers                                                                                             |
| [`@czap/scene`](./packages/scene)           | ECS-backed scene composition + timeline authoring                                                                                               |
| [`@czap/assets`](./packages/assets)         | Asset capsules + analysis projections (audio waveform, beat markers, ...)                                                                       |
| [`@czap/stage`](./packages/stage)           | Dual-export orchestration: one document graph → static Astro page + headless video, proven same-source (ffmpeg backend on `@czap/stage/ffmpeg`) |
| [`@czap/cli`](./packages/cli)               | `czap` CLI: AI-first JSON I/O with human-pretty TTY mode                                                                                        |
| [`@czap/mcp-server`](./packages/mcp-server) | Model Context Protocol server for AI tooling integration                                                                                        |
| [`@czap/_spine`](./packages/_spine)         | Type-only declaration spine referenced by published `.d.ts` from `@czap/core` / `@czap/scene`                                                   |

You don't install these directly — they back the CLI, the MCP server, and the release tooling:

| Package                                 | Description                                                                                                                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@czap/command`](./packages/command)   | Shared capsule command registry + dispatcher — one command truth for the CLI and MCP adapters                                                                                                  |
| [`@czap/audit`](./packages/audit)       | Profile-driven structure / integrity / surface audit engine + the host that builds the gauntlet's repo-IR + oracles (deps `@czap/canonical` / `@czap/error` / `@czap/gauntlet` / `typescript`) |
| [`@czap/gauntlet`](./packages/gauntlet) | Self-proving rigor engine: gates, findings, assurance levels, the authority ratchet, and `defineFactGate` (evidence-bound gates) — lean (no `typescript`; oracles host-injected)               |

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
