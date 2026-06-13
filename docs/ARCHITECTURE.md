# LiteShip architecture

Slim structural index. Deeper explanation lives in the linked docs.

*LiteShip — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages on npm.*

Prose vocabulary: [GLOSSARY.md](./GLOSSARY.md).

- Mental model: [`ASTRO-STATIC-MENTAL-MODEL.md`](./ASTRO-STATIC-MENTAL-MODEL.md), [`AUTHORING-MODEL.md`](./AUTHORING-MODEL.md), and [`ASTRO-RUNTIME-MODEL.md`](./ASTRO-RUNTIME-MODEL.md).
- Public surfaces: [`PACKAGE-SURFACES.md`](./PACKAGE-SURFACES.md) and [`docs/api/`](./api/) (TypeDoc-generated from source TSDoc).
- Decisions: [`docs/adr/`](./adr/), where each non-obvious choice has a record.
- Status: [`docs/STATUS.md`](./STATUS.md), live gates, perf, watch items.

## System shape

Core grammar: `signal -> boundary -> named state -> target output`. `@czap/core` owns the language; host packages rig it to browsers, Astro, edge, workers, video, CLI, and AI-tooling surfaces. Worth noting: the grammar holds across all of them. Hosts do not define boundary semantics; every projection target reads the same content-addressed definition.

## Package DAG

```text
@czap/_spine -> @czap/core
@czap/canonical -> @czap/core (bytes implementation; re-exported at core boundary)
@czap/canonical -> @czap/genui -> @czap/web / @czap/astro / @czap/mcp-server
@czap/core -> quantizer / compiler / detect / web / worker / remotion / assets / scene
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

API docs per package live at [`docs/api/<name>/`](./api/); import guidance at [`PACKAGE-SURFACES.md`](./PACKAGE-SURFACES.md).

- `@czap/_spine` — type spine
- `@czap/canonical` — sync bytes kernel (CBOR, FNV-1a, addressed digests)
- `@czap/core` — primitives + runtime coordination
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
- `@czap/assets` — asset capsules + projections
- `@czap/command` — shared command registry + dispatcher (CLI + MCP)
- `@czap/audit` — profile-driven structure/integrity/surface audit engine (standalone)
- `@czap/cli` — JSON-first CLI
- `@czap/mcp-server` — MCP server

## Graceful degradation

Fast paths fall back honestly past their regime — `DirtyFlags` past 31 keys (`packages/core/src/compositor.ts:146`), `Boundary.evaluate` past 4 thresholds (`packages/core/src/boundary.ts:86`).

## Architectural decisions

Full index + accepted set (0001–0014): [`docs/adr/README.md`](./adr/README.md).

Capsule factory + video stack: [capsule-factory.md](./capsule-factory.md).

## Where to start

- New contributors: [mental model](./ASTRO-STATIC-MENTAL-MODEL.md), [GLOSSARY](./GLOSSARY.md), [ADR-0001](./adr/0001-namespace-pattern.md), [ADR-0002](./adr/0002-zero-alloc.md).
- Using primitives: [api/core/](./api/core/).
- Adding a projection target: [ADR-0006](./adr/0006-compiler-dispatch.md), `packages/compiler/src/dispatch.ts`.
- Host integration: [HOSTING.md](./HOSTING.md).
