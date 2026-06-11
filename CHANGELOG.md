# Changelog

All notable changes to czap. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-1.0
break policy is intentionally aggressive — minor version bumps may carry breaking changes.

## [Unreleased]

Hardening follow-ups to the 0.1.5 dogfood wave: ROADMAP epics #1 (branch
hotspots) and #2 (advisory cleanup), the timeout-flake class seen during the
release, and the two deferred dogfood items. Plus the v0.2 release-trust
pivot (epic #4) — these notes ship as 0.2.0.

### Removed

- **BREAKING** `@czap/astro` — the deprecated `attachViewportObserver`
  alias is gone; use `attachSignalObserver` (handles `viewport.*` and
  `scroll.*`). It was never re-exported from `@czap/astro/runtime`'s
  index; both known consumer repos are grep-clean.

### Added

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

### Changed

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

### Fixed

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
  `timestamp` field and did not typecheck — fixed.

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
- Hosting guide: `docs/hosting/cloudflare.md`.

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

- `docs/RELEASING.md` documents the v0.1.1+ release-cutting flow
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
  [docs/GETTING-STARTED.md](./docs/GETTING-STARTED.md).
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

## [0.4.0] — 2026-04-05

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

## [0.3.0] — 2026-03-16

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
- FxProvider + useFxState: React context for frame data
- precomputeFrames: async frame precomputation

### Benchmarks

- tinybench harness: core, compiler, video benchmarks
- `bun run bench` script

## [0.2.0] — 2026-03-16

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
