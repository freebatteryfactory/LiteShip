# Changelog

All notable changes to czap. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-1.0
break policy is intentionally aggressive — minor version bumps may carry breaking changes.

## [0.5.0] - 2026-06-30

A "make-it-loud" release: every fix turns a silent degradation into a loud
diagnostic through the existing channel, plus a packaging hardening and a
DAG-compaction feature — surfaced by dogfooding the framework on real apps, and
hardened by an adversarial review pass.

### Added

- **`@czap/core` — receipt-DAG compaction.** `DAG.checkpoint(dag, { below })` +
  `DAG.spliceCheckpoint` reclaim a long-lived receipt DAG's dominated prefix into
  a content-addressed checkpoint attestation (drop-only; the spliced DAG equals a
  fresh reload). `Receipt.validateChain` gains `ChainValidationOptions { base,
  checkpoint }` for cross-boundary validation (a compacted tail is verifiable only
  against its checkpoint). See ADR-0026.
- **`@czap/web` — SSE overflow policy.** `SSEConfig.overflow`
  (`drop-newest | drop-oldest | coalesce-by-id`, default `coalesce-by-id`) + an
  enriched `BackpressureHint` (`policy` / `droppedCount` / `coalescedCount`) + a
  `stateChanges` edge stream. See ADR-0005 (SSE addendum).
- **`create-liteship`** now scaffolds `effect` (`^4.0.0-beta.32`), fixing an
  unmet peer on a fresh project.

### Fixed

- **`client:gpu`** warns once (`canvas-default-size`) when its host has no layout
  at boot and the canvas falls back to the 300×150 default — previously a silent
  tiny render.
- **Signal directives** warn once when a boundary input is recognized but has no
  live producer on that surface (`signal-input-unserved-here`) — previously a
  silent freeze; the `uniform-signal` "likely a typo" mislabel is split into two
  disjoint codes.
- **`@czap/genui`** rejects an unsupported registered handler prop (`on*` ≠
  `onClick`, or a non-string `onClick`) at validation instead of silently dropping
  it at render.
- **`@czap/web` SSE** no longer silently drop-newests under saturation (see
  Added), and the heartbeat watchdog now reconnects on timeout.
- **`client:stream` / `client:llm`** now consume the hardened `SSE.create` with
  deterministic, disposable-runtime teardown (clean dispose / VT-swap single-boot);
  `client:llm` terminal frames fully tear down.

### Changed

- **`effect` peer range** capped to `>=4.0.0-beta.32 <5` across all `@czap/*`
  packages (was an unbounded `>=4.0.0-beta.0`), pinned by `pnpm.overrides.effect`
  and a drift guard.

### Security

- **`Receipt.validateChainDetailed`** now requires a verified checkpoint to
  validate a compacted tail; a `base` watermark alone is rejected
  (`checkpoint_invalid`) — previously a truncated chain could validate with no
  proof of compaction.

### Internal

- Cell↔DOM boundary committed as a guarded law (ADR-0027). Audit consumer-mode
  disallowed-edge coverage. Fixed two Effect-beta issues uncovered during review
  (`Scope.use` finalizing immediately; an overflow-buffer CPU spin). api-surface
  snapshot regenerated for the new exports.

### Breaking

- **`@czap/genui` `renderFromCatalog`** now returns a tagged
  `RenderFromCatalogResult` (`{ ok }` union) instead of `boolean`. Callers using
  `if (renderFromCatalog(...))` must switch to `.ok`.

## [0.4.1] - 2026-06-29

A patch release: a consumer-audit scoping fix, two runtime DX/behavior fixes
surfaced by downstream dogfooding, and a dev-toolchain refresh.

### Added

- `@czap/astro` — **directive-collision diagnostic.** The client-directive scanner now warns
  once when an element is claimed by more than one czap directive — e.g. `client:gpu` and
  `satelliteAttrs()` on the same canvas, where the satellite silently wins and the GPU shader
  never boots. Activation is unchanged; the warning names both directives and the fix (put each
  on its own element), turning a silent directive fight into a loud, actionable signal.

### Fixed

- `@czap/audit` — **consumer-audit scoping regression.** `czap audit --consumer` no longer emits
  false `unknown-internal-package` errors (98 on a real 0.4.0 upgrade) for a discovered package
  importing an internal `@scope/*` package that isn't in the discovery seed (transitive/pnpm-hoisted
  deps like the new `@czap/error`/`@czap/gauntlet`). In consumer mode (`profile.packageRoots` set)
  the structure pass keeps its dependency-graph output but suppresses that rule — it's the vendor's
  own published wiring, which a consumer can't act on and LiteShip's own CI already audits. Source-
  monorepo audits still flag it.
- `@czap/audit` — the "internalPackagePrefix cannot be derived" error (hit when the direct
  `runAuditPasses({ repoRoot })` API runs in an unscoped consumer app) now points at
  `czap audit --consumer` as the correct consumer entry point. (A silent no-op prefix is
  deliberately NOT introduced: a clean audit must never mean "nothing was checked".)
- `@czap/astro` — **WGSL `u_time` is now advanced every frame.** Hand-authored animated WGSL
  shaders that declare `u_time` were frozen: the WebGPU runtime only wrote the uniform buffer on
  boundary crossings, never a clock. It now feeds the monotonic elapsed-seconds clock per-frame
  (merged with the live signal snapshot so signal fields are preserved), at parity with the GLSL
  path. `u_resolution` (a `vec2`) is fed per-frame too — the WGSL uniform buffer now lays fields
  out by WGSL alignment rules (so a `vec2` lands on its required 8-byte offset) rather than a flat
  scalar layout. (`u_state` is already fed as the compiler's `state_index`.)

### Changed

- **Node floor + dev toolchain.** Raised `engines.node` to `>=22.13.0` (the minimum for
  eslint 10) across all packages; CI continues on Node 22. Bumped eslint 9→10, prettier 3.9,
  typescript-eslint 8.62, fast-check 4.8, jsdom 29.1, playwright 1.61, and related dev tooling,
  and aligned the `@remotion/*` override to 4.0.484. Tailwind is held at 4.2.1 (4.3 regresses the
  showcase example build) and Node 24 is deferred (its V8 breaches `INV-COMPOSITOR-ZERO-ALLOC` via
  Effect's Queue in the compositor's live-subscriber publish path) — both tracked for a later release.

## [0.4.0] - 2026-06-25

The **live-runtime cut**: the framework primitives that 0.3.0 left built-but-test-only
are now plumbed into the live cast pipeline — and a new gate makes "built-not-plumbed"
a CI failure so it can't happen silently again.

This cut also hard-cuts the Astro host substrate to Astro 7 / `@astrojs/cloudflare` v14:
`czapFetchLayer()` is the front-of-pipeline fetch layer, `@czap/cloudflare/cache-provider`
bridges Astro `cache.invalidate()` into the CZAP boundary KV tag index, `czap astro
dev/status/stop` delegates to Astro background dev-server management, and `czap doctor
--target astro` probes the Astro dev status endpoint.

### Added

- `@czap/astro` — **runtime DocumentGraph loader.** `loadGraphRuntime(serialized, resolve)`
  lowers a sealed `DocumentGraph` onto the live boundary cast pipeline (CSS/ARIA/GPU),
  with a surgical `castGraphDelta` re-cast seam (only changed cells re-lower; untouched
  observers survive). New `client:graph` directive. The loader is the seam an authoring
  producer feeds; the producer itself is downstream.
- `@czap/astro` — **scene→live-runtime bridge.** `bridgeSceneToGraph(scene, handle, …)`
  drives a signal-indexed `@czap/scene` against the live runtime: a DISCRETE state crossing
  emits a `GraphPatch` → `recast`, while the CONTINUOUS tween writes a leaf CSS var / GPU
  uniform each frame and **never patches the graph**. `@czap/scene` is now a live runtime
  consumer (was video/offline-only).
- `@czap/astro` — **AI-apply seam.** `castGraphContext` (cast the live graph OUT to a
  model-facing `AIContext`) + `admitGraphPatchProposal` (admit a candidate IN through the
  un-bypassable `validateGraphPatchProposal` → `applyValidatedPatch` token-witness chain,
  then re-cast the delta). LiteShip exposes the seam; the model producer is downstream.
- `@czap/astro` — **SVG last-mile directive** (`client:svg`): resolves `data-czap-entity →
  SVGElement` and applies `@czap/scene`'s `applySvgAttrs` to the live DOM each frame.
- `@czap/stage` — **headless node video encode.** `dualExportNode(graph, ffmpegFrameEncoder())`
  runs the graph→page+video dual-export proof in node/CI via an injected ffmpeg/libx264
  `FrameEncoder` (was browser/WebCodecs-gated). The frame-source digest == page digest
  invariant holds headless (frames addressed, bytes injected).
- `@czap/quantizer` — **AnimatedQuantizer frame-clock injection.** `AnimatedQuantizer.make(…, { scheduler })`
  takes an optional `@czap/core` `Scheduler.Shape` (`raf` / `fixedStep` / `audioSync`) so the output
  interpolation rides the display refresh (or a deterministic render/test clock) instead of its internal
  fixed 16ms sleep. Omitted, the 16ms loop is byte-unchanged — existing callers are untouched.
- `@czap/astro` — **continuous signal→uniform bridge.** `driveUniformFromSignal(element, input, uniform)`
  (from `@czap/astro/runtime`) drives the existing `czap:uniform-update` event continuously from a
  continuous signal (e.g. `scroll.progress`), writing the value into the GLSL/WGSL uniform the GPU runtime
  already consumes each (rAF-throttled) frame. Replaces the hand-rolled scroll→uniform glue and its
  0..1-vs-0..100 scale footgun.
- `@czap/vite` — **`@quantize` container-target opt-out.** New `quantize.container` plugin option
  retargets the auto-emitted viewport `@container` containment off `:root` to a named selector
  (e.g. `'.czap-vp'`) for hosts whose layout can't have a size-contained `:root`. Default `:root`
  unchanged; applies to both the CSS transform and emitted boundary assets.
- `@czap/astro` — **convention-file watch battery.** The integration now calls Astro's `addWatchFile`
  for the convention primitive sources (boundaries / tokens / themes / styles, via the resolver's own
  `primitiveSearchPatterns`), so editing a definition restarts the dev server and re-collects the
  manifest — even for definitions not yet imported by a CSS block.
- `@czap/cli` — **`czap audit --consumer --profile <p>` now combines** (was mutually exclusive): the
  profile becomes the consumer discovery base, so a downstream can run the audit engine against THEIR
  OWN installed `node_modules` topology, not just LiteShip's `@czap/*`. The engine seam
  (`consumerDevopsProfile(cwd, base)`) was already there; this wires it to the CLI.
- **Plumb-completeness gate** (`plumb:gate`, gauntlet phase 37). A package-plumb ledger
  classifies every published package `runtime`/`tooling`/`deferred` (an unclassified package
  fails CI, so a test-only subsystem can't ship hidden) + an unwired-capsule floor. Closes
  the hole where built-not-plumbed primitives passed green (the audit's orphan findings were
  `info`-only; no phase asserted producer→consumer plumbing).
- **Determinism hardening:** an ast-grep guard banning re-implemented threshold reverse-scans
  outside the canonical f32 kernels, + a `BlendTree.computeBlend` accumulation-order-independence
  property test (run against the fresh wasm in CI).
- **New package `@czap/error`** — a composable tagged-error algebra (a closed variant coproduct
  over an open `TaggedError` contract, value AND type, Effect- and throw-compatible) the whole
  stack now adopts as its foundational zero-dep leaf.
- **New package `@czap/gauntlet`** — the self-proving rigor engine (ADR-0023): gates, findings,
  assurance levels (L0–L4), and the authority ratchet (a gate earns blocking power only by
  self-proving against its own red/green/mutation fixtures). Lean (no `typescript`; the
  triangulated repo-IR + the mutation / MC-DC / taint / coverage-guided-fuzz / claim-vs-reality /
  traceability / agent-safety gate families are host-injected via `@czap/audit`, ADR-0012). This
  is the rigor work the small live-runtime cut grew into when it exposed the gaps.
- **FactGate — evidence-bound gates (ADR-0019).** Gates can be defined as DATA (`defineFactGate` —
  `requires` + `decide`) instead of arbitrary closures, closing the stale-green hole where a `run`
  body could read undeclared evidence. Cache identity derives from the declared facts; the
  discriminant is an unforgeable `WeakSet`. The always-blocking no-skipped-test gate has a
  proven-equivalent FactGate form.
- **API-docs source-of-truth.** Every publishable package is in the TypeDoc roster (guarded), and
  a broken `{@link}` now fails the build (`treatWarningsAsErrors`) — zero dead links, enforced.
- **Astro 7 (hard-cut).** The workspace targets Astro 7 + `@astrojs/cloudflare` v14 (Vite 8 /
  Rolldown). `@czap/astro` needs no code changes — the integration hooks, middleware, and
  `client:*` contracts are unchanged — and the batteries Astro 7 ships are now consumed:
  - `@czap/astro` — **`czapFetchLayer()` (ADR-0024):** request-time adaptation as a layer in
    FRONT of Astro via `src/fetch.ts`. Shares the one `createEdgeHostAdapter().resolve()` with
    `czapMiddleware`; on an opt-in `serveFromEdge` path it serves boundary CSS from the edge and skips Astro
    entirely. `serializeBoundaryCss` exposed. Astro's `Fetchable` / Hono-compatible.
  - `@czap/astro` — **Diagnostics → Astro logger bridge.** `bridgeDiagnosticsToAstroLogger` /
    `installDiagnosticsBridge` route `@czap/*` runtime diagnostics through Astro's logger
    (structured `astro dev --json` output); wired in `astro:config:setup`.
  - `@czap/edge` / `@czap/cloudflare` — **active cache invalidation.** `BoundaryCache.invalidateByPath`
    (purge by content address) + `invalidateByTag` (Astro.cache tag parity, index-backed) close
    ADR-0017's passive-TTL gap; `KVNamespace` gains optional `delete`/`list`, forwarded by the
    Cloudflare adapter, degrading to a diagnostic when a provider omits them.
  - `@czap/cli` — **`czap doctor --target astro`:** an Astro 7 `/_astro/status` dev-server
    liveness probe for agent-run background dev sessions.

### Changed

- `@czap/core` — factored the DocumentGraph node well-formedness reader (`isWellFormedNode`,
  `DocumentGraphNodeSchema`) out of `ai-cast.ts` into `document-graph-schema.ts` so the
  runtime loader and the AI seam share one trust gate.

## [0.3.1] - 2026-06-19

### Fixed

- `@czap/cli` — **`czap ship` now fails closed on unrecognized flags.** The arg
  parser silently ignored any unknown `-`/`--` flag (including `--help`), so
  `czap ship --help` — or any typo'd flag — fell through to "no `--filter` →
  publish EVERY workspace package." `--help`/`-h` now print usage and exit
  without shipping, and any unrecognized flag is refused (exit 1) before a single
  package is packed or published. Long-latent (present since ≥0.2.3), auth-gated;
  hardened here so a flag typo can never trigger a publish.

## [0.3.0] - 2026-06-19

The **source-of-truth cut**: every identity — a name, a cache key, a guard's
expected value, a content address, a signal scale — is computed from its source,
not a proxy standing beside it. Carries breaking surface (pre-1.0 minor).

### Breaking

- `@czap/web` / `@czap/astro` — **external shaders now require an integrity pin.** An external
  shader URL (`data-czap-shader` / `data-czap-shader-src`) must carry a
  `data-czap-shader-integrity="sha256-…"` pin, or czap refuses to compile it and the boundary
  falls back to its CSS layer (secure-by-default — an unverified external shader never reaches the
  GPU). A shader that silently stopped rendering on capable GPUs after upgrading needs the pin
  added; the runtime logs `shader-integrity-absent` / `wgsl-integrity-absent` ("Refusing to
  compile. Fix: add a data-czap-shader-integrity…") when this fires. Inline shader sources are
  unaffected (no fetch boundary to verify).
- `@czap/edge` / `@czap/astro` — **`data-czap-cap` → `data-czap-tier`.** The edge
  `<html>` capability-tier attribute was emitted as `data-czap-cap` while every
  reader, the probe, and all examples used `data-czap-tier`. It is now one name,
  projected from a single `CAP_AXES` registry. CSS/selectors keyed on
  `[data-czap-cap]` must migrate to `[data-czap-tier]`.
- `@czap/astro` — **`Astro.locals.czap.tier.{cap,motion,design}` →
  `czap.tiers.{tier,motion,design}`.** The locals triple was renamed so the field
  names match the `data-czap-<axis>` attributes (one source) — and is now typed
  via an `App.Locals` augmentation, so no cast is needed. Host code reading
  `locals.czap.tier.cap` must read `locals.czap.tiers.tier`.
- `@czap/astro` — **`scroll.progress` runtime value is now `0..1`** (was
  `0..100`). A boundary authored against `0.5` now evaluates correctly at runtime;
  any host math or thresholds on the old `0..100` scale must rescale.
- `@czap/astro` — **`data-czap-gpu-tier` / `data-czap-webgpu` are no longer
  written to `<html>`.** They were write-only engine state; post-probe `gpuTier`/
  `webgpu` ride the `czap:detect-ready` event detail + `window.__CZAP_DETECT__`
  only. Anything reading those attributes must read the event/global.
- `@czap/astro` — **the boundary inspector is now an Astro dev-toolbar app**
  (toggle from the toolbar icon). The `Alt+Shift+C` overlay and the
  `./runtime/inspector-loader` export are gone.
- `@czap/edge` / `@czap/cloudflare` — **the cache "never go stale" guarantee is
  now conditional.** An entry is keyed by boundary id + tier + name + a
  resolved-theme fingerprint; a bundled `compile()` whose output depends on
  build-time content the boundary id doesn't cover must set `prefix` as a
  per-deploy content version.

### Added

- `@czap/core` / `@czap/astro` — **full audio boundary signals.**
  `Boundary.make({ input: 'audio.amplitude', at: [...] })` (and `audio.beat`) now
  light up the same evaluator → CSS/GPU casts, driven by a main-thread
  `AnalyserNode` producer (`driveAudioFromAnalyser`, `@czap/astro/runtime`).
- `@czap/core` — **unified Signal vocabulary.** `SignalSource` is the source of
  truth; `sourceToInput`/`inputToSource`/`inputSourceType` round-trip the
  dot-string input form, replacing the per-domain string parsers the runtime,
  inspector, and CSS-axis compiler each forked.
- `@czap/astro` / `@czap/edge` — **GLSL/WGSL shader-declaration delivery.** The
  compiler's emitted `.declarations` block now reaches the runtime (prepended
  before `gl.shaderSource` / `createShaderModule`); authors no longer hand-write
  the matching `u_*` uniform declarations.
- `@czap/detect` — **`CAP_AXES` / `capAxisAttr` / `CapAxis`**, the single source
  for the `data-czap-*` capability vocabulary (the attribute suffix is the axis
  key by construction, so a DOM attribute can't drift from its locals field).
- `@czap/astro` — **opt-in detection middleware.** `czap({ middleware: true })`
  auto-wires `@czap/astro/middleware-entry`, so the common case needs no
  hand-written `src/middleware.ts`.
- `@czap/vite` — `addWatchFile` on convention directories, so editing an
  out-of-module-graph `*.tokens.ts` / `*.themes.ts` triggers HMR.

### Changed

- `@czap/astro` — **the `serverIslands` integration option is a deprecated
  no-op.** Server Islands are stable in Astro (since v5); the
  `experimental.serverIslands` bridge was removed.

### Fixed

- `@czap/astro` — the inline `capLevel` ladder in the head detect probe had
  silently diverged from canonical `tierFromCapabilities` (reduced-motion forced
  `static` at every GPU tier; `cores`/`memory` shortcuts to `styled`); reconciled
  and pinned by a drift guard against canonical.
- `@czap/astro` — the LLM directive's device-tier read now uses the
  source-of-truth `data-czap-motion`, falling back to deriving from the capability
  tier only pre-probe.
- `@czap/web` — the runtime-URL SSRF private-IP check now gates on cross-origin
  rather than scheme presence, closing the protocol-relative `//169.254.169.254`
  bypass.
- `@czap/stage` — `videoFrameDigest` folds `VIDEO_CONFIG.durationMs` instead of a
  hardcoded literal, so the content address can't silently lie when the config
  changes.
- `@czap/command` — the idempotency cache folds an environment fingerprint
  (node/platform/arch/package-manager) into its identity, preventing
  cross-toolchain stale hits.

## [0.2.3] - 2026-06-16

Detect-ladder fixes from dogfooding. No breaking changes to public APIs (one
client-side data attribute renamed).

### Fixed

- `@czap/astro` — **`client:gpu` now re-boots when the async probe upgrades the
  tier.** The probe is async, so the directive's first activation saw only the
  conservative provisional tier and a capable GPU bailed permanently — forcing
  the `force` hatch. It now listens for `czap:detect-ready` and boots the shader
  once a GPU-admitting tier settles (re-running forced with a no-op `load`, so
  hydration never repeats and exactly one canvas is created). `force` stays for
  headless/CI and genuinely-low devices that never upgrade.
- `@czap/astro` — **the reduced-motion preference moved off `data-czap-motion`.**
  The head detect script wrote the reduced-motion preference (`reduce`/
  `no-preference`) to `data-czap-motion`, colliding with `EdgeTier.tierDataAttributes`
  (SSR), which writes the motion capability **tier** (`animations`/.../`none`) to
  the same attribute — whichever ran last won. The preference is now
  `data-czap-reduced-motion`; `data-czap-motion` is the tier consistently (keeping
  the `cap`/`motion`/`design` triple coherent). **Breaking** for CSS keyed on
  `[data-czap-motion="reduce"]` → use `[data-czap-reduced-motion="reduce"]`.

## [0.2.2] - 2026-06-16

Route-scoping for embedded sub-apps. Surfaced dogfooding a site that mounts a
Starlight `/docs` section next to a `@czap/astro` marketing app. No breaking
changes.

### Added

- `@czap/astro` — **`czap({ exclude: ['/docs/**'] })`**: route globs on which
  czap's costly runtime scripts (detect, the GPU probe, wasm, the dev inspector)
  do not run. Astro's `injectScript` is global with no build-time route filter, so
  this is a runtime guard — a tiny head-inline script, injected ahead of
  everything else, matches `location.pathname` and sets `window.__CZAP_OFF__`
  (re-evaluating on View-Transition swaps), which those scripts short-circuit on.
  The directive bootstrap stays wired (a no-op without czap markers) so View
  Transitions still work across the boundary. For embedding czap alongside another
  Astro sub-app that never consumes it, so those pages don't pay for a pointless
  GPU probe. Matches exact paths and a trailing `**`
  (`/docs/**` covers `/docs` and everything under it; `/documentation` is not
  matched). Default `[]` (czap runs everywhere) — zero overhead when unused.

### Fixed

- `@czap/astro` — **`czap({ wasm: { enabled: true } })` now actually loads the
  kernel.** The injected bootstrap only called `configureWasmRuntime` (which sets
  `data-czap-wasm-url` but never loads), so enabling wasm in config silently
  no-op'd — the kernel loaded only if the page happened to carry a per-element
  `client:wasm` directive, and `czap:wasm-ready` never fired otherwise (a 0.2.1
  dogfood sharp edge). The bootstrap now eagerly calls
  `loadWasmRuntime(document.documentElement)` at the document level (and re-fires
  on `astro:after-swap`, so a View Transition from an excluded route still loads
  the kernel); the per-element directive still works, and `WASMDispatch.load` is
  idempotent after completion so nothing re-fetches.

## [0.2.1] - 2026-06-15

The escape-hatch patch. 0.2.0 shipped the WASM compute API and the GPU detect
ladder; dogfooding two sites surfaced that the API was reachable but the
**artifact never shipped**, and the GPU/detect runtime lacked two escape hatches.
No breaking changes — purely additive.

### Added

- `@czap/core` — **the czap-compute WASM kernel now ships**. `build:wasm` builds
  the Rust crate and stages `czap-compute.wasm` into `@czap/core/dist` (shipped via
  the package `files`). Until now `WASMDispatch.load()` had nothing to load from an
  npm install, so every consumer silently ran the TS fallback.
- `@czap/vite` — the WASM resolver now finds the shipped artifact through the
  module graph (`@czap/vite` → `@czap/core`, a 4th `'package'` source after config /
  crate, before public) — pnpm-nesting-safe, so it works even when an app installs
  only `@czap/astro`/`liteship` and has no top-level `node_modules/@czap/core`.
  `czap({ wasm: { enabled: true } })` now "just works" off a plain install — no
  hand-copied artifact, no local Rust build.
- `@czap/core` — **`Boundary.evaluateBatch(boundary, values)`**: batch-evaluate
  many values against one boundary into state indices, routed through
  `WASMDispatch.kernels()` (Rust when loaded, TS fallback otherwise). Output is
  bit-identical to mapping `Boundary.evaluate` — the win is throughput on large
  value sets (offline precompute, scrub timelines, per-entity scene signals),
  never different numbers. Locked by the wasm-parity property suite on both paths.
- `@czap/astro` — **`client:gpu` force escape hatch**: `client:gpu={{ force: true }}`
  (or a `data-czap-gpu-force` attribute) boots the shader even below the GPU rung,
  for headless/CI (SwiftShader reports gpuTier 0 yet WebGL2 works) and real
  low-tier-but-capable devices. Capability is still re-checked by the actual
  WebGL2/WebGPU probe, which degrades to CSS if the context is genuinely absent.
- `@czap/astro` — **`czap:detect-ready` event**: the async GPU probe now fires one
  consolidated event on `document` once `__CZAP_DETECT__` and the `data-czap-*`
  attributes are final, carrying the settled `{ tier, gpuTier, webgpu, motionTier }`
  payload (or `{ error: true }` if the probe throws, so listeners never hang).
  Replaces `setTimeout` backstops that raced the probe.

## [0.2.0] - 2026-06-14

The substrate cut. 0.1.x proved the casts; 0.2.0 makes the **DocumentGraph IR** the
keystone they all project from, lands the **production cast family** (CSS / SVG / GLSL /
WGSL / ARIA / video / AI), and ships the **AI cast primitive** — a content-addressed
graph spoken to a model and a validated, unforgeable proposal taken back. Plus a
developer-experience pass (defaults + teaching errors), a full dev inspector, and a
structural-lint guard layer. Pre-1.0 break policy applies — breaking changes are noted.

### Added — substrate, casts, AI

- `@czap/core` — **DocumentGraph IR** (the keystone): a content-addressed graph of
  signal / entity / component / pose / transition / projection / policy / export nodes,
  with deterministic evaluation across the render seam and the dual-export proof. Every
  cast now projects from one graph.
- `@czap/compiler` + `@czap/astro` — **live GLSL and WGSL casts**: the compilers emit
  per-state uniform/binding declarations and a `bindUniforms` helper; the runtime
  subscribes to `czap:uniform-update` and binds `detail.glsl` / `detail.wgsl` on every
  boundary crossing (the WGSL consumer is net-new).
- `@czap/scene` — **SVG egress**: an ECS render sink applies `_svgAttrs`
  (transform / opacity / mixBlendMode / clipPath) post-tick, closing the SVG cast.
- `@czap/core` — **AI Cast Primitive** (`AICast`): a graph → token-budgeted
  `AIContext` + tool/output schema → model proposes a `GraphPatch` / `GeneratedUITree`
  → the framework **validates + previews** → a `ValidatedProposal` envelope a host can
  apply. The envelope is unforgeable (a module-private `ApplyToken` witness backed by a
  WeakSet identity registry, frozen), untrusted nodes are decoded against a declarative
  `Schema.Union` over all node families, and there is **no model-output → mutation path
  that skips validation**. Zero network/provider imports — the host owns all authority.
- `@czap/core` — **escalation chooser** (`chooseRung`) wired into the compositor as a
  per-projection target gate: a budget/policy constraint downgrades the admitted casts.
- `@czap/core` — **GraphPatch round-trip capsule**; `apply`'s `update` is now a true
  logical replace (drops the prior node sharing a `logicalKey`, not an orphaning add).
- `@czap/stage` — headless video **`FrameEncoder`** behind the `encode?` seam (ffmpeg);
  `@czap/stage` promoted to a published package.
- `@czap/astro` — the dev inspector now covers the **full** 0.2.0 surface: per-boundary
  active-casts (css/glsl/wgsl/aria/svg + live values), an escalation panel (rung +
  admitted targets), and a read-only DocumentGraph peek, on the Alt+Shift+C overlay.
- **Capsule system** — one `defineCapsule` generates a fast-check property test + a
  budgeted bench; `bench:gate` fails the build on a budget regression. 24 capsules.
- **ast-grep structural guards** — a `lint:structural` gauntlet phase backstops the
  hand-rolled meta-guards (raw-timeout, seam-integrity, c8-ignore-reason, doc drift).
- **Wave-3 DX sweep** — backward-compatible defaults + teaching errors across
  `@czap/vite` (wasm auto-detect, env validation), `@czap/astro` (no rename ritual,
  workers configured once), `@czap/edge`, `@czap/cloudflare` (default KV binding,
  `/testing` subpath), and `@czap/assets`; examples adopt the modern usage.

### Fixed — caught by the property tests / adversarial review

- `@czap/compiler` — GLSL/WGSL compilers null-proto their per-state field maps; a
  boundary field named `__proto__` is no longer silently dropped from the bindings.
- `@czap/genui` — `validateGeneratedUITree` guards own-property lookups; a model
  proposing a `constructor` / `__proto__` component or prop name can't bypass the
  unknown-component gate or crash the validator.

### Removed

- **BREAKING** `@czap/astro` — the deprecated `attachViewportObserver`
  alias is gone; use `attachSignalObserver` (handles `viewport.*` and
  `scroll.*`). It was never re-exported from `@czap/astro/runtime`'s
  index; both known consumer repos are grep-clean.

### Added

- `@czap/canonical` — self-contained canonical bytes kernel (`CanonicalCbor`, FNV-1a,
  sync `AddressedDigest.of`); sole dependency `@noble/hashes`. `@czap/core` re-exports
  and re-anchors types to `@czap/_spine` (ADR-0013).
- `@czap/genui` — host-owned generated UI catalog (`defineComponentCatalog`,
  `validateGeneratedUITree`, `renderFromCatalog`, `renderHash` / `catalogHash`); interactions
  surface as `genui:interaction` host callbacks only (ADR-0014).
- `@czap/core` — GenFrame `receiptId` minted from stable canonical bytes (excludes wall clock).
- `@czap/astro` — `client:llm` catalog path for `{ "_genui": true, ... }` chunks when
  `genuiCatalog` is configured (`data-czap-genui` enables the demo catalog); exports
  `attachSignalObserver` from `@czap/astro/runtime`.
- `@czap/mcp-server` — `liteship://registry/components` and `ui://liteship/registry/components`
  project the demo catalog for discovery.
- `@czap/astro` — dev-mode boundary inspector overlay (Alt+Shift+C in `astro dev`):
  live signal readout, draggable threshold track with in-DOM `data-czap-boundary` rewrite +
  `czap:reinit`, Copy `Boundary.make` snippet, INERT/@quantize honesty badges.
  `IntegrationConfig.inspector?: boolean` opts out; production builds exclude the chunk.
- `@czap/core` — `Token.make({ name, category, value })` shorthand for single-value
  tokens (derives `axes: []`, `values: {}`, `fallback: value`).
- `examples/tutorial` — `/api/feed` SSE stub for the stream demo; example READMEs
  with published-version notes.
- `@czap/vite` — `virtual:czap/tokens`, `virtual:czap/tokens.css`, and
  `virtual:czap/themes` are real: convention modules (`tokens.ts` /
  `*.tokens.ts`, `themes.ts` / `*.themes.ts`) are collected at build time
  and hotUpdate-invalidated like `virtual:czap/boundaries`.
- `@czap/vite` + `@czap/compiler` — `viewport.height` is a first-class
  compiled axis: the CSS compiler derives the container-query axis from
  the boundary input (height-measuring inputs serialize `(height ...)`
  conditions; everything else keeps `(width ...)` byte-for-byte), and
  height boundaries join the auto-containment path. When a sheet (or a
  manifest entry) collects the `viewport-height` container name, the
  `:root` rule upgrades to `container-type: size` with `block-size:
  100dvh` pinned (size containment computes the root's height as if
  empty); width-only sheets keep the `inline-size` rule unchanged. The
  `container-not-declared` diagnostic no longer fires for
  `viewport.height` — it remains for unrecognized `viewport.*` axes and
  non-viewport inputs.
- `@czap/assets` — `AssetDecl.invariants` and `budgets.decodeP95Ms` are optional
  (defaults: `[]` and per-kind decode budgets — beat-markers/onsets 200 ms,
  waveform 100 ms, video 100 ms, image 20 ms, audio 50 ms). `WaveformProjection`
  defaults `bins` to 512 when omitted. `defineAsset` now returns a typed
  `CapsuleDef<'cachedProjection', ArrayBuffer, DecodedAsset<K>, unknown>`.
- `@czap/assets` — decoder and registry teaching errors: `registry-miss` lists
  sorted registered ids plus an import-order hint; WAV/RIFF failures name chunk
  ids, format codes, byte lengths, container sniff hints, and re-export steps;
  `videoDecoder` accepts an optional source path and names it on empty-buffer
  and probe-write failures.
- `@czap/assets` — `AssetDecl.site` explicit override: an asset can now
  declare the sites it runs on instead of inheriting the derived default
  (custom decoder → `['node', 'browser']`, builtin → `builtinDecoderSiteFor`),
  e.g. a node-only custom video decoder or an audio asset that must never
  ship to browsers. Impossible claims fail at decl time with teaching
  errors: a site the builtin decoder cannot honor (builtin video is
  node-only — ffprobe needs node:child_process) and the empty array (a
  capsule must run somewhere).

### Changed

- **BREAKING** `@czap/assets` — `BeatMarkerProjection`, `OnsetProjection`,
  `WaveformProjection`, and `WavMetadataProjection` validate `audioAssetId` via
  `getAssetRegistry()` at construction (same semantics as `AssetRef`). Call
  `defineAsset` before constructing projections, or import the module that
  registers the audio asset.
- `create-liteship` — `npm create liteship` / `pnpm create liteship`
  scaffolds a minimal working Astro + `@czap` project (the "first five
  minutes" path): one boundary, one `satelliteAttrs()` element, and one
  `@quantize` block sharing the same boundary export, mirroring
  `examples/default`'s repaired idioms. Zero runtime dependencies
  (`node:fs` template copy + `node:readline` prompt); refuses non-empty
  targets with a teaching error and prints the cd/install/dev next
  steps. Post-publish smoke: scaffold + `pnpm install` + `astro build`
  against the published `@czap/*` tarballs.
- `@czap/vite` — `virtual:czap/boundaries` is real: the plugin derives a
  boundary manifest (`collectBoundaryManifest`) from `boundaries.ts` /
  `*.boundaries.ts` modules and `@quantize` CSS blocks — each entry is the
  boundary's minted `ContentAddress` plus precompiled `CompiledOutputs`
  for the full (motion x design) tier grid. Dev imports stay fresh via
  hotUpdate invalidation; `@czap/vite/virtual` ships ambient types for
  the virtual modules.
- `@czap/astro` — `astro:build:done` emits `czap-boundary-manifest.json`
  (versioned envelope) into the build output for hosts that read the
  manifest from disk instead of importing `virtual:czap/boundaries`.
- `@czap/edge` — boundary manifest contract (`BoundaryManifest`,
  `BoundaryManifestEntry`, `BoundaryManifestFile`, `TierKey`, `tierKey`,
  `enumerateTierKeys`, `MOTION_TIERS`, `DESIGN_TIERS`);
  `EdgeHostCacheConfig.precompiled` serves manifest outputs without a KV
  round-trip (new `cacheStatus: 'precompiled'`), with `compile` now an
  optional fallback (config validation teaches the fix when both are
  missing).
- `@czap/cloudflare` — `cloudflareMiddleware` accepts `manifest` (+
  optional `boundary` selector) and derives `boundaryId` + precompiled
  outputs from it; the hand-built `boundaryId` + `compile` form remains
  as an escape hatch. `examples/cloudflare-astro` now runs the derived
  path end-to-end (real boundary module, `@quantize` CSS, manifest-fed
  middleware) instead of compiling a placeholder constant.
- `@czap/edge` — the host cache serves **multiple boundaries per page**:
  `EdgeHostCacheConfig.boundaries` takes a name-keyed record of
  `EdgeHostBoundaryConfig` (`boundaryId` + `precompiled`/`compile`), and
  `EdgeHostResolution.boundaries` reports each boundary's own outputs and
  cache status (top-level `cacheStatus` aggregates worst-case; top-level
  `compiledOutputs` stays populated when exactly one boundary is
  configured). Each boundary keeps its own content-addressed KV key, so
  two boundaries at the same tier cannot poison each other's cached CSS.
  The single-boundary `boundaryId` form is unchanged.
  `EdgeHostCompileContext` now carries `boundaryId` (+ `boundaryName` in
  the multi form) so a shared `compile` fallback can branch per boundary
  (**breaking** only for code constructing the compile context itself;
  callbacks just see the new fields). `CzapLocals.edge` (`@czap/astro`)
  exposes the per-boundary record as `boundaries`.
- `@czap/cloudflare` — `cloudflareMiddleware` serves **every manifest
  boundary by default** (previously a multi-boundary manifest without a
  `boundary` selector threw); `boundary` narrows to one name or a list.

### Fixed

- `@czap/edge` — `EdgeTier.tierFromParsed(caps)` maps already-parsed Client
  Hints to the tier triple; `EdgeHostAdapter.resolve()` parses headers once.
- `@czap/edge` — KV cache docs use `Boundary.make(...).id` and
  `EdgeTier.detectTier(request.headers)` instead of hand-typed ids/tiers;
  corrupt or mis-shaped cache entries warn with probable cause and self-heal
  guidance (`invalid-cache-entry`, `cache-entry-shape-mismatch`).
- `@czap/edge` — theme compiler teaching errors name the offending token or
  prefix, suggest a sanitized prefix, and explain why prefixes become
  `--<prefix>-*` custom properties.
- `@czap/cloudflare` — `cloudflareMiddleware` defaults `binding` to
  `CZAP_BOUNDARY_CACHE`; missing KV bindings and unavailable
  `cloudflare:workers` emit `warnOnce` diagnostics listing available env keys;
  test env helpers moved under a `// --- testing ---` export group;
  `getDefaultWorkersEnv` docblock matches behavior.

- `@czap/vite` + `@czap/compiler` — `@quantize` states accept **nested
  selector rules** (`<selector> { ... }`) alongside bare declarations:
  each nested selector compiles to its own rule inside the state's
  `@container` block (`CSSCompiler.compile` takes per-state
  `{ bareProps, rules }` bodies; flat property maps still work).
  `QuantizeBlock.states` is now `Record<string, QuantizeStateBody>`
  (**breaking** for direct `parseQuantizeBlocks` consumers). For
  `viewport.*` boundaries the compiled output also declares `:root` as
  the named query container (`container-type: inline-size;
  container-name: <input>`) so the queries actually match; non-viewport
  inputs get a `container-not-declared` diagnostic naming the exact
  declaration to add.
- `@czap/vite` — single-line `@token name {}` blocks parse (the natural
  dependency-declaration form used by the examples).
- `@czap/vite` — **parse-miss diagnostics**: a CSS file containing
  `@token`/`@quantize` where zero blocks parse warns with the file:line
  and the supported grammar (anonymous/inline dialects no longer die
  silently); a parsed `@quantize` block whose states are all empty warns
  the same way. Markers that only appear inside comments stay silent.
- `@czap/vite` — `transformHTML` accepts the plugin's `dirs.boundary`
  override, so `data-czap="name"` resolution honors the same convention
  directories as the CSS phases.
- `@czap/scene` — the authoring sugar is now WIRED (Spec 1 §5.1/§5.3/§5.4;
  it shipped as orphaned exports): track `from`/`to` accept `Beat(n)` marks
  (`FrameMark = number | BeatHandle | FrameMarkSum`), resolved to frame
  indices by `compileScene` via scene BPM/fps BEFORE invariants run —
  invariant checks now receive a `ResolvedSceneContract` with numeric
  ranges; `Scene.include` accepts a `Beat()` offset (deferred via
  `addFrameMarks`, resolved against the parent's BPM/fps); video/audio/
  effect tracks accept `envelope: fade.in/fade.out/pulse.every(...)`,
  compiled to pre-resolved `Envelope` components that VideoSystem
  (`_opacity`), AudioSystem (new `_gain` write), and EffectSystem
  (`_intensity`) read each tick; transitions accept `ease: 'cubic' |
  'spring' | 'bounce' | { stepped: n }`, compiled to an `Ease` component
  TransitionSystem maps through the closed catalog (`easeFnFor`). New
  public helpers: `resolveFrameMark`, `addFrameMarks`, `resolveEnvelope`,
  `envelopeFactor`, `easeFnFor`; canonical types land in
  `@czap/_spine/scene.d.ts` per ADR-0010. `examples/scenes/intro.ts` is
  now authored in musical time end-to-end.
- `@czap/audit` — consumer mode verifies **dist truth**: every concrete
  exports-map condition of every installed package must resolve to a real
  file (`export-target-missing`, error). Catches broken installs and
  tarballs that shipped without their build output.
- e2e — the built Astro example now runs in a real browser
  (`tests/e2e/astro-directives.e2e.ts`): the directive boot scanner
  activates the Satellite element and `data-czap-state` tracks
  `viewport.width` across thresholds — the exact scenario that shipped
  inert in 0.1.4.
- Test infra — `scaledTimeout` (vitest.shared.ts): explicit test timeouts
  clamp to the 240s floor under coverage (a raw literal silently LOWERED
  the budget before) and honor `CZAP_TEST_TIMEOUT_SCALE` on loaded
  machines. A meta source guard rejects raw timeout literals.
- `@czap/core` — capsule harness handlers wave 1: `CapsuleContract` gains
  optional `step`/`initialState` (stateMachine) and `derive`
  (cachedProjection); the harness generators emit runtime-probing property
  tests that import the real binding (invariants after every step across
  random event sequences, deterministic replay, projection determinism).
  `core.token-buffer` runs live by wrapping the production `TokenBuffer`;
  capsules without handlers or with non-derivable schemas self-report as
  honest skips.
- `@czap/assets` — harness handlers wave 2: `AssetDecl.decoder` is real.
  `defineAsset` resolves `decl.decoder ?? builtinDecoderFor(decl.kind)`
  (audio → audioDecoder, video → videoDecoder, image → imageDecoder;
  analysis kinds keep their projection factories) and wires it as the
  capsule's `derive` handler. New exports: `builtinDecoderFor`,
  `resolveAssetDecoder`, and the `DecodedAsset<K>` kind→decoded-shape
  mapping (`decoder` is now typed against it, so an audio asset's custom
  decoder must produce `DecodedAudio`). The `asset analyze` hosts (CLI +
  shared Node command context) decode through the asset's own decoder via
  the registry instead of a hardwired `audioDecoder` (audio built-in
  remains the fallback for processes that never import the asset module);
  `CommandContext.runAudioProjection` gains an optional `assetId`
  parameter to carry the routing. `CapsuleContract.derive` may now be
  async (`Out | Promise<Out>`) and every harness probe awaits it.
  capsule-compile is factory-aware for exported `defineAsset` bindings:
  the generated `intro-bed` test imports the real capsule and decodes the
  canonical `examples/scenes/intro-bed.wav` fixture (determinism +
  invariants), and the decode-throughput bench is a REAL bench against
  the declared p95 budget instead of a comment-only stub.
- Rust/WASM parity harness: `crates/czap-compute` joins the proof system —
  crate unit tests, a CI job (`rust-wasm-parity`) that builds the wasm32
  artifact from source, and a property suite loading it through the real
  `WASMDispatch.load()` against `fallbackKernels` (boundary state indices
  exact, spring trajectories within f32 tolerance, blend bit-identical).
  The suite self-skips locally when the artifact is absent.
- `czap-compute` — `blend_normalize` accumulates its total and computes the
  reciprocal in f64, matching the TS fallback op-for-op: an f32 reciprocal
  overflowed to `inf` for subnormal weight totals where the fallback
  normalized to 1.0 (caught by the new parity suite on its first run).

- `czap ship` — graceful already-published handling: a registry version
  conflict in the publish pre-check emits a `ShipSkippedReceipt`
  (`already_published: true`) and continues; a run where every package is
  already published exits 0. Release-workflow re-runs after a mid-batch
  failure need no shell grep fallback.

- `Token.make` defaults: `axes` defaults to `['default']` and `fallback` derives from `values.default`, so single-value tokens need no axis ceremony (`Token.make({ name, category, values: { default: '#ccc' } })`).
- `Component.make` accepts omitted `slots` (implied `{ children: {} }` with `defaultSlot: 'children'`) and `SlotConfig.required` is now optional (default `false`, normalized so content addresses match an explicit `false`).
- `Easing.spring({})` and `Easing.springNaturalDuration({})` now work: `stiffness`/`damping` default to the engine constants 170/26 (react-spring convention; `mass` already defaulted to 1).
- `Signal.make` source payloads are optional with documented defaults — viewport `axis: 'width'`, scroll `axis: 'y'`, pointer `axis: 'x'`, time `mode: 'elapsed'`, audio `mode: 'sample'` — normalized at entry so the returned `signal.source` always carries explicit values.
- `Style.make` accepts a plain `number` for `transition.duration` and brands it with `Millis` internally (matches the spine declaration; docblock no longer teaches the `Millis(200)` wart).
- `SSEConfig.reconnect` is now `Partial<ReconnectConfig>`, spread-merged over `defaultReconnectConfig` in `SSE.create` — override one knob without hand-copying the other three.
- `@czap/_spine` declares `effect` as a peer dependency and `astro`/`vite` as optional peers; a runtime (value) import now throws a teaching error from `stub.js` instead of Node's bare `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- `ResumptionConfig.maxGapSize` documents its default (50) and the `Partial` accepted by `Resumption.resume`.
- `@czap/audit`: `runAuditPasses` now accepts a partial `DevopsProfile` — omitted fields take documented defaults via the new `resolveDevopsProfile` (repoRoot=cwd, empty topology/exemptions/surface policy), and `internalPackagePrefix` is derived from the single common npm scope of the discovered package manifests (ambiguous or unscoped trees throw a teaching error instead of guessing). `runAuditPasses({ repoRoot })` just works.
- `@czap/audit`: consumer mode now reports topology packages that aren't installed as support-section info findings (rule `consumer-package-missing`), making the README's missing-packages promise automatic — no second `discoverInstalledPackageRoots` call needed.
- `@czap/worker`: `CompositorWorker.addQuantizer(boundary)` overload accepts a `Boundary.make` result directly — id/states/thresholds derived, quantizer name defaults to `boundary.input` (new `QuantizerBoundarySource` type; explicit two-arg form unchanged).
- `@czap/worker`: `WorkerHost.startRender({ durationMs })` — width/height default to the attached canvas's dimensions (captured at `attachCanvas` time), fps defaults to 60, and `durationMs` accepts a plain number (branded to `Millis` internally). New `WorkerHostRenderConfig` type; `TransferableCanvas` gains `width`/`height`.
- `@czap/scene`: `Track.transition` `between`, `Track.effect` `target`, and `syncTo.beat/onset/peak` anchors accept the track object itself (new `TrackRef<K>` type + `trackRefId` helper) — the id is derived and the phantom kind brand preserved.
### Documentation
- `@czap/worker`: `WorkerConfig.poolCapacity` documents `@defaultValue 64`; SPSC examples drop the slotCount/slotSize postMessage shuttling.
- `@czap/scene`: `VideoTrack.source` documented as an opaque renderer-owned passthrough (the engine only checks presence).
- `@czap/mcp-server`: `start({ http })` / `runHttp` accept a plain port number alongside `':PORT'`, `'PORT'`, and `'HOST:PORT'` strings; all accepted bind shapes are documented on `StartOpts`, and `parseHttpBind` is exported for host tooling.
- `@czap/cli`: `czap doctor` gains the `liteship.pnpm` consumer probe — when `liteship` is declared under pnpm's strict layout without a resolvable `@czap` scope, it warns with the literal `pnpm add @czap/core @czap/astro` remedy (or the `public-hoist-pattern[]=@czap/*` alternative).
- `Transition.for` accepts a bare `Boundary` in place of a quantizer — the quantizer argument was only a type anchor, so a config-lookup table no longer requires a live quantizer (@czap/quantizer).
- Dispatch `CSSCompiler` arm accepts an optional `selector` for bare properties (default `.czap-boundary`, now documented in the arm docblock) (@czap/compiler).
- `AIManifestInput`: every `AIManifestCompiler` entry point (`compile`, `validateAIOutput`, `generateSystemPrompt`, `generateToolDefinitions`) and the dispatch `AICompiler` arm accept partial manifests, normalized to documented defaults (`version: '1.0'`, empty `dimensions`/`slots`/`actions`, `[]` constraints); compile results still carry the total `AIManifest` (@czap/compiler).
- Build-time `tier-gated-output-dropped` diagnostic (warnOnce): `Q.from().outputs()` now says when outputs target a channel the tier never emits, naming the dead target, the tier's emit set, and the literal `.force('<target>')`/tier remedies (@czap/quantizer).
- `unknown-previous-state` diagnostic (warnOnce): `evaluate()` names the foreign `previousState`, the boundary input, and its valid states instead of silently returning `crossed: true` (@czap/quantizer).
- `uncovered-animation-states` diagnostic: `AnimatedQuantizer.make` warns once when the outputs record misses boundary states that would lerp to empty records at the 50% snap (@czap/quantizer).
- `unknown-state-key` diagnostic: `CSSCompiler.compile` warns for every supplied state key that matches no boundary state (the silent path behind dispatch typos like `Sm:` vs `sm:`), with a case-insensitive did-you-mean (@czap/compiler).
- `unknown-current-state` diagnostic: `ARIACompiler.compile` warns and lists the boundary's states before falling back to empty `currentAttributes` (@czap/compiler).
- `@czap/detect`: `resetDetectionCaches()` clears memoized session-stable probe results (exists for test isolation; production code never needs it). Mirrored in `@czap/_spine`.
- `@czap/remotion`: `rendererFromRemotionConfig(config, compositor, signal?)` builds a `VideoRenderer` directly from Remotion's `useVideoConfig()`/`calculateMetadata` shape, deriving `durationMs = durationInFrames / fps * 1000` so fps/duration are declared exactly once — in Remotion — and can no longer drift into a video that freezes on the last frame. New `RemotionVideoConfig` type exported; both mirrored in `@czap/_spine`.
### Changed

- `@czap/vite` — `PluginConfig.environments` now defaults to `['browser']`
  when omitted (derive-with-override); pass `environments: []` to opt out.
- `@czap/vite` — `PluginConfig.wasm` accepts `true` as shorthand for
  `{ enabled: true }`.
- `@czap/vite` — exports `czap` as an alias for `plugin`; docblock examples
  updated.
- **BREAKING** `@czap/vite` — the `data-czap="name"` HTML macro now emits
  `data-czap-directive="satellite"` alongside `data-czap-boundary`, so macro
  elements activate the runtime scanner (previously inert).
- `@czap/vite` — `transformHTML` blanks HTML comments and `<pre>`/`<code>`
  contents before matching `data-czap` macros, so teaching prose and code
  samples are not corrupted into boundary JSON blobs.
- `@czap/vite` — boundary-not-found, import-failed, export-tag-mismatch, and
  WASM buildStart warnings upgraded to doctor-style messages naming searched
  paths and literal fixes.
- `examples/*` — astro configs drop restated integration defaults; tutorial 01
  teaches `satelliteAttrs`; tutorial 04 stream demo adds `client:stream` and a
  live `/api/feed` endpoint; `remotion-demo` uses `workspace:*` deps.
- `@czap/astro` — exports `czap` as an alias for `integration`; `satelliteAttrs`
  defaults `data-czap-state` from the boundary; middleware consumes
  integration-published detect/workers/coep toggles; runtime diagnostics upgraded
  for boundary parse failures, directive-not-enabled, worker/WASM/GPU paths, and
  endpoint policy rejections. **BREAKING**: SSR output bytes change when
  `initialState` is omitted (first boundary state is now emitted).
- **BREAKING** `@czap/edge` + `@czap/vite` — the boundary manifest
  deduplicates tier-invariant CSS (the format shipped above in this
  release, so no released format breaks): `BoundaryManifestEntry` pools
  the DISTINCT `CompiledOutputs` in a new `outputs` array and
  `outputsByTier` cells are now pool indices instead of repeating the
  same compiled strings per (motion x design) grid cell (~20 copies →
  at most 2). New `dedupeOutputsByTier` (producer) and
  `resolveOutputsByTier` (host inflation — byte-identical per-tier
  lookups) ship from `@czap/edge`; `cloudflareMiddleware` inflates
  manifest entries itself, so middleware consumers are unaffected.
  Hosts hand-wiring `EdgeHostCacheConfig.precompiled` pass
  `resolveOutputsByTier(manifestEntry)` instead of
  `manifestEntry.outputsByTier`. `czap-boundary-manifest.json` is now
  `_version: 2`; resolving a pre-v2 entry throws a teaching error
  naming the rebuild fix.
- `@czap/vite` — `parseStyleBlocks` (the `@style` transform) now runs on
  the shared character-level `css-scan` scanner (same as `@token` /
  `@theme` / `@quantize`) instead of its own line-based parser. Fixes the
  re-serialized single-line `<style>` case (the Astro compiler collapses
  whole sheets onto one line — the old parser found the block but lost
  every state), braces/semicolons inside comments and quoted strings
  prematurely terminating states, `@style` markers inside comments
  parsing as phantom blocks, and multi-line functional values truncating
  at the first line. Comments inside values now read as whitespace per
  CSS (`1fr/*c*/2fr` → `1fr 2fr`). Public signature unchanged.
- Release workflow — **OIDC trusted publishing**: no publish tokens
  anywhere. `id-token: write` + pnpm's native OIDC exchange replace the
  `NPM_TOKEN` secret and `~/.npmrc` step; `czap ship` runs with
  `--provenance` so every published tarball links to its workflow run.
  One-time prerequisite: a trusted publisher per package on npmjs.com
  (RELEASING.md).
- The advisory audit warning floor is **zero** (was 10 pinned
  `fallback-laundering` warnings). `czap doctor` probes now surface
  read/parse failures as structured check details instead of collapsing
  them into "absent" (a corrupt package.json no longer misdiagnoses as a
  missing dependency); the integrity detector recognizes catches that
  consume their error binding before returning a default (the
  emit-then-exit-code contract); the two deliberate fail-closed defaults
  (html-trust CSP fallback, doctor --fix workspace guard) carry allowlist
  reasons and classify as suppressed.
- Runtime-seams branch-hotspot table cleared: wgpu runtime 4%→100%,
  ffmpeg-probe 15%→100%, browser host context 15%→100%, scene-dev server
  20%→100%, gauntlet command 30%→100%, video decoder 47%→100%, audit CLI
  adapter 52%→100% branches, plus the three 1/2-branch harness files.
- **BREAKING** `@czap/quantizer` — `TransitionMap`'s pair keys are now a
  template over the state union (`` `${S}->${S}` ``, mirrored in
  `packages/_spine/quantizer.d.ts`): with a concrete boundary, non-state
  keys like the historical `'*->*'` docblock mistake are compile errors
  instead of silently-never-matching duration-0 transitions. The
  any-to-any wildcard remains `'*'`. `TransitionMap` is now a type alias
  (mapped pair keys cannot live on an interface); loosely-typed
  `TransitionMap<string>` call sites are unaffected.
- `capsule:verify` — the JSON receipt classifies every generated bench
  (`benches: { total, real, placeholder }`) instead of existence-only
  checking. Most harness templates still emit comment-only bench closures
  and report as `placeholder` — a green verdict can no longer be mistaken
  for benchmark coverage; the `intro-bed` decode-throughput bench (asset
  decoder channel, above) is already real and counts in `real`. Remaining
  real bench bodies land with the harness-handlers epic's later waves. The
  integration test derives its expected classification from the manifest
  via the shared `scripts/lib/bench-classify.ts` classifier instead of
  hardcoded counts.

- Docblock examples for `Theme.make`/`Boundary.make` no longer teach `as const` (the `const` type parameters already preserve tuples); the `Token.make` multi-axis example now shows the correct alphabetical-axis-order compound key.
- `Composable.merge` and the `ComposableWorld` dense store replace bare `Error`s with `CzapValidationError`s that name the module and the literal fix (pass at least one entity; `filter(Boolean)` for sparse arrays; call `world.create(name, capacity)` before `world.store`).
- `Receipt.validateChain` is now implemented over `validateChainDetailed` with a message formatter: genesis violations report the got-value and the sliced-chain remedy, chain breaks report both hashes and the recovery step — the prose form can no longer drift from the typed taxonomy.
- `Part.dense` capacity overflow appends the next step (create with a larger capacity or remove entities).
- `Token.tap` and `Style.tap` misses are now observable: `Diagnostics.warnOnce` reports the built lookup key with the token's known keys (`token-tap-miss`) and a state outside the style's boundary state set (`style-unknown-state`); the designed fallback behavior is unchanged.
- Worker `ErrorMessage` carries structure: optional `code` (`'render-failed' | 'startup-compute-failed' | 'compute-failed'`), `subjectId`, and `hint`; the built-in workers populate `code`+`hint` at every producer site and the main-thread consumers forward the structured detail through `Diagnostics`.
- `MorphRejection.type` is closed to the union actually emitted (`'preserve_violation'`) and rejections carry an optional `hint` naming both ways out (keep the `data-czap-id` elements in the server HTML, or drop them from the preserve hint).
- `validateAIOutput` additionally returns a structured `issues` array (`{ path, expected, received, hint, message }`, exported as `AIValidationIssue`) for LLM re-prompting loops; the existing `errors` strings are unchanged and remain the prose projection of `issues`.
- **BREAKING** `@czap/web`: `SlotRegistry.observe` now scans the root for pre-existing `data-czap-slot` elements before watching mutations, so a separate `scanDOM` call is no longer required. `register` is idempotent per path+element+mode, so existing `scanDOM` + `observe` sequences keep working without duplicate `czap:slot-mounted` dispatches — but hosts relying on `observe` ignoring pre-existing DOM will now see those slots registered.
- `@czap/web`: `SSEConfig.reconnect` accepts `Partial<ReconnectConfig>`; overrides merge over `defaultReconnectConfig` (maxAttempts 10, initialDelay 1000ms, maxDelay 30000ms, factor 2), so bumping one knob no longer requires copying the rest.
- `@czap/web`: `Resumption.saveState` accepts the new `ResumptionStateInput` — `timestamp` defaults to `Date.now()` on input (the stored shape keeps it required).
- `@czap/web`: `SlotRegistryShape.register` accepts the new `SlotEntryInput` — `mode` defaults to `'partial'` and `mounted` to `true`, normalized inside `register`.
- `@czap/web`: `Morph` docs now lead with `morphWithState` as the default entry point; bare `morph` is documented as the opt-out that skips physical-state handling and preserve validation.
- `@czap/web`: invalid JSON in `data-morph-id-map` now emits an `invalid-morph-id-map` diagnostic (with the raw value and a valid example) instead of being silently skipped.
- `@czap/_spine`: web spine mirrors the `SlotEntryInput` / `ResumptionStateInput` / `Partial<ReconnectConfig>` widenings.
- `@czap/web`: resumption endpoint rejections now explain themselves per `RuntimeUrlResolution` variant — the rejected URL, the resolved vs page origin, and the literal `endpointPolicy` allowlist fix (or the SSRF/malformed detail) instead of `Snapshot URL rejected: cross-origin-rejected`.
- `@czap/web`: snapshot/replay request failures include the fetched URL and teach the default endpoint contract (`/czap/snapshot/<artifactId>`, `/czap/replay/<artifactId>?from=&to=`) plus the `ResumptionConfig` override.
- `@czap/web`: the `preserve-id-missing` warning names the `data-czap-id` matching rule and the literal attribute to add; `MorphRejection.reason` names the missing ids and both remedies (keep the elements in the server HTML, or drop them from the hint), and the `czap:morph-rejected` event detail gains an additive `recovery` field on the `morphWithState` path.
- `@czap/web`: artifactId validation enumerates the allowed characters (letters, digits, `:`, `_`, `-`) with literal examples; slot-path errors carry example paths (`"/hero"`, `"/sidebar/nav"`) at both the throw and warn sites.
- `@czap/web`: the even-dimension WebCodecs error names the codec family (H.264/HEVC), the rounded-down size to use, and the VP9/AV1 alternative.
- `@czap/web`: physical restore warnings identify the element they were restoring (semantic id / DOM id / tag) and the likely cause (element type changed across the morph).
- `@czap/web`: requesting `policy: 'trusted-html'` without `allowTrustedHtml: true` now emits a once-per-session `trusted-html-downgraded` diagnostic with the literal opt-in; the downgrade behavior itself is unchanged. All diagnostic codes are unchanged.
- `@czap/audit`: every `SurfacePolicyShape` field is now optional — an absent surface is a surface the profile never declared, so its check is skipped (a project with no Astro/Vite host supplies `{}` instead of hand-built empty strings/arrays). The `czap audit --profile` JSON loader no longer requires `surfacePolicy`.
- `@czap/audit`: the reference `surfacePolicy` const is typed directly as `SurfacePolicyShape`; the inner `as const` tuple wart and the wide-vs-literal docblock caveat are gone (zero behavior change).
- **BREAKING** `@czap/audit`: a run that discovers ZERO packages now emits a support-section error finding (rule `no-packages-discovered`, id `support/no-packages`) instead of a deceptively green "0 finding(s)" result — clean must never read as unchecked (CUT A0). `czap audit --consumer` in a repo with no `@czap/*` packages installed now exits 1.
- `@czap/audit`: audit findings now teach what happened, which subject, and the literal next step — `astro-package-missing` names `surfacePolicy.astroPackage` and both ways out (omit/`''` or `--consumer`); `package-topology` violations name `packageTopology[pkg].allowedInternalImports` and the add-or-remove fix; unresolved relative imports enumerate the real candidate set (verbatim, `.ts/.tsx/.js/.jsx`, `index.ts/index.tsx`, the `.js`→`.ts` mapping); `console-call` drops LiteShip-internal "Diagnostics" jargon and points at the console-call allowlist entry shape; `fallback-laundering` teaches consuming the error binding or allowlisting with a reason (the `returns <expr>` phrase allowlist matchers pin is preserved); vite virtual-module findings name `surfacePolicy.viteVirtualModules` and the actual inventory file path; `export-target-missing` appends the reinstall / publisher `files[]` next step.
- `@czap/audit`: `readJsonFile` wraps Node's pathless `SyntaxError`/`ENOENT` with the offending file path (`Could not read <path> as JSON: …`, with `cause`); consumer-mode discovery names a nonexistent/unreadable cwd instead of throwing a bare `ENOENT`.
- `@czap/cli`: `--profile` JSON missing-field errors now append a copy-pasteable minimal profile template (`{ "internalPackagePrefix": "@acme/", "packageTopology": {} }`).
- **BREAKING** `verify` no longer requires `--capsule`: it defaults to the ship sibling convention (`<tarball basename>.shipcapsule.cbor`) when that file exists; `inputSchema.required` shrinks to `['tarball']`, and omitting `--capsule` can now exit 0/2/3 instead of always 4. The Unknown verdict (exit 4) is preserved when no capsule can be found (ADR-0011). (@czap/command)
- `SceneContract` gains optional `width`/`height`; `scene.render` threads them through the `renderScene` capability, and the Node host + CLI render backends fall back to 1280x720 when absent. (@czap/scene, @czap/command, @czap/cli)
- **BREAKING** `createNodeCommandContext({ cwd })` now resolves `fileExists`/`readFileBytes`/`loadSceneModule`/`loadAssetBytes` against `opts.cwd` (previously only manifest + cache honored it), and `loadAssetBytes` tries the manifest-declared `source` before the `examples/scenes/<id>.wav` convention (candidate order flipped). Asset bytes are now sliced out of Node's Buffer pool instead of returning the shared pool ArrayBuffer. (@czap/command)
- **BREAKING** Command descriptors declare `requires` (injected `CommandContext` capability names) as data, and `CommandDispatcher.dispatch` enforces presence with one structured failure: `{ error: 'capability_unavailable', missing, hint }`, exit 2. Replaces the per-handler `'vitest runner unavailable'` (exit 2), `'render backend unavailable'` (exit 5), `'audio projection unavailable'` (exit 1), and `'audit engine unavailable'` payloads. New exports: `capabilityUnavailable`, `CommandCapability`. `verify` deliberately declares no requires — capability absence there is its Unknown/Incomplete verdict (ADR-0011). (@czap/command, @czap/_spine)
- Dispatcher `unknown_command` failures now carry `didYouMean` (nearest registered name, edit distance ≤ 3) and a `run \`czap help\` for the verb chart` hint; `no_registry_handler` keeps its stable code and gains `executionKind` plus a hint naming the literal `czap <name>` invocation for cli-orchestration commands. (@czap/command)
- One capsule-manifest failure wording across `capsule.*`/`asset.*`/`scene.verify` (was three phrasings): names `reports/capsule-manifest.json`, the `CZAP_CAPSULE_MANIFEST` override, and `pnpm run capsule:compile`. (@czap/command)
- Scene failures name their subject and fix: missing capsule/contract errors include the scene path and `czap glossary capsule`; missing `--output` shows the full `czap scene render <scene.ts> -o out.mp4` example. (@czap/command)
- Browser-host `scene.render` delegation failures name the MCP server URL, the remote JSON-RPC payload, and the `czap mcp --http=PORT` next step. (@czap/command)
- Registry duplicate-command-name invariant errors point at `HANDLER_COMMANDS` / `CLI_OWNED_DESCRIPTORS` in catalog.ts. (@czap/command)
### Fixed
- A corrupt capsule manifest now returns a structured `capsule manifest is not valid JSON (…) — regenerate it with \`pnpm run capsule:compile\`` failure instead of throwing a raw `SyntaxError` across the dispatcher's never-throw seam. (@czap/command)
- The ffmpeg EPIPE render failure re-runs `probeFfmpegRender()` and embeds its per-platform diagnosis/install hint instead of the rhetorical "(is libx264 available?)". (@czap/command)
- **BREAKING** `czap doctor` run outside the LiteShip workspace now auto-selects a consumer probe profile (`node.version`, `pnpm.version`, `workspace.installed`, `ffmpeg.libx264`) instead of the maintainer profile — receipt check ids change for consumers; `--target` remains the explicit override, and `--fix` outside the workspace now attempts nothing at all (the Codex P1 guard is the second layer).
- `czap scene render` no longer requires `-o/--output`: when omitted, the output derives to `<sceneBasename>.mp4` beside the scene file, resolved in the command layer so the cache key and receipt record the real path; the `scene.render` inputSchema now requires only `scene` (widening).
- `czap doctor --target`, `czap describe --format`, and `czap asset analyze --projection` now validate against their closed sets — a typo fails with `expected <flag>: <values> (got: X)` instead of silently running the default profile / falling back to JSON / being cast unchecked.
- Missing CLI positionals (`scene compile|dev|render|verify`, `asset analyze|verify`, `capsule inspect|verify`) fail at dispatch with a `usage: czap …` line instead of forwarding `''` downstream; `-o` without a value is rejected likewise.
- `czap gauntlet` refuses to run outside the LiteShip workspace (one-line receipt) instead of executing a stranger's same-named `gauntlet:full` script; the `isLiteShipWorkspace` guard moved to a shared `lib/workspace` module.
- `scene render` receipts now echo `width`/`height` (the 1280x720 engine default) and `fps` (from the scene contract), making the render defaults observable; `scene.render` outputSchema gains optional `fps`.
- CLI stderr error envelopes gain an optional `hint` field carrying the literal next command to type (the doctor-check convention, generalized via `emitError(command, message, hint?)`).
- `czap mcp` without `@czap/mcp-server` installed now emits the structured error envelope with the literal install command (`pnpm add @czap/mcp-server@0.1.x`) instead of a raw `ERR_MODULE_NOT_FOUND` stack trace.
- Manifest-missing errors (`asset.analyze`, `asset.verify`, `scene.verify`) now name the resolved path that was looked at and teach both remedies — `pnpm run capsule:compile` in the LiteShip repo, or `CZAP_CAPSULE_MANIFEST` in a consumer project; new optional `CommandContext.manifestPath` capability (additive) feeds the path through the host context and CLI adapters.
- `scene.compile`/`scene.render` missing-export errors now name the module path and WHICH export is absent (sceneComposition capsule vs scene contract), pointing at `examples/scenes/intro.ts` and `czap glossary sceneComposition`; a contract without numeric `fps`/`duration` gets its own got-values error.
- `czap gauntlet` failures name the failing phase read from `benchmarks/gauntlet-phase-timings.json` (`gauntlet failed in phase <label> (exit N)`) with a `List phases: czap gauntlet --dry-run` hint; stale passing artifacts are ignored.
- **BREAKING** (`@czap/worker`): `SPSCRing` ring geometry (slotCount/slotSize) now lives in the SharedArrayBuffer control header — the control region grows from 8 to 16 bytes, moving the data-region offset and buffer `byteLength`. `attachProducer(buffer)` / `attachConsumer(buffer)` need only the buffer; explicitly re-supplied slotCount/slotSize are validated against the header and a mismatch throws instead of silently corrupting data.
- **BREAKING** (`@czap/scene`): `AudioTrack.mix.volume` is documented as linear gain and the default changed from `0` (silent) to `1` (unity) in `Track.audio` and the compiled `Volume` component — scenes omitting `mix` are now audible by default; `PassThroughMixer` receipts for such scenes report `volume: 1`.
- `@czap/scene`: `SceneContract.duration`, `.invariants`, `.budgets`, and `.site` are now optional with documented defaults normalized at the top of `compileScene` (`duration` derives from resolved track extents, `invariants` `[]`, `budgets` `{ p95FrameMs: 1000 / fps }`, `site` `['node','browser']`); `ResolvedSceneContract` keeps them required so invariant checks stay total.
- **BREAKING** (`@czap/scene`): `compileScene` now validates structure after beat-mark resolution — non-positive/non-finite `fps`, reversed ranges (`from > to`), and transition `between` refs naming undeclared video tracks (with a did-you-mean suggestion) are collected together with declared-invariant violations into one `CzapValidationError`; previously-compiling broken scenes now throw. A track extending past an *explicitly declared* `duration` emits a `track-past-duration` Diagnostics warning instead of failing (truncation stays legal; derived durations never warn).
- `@czap/worker`: `SPSCRing.createPair` preflights cross-origin isolation — a non-isolated page now throws a teaching error naming the exact COOP/COEP headers (and that `@czap/astro` sets them) instead of the browser's bare `ReferenceError`/`TypeError`.
- `@czap/worker`: SPSC `push`/`pop` role errors name which side the handle is and the literal `SPSCRing.attachProducer(buffer)` / `attachConsumer(buffer)` call to make; slot-size mismatches teach scratch-array reuse with the exact `new Float64Array(n)` to allocate once.
- `@czap/worker`: the worker error envelope (`ErrorMessage`) gains an optional `context` field carrying the inbound message type being handled; the host's `worker-message-error` diagnostic names it plus the most common cause (thresholds[i]/states[i] misalignment), and `worker-unhandled-error` teaches the dominant `worker-src blob:` CSP fix.
- `@czap/scene`: `SceneRuntime` tick-after-release explains that `release()` closed the world's scope and to call `SceneRuntime.build(compiledScene)` again; `resolveBeatProjectionToSceneBeats` names where the sample rate comes from (decoded asset, typically 44100/48000) with the literal call to make; `SyncSystem` warns once (`worldless-degrade`) when executed without a world instead of silently writing zero intensity.
- `@czap/mcp-server`: `tools/call` treats an omitted `arguments` as `{}` (MCP-spec conformance), matching `prompts/get` and `ui/call-tool`; `McpToolCall.arguments` is now optional.
- `liteship`: README install snippets name the `effect@beta` peer dependency so the first install cannot fail the peer check; `LITESHIP_PACKAGES` docblock names its intended consumer (audit/doctor/release tooling — app authors never need it).
- `@czap/command`: unknown-command dispatch failures now carry a `hint` (pointing at `tools/list` and `liteship://registry/commands`) and a `didYouMean` nearest-match suggestion.
- **BREAKING** `@czap/command`: the dispatcher's `no_registry_handler` error code is renamed `cli_only_command`, with a hint to run the command as `czap <name>` instead of calling it over MCP.
- `@czap/mcp-server`: `prompts/get` failures enumerate the available prompts, point unknown commands at the `liteship://registry/commands` resource, and distinguish CLI-owned tools (run `czap <tool>`) from names outside the catalog.
- `@czap/mcp-server`: `resources/read` `-32002` responses carry `data.hint` pointing at `resources/list` (error code unchanged).
### Fixed
- `@czap/mcp-server`: an invalid `--http` bind (e.g. `localhost`) now fails with a teaching error enumerating the accepted shapes (`:PORT`, `PORT`, `HOST:PORT`, port 0-65535) instead of leaking Node's raw `ERR_SOCKET_BAD_PORT`.
- `TransitionConfig.duration`/`delay` accept plain `number` alongside branded `Millis` — `{ duration: 300 }` needs no `Millis` import (@czap/quantizer).
- **BREAKING**: `AnimatedQuantizer.make` derives interpolation outputs from a wrapped `LiveQuantizer`'s `config.outputs.css` when the third argument is omitted (finite-numeric strings coerce via `Number()` so they lerp; other strings snap at 50%); callers that omitted `outputs` previously animated to empty records and now receive derived values. Explicit `outputs` still override (@czap/quantizer).
- Dispatch `ARIAStates.currentState` is optional, defaulting to the boundary's first state — the same derive-from-boundary move as satelliteAttrs (@czap/compiler).
- `AIParamSchema.required` is optional, defaulting to `false` per JSON Schema convention (@czap/compiler).
- `compileMcpAppManifest` collection inputs (`resources`, `uiResources`, `appResources`, `prompts`) are optional and default to `[]` (@czap/compiler).
- `Q.from` throws `CzapValidationError` listing valid tiers on an unknown `MotionTier` instead of failing open and disabling gating entirely (fail-open allowed ALL targets, including ai/wgsl); only previously-invalid input is affected (@czap/quantizer).
- `Boundary.make`'s strictly-ascending error appends a copy-pasteable reorder of the user's own `at:` pairs (@czap/core).
- `invalid-aria-key` diagnostic now names the state the bad attribute came from and the literal replacement to type (diagnostic code unchanged) (@czap/compiler).
- `@czap/detect`: the WebGL renderer probe is now memoized for the session (the GPU cannot change while the page lives) and releases its throwaway context via `WEBGL_lose_context.loseContext()` after every probe, so calling `detect()` freely no longer leaks toward the browser's live-context cap.
- `@czap/detect`: `watchCapabilities` now debounces event bursts to one re-detection per animation frame and reuses the hardware-identity probes (GPU renderer, WebGPU, cores, memory) across updates — resize storms no longer allocate fresh WebGL contexts or run full sweeps per event. Same signature, same scoped-cleanup contract.
- `@czap/detect`: docs now lead with the auto-wired path — the `@czap/astro` boundary runs detection and publishes `window.__CZAP_DETECT__`, so you usually never call `detect()` yourself; `Effect.runSync` is demoted to an advanced section, and the standalone `*FromCapabilities` tier helpers are docblock-tagged as advanced derive-helpers with `detect()` as the single entry.
- `@czap/detect`: a probe that errored is no longer indistinguishable from one that was unavailable — `detect()` emits one grouped `Diagnostics.warnOnce` (`czap/detect` / `probes-defaulted`) naming each defaulted probe, why (API unavailable vs threw + the error), and the resulting confidence. Non-browser environments stay silent: all-default SSR sweeps are the documented isomorphic contract.
- `@czap/detect`: an unrecognized GPU renderer string (e.g. next year's GPU) no longer classifies to tier 1 silently — `Diagnostics.warnOnce` (`unrecognized-gpu-renderer`) names the renderer string, the tier-1 default, and points at the issue tracker so new patterns get filed.
- `@czap/remotion`: the silent degraded paths now teach. `stateAtFrame` warns once on 0 frames (`no-frames`: did `precomputeFrames` run/get awaited before render?) and once on frame overflow (`frame-overflow`: the video will freeze on the last state; probable cause is `fps`/`durationMs` drifting from `durationInFrames`, with the literal fix and a pointer at `rendererFromRemotionConfig()`; the offending frame index travels in `detail` so the warn-once dedup key stays frame-independent). `useCzapState` warns once (`no-provider-frames`) naming the missing `<Provider frames={...}>` and the `precomputeFrames` step. All total-function return values are unchanged.
- `@czap/remotion`: the `remotionAdapterCapsule` invariant message now states the `frames[i].frame === i` contract, the likely causes (frames filtered, re-sorted, or concatenated after `precomputeFrames`), and the fix, instead of 'frames must arrive in order with contiguous indices'.
- README quick start and GETTING-STARTED.md restructured around the consumer path: `pnpm add @czap/core @czap/astro effect@beta` in your own Astro project, then the two layer-1 concepts (`Boundary.make` + `satelliteAttrs`) to a working resize demo; monorepo clone/build/test moved behind CONTRIBUTING.md, with tokens/styles/CSS casting layered behind links (#234, #235)
- Removed residual `as const` from `Boundary.make` and `Theme.make` docblock examples — both factories declare const-modified type parameters, so inference is exact without it (#236)
- Docs now state `hysteresis` is optional with default `0` (no dead-zone) at first use in README and GETTING-STARTED instead of only in troubleshooting (#238)
- `Boundary.make` validation errors now carry the literal next step: the strictly-ascending error appends a sort-lowest-first example (`at: [[0, 'mobile'], [768, 'tablet']]`), and the duplicate-state error names the colliding thresholds, gives a rename example, and inlines the hoist-to-module-scope hint previously found only in GETTING-STARTED prose (#243, #244)
- **BREAKING** `Token.make` now validates that every `values` key has exactly one `:`-separated segment per declared axis — previously-accepted malformed compound keys (including axis values containing the reserved `:` separator) now throw `CzapValidationError`.
- **BREAKING** `Signal.audio(bridge, 'normalized')` without a positive `totalDurationSec` now throws `CzapValidationError` instead of silently returning raw sample indices.
- **BREAKING** One validation taxonomy: `AVBridge.make`, `Easing.spring`/`springNaturalDuration`, `FrameBudget.make`, and `DirtyFlags.make` now throw `CzapValidationError` instead of `RangeError` — consumers branching on `instanceof RangeError` stop matching (use `isValidationError`). Message texts are preserved as `module: detail`.
### Fixed

- examples/tutorial — `05-llm.astro` failed `astro build` outright: its
  code samples were littered with mangled brace escapes (`{'{'}&br;` —
  `&br;` is not an HTML entity) and one unescaped `{` opened a bogus
  Astro expression mid-sample. The code blocks now use `is:raw` so
  braces render literally. A new integration gate
  (`tests/integration/examples-build.test.ts`) builds every example
  that declares a `build` script — nothing in CI had ever built the
  examples, which is how a tutorial page that could not build shipped.
- Cloudflare boundary-cache truth repairs: the middleware docblock and
  docs taught `boundaryId: 'sha256:…'` — the wrong identity family
  (ADR-0003 mints `fnv1a:xxxxxxxx`) with no sanctioned way to obtain a
  real id. Docs/README/example now derive ids from the build manifest,
  and the integration test mints a real address instead of casting a
  fabricated one (`as never`).
- examples (default / showcase / tutorial) — the `@token` blocks now use
  the documented named-block grammar (the previous anonymous-manifest,
  inline-declaration, and dependency-map dialects parsed to zero
  declarations); the tutorial's fabricated "tree-shaking" claim is gone.
  The `@quantize` blocks use the now-working nested-selector form, each
  example's `astro.config.ts` points `dirs` at its convention
  directories so every referenced primitive resolves, and
  `examples/default` drives both the satellite runtime and the compiled
  `@container` CSS from the same shared `layout` boundary export.
- `@czap/scene` — `compileScene` now evaluates `SceneContract.invariants`
  and throws `CzapValidationError` on violation, as the `SceneInvariant`
  docblock always documented. Every declared check runs against the
  contract before compilation; a check that returns `false` or throws is
  a violation, and ALL violations are reported in one error carrying each
  invariant's name and message. Previously the required `invariants`
  field was declaration-only — never read.
- docs(compiler/quantizer) — all 16 `Boundary.make` docblock examples
  (CSS/GLSL/WGSL/ARIA compilers, `dispatch`, `evaluate`, `Q.from`,
  `AnimatedQuantizer`) used the dead pre-rename
  `states: [...] as const, thresholds: [...]` form; rewritten to the real
  `at: [[0, 'sm'], [768, 'lg']]` API. Every example now typechecks as
  pasted. No runtime behavior changed.
- docs(quantizer) — `AnimatedQuantizer` examples used a `'*->*'` transition
  key that never matched (the supported any-to-any wildcard is `'*'`) and
  bare-number durations that fail the `Millis` brand; anyone who copied the
  example silently got duration-0 (instant) transitions. The tier → targets
  table now lives on `QuantizerFromOptions.tier` instead of three pointers
  to `TIER_TARGETS` in `@czap/quantizer/testing`. No runtime behavior
  changed.
- docs(detect) — `detect()` `@example` taught a pre-rename tier vocabulary
  (`'low'/'mid'/'high'`, `'basic'`); actual unions are `CapLevel`
  (`'static' | 'styled' | 'reactive' | 'animated' | 'gpu'`) and `DesignTier`
  (`'minimal' | 'standard' | 'enhanced' | 'rich'`). No runtime or type
  changes.
- `@czap/audit` — allowlist entries are **package-relative**
  (`{ package: '@czap/astro', filePrefix: 'src/...' }`) and resolve through
  the profile's discovered package roots. A clean consumer install
  (`czap audit --consumer`) previously surfaced 24 warnings — Astro-mandated
  directive default exports, the policy file's own placeholder strings, the
  documented fail-closed fallbacks — because the entries matched repo-relative
  `packages/...` prefixes that can never match a `node_modules` path. Consumer
  runs now classify them suppressed-with-reason, same as the monorepo
  (0.1.5 re-dogfood report, findings 1–3).
- `liteship` README documents pnpm's strict `node_modules`: the umbrella
  does not make transitive `@czap/*` imports resolvable under pnpm — keep
  explicit scoped deps or hoist the scope (0.1.5 re-dogfood report).
- `@czap/vite` / `@czap/astro` — the module docblock examples showed a
  `themes: string[]` plugin option that never existed; themes are
  discovered by convention (`themes.ts` / `*.themes.ts`, override the
  directory via `dirs.theme` on `PluginConfig`). The examples now use the
  real config fields.
- `@czap/vite` — "Could not resolve token/theme/style/boundary" warnings
  now list the exact convention modules that were searched (in search
  order) and the literal fix: the `Token.make`-style factory export to
  add, or the `dirs` override to point elsewhere.
- `@czap/worker` — the threshold contract was documented two contradictory
  ways: `Messages` docs said `thresholds.length = states.length - 1` while
  the evaluators implement the canonical quantizer contract
  (`thresholds[i]` is the lower bound of `states[i]`,
  `thresholds.length === states.length`). Following the old doc, the
  flagship `CompositorWorker` example (`states: ['dim','bright'],
  thresholds: [0.5]`) made `'bright'` unreachable. Docs and example now
  match the implementation (`thresholds: [0, 0.5]`).
- `@czap/web` — SSE/Resumption seam is documented: the SSE client handles
  transport-level reconnect only (backoff + `lastEventId` cursor) and
  gap recovery is host-wired via the `Resumption` namespace; `SSE.create`
  carries a composed example mirroring the Astro reference wiring. The two
  `Resumption.saveState` docblock examples omitted the required
  `timestamp` field and did not typecheck — fixed. The composed recipe is
  now guarded by a component test
  (`tests/component/sse-resumption-composition.test.ts`) that runs all
  three steps — seed from `loadState`, persist per message, `resume` after
  reconnect — against mock EventSource/sessionStorage/fetch.
- docs(api) — the typedoc `externalSymbolLinkMappings` placeholders are
  real URLs: re-exported `@czap/*` symbols (`Millis`, `CapLevel`, `CapSet`,
  `Quantizer`, the `*.Shape` namespaces, `ExtendedDeviceCapabilities`,
  `KVNamespace`, …) link to their GitHub docs/api pages, module-internal
  constants link to their source files, and `effect` symbols link to the
  Effect docs. `docs/api` previously contained 160 dead `[X](#)` links;
  now zero.

## [0.1.5] — 2026-06-10

Fixes and features upstreamed from a deep dogfood of the published `0.1.4`
artifacts on a zero-React Astro 6 site, plus the new `liteship` umbrella
package. All **19** packages (18 `@czap/*` + `liteship`) ship at `0.1.5`.

### Added

- `liteship` — the umbrella package: one `npm install liteship` brings every
  publishable `@czap/*` package into node_modules. Deliberately re-exports
  nothing (host integrations carry host-specific peer expectations); imports
  stay on the individual `@czap/*` scopes.
- `@czap/astro` — directive boot scanner: `data-czap-directive` markers (and
  legacy literal `client:*` attributes on plain elements) now activate on
  plain HTML and `Satellite.astro` output. Astro only fires custom `client:*`
  directives on framework islands, so every documented plain-element wiring
  was silently inert. `satelliteAttrs()` emits the marker automatically when
  a boundary is present (`directive: false` opts out).
- `@czap/astro` — `scroll.x` / `scroll.y` / `scroll.progress` signals with a
  rAF-throttled passive observer (`attachSignalObserver`; the viewport-only
  `attachViewportObserver` remains as a deprecated alias).
- `@czap/astro` — `workers.coep` integration/middleware option
  (`'require-corp' | 'credentialless'`); COOP/COEP are now set only when
  absent, so consumer middleware can override them in either `sequence()` order.
- `@czap/audit` — consumer mode: `czap audit --consumer` /
  `consumerDevopsProfile(cwd)` audit the `@czap/*` packages installed in a
  downstream repo's node_modules (publish-integrity gate). New
  `DevopsProfile.packageRoots` seam; discovery walks node_modules (pnpm
  virtual store included).
- `@czap/cli` — `czap audit --findings` includes the findings array in the
  JSON receipt and per-finding lines in `--pretty` stderr output.

### Fixed

- `@czap/quantizer` — config/output cache identity now includes `tier`,
  `spring`, and `force()` targets; previously the first config minted for a
  boundary+outputs pair was served for every later variant, so e.g. a
  `tier: 'physics'` quantizer created after a `tier: 'transitions'` one never
  emitted glsl outputs. **Note:** `QuantizerConfig.id` values change.
- Examples/tutorial pages with broken or missing boundary payloads
  (`examples/default`, `examples/cloudflare-astro`, `examples/showcase`
  worker page, tutorial live demo) now serialize real boundaries via
  `satelliteAttrs()`.

### Changed

- `@czap/audit` — `surfacePolicy.astroRuntimeFiles` entries are now
  astro-package-relative (e.g. `'src/runtime/boundary.ts'`); entries starting
  with `packages/` keep resolving repo-root-relative for back-compat. New
  optional `surfacePolicy.vitePackage` / `viteVirtualModulesFile` fields
  replace the hardcoded `packages/vite` path (legacy fallback retained).
- Docs: signal list now distinguishes built-in observers from quantizer-fed
  signals (`network.effectiveType` moved to tier detection); Astro docs show
  `<Satellite boundary={...}>` without `client:satellite`.

## [0.1.4] — 2026-06-08

Cloudflare Workers first-class support. All **18** `@czap/*` packages ship at `0.1.4`
(including first npm publish of `@czap/cloudflare`, `@czap/audit`, and `@czap/command`).

### Added

- `@czap/cloudflare` — Workers siteAdapter, KV edge cache, and Astro middleware glue.
- `czap doctor --target cloudflare` — probes Astro, Wrangler, adapter output, and config bindings.
- `examples/cloudflare-astro/` — end-to-end Astro + Cloudflare adapter example.
- `pnpm run test:cloudflare` gauntlet phase; Windows and macOS CI smoke run it.
- Hosting guide: `HOSTING.md`.

### Fixed

- `prepare` hook (`link-pre-commit.ts`) no longer imports built `@czap/command` before `tsc --build`.
- CI: build workspace before `gauntlet:full`; git identity for `doctor --ci` on GHA runners.
- Windows `package:smoke`: copy hoisted deps beside tar-extracted `@czap/*` (junction ENOENT on GHA).
- TypeDoc link mappings for `@czap/edge` / `@czap/mcp-server`; browser coverage excludes Workers-only sources.
- Prettier drift in `doctor.ts` and `cloudflare-adapter.ts`; `.wrangler/` gitignored.

## [0.1.3] — 2026-05-21

CI greening release — no intentional public API changes beyond what shipped in 0.1.2.

### Fixed

- `package:smoke` audits `workspace:` leakage from packed tarballs (`tar -xOf`) instead of
  `node_modules` layout, so Windows CI no longer depends on pnpm hoisting shape.
- Windows `package:smoke`: `--ignore-workspace` consumer install, hoisted linker, junction links
  beside tar-extracted `@czap/*` so `mediabunny`/`cborg` resolve for import-smoke.
- `czap` bin shim (`packages/cli/bin/czap.mjs`): load `dist/` via `file://` URL on Windows ESM.
- `animation.test.ts` waits for scheduler callback registration before driving frames,
  eliminating 10s Vitest timeouts on loaded Linux runners.

## [0.1.2] — 2026-05-21

Dev-experience layer plus CI publishability fixes. All **15** `@czap/*` packages ship at `0.1.2`.

### Added

- `czap doctor` — preflight rig-check with JSON receipt; `--fix` for cheap repairs, `--ci` to fail on warnings.
- `czap glossary [term]` — ontology lookup for LiteShip / CZAP prose register.
- `czap help`, `czap completion <shell>`, `czap version`.
- Root scripts: `pnpm shakedown` (first-run aggregate), `pnpm run doctor`, `pnpm scripts`, `pnpm run glossary`, `pnpm run fix`, `pnpm run dev`, `pnpm run clean`.
- `postinstall` welcome + pointer to shakedown.

### Changed

- **Breaking (scripts only):** `pnpm setup` renamed to `pnpm shakedown` to avoid collision with pnpm's built-in `setup` command.

### Fixed

- `package:smoke` on Windows CI: avoid `%TEMP%` 8.3 paths (`RUNNER~1` → `RUNNER%7E1`) when building `file://` tarball URLs for the consumer fixture.
- `docs/api/` regenerated so `docs:check` matches current TSDoc output after CLI surface growth.

## [0.1.1] — 2026-05-13 (release-automation patch)

First release through the GitHub Actions release pipeline. No runtime
API changes — this version exists to exercise the release-automation
substrate end-to-end on a real publish before any code change rides it.

### Release infrastructure

- `.github/workflows/release.yml` cuts releases on `v*.*.*` tag push.
  Runs the full gauntlet for release certification, then loops
  `czap ship --filter @czap/<pkg>` over all 15 packages, then creates
  the GitHub Release and attaches the ShipCapsules. v0.1.1 authenticates
  via `NPM_TOKEN` secret (granular access token with `bypass_2fa: true`)
  while trusted-publisher OIDC setup is pending; v0.2 pivots to OIDC
  once each package has its trusted-publisher configured at
  `https://www.npmjs.com/package/@czap/<name>/access`.
- `czap ship --provenance` flag added (passthrough to `pnpm publish
--provenance`); reserved for the v0.2 OIDC pivot.

### Documentation

- `RELEASING.md` documents the v0.1.1+ release-cutting flow
  (`git tag -a vX.Y.Z` → workflow auto-fires) and the per-package
  trusted-publisher form values for the eventual OIDC pivot.

## [0.1.0] — 2026-05-07 (initial public release)

First public release on npm and GitHub. Pre-release entries below this section
chronicle internal development milestones from before the framework went public;
all **15** `@czap/*` packages (including type-only `@czap/_spine`) land on npm at
`0.1.0` regardless of their internal history.

### Public-API surface

- Test-only helpers moved off main entries to dedicated `/testing` sub-paths.
  Consumers must now `import { resetCapsuleCatalog } from '@czap/core/testing'`,
  `import { resetAssetRegistry } from '@czap/assets/testing'`, and
  `import { TIER_TARGETS, MemoCache } from '@czap/quantizer/testing'` — these
  functions mutate global registry state and don't belong in production code.
- `Harness` namespace removed from `@czap/core` main entry. Use
  `import * as Harness from '@czap/core/harness'` to get the code-generation
  template surface (fast-check + generators) without bundling it into every
  consumer.
- `startDevServer` moved from `@czap/scene` to `@czap/scene/dev`. The dev
  server pulls `node:os` / `node:crypto` / `vite-server` and would crash
  bundlers targeting browsers / Workers / Deno at parse time if shipped on
  the main entry.
- `@czap/_spine` is now publishable — required so consumers' `tsc` can
  resolve the type spine that `@czap/core` and `@czap/scene` reference in
  their `.d.ts` output.
- Removed orphan re-exports: `SchemaError`/`isSchemaError` from `@czap/core`
  (no in-repo consumers; import from `effect/Schema` directly), `KIND_META`
  from `@czap/vite` (internal lookup table that powers `resolvePrimitive`).

### Package metadata

- All 15 packages now have `keywords`, full `repository`/`bugs`/`homepage`
  fields, `sideEffects: false` (or a precise array for `@czap/web`'s
  capture init), and `license: MIT`.
- `effect` peer-dep ranges relaxed from exact `4.0.0-beta.32` pin to
  `>=4.0.0-beta.0` across `@czap/scene`, `@czap/assets`, `@czap/cli`.
- `effect` removed from `dependencies` in `@czap/core`, `@czap/quantizer`,
  `@czap/detect`, `@czap/web` (was double-listed; consumers no longer pay
  double bundle weight).

### Documentation

- README restructured for OSS first impressions: hook → quick start →
  package table → docs index. Internal hygiene (operational telemetry,
  PowerShell mojibake note) moved to appendix.
- New: [CONTRIBUTING.md](./CONTRIBUTING.md), [SECURITY.md](./SECURITY.md),
  [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md),
  [GETTING-STARTED.md](./GETTING-STARTED.md).
- `docs/api/` (TypeDoc output) regenerated to reflect the post-cleanup
  public surface.

### Hygiene

- Removed ~700KB of internal AI-session plans and Six Sigma debug threads
  from `docs/superpowers/` and `docs/sixsigma/` — kept locally as private
  notes via `.gitignore`.
- Removed root-level scratch files (`PLAN.md`, `QA-AUDIT.md`).
- Untracked stale build artifacts (`scripts/test-*.{js,d.ts}`,
  `tests/integration/astro/.astro/*.d.ts`, `.claude/settings.local.json`,
  `czap.code-workspace`).
- Sanitized hardcoded Windows `C:\Users\<username>\…` paths from `AGENTS.md`
  and the spawn-quoting test fixture.

---

> **Pre-public internal milestones (2026-03 → 2026-04).** The `0.2.0`–`0.4.0`
> headings below are the early in-repo numbering line. It was **reset** when the
> canonical public release restarted at `0.1.0` on 2026-05-07 (top of file), so
> these do **not** correspond to published npm versions and are kept only for
> provenance. The public `0.2.0` is the substrate cut dated 2026-06-14 at the top.

## [0.4.0] — 2026-04-05 (internal milestone; superseded by public 0.1.0 on 2026-05-07)

### Core

- MotionTier canonical definition moved to @czap/core (was duplicated in detect, quantizer, core)
- Deprecated standalone exports removed: `evaluateBoundary`, `evaluateWithHysteresis` (use `Boundary.evaluate`, `Boundary.evaluateWithHysteresis`)
- New centralized constants: THEME_TRANSITION_DURATION_MS, THEME_TRANSITION_EASING, CANVAS_FALLBACK_WIDTH, CANVAS_FALLBACK_HEIGHT
- MS_PER_SEC used consistently (replaced raw `1000` literals in frame-budget, compositor-worker)
- BoundarySpec.isActive documented as Phase 2 (implemented, not yet wired into Compositor)

### Compiler

- ARIA compiler emits Diagnostics.warn on dropped invalid keys (was silent)
- Theme CSS compiler uses centralized transition constants from defaults.ts

### Quantizer

- TIER_TARGETS and MemoCache moved to `@czap/quantizer/testing` (not main export)
- MotionTier re-exported from @czap/core

### Web

- SlotRegistry uses SlotAddressing.isValid() for path validation with Diagnostics.warn

### Astro

- Fixed czap:dispose resource leak: now dispatched before czap:reinit on page swap
- SSE reconnect config imports from @czap/core defaults (was hardcoded duplicate)
- Canvas fallback dimensions use centralized constants
- Added "types" field to all 6 client-directive package.json exports

### Edge

- Added effect peer dependency

### Type Contracts (\_spine)

- Removed deprecated type aliases from all 5 spine files
- Added MotionTier, SpringConfig, TIER_TARGETS, QuantizerFromOptions to quantizer spine

## [0.3.0] — 2026-03-16 (internal milestone; superseded by public 0.1.0 on 2026-05-07)

### Core

- FrameCapture: capture abstraction (init/capture/finalize lifecycle)
- CaptureConfig, CaptureFrame, CaptureResult types

### Web

- WebCodecs capture: browser-native H.264 encoding to MP4
- renderToCanvas: CompositeState → OffscreenCanvas
- captureVideo: end-to-end pipeline (VideoRenderer → FrameCapture → CaptureResult)

### Remotion

- @czap/remotion package: React adapter for Remotion video rendering
- useCompositeState: frame-indexed state hook
- cssVarsFromState: CompositeState → CSS custom properties
- Provider + useCzapState: React context for frame data (shipped under these names; an early draft called them FxProvider + useFxState)
- precomputeFrames: async frame precomputation

### Benchmarks

- tinybench harness: core, compiler, video benchmarks
- `bun run bench` script

## [0.2.0] — 2026-03-16 (internal milestone; superseded by public 0.1.0 on 2026-05-07)

### Core

- FrameScheduler: clock abstraction (rAF, noop, fixed-step)
- Timeline: accepts optional scheduler for deterministic playback
- animate(): accepts optional scheduler for deterministic animation streams
- Signal: implemented scheduled mode for externally-controlled time
- createControllableSignal: seekable signal for video rendering
- VideoRenderer: fixed-step frame generator with CompositeState per frame

### Documentation

- ARCHITECTURE.md: full system overview
- CHANGELOG.md: version history
- README.md: installation, quick start, package table

## [0.0.1] — 2026-03-16 (internal milestone; superseded by public 0.1.0 on 2026-05-07)

This section records the first in-repo development snapshot. It used a `0.1.0`
style heading historically; the **canonical public** `0.1.0` release is dated
**2026-05-07** at the top of this file.

### Core

- BoundaryDef, evaluateBoundary, evaluateWithHysteresis
- Signal, Cell, Derived, FxEvent, Store, FxStream, FxTask
- Timeline (play/pause/seek/scrub/reverse)
- Compositor (multi-quantizer state merge → css/glsl/aria channels)
- BlendTree (weight-based numeric interpolation)
- FrameBudget, DirtyFlags
- ECS (Entity/Component/System/World)
- HLC, VectorClock, Receipt chain, DAG
- Plan IR (step/edge/validation/topological sort)
- Schema codec (Effect Schema)
- LiveCell (protocol envelope + reactive bridge)
- CapSet lattice (static/styled/reactive/animated/gpu)
- TypedRef (content addressing via SHA-256)
- Easing: linear, cubic, expo, back, elastic, bounce, cubicBezier, spring
- springToLinearCSS, springNaturalDuration (CSS linear() from spring physics)

### Design Layer

- TokenDef: multi-axis design tokens with category/axes/values/fallback
- StyleDef: boundary-aware style layers with pseudo/shadow/transition
- ThemeDef: variant-keyed token value maps with light/dark mode metadata
- ComponentDef: satellite shell binding boundary + styles + named slots
- TokenRef brand type

### Compiler

- CSSCompiler: BoundaryDef → @container queries
- GLSLCompiler: BoundaryDef → uniform declarations + bind code
- WGSLCompiler: BoundaryDef → struct definitions + bindings
- ARIACompiler: BoundaryDef → accessibility attribute maps
- AIManifestCompiler: AI tool definitions + JSON schema + system prompts
- TokenCSSCompiler: @property + :root + html[data-theme] overrides
- TokenTailwindCompiler: Tailwind v4 @theme {} blocks
- TokenJSCompiler: const exports + .d.ts type declarations
- ThemeCSSCompiler: html[data-theme] selectors + transition declarations
- StyleCSSCompiler: @layer + @scope + @starting-style + @container delegation
- ComponentCSSCompiler: satellite container + slot marker styling
- generatePropertyRegistrations: @property from state value inference

### Detect

- 16 device capability probes (GPU, cores, memory, WebGPU, touch, reduced-motion, color-scheme, viewport, DPR, connection, contrast, forced-colors, reduced-transparency, dynamic-range, color-gamut, update-rate)
- tierFromCapabilities → CapLevel (single-axis)
- designTierFromCapabilities → DesignTier (2-axis: what to render)
- motionTierFromCapabilities → MotionTier (2-axis: how to move)

### Vite

- @quantize CSS block transform → @container queries
- @token CSS block transform → @property + custom properties
- @theme CSS block transform → html[data-theme] selectors
- @style CSS block transform → @layer + @scope
- Convention-based definition resolution (_.tokens.ts, _.themes.ts, etc.)
- Virtual modules (virtual:fx/tokens, virtual:fx/tokens.css, virtual:fx/boundaries, virtual:fx/themes)
- Vite 8 hotUpdate hook (migrated from deprecated handleHotUpdate)

### Astro

- Satellite.ts: server-side attribute generation for adaptive container divs
- client:satellite directive: client-side signal evaluation + state hydration
- View transition re-initialization (astro:after-swap)

### Type Spine (\_spine/)

- Complete .d.ts contracts for all packages
- design.d.ts: TokenDef, StyleDef, ThemeDef, ComponentDef, utility types
- compiler.d.ts § 7: DefKind, ExtendedCompilerTarget, result types
- detect.d.ts § 3: DesignTier, MotionTier, ExtendedDeviceCapabilities
