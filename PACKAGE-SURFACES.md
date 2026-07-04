# Package surfaces

## Purpose

This document maps the main `@czap/*` compartments in the repo: the hull sections you import from.

It answers:

- what each package owns
- what to import from it
- when to reach for it

It is a public-surface map, not a source dump.

Product naming for surrounding docs: [GLOSSARY.md](./GLOSSARY.md).

---

---

## `@czap/canonical`

Source: [`packages/canonical/src/index.ts`](./packages/canonical/src/index.ts)

The sync bytes kernel: canonical CBOR encoding, FNV-1a content labels, and addressed digests. Runtime status: `standalone leaf` (sole dep `@noble/hashes`; no Effect, no spine imports in-package).

Reach for it when you need:

- deterministic byte sequences for content addressing **without** importing `@czap/core`
- sync `AddressedDigest.of` (sha256 / blake3 integrity digests)
- upstream factory or WASM-side bytes that must not pull the full core graph

Main surfaces:

- `CanonicalCbor.encode`
- `fnv1a` / `fnv1aBytes`
- `AddressedDigest.of`

`@czap/core` re-exports these at its public boundary for app authors who already depend on core; import `@czap/canonical` directly when core is too heavy (ADR-0013).

---

## `@czap/error`

Source: [`packages/error/src/index.ts`](./packages/error/src/index.ts)

The composable tagged-error algebra — the foundational leaf the rest of the stack now adopts. Runtime status: `standalone` (zero `@czap/*` deps). A closed coproduct of built-in variants (`ValidationError`, `ParseError`, `InvariantViolationError`, `HostCapabilityError`, …) over an open `TaggedError` contract: every variant is a value AND a type (`throw ValidationError(…)` / `Effect.fail(ValidationError(…))`; `hasTag(e, 'ValidationError')` / `catchTag`). Downstream extends by composing, never editing: `type AppError = LiteShipError | MyDomainError` keeps full `matchTag`/`hasTag`/`raise` support. Composition over inheritance — no class hierarchy.

Main surfaces:

- `ValidationError`, `ParseError`, `InvariantViolationError`, `HostCapabilityError`
- `LiteShipError`, `TaggedError`, `matchTag`, `hasTag`, `raise`

---

## `@czap/genui`

Source: [`packages/genui/src/index.ts`](./packages/genui/src/index.ts)

Host-owned generated UI catalog renderer. Runtime status: `host-wired` through `@czap/astro` (`client:llm` + `genuiCatalog`), `@czap/web` (chunk parsing), and `@czap/mcp-server` (registry discovery).

Reach for it when you need:

- closed-catalog rendering of structured LLM UI trees (no model HTML)
- stable `renderHash` / `catalogHash` identities for cache and replay
- `genui:interaction` events for action ids the host interprets

Main surfaces:

- `defineComponentCatalog`
- `validateGeneratedUITree`
- `renderFromCatalog`
- `tryParseGeneratedUIChunk`
- `catalogHash` / `renderHash`
- `DEMO_COMPONENT_CATALOG`

Wire protocol discriminator: `{ "_genui": true, "name": "...", "props": { ... } }`. Legacy token/text/HTML streaming is unchanged when the marker is absent (ADR-0014).

---

## `@czap/core`

Source: [`packages/core/src/index.ts`](./packages/core/src/index.ts)

The semantic and runtime foundation. Runtime status: `host-wired`, including `Plan` and `ECS` through the shared `RuntimeCoordinator` host surface.

Reach for it when you need:

- definitions
- reactive primitives
- scheduling
- compositor logic
- diagnostics
- video and capture contracts

Main surfaces:

- `Boundary`
- `Token`
- `Theme`
- `Style`
- `Component`
- `Signal` (+ `SignalSource` / `sourceToInput` / `inputToSource` / `inputSourceType` — the canonical signal-input vocabulary, source of truth for input strings like `viewport.width`, `scroll.progress`, `audio.amplitude`/`audio.beat`)
- `Animation`
- `Timeline`
- `Scheduler`
- `Compositor`
- `BlendTree`
- `FrameBudget`
- `DirtyFlags`
- `VideoRenderer`
- `TokenBuffer`
- `UIQuality`
- `GenFrame`
- `Diagnostics`
- `Cell`
- `Derived`
- `Zap`
- `Wire`
- `Op`
- `Store`
- `Plan`
- `RuntimeCoordinator`
- `Part`
- `World`
- `Receipt`
- `DAG`
- `DocumentGraph`
- `GraphPatch`
- `AICast`
- `chooseRung`
- `WASMDispatch`

### Document graph (the IR)

The content-addressed keystone every cast reads from ([ADR-0015](./docs/adr/0015-document-graph-ir.md)). Reach for it when you need:

- a typed, addressable form of a definition (eight node families: `signal`, `entity`, `component`, `pose`, `transition`, `projection`, `policy`, `export`)
- proof that two casts share one source (same content address)
- typed graph mutation — `GraphPatch`: `diff` / `apply` / `validate` / `receipt`

Main surfaces: `DocumentGraph`, `DocumentGraphNode`, `DocumentGraphEdge`, `DocumentGraphNodeSchema`, `sealNode` / `sealGraph`, `validateGraph`, `linearizeGraph`, `GraphPatch`. `apply` re-seals the graph, so a patched node's address stays honest. `DocumentGraphNodeSchema` carries Standard Schema V1 through `~standard` for host validators that consume that interop contract directly. Added 0.8.0.

### AI cast

Cast a graph *out* to a model and accept its reply safely ([ADR-0015](./docs/adr/0015-document-graph-ir.md)). Reach for it when you need:

- a deterministic, token-budgeted `AIContext` (graph summary + tool schema) for a model call
- validation of a model's `GraphPatch` proposal (or a genui tree, ADR-0014)
- the envelope that keeps raw model output from ever mutating a graph

Main surfaces: `AICast.castContext`, `summarizeGraph`, `validateGraphPatchProposal`, `validateGeneratedUIProposal`, `applyValidatedPatch`, `ValidatedProposal`, `ApplyToken`. The primitive is pure — zero network, zero provider imports — and `mintValidated` is denied at the package subpath, so a consumer cannot forge a proposal. The host owns the model call and the authority to apply.

### Client→server mutation channel

The return leg of the stream (SSE pushes server→client; this comes back). Reach for it when a client needs to change the server's graph — a sort, a filter, an edit:

- the server core — `handleGraphMutation(request, { loadGraph, saveGraph })`: decode a client-proposed `GraphPatch` → `validateGraphPatchProposal` → `applyValidatedPatch` → persist
- the client sender — `sendGraphMutation(url, patch)`
- the client state machine — `createGraphMutationClient({ url, base, refreshBase })`

Main surfaces: `handleGraphMutation`, `sendGraphMutation`, `createGraphMutationClient`, `verifyAppliedGraph`, `GraphStore`, `GraphMutationRequest`, `GraphMutationResponse`. It rides the AI-cast refuse-seam, so a human client's edit is validated exactly like a model's proposal. Three outcomes: `applied` (new sealed graph), `refused` (invalid patch — a stale base, dangling edge, or a concurrent-write compare-and-swap miss; optimistic concurrency for free), and `error` (a server-side store failure — retryable, never a raw 500). Stale-base/lost-update refusals carry `staleBase: true`, so a client can reload and re-propose without string-matching errors. `saveGraph` is a compare-and-swap (`saveGraph(next, expected)`) so two clients racing the same base can't lose-update; the sender and live adopters share `verifyAppliedGraph` before accepting a server-applied graph. Transport-agnostic; the host owns the `GraphStore` (the authority boundary) and wires the endpoint (`@czap/astro`'s `graphMutationRoute` for Astro). `createGraphMutationClient` and `verifyAppliedGraph` added 0.8.0; the channel added 0.7.0.

### WASM compute

The Rust `czap-compute` kernel (spring / boundary / blend) ships inside `@czap/core`'s `dist/` as of 0.2.1. `@czap/vite` locates it through the module graph (pnpm-nesting-safe) when you set `czap({ wasm: { enabled: true } })` — no hand-built or hand-copied artifact. Reach for it when you need:

- batch boundary evaluation — `Boundary.evaluateBatch(boundary, values)`: many values against one boundary, into state indices, routed through `WASMDispatch.kernels()`
- the kernel handle directly — `WASMDispatch.load` / `kernels` / `isLoaded`

Main surfaces: `WASMDispatch`, `Boundary.evaluateBatch`. The WASM path is a throughput upgrade, never a behavior change: every kernel is output-identical to its TypeScript fallback (`packages/core/src/wasm-fallback.ts`), locked by the wasm-parity property suite. A boundary that can't load WASM selects the same indices in JS.

---

## `@czap/quantizer`

Source: [`packages/quantizer/src/index.ts`](./packages/quantizer/src/index.ts)

Turns boundaries and outputs into live quantized behavior. Runtime status: `host-wired`.

Reach for it when you need:

- boundary evaluation
- output-target routing
- motion-tier filtering
- animated transitions between named states, optionally on an injected frame clock (`AnimatedQuantizer.make(…, { scheduler })` takes a `@czap/core` `Scheduler.Shape` — `raf` / `fixedStep` / `audioSync`; default is an internal 16ms loop)

Main surfaces:

- `Q`
- `evaluate`
- `Transition`
- `AnimatedQuantizer`

Testing-only surfaces (`@czap/quantizer/testing`): `MemoCache`, `TIER_TARGETS`

---

## `@czap/compiler`

Source: [`packages/compiler/src/index.ts`](./packages/compiler/src/index.ts)

Projects authored definitions into target-specific outputs. Runtime status: `host-wired` through the Vite and Astro host paths.

Reach for it when you need:

- CSS compilation
- GLSL or WGSL output
- ARIA output
- AI manifest output
- Tailwind token emission

Main surfaces:

- `CSSCompiler`
- `GLSLCompiler`
- `WGSLCompiler`
- `ARIACompiler`
- `AIManifestCompiler`
- `TokenCSSCompiler`
- `TokenTailwindCompiler`
- `TokenJSCompiler`
- `ThemeCSSCompiler`
- `StyleCSSCompiler`
- `ComponentCSSCompiler`
- `dispatch`

---

## `@czap/web`

Source: [`packages/web/src/index.ts`](./packages/web/src/index.ts)

The browser runtime package. Runtime status: `host-wired`.

Reach for it when you need:

- DOM morphing
- slot registration
- SSE and resumption — `SSE` is the transport, `Resumption` is the recovery protocol; hosts compose them (see [`packages/astro/src/runtime/stream.ts`](./packages/astro/src/runtime/stream.ts) for the reference wiring)
- physical state capture and restore
- WebCodecs capture
- LLM chunk adaptation
- audio processor bootstrapping

Main surfaces:

- `Morph`
- `MorphOpaque` (`data-czap-morph-opaque`) — diff-isolate self-owned DOM islands; opacity never bypasses sanitize-before-diff. Added 0.8.0.
- `bindGraphForm(form, { client, toOps })` — bind a host-authored form to the graph mutation client, reflecting only `data-czap-mutation-state` and `czap:mutation`. Added 0.8.0.
- `SemanticId`
- `Hints`
- `SlotRegistry`
- `SlotAddressing`
- `SSE`
- `Resumption`
- `Physical`
- `WebCodecsCapture`
- `renderToCanvas`
- `captureVideo`
- `LLMAdapter`
- `createAudioProcessor`

---

## `@czap/detect`

Source: [`packages/detect/src/index.ts`](./packages/detect/src/index.ts)

Reads capabilities and maps them into the tier lattice. Runtime status: `host-wired`.

Reach for it when you need:

- capability probing
- tier mapping
- runtime observation of changing device conditions

Main surfaces:

- `detect`
- `detectGPUTier`
- `watchCapabilities`
- `tierFromCapabilities`
- `designTierFromCapabilities`
- `motionTierFromCapabilities`
- `capSetFromCapabilities`
- `CAP_AXES` / `capAxisAttr` / `CapAxis` — the single source for the `data-czap-*` capability vocabulary (`tier`/`motion`/`design`); the attribute suffix is the axis key by construction

---

## `@czap/vite`

Source: [`packages/vite/src/index.ts`](./packages/vite/src/index.ts)

The authored-CSS transformation layer. Runtime status: `host-wired`.

Reach for it when you need:

- Vite plugin integration
- parsing and compiling `@token`, `@theme`, `@style`, and `@quantize`
- definition resolution
- HMR behavior
- viewport `@container` containment, retargetable off `:root` via the `quantize.container` plugin option
- virtual modules

Main surfaces:

- `plugin`
- `parseQuantizeBlocks`
- `compileQuantizeBlock`
- `parseTokenBlocks`
- `compileTokenBlock`
- `resolveToken`
- `parseThemeBlocks`
- `compileThemeBlock`
- `resolveTheme`
- `parseStyleBlocks`
- `compileStyleBlock`
- `resolveStyle`
- `resolveBoundary`
- `resolveVirtualId`

Virtual modules the plugin serves (import them from app code; the boundary/token/theme ones are also emitted automatically into the build):

- `virtual:czap/boundaries` — the build-derived boundary manifest (the shape the edge cache reads)
- `virtual:czap/tokens` / `virtual:czap/tokens.css` — resolved token values (JS + emitted CSS)
- `virtual:czap/themes` — resolved theme variants
- `virtual:czap/wasm-url` — the resolved URL of the `czap-compute` WASM (or `null` when `wasm` is off)
- `virtual:czap/config` — the resolved plugin config
- `virtual:czap/hmr-client` — the dev HMR client (dev only)
- `isVirtualId`
- `loadVirtualModule`
- `handleHMR`

---

## `@czap/astro`

Source: [`packages/astro/src/index.ts`](./packages/astro/src/index.ts)

The Astro host package. Runtime status: `host-wired`.

Reach for it when you need:

- Astro integration setup
- request-time middleware
- initial state resolution
- shell attribute generation

Main surfaces:

- `integration`
- `resolveInitialState`
- `satelliteAttrs`
- `resolveInitialStateFallback`
- `czapMiddleware`
- `CzapMiddlewareConfig`
- `@czap/astro/middleware-entry` — the auto-wired detection middleware registered by `czap({ middleware: true })`; populates a typed `Astro.locals.czap.tiers.{tier,motion,design}` via an `App.Locals` augmentation
- `czapFetchLayer` / `serializeBoundaryCss` (also `@czap/astro/fetch-layer`) — request-time adaptation as a layer in FRONT of Astro (Astro 7 `src/fetch.ts`): shares the one `createEdgeHostAdapter().resolve()` with `czapMiddleware` and, on an opt-in `serveFromEdge` predicate, serves boundary CSS from the edge and skips Astro entirely; Astro `Fetchable` / Hono-compatible (ADR-0024, 0.4.0)
- `bridgeDiagnosticsToAstroLogger` / `installDiagnosticsBridge` — route `@czap/*` runtime diagnostics through Astro's logger for structured `astro dev --json` output; wired in `astro:config:setup` (0.4.0)
- `graphMutationRoute(store)` — the client→server mutation channel's host route adapter: wraps `@czap/core`'s `handleGraphMutation` into a `(request) => Response` that drops into an Astro API route (`export const POST: APIRoute = ({ request }) => graphMutationRoute(store)(request)` — Astro hands the handler an `APIContext`, so unwrap `request`). 200 on apply, 409 on stale-base/lost-update refusal (`staleBase: true`), 422 on other refusals, 400 on a malformed JSON body, 415 on a non-`application/json` body (requiring the JSON content type forces cross-origin POSTs through a CORS preflight — a CSRF-hardening gate; the host still owns session/origin auth). `@czap/astro` injects no route — the endpoint, `GraphStore`, and authority are the host's (0.7.0; 409 added 0.8.0)

Host-owned shared runtime surfaces:

- `@czap/astro/runtime` slot bootstrap and swap reinit helpers
- `@czap/astro/runtime` directive boot scanner (`bootstrapDirectives`, `scanAndBootDirectives`) — activates `data-czap-directive` / legacy `client:*` markers on plain elements and `.astro` output
- `@czap/astro/runtime` programmatic LLM session (`createLLMSession`, `LLMSessionConfig`) — the documented catalog-wiring path (GETTING-STARTED § Generated UI): build a session over a host-owned element/target with a host-owned genui catalog; the `client:llm` directive composes the same factory internally (export added 0.8.0 — the docs taught this import before the barrel carried it)
- `@czap/astro/runtime` wasm runtime configuration and loading
- `@czap/astro/runtime` audio-signal producer/readers (`driveAudioFromAnalyser`, `readAudioSignal`, `attachAudioObserver`) — wire a live `AnalyserNode` so `audio.amplitude`/`audio.beat` boundaries carve
- `@czap/astro/runtime` continuous signal→uniform driver (`driveUniformFromSignal`) — drive the existing `czap:uniform-update` GPU event continuously from a continuous signal (e.g. `scroll.progress`) into a GLSL/WGSL uniform, collapsing the hand-rolled scroll→uniform consumer bridge (0.4.0)
- `@czap/astro/runtime` runtime DocumentGraph loader (`loadGraphRuntime`, `lowerGraph`, `castGraphDelta`) — lower a serialized `DocumentGraph` onto the live cast pipeline and apply a `GraphPatch` delta at runtime; the `client:graph` directive boots it from `data-czap-graph` (0.4.0)
- `@czap/astro/runtime` scene→live bridge (`bridgeSceneToGraph`) — drive the live graph from a signal-indexed `@czap/scene`: a discrete crossing re-casts, the continuous tween writes a leaf CSS var / GPU uniform and never patches the graph (0.4.0)
- `@czap/astro/runtime` AI-apply seam (`castGraphContext`, `admitGraphPatchProposal`, `adoptAppliedGraph`) — cast the live graph OUT to a model-facing `AIContext`, admit a VALIDATED `GraphPatch` proposal IN through the un-bypassable validate→apply token chain, or adopt a server-applied graph after `verifyAppliedGraph`; re-cast the delta; the model producer is downstream (`adoptAppliedGraph` added 0.8.0, original seam 0.4.0)
- `@czap/astro/runtime` SVG last-mile (`attachSvgRuntime`, `client:svg`) — resolve `data-czap-entity → SVGElement` and apply `@czap/scene`'s `applySvgAttrs` to the live DOM each frame (0.4.0)
- internal runtime adapters for `satellite`, `stream`, `llm`, `worker`, `wasm`, `graph`, and `svg`

---

## `@czap/edge`

Source: [`packages/edge/src/index.ts`](./packages/edge/src/index.ts)

The edge / server capability and caching layer. Runtime status: `host-wired`.

Reach for it when you need:

- client hints parsing
- server-side tier decisions
- boundary output caching
- theme compilation at the edge

Main surfaces:

- `ClientHints`
- `EdgeTier`
- `createEdgeHostAdapter`
- `EdgeHostAdapter`
- `createBoundaryCache`
- `KVCache`
- `compileTheme`

The default Astro host path now routes through `createEdgeHostAdapter`, which combines `ClientHints`, `EdgeTier`, `compileTheme`, and `createBoundaryCache` into one request-time resolution pass. A KV entry is keyed by boundary id + tier + name + a resolved-theme fingerprint; the cache config's `prefix` doubles as the per-deploy content version for a bundled `compile()` whose output depends on build-time content the boundary id doesn't cover. Compile fallback writes can carry tags, and `BoundaryCache.invalidateByTag()` / `invalidateByPath()` actively purge all tier/theme variants when the KV provider supports `delete`/`list`. This is the package for request-time adaptation outside the browser.

---

## `@czap/cloudflare`

Source: [`packages/cloudflare/src/index.ts`](./packages/cloudflare/src/index.ts)

The Cloudflare Workers siteAdapter. Runtime status: `host-wired` on workerd.

Reach for it when you need:

- Workers KV binding glue for `@czap/edge` boundary cache
- Astro middleware pre-wired for `cloudflare:workers` env
- Astro 7 cache-provider invalidation that points `cache.invalidate()` at the same KV tag index

Main surfaces:

- `cloudflareMiddleware`
- `createCloudflareEdgeCache`
- `@czap/cloudflare/cache-provider`
- `cloudflareAdapterCapsule`

See [HOSTING.md](./HOSTING.md#cloudflare-workers) for the full deploy guide.

---

## `@czap/worker`

Source: [`packages/worker/src/index.ts`](./packages/worker/src/index.ts)

The off-main-thread runtime layer. Runtime status: `host-wired`.

Reach for it when you need:

- shared worker message contracts
- lock-free ring buffers
- compositor workers
- render workers
- a coordinating host

Main surfaces:

- `Messages`
- `SPSCRing`
- `CompositorWorker`
- `RenderWorker`
- `WorkerHost`

This package assumes stronger runtime requirements and should be used where the surface meaning justifies off-thread work. The Astro worker directive routes through this package rather than carrying its own worker protocol. By the way, `SPSCRing` is a real lock-free single-producer / single-consumer ring on `SharedArrayBuffer`, with `Atomics.load` and `Atomics.store` only — no `Atomics.wait` or `Atomics.notify`, which keeps it fully non-blocking on both sides.

---

## `@czap/remotion`

Source: [`packages/remotion/src/index.ts`](./packages/remotion/src/index.ts)

The React / Remotion video adapter. Runtime status: `standalone subsystem`.

Reach for it when you need:

- precomputed frame consumption in Remotion
- CSS var projection from `CompositeState`
- frame-indexed composition helpers

Main surfaces:

- `cssVarsFromState`
- `stateAtFrame`
- `useCompositeState`
- `precomputeFrames`
- `Provider`
- `useCzapState`

This package is for the Remotion / video branch of the ecosystem, not the main Astro static-site path.

---

## `@czap/stage`

Source: [`packages/stage/src/index.ts`](./packages/stage/src/index.ts)

The dual-export orchestration layer: cast one document graph to more than one carrier and prove they share a source. Runtime status: `standalone subsystem`.

Reach for it when you need:

- a static Astro page and a video export from the same definition
- proof both outputs trace to one content address
- headless, byte-real video encoding without a system-codec hard dependency

Main surfaces:

- `dualExport`
- `dualExportNode` (0.4.0) — the headless entry: runs the full proof and a real ffmpeg byte-encode in node, e.g. `dualExportNode(graph, ffmpegFrameEncoder())`
- `exportAstroPage`
- `exportVideo` / `exportVideoEncoded`
- `FrameEncoder` (the injectable seam)

The `encode?` seam keeps `@czap/stage` pure; the node-only ffmpeg backend is a thin adapter on the `@czap/stage/ffmpeg` subpath — `exportVideoEncoded(graph, ffmpegFrameEncoder())`. When no encoder is wired, frame digests are still real; the bytes are skipped-with-log, not faked. The video carrier's content address is taken over the produced **frames**; the byte-encode is the injected seam, so it never changes the proof's digest.

---

## `@czap/scene`

Source: [`packages/scene/src/index.ts`](./packages/scene/src/index.ts)

ECS-backed scene composition + timeline authoring (ADR-0009). Runtime status: `host-wired`.

Reach for it when you need:

- timeline-driven composition (video, audio, transitions, effects)
- an ECS world with the canonical systems already written
- a compiled scene that drives a frame loop

Main surfaces:

- `SceneContract` / `compileScene`
- `Track` (`Track.video` / `Track.audio` / `Track.transition` / `Track.effect`)
- `SceneRuntime`
- `VideoSystem` / `AudioSystem` / `TransitionSystem` / `EffectSystem` / `SVGSystem` (+ the sync + pass-through mixer)
- `applySvgAttrs` / `collectSvgAttrs` (the SVG egress, applied live by `@czap/astro`'s `client:svg` directive)
- `bindBeats` (beat-indexed composition from `@czap/assets` projections)

Paired with `@czap/stage` for the video-export branch — and, as of 0.4.0, a **live** runtime consumer too: `@czap/astro`'s `bridgeSceneToGraph` drives a scene against the live cast pipeline, and the `client:svg` directive applies its SVG egress to the live DOM (scene is no longer offline/video-only).

---

## `@czap/assets`

Source: [`packages/assets/src/index.ts`](./packages/assets/src/index.ts)

Asset capsules + analysis projections, built on the `cachedProjection` arm. Runtime status: `host-wired`.

Reach for it when you need:

- declarative asset loading + caching (`defineAsset`)
- audio / video / image decoders
- signal-indexed analysis projections to drive boundaries or scenes

Main surfaces:

- `defineAsset`
- `audioDecoder` / `videoDecoder` / `imageDecoder`
- `BeatMarkerProjection` / `OnsetProjection` / `WaveformProjection` / `WavMetadataProjection`

---

## `@czap/command`

Source: [`packages/command/src/index.ts`](./packages/command/src/index.ts)

The shared command registry + dispatcher both the CLI and the MCP server route through. Runtime status: `host-wired`. Not imported by app code — it is the seam that keeps `czap <verb>` and the MCP tool surface one implementation.

---

## `@czap/cli`

Source: [`packages/cli/src/index.ts`](./packages/cli/src/index.ts)

The JSON-first `czap` CLI (human-pretty in a TTY). Runtime status: build tooling — not an app dependency.

Reach for it when you need:

- structural description + audit (`czap describe`, `czap audit`, `czap doctor`)
- scene + asset operations (`czap scene.compile`, `czap scene.render`, `czap asset.analyze`)
- capsule inspection (`czap capsule.inspect`)
- release + gauntlet (`czap ship`, `czap verify`, `czap gauntlet`)

Entry: `pnpm exec czap <verb>` in a LiteShip checkout. `czap help` prints the chart.

---

## `@czap/audit`

Source: [`packages/audit/src/index.ts`](./packages/audit/src/index.ts)

The profile-driven structure / integrity / surface audit engine, and the host that builds the gauntlet's triangulated repo-IR + oracles (ADR-0012/ADR-0023). Runtime status: deps `@czap/canonical` + `@czap/error` + `@czap/gauntlet` (it builds the `RepoIR` the gauntlet defines) and `typescript`. Consumed by `@czap/cli`; see [AUDIT.md](./AUDIT.md).

Main surfaces:

- `runAuditPasses`
- `AuditPassResult`
- `consumerDevopsProfile(cwd, base?)` — discover installed packages under `cwd/node_modules` and audit them against a base profile's topology. A downstream runs this via `czap audit --consumer --profile <their-profile>` (the profile is the discovery base, so they audit their own packages, not just `@czap/*`).

---

## `@czap/gauntlet`

Source: [`packages/gauntlet/src/index.ts`](./packages/gauntlet/src/index.ts)

The self-proving rigor engine — gates, findings, assurance levels, and the authority ratchet (ADR-0023). Runtime status: lean (deps `@czap/error` + `fast-glob`; **no** `typescript` — the heavy IR/oracles are host-injected via `GateContext`, ADR-0012). A `Gate` is a `(context) => Finding[]` fitness function that earns BLOCKING authority only by self-proving against its own red/green/mutation fixtures (`verifyGate`); `AssuranceLevel` (L0–L4) aims its rigor. Two gate forms: the closure `defineGate` and the evidence-bound `defineFactGate` (the decision is DATA over a declared FactPack — it cannot read undeclared evidence; ADR-0019). A downstream registers its own gate the same way LiteShip registers its built-ins — no fork, no rebuild. See [AUDIT.md](./AUDIT.md).

Main surfaces:

- `defineGate`, `defineFactGate`, `isFactGate`, `runGates`, `verifyGate`
- `Gate`, `FactGate`, `GateContext`, `Finding`, `AssuranceLevel`

---

## `@czap/mcp-server`

Source: [`packages/mcp-server/src/index.ts`](./packages/mcp-server/src/index.ts)

The Model Context Protocol server that exposes LiteShip document graphs + command dispatch to AI tooling. Runtime status: build tooling. Entry: `czap mcp` (stdio) or `czap mcp --http=:port`. Dispatches through `@czap/command`, so its tool surface and the CLI's verb surface never drift.

---

## A simple selection rule

If the problem is:

- semantic authored definitions: `@czap/core`
- live quantized state: `@czap/quantizer`
- cast to output targets: `@czap/compiler`
- browser runtime behavior: `@czap/web`
- capability decisions: `@czap/detect`
- authored CSS in Vite: `@czap/vite`
- Astro host integration: `@czap/astro`
- request-time adaptation: `@czap/edge`
- off-thread runtime: `@czap/worker`
- Remotion / video composition: `@czap/remotion`
- dual-export (page + video from one graph): `@czap/stage`
- timeline / ECS scene composition: `@czap/scene`
- asset loading + analysis projections: `@czap/assets`
- the `czap` CLI or codebase auditing: `@czap/cli`, `@czap/audit`
- rigor gates / audit criteria / FactGate: `@czap/gauntlet`
- a composable tagged-error algebra: `@czap/error`
- an MCP server for AI tooling: `@czap/mcp-server`
