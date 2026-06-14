# LiteShip architecture

The structural map: what the pieces are and how they fit. This doc explains the system on its own — the ADRs record *why* each choice was made, but you shouldn't need them to understand it.

*LiteShip — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages on npm.*

Prose vocabulary: [GLOSSARY.md](./GLOSSARY.md).

- Mental model: [`ASTRO-STATIC-MENTAL-MODEL.md`](./ASTRO-STATIC-MENTAL-MODEL.md), [`AUTHORING-MODEL.md`](./AUTHORING-MODEL.md), and [`ASTRO-RUNTIME-MODEL.md`](./ASTRO-RUNTIME-MODEL.md).
- Public surfaces: [`PACKAGE-SURFACES.md`](./PACKAGE-SURFACES.md) and [`docs/api/`](./docs/api/) (TypeDoc-generated from source TSDoc).
- Decisions: [`docs/adr/`](./docs/adr/), where each non-obvious choice has a record.
- Status: [`STATUS.md`](./STATUS.md), live gates, perf, watch items.

## System shape

Core grammar: `signal -> boundary -> named state -> target output`. `@czap/core` owns the language; host packages rig it to browsers, Astro, edge, workers, video, CLI, and AI-tooling surfaces. Worth noting: the grammar holds across all of them. Hosts do not define boundary semantics; every projection target reads the same content-addressed definition.

## Document graph (the IR)

That "same content-addressed definition" is one data structure: the **document graph**, `@czap/core`'s keystone IR. Authored boundaries, tokens, themes, and styles seal into a graph of typed nodes — eight families (`signal`, `entity`, `component`, `pose`, `transition`, `projection`, `policy`, `export`) — each addressed by the content hash of its canonical bytes (CBOR + FNV-1a, [ADR-0003](./docs/adr/0003-content-addressing.md)). `sealNode` / `sealGraph` mint those addresses; `validateGraph` and `linearizeGraph` check and order them. Every cast target — CSS, GLSL, WGSL, ARIA, AI manifest, video — reads from the same sealed graph, so "computed from a content address of the definition" is literal: change a node, its address changes, and only the casts that depend on it recompute. `GraphPatch` is the typed delta over a graph (propose -> validate -> apply -> re-seal); the editor and the AI cast both mutate through it, never by hand. Full rationale: [ADR-0015](./docs/adr/0015-document-graph-ir.md).

## AI cast

The same graph casts *out* to a model. `AICast.castContext` turns a sealed graph into a token-budgeted `AIContext` (a deterministic summary plus a tool schema); a model's reply returns as a `GraphPatch` proposal that must clear `validateGraphPatchProposal` before `applyValidatedPatch` will touch the graph. Validation mints a `ValidatedProposal` carrying an unforgeable `ApplyToken` — there is no path from raw model output to a graph mutation that skips it (`mintValidated` is denied at the package subpath; see `packages/core/package.json` `"./validated-output": null`). The primitive is pure: zero network, zero provider imports. The framework owns the envelope; the host owns the model call and the authority to apply. See [ADR-0015](./docs/adr/0015-document-graph-ir.md) and `packages/core/src/ai-cast.ts`.

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
core + assets -> command -> cli -> mcp-server   (command also -> mcp-server directly)
@czap/audit                                       (standalone: zero @czap/* deps; consumed by cli + the gauntlet)
```

`@czap/command` is the shared command registry both `@czap/cli` and `@czap/mcp-server`
dispatch through (CUT A1) — not a direct `cli -> mcp-server` edge. `@czap/audit` (CUT D9b)
is a standalone leaf with no `@czap/*` dependencies.

Plus `crates/czap-compute/`, the Rust `#![no_std]` WASM hot-path kernels.

## Packages

API docs per package live at [`docs/api/<name>/`](./docs/api/); import guidance at [`PACKAGE-SURFACES.md`](./PACKAGE-SURFACES.md).

- `@czap/_spine` — type spine
- `@czap/canonical` — sync bytes kernel (CBOR, FNV-1a, addressed digests)
- `@czap/core` — primitives + runtime coordination + the document graph IR / AI cast
- `@czap/genui` — closed catalog renderer for structured LLM UI trees
- `@czap/quantizer` — boundary evaluation + transitions
- `@czap/compiler` — CSS / GLSL / WGSL / ARIA / AI / Tailwind output
- `@czap/web` — DOM, SSE, morph, LLM, capture
- `@czap/detect` — capability + tier detection
- `@czap/vite` — Vite transforms + HMR
- `@czap/astro` — Astro integration + directives
- `@czap/edge` — client hints, tiers, edge cache
- `@czap/cloudflare` — Cloudflare Workers siteAdapter
- `@czap/worker` — off-thread compositor / render workers
- `@czap/remotion` — Remotion adapter
- `@czap/scene` — ECS scene composition
- `@czap/stage` — dual-export orchestration (one graph -> static page + headless video)
- `@czap/assets` — asset capsules + projections
- `@czap/command` — shared command registry + dispatcher (CLI + MCP)
- `@czap/audit` — profile-driven structure/integrity/surface audit engine (standalone)
- `@czap/cli` — JSON-first CLI
- `@czap/mcp-server` — MCP server

## Graceful degradation

Fast paths fall back honestly past their regime — `DirtyFlags` past 31 keys (`packages/core/src/compositor.ts:146`), `Boundary.evaluate` past 4 thresholds (`packages/core/src/boundary.ts:86`).

## Architectural decisions

Full index + accepted set (0001–0015): [`docs/adr/README.md`](./docs/adr/README.md).

Capsule factory + video stack: [CAPSULE-FACTORY.md](./CAPSULE-FACTORY.md).

## Where to start

- New contributors: [mental model](./ASTRO-STATIC-MENTAL-MODEL.md), [GLOSSARY](./GLOSSARY.md), [ADR-0001](./docs/adr/0001-namespace-pattern.md), [ADR-0002](./docs/adr/0002-zero-alloc.md).
- Using primitives: [api/core/](./docs/api/core/).
- Adding a projection target: [ADR-0006](./docs/adr/0006-compiler-dispatch.md), `packages/compiler/src/dispatch.ts`.
- Host integration: [HOSTING.md](./HOSTING.md).
