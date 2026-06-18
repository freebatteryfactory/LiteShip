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

Main surfaces: `DocumentGraph`, `DocumentGraphNode`, `DocumentGraphEdge`, `sealNode` / `sealGraph`, `validateGraph`, `linearizeGraph`, `GraphPatch`. `apply` re-seals the graph, so a patched node's address stays honest.

### AI cast

Cast a graph *out* to a model and accept its reply safely ([ADR-0015](./docs/adr/0015-document-graph-ir.md)). Reach for it when you need:

- a deterministic, token-budgeted `AIContext` (graph summary + tool schema) for a model call
- validation of a model's `GraphPatch` proposal (or a genui tree, ADR-0014)
- the envelope that keeps raw model output from ever mutating a graph

Main surfaces: `AICast.castContext`, `summarizeGraph`, `validateGraphPatchProposal`, `validateGeneratedUIProposal`, `applyValidatedPatch`, `ValidatedProposal`, `ApplyToken`. The primitive is pure — zero network, zero provider imports — and `mintValidated` is denied at the package subpath, so a consumer cannot forge a proposal. The host owns the model call and the authority to apply.

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
- animated transitions between named states

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

Host-owned shared runtime surfaces:

- `@czap/astro/runtime` slot bootstrap and swap reinit helpers
- `@czap/astro/runtime` directive boot scanner (`bootstrapDirectives`, `scanAndBootDirectives`) — activates `data-czap-directive` / legacy `client:*` markers on plain elements and `.astro` output
- `@czap/astro/runtime` wasm runtime configuration and loading
- `@czap/astro/runtime` audio-signal producer/readers (`driveAudioFromAnalyser`, `readAudioSignal`, `attachAudioObserver`) — wire a live `AnalyserNode` so `audio.amplitude`/`audio.beat` boundaries carve
- internal runtime adapters for `satellite`, `stream`, `llm`, `worker`, and `wasm`

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

The default Astro host path now routes through `createEdgeHostAdapter`, which combines `ClientHints`, `EdgeTier`, `compileTheme`, and `createBoundaryCache` into one request-time resolution pass. A KV entry is keyed by boundary id + tier + name + a resolved-theme fingerprint; the cache config's `prefix` doubles as the per-deploy content version for a bundled `compile()` whose output depends on build-time content the boundary id doesn't cover. This is the package for request-time adaptation outside the browser.

---

## `@czap/cloudflare`

Source: [`packages/cloudflare/src/index.ts`](./packages/cloudflare/src/index.ts)

The Cloudflare Workers siteAdapter. Runtime status: `host-wired` on workerd.

Reach for it when you need:

- Workers KV binding glue for `@czap/edge` boundary cache
- Astro middleware pre-wired for `cloudflare:workers` env

Main surfaces:

- `cloudflareMiddleware`
- `createCloudflareEdgeCache`
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
- `exportAstroPage`
- `exportVideo` / `exportVideoEncoded`
- `FrameEncoder` (the injectable seam)

The `encode?` seam keeps `@czap/stage` pure; the node-only ffmpeg backend is a thin adapter on the `@czap/stage/ffmpeg` subpath — `exportVideoEncoded(graph, ffmpegFrameEncoder())`. When no encoder is wired, frame digests are still real; the bytes are skipped-with-log, not faked.

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
- `VideoSystem` / `AudioSystem` / `TransitionSystem` / `EffectSystem` (+ the sync + pass-through mixer)
- `bindBeats` (beat-indexed composition from `@czap/assets` projections)

Paired with `@czap/stage` for the video-export branch.

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

The profile-driven structure / integrity / surface audit engine. Runtime status: `standalone` (zero `@czap/*` deps). Consumed by `@czap/cli` and the gauntlet; see [AUDIT.md](./AUDIT.md).

Main surfaces:

- `runAuditPasses`
- `AuditPassResult`

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
- an MCP server for AI tooling: `@czap/mcp-server`
