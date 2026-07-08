# LiteShip roadmap

> Verified against the 2026-07-08 hardening wave (`v0.8.1` published). See `STATUS.md` for live counts, gate totals, coverage numbers, and current telemetry watch items.

## Current Phase

The pre-1.0 hardening arc closed through 0.6.0 (gates, fail-closed security defaults,
CI/release truth, the front-door cut). 0.7.0 and 0.8.0 were dogfood-driven keystone
waves: the client→server mutation channel, the form/mutation-binding primitive,
morph-opaque subtrees, Standard Schema interop, and the Cloudflare dev-path fix —
the five dashboard-blocking upstreams, all landed. **0.8.1** (2026-07-08) shipped test/bench/CI
hardening: parallel CI lane green, `check:gates` wired, honest benches, catalog-driven
coverage. **Epic 9** (authored motion + stream spine — `interpretTransition`,
`MotionCompiler`, `StateCell`, wire-contract registry, active-surface gate) is on `main`
(merged PR #135) but not versioned as 0.9.0.

The current phase is **0.9.0 keystone build + road-to-1.0 stabilization**: close the
31 open tracker issues to production quality (QUERY read-leg, motion primitives,
security/correctness, tooling), prove keystones downstream, then freeze what has earned it.

Active priorities:

1. **Phase B gap closure** — every open issue (#104–#136) to code + test/bench + gate-green;
   tracker reconciled with repo truth (no false-done, no phantom claims).
2. **0.9.0 keystone** — HTTP QUERY read-leg (#119) + DPU adopt-under (#120) per §7 below.
3. Downstream dogfood on 0.8.x — keystones are finished only when the consuming app stops
   producing structural product feedback, not when packages publish.
4. Keep runtime correctness and hotspot coverage moving (standing watch on
   `reports/runtime-seams.*`).
5. Keep security defaults fail-closed for HTML, URL, selector, style, and boundary-state surfaces.
6. CI truth: parallel lane proven green; serial `truth-linux` cutover pending after Phase B.
7. Stability ledger toward 1.0: `_spine` as the freeze ledger; freeze less than tempted.

## Already Promoted

These are no longer roadmap aspirations; they are current repo reality:

- versioned authored defs with `_version: 1`
- quantizer runtime branding via `_tag: 'Quantizer'`
- dedicated `test:redteam` regression lane
- same-origin-by-default runtime URL policy with explicit allowlist support
- artifact-id path-segment validation
- text-safe default LLM rendering
- shared HTML trust pipeline for stream and LLM rendering
- morph sanitization for dangerous HTML classes
- boundary-state lockdown to `--czap-*`, `aria-*`, and `role`
- package tarball smoke for publishable packages
- Linux truth CI plus Windows truth-preserving and browser-matrix lanes
- production middleware parity for worker-isolation headers
- live-runtime DocumentGraph (0.4.0): `loadGraphRuntime` + `castGraphDelta`, the scene→live bridge, the AI-apply seam, the `client:svg` last-mile, and headless `dualExportNode` — the cast/signal substrate is now plumbed onto the live runtime, not test-only
- the plumb-completeness gate (0.4.0): a package-plumb ledger + unwired-capsule floor as gauntlet phase `plumb:gate`, so a built-not-plumbed primitive fails CI instead of shipping green
- the front-door cut (0.6.0): the Layer-1 README with the "I want to…" router and the ≤3-package front-door budget gate, the examples ladder index, the `05-ai-patch-refused` keystone example, the four-layer DOCS preamble, and the `liteship` umbrella package
- the doc-05 keystone set (0.7.0–0.8.0): the client→server mutation channel + client/form-binding primitives, morph-opaque subtrees, Standard Schema interop on the node schema, and the Cloudflare adapter dev-path fix — all five dashboard-blocking upstreams shipped
- 0.8.1 test/bench/CI hardening (2026-07-08): parallel CI lane, `check:gates` in gauntlet, honest benches, catalog-driven coverage, WGSL honesty tests (#106/#107), active-surface gate blocking (#132), wire-contract single-source (#134)
- Epic 9 motion/stream spine on main (2026-07-07, PR #135): `interpretTransition`, `MotionCompiler`, `StateCell`, stream recovery, generated wire-contract registry — landed as commits, not a separate semver narrative

## Near-Term Hardening Epics

### 1. Runtime branch-hotspot sweep — watch state

The 2026-04-08 hotspot cluster and the 2026-06-08 top-10 table are both
cleared (see Completed below). The epic stays open only as a standing watch:
each gauntlet regenerates `reports/runtime-seams.*`, and any file that
surfaces there gets real behavior-branch tests, not synthetic padding.

### 2. Advisory audit cleanup — warning floor is zero

The pinned warning floor hit **zero** on 2026-06-10 (see Completed below);
any new advisory warning is a regression against `AUDIT_WARNING_FLOOR = []`.
Remaining advisory pressure is info-level strike-board pockets:

- shadow-test helpers (`tests/helpers/mock-*.ts`, `tests/support/`) with no
  production imports
- assertion-free `tests/generated/*` files
- `crates/czap-compute` traceability evidence

Success condition:
- info-level pressure trends down without hiding real diagnostics

### 3. CI and release truth parity

Keep enforcing the same source of truth everywhere:

- `gauntlet:full` remains the canonical sequential lane
- CI jobs stay semantically aligned with the gauntlet
- packaged tarballs stay installable and export-map-valid
- docs continue to point to live telemetry instead of hardcoded ledgers

Success condition:
- local truth, CI truth, and release/package truth stop drifting

### 4. v0.2 release-trust pivot

Code side landed 2026-06-10: the release workflow IS the OIDC pivot
(renamed `Release (OIDC trusted publishing)`; token steps deleted;
`czap ship --provenance` per package), ship emits `ShipSkippedReceipt`
for already-published versions so workflow re-runs need no shell
fallback, and the deprecated `attachViewportObserver` alias is removed
(superseded by `attachSignalObserver` in 0.1.5).

**Closed (verified during the 0.8.0 cut):** the npm-side trusted publishers are
configured and proven — the 0.6.0 and 0.7.0 releases (2026-07-03) both published
every package via OIDC with provenance and zero tokens, and the dead `NPM_TOKEN`
repo secret was deleted on 2026-07-04. Nothing remains in this epic.

### 5. Client→server channel (0.7.0) — deferred nits

The channel shipped hardened against its untrusted HTTP boundary: a CSRF content-type gate,
off-contract nested edge-field rejection, canonical-CapSet grants, and a full applied-graph adopt
guard (decode → reseal → id/digest → topology → uniqueness — the normalized form the server emits).
These smaller items were consciously NOT done in the 0.7.0 cut and are tracked here rather than lost.
Both are resolved in 0.8.0:

- **Resolved in 0.8.0 — Example `06-mutation-roundtrip` store contract** — show the compare-and-swap `expected` argument
  inline in the store snippet (review nit). Pure doc-comment polish; no behavior change.
- **Resolved in 0.8.0 — `spine-conformance` guard is non-comprehensive** — it pins only an explicit SUBSET of
  `@czap/_spine` types, which is why the `CapSet.levels` Set→array drift slipped past it (a review bot
  caught it, the gate did not). Make it cover every exported spine type, or auto-derive the
  bidirectional contract, so no future spine drift can hide behind a green gate.

Success condition:
- the doc nit is folded into the example, and the spine guard can no longer carry a blind spot.

### 6. 0.8.0 downstream dogfood — intake (2026-07-04)

Both dogfood consumers are live on 0.8.0 the day of the cut (clean bumps from
0.5.0, consumer audits at 0 errors / 0 warnings, prod verified headless). One
validation and three parked items, recorded here so they are not lost:

- **Validation — the loud-not-silent bet paid off downstream:** the 0.8.0
  compile-without-content-version diagnostic fired on the dashboard consumer's
  build and caught a real latent staleness hole in ITS config — its KV boundary
  cache was keyed by `boundaryId` alone, not the full compiled output, so a
  deploy changing container decls / clamp tracks / easings without touching the
  boundary would have served day-stale CSS silently. The consumer now hashes the
  full compiled output into a per-deploy prefix. The framework's own diagnostic
  found the bug; no engine change needed.
- **Upstream candidate — silently unfed shader uniform:** the WGSL runtime
  auto-feeds only the uniforms named literally `u_time` / `u_resolution`
  (`packages/astro/src/runtime/wgpu.ts:465-466`); a hand-authored shader
  declaring a bare `time` field compiles and renders with a silently frozen
  clock, because nothing feeds it. That is exactly the silent-degradation class
  this repo hunts: emit a loud diagnostic when a shader declares uniform struct
  fields the runtime will not feed.
- **Upstream candidate — `@property` initial-value override:**
  `CSSCompiler.generatePropertyRegistrations(states)`
  (`packages/compiler/src/css.ts:352`) always mints `initial-value` from the
  inferred syntax's zero (`0px` / `transparent` / `0deg`), with no per-property
  override — so a consumer whose true resting value is not the zero (a brand
  color, a non-zero radius) regex-patches the emitted CSS text, fragile glue
  over our output format. Fix shape: an additive
  `options?: { initialValues }` second parameter that validates each override
  parses under the inferred syntax (loud on mismatch), threaded through the
  second call site in the vite boundary manifest
  (`packages/vite/src/boundary-manifest.ts:495`).
- **Upstream candidate — `htmlAttributesMap` dropped one hop from home:**
  `@czap/edge` builds the spreadable map expressly for the Astro spread — its
  own docstring says `<html {...htmlAttributesMap}>`
  (`packages/edge/src/host-adapter.ts:213`) — but `czapMiddleware` copies six
  fields off the edge resolution into `locals.czap.edge` and drops exactly that
  one (`packages/astro/src/middleware.ts:140-147`); only the pre-joined
  `htmlAttributes` string survives, which cannot be spread. SSR shells rebuild
  the map by hand from `tiers` with hand-prefixed `data-czap-`, reintroducing
  the silent-axis-miss the map exists to prevent. One-field plumb:
  `CzapLocals['edge']` + the middleware copy + api-surface snapshot.
- **Rest of the consumer's upstream backlog, re-baselined against source:** a
  `computeShaderIntegrity` producer is a real thin gap (`@czap/web` ships
  parse / verify / classify / decide but no source→`sha256-…` producer; the
  digest kernel already lives inside `verifyShaderIntegrity`); a
  Boundary→DocumentGraph node helper is real and corroborated in-repo — our own
  `tests/helpers/graph-fixtures.ts` carries the same `as unknown as SignalNode`
  cast it self-describes as deliberately fragile glue — though (verified) the
  fixture *does* call the public `sealNode`/`sealGraph`; the cast bridges a raw
  literal lacking the computed `id`/`digest` into a sealable node. So the real
  gap is a from-parts node builder that computes `id`/`digest` for you, not
  "no constructors" — `sealNode` seals a pre-formed node, it doesn't build one
  from fields; a tier-aware
  reveal/stagger primitive and a Save-Data/DPR responsive-image primitive are
  net-new surface whose ingredients exist (Client Hints already parse
  `Save-Data`; tiers ride `locals.czap`) but which sit on the
  primitive-vs-UI-kit thesis line — owner design fork, not intake nods.
- **Correction to the 0.6.0 findings batch (finding #6, COEP):** the original
  "COEP is not overridable" framing is inverted (memory flagged it, source
  confirms). COEP *is* consumer-overridable — it lives in
  `CONSUMER_OVERRIDABLE_HEADERS` (`packages/astro/src/headers.ts:48-51,111`),
  set-only-when-absent, with an `options.coep` selector. What is *not* possible
  is *disabling* COEP while workers are enabled — cross-origin isolation is
  required for SharedArrayBuffer, so that floor is intentional. The only real
  gap is a first-party escape for the workers-off isolation case; neither
  dogfood site is bitten (both want `crossOriginIsolated`). Parked, not forgotten.
- **Owner eyeball task:** the WGSL render path needs a real WebGPU device
  (headless has no `navigator.gpu`): open
  `https://heyoub.dev/?cast=wgsl&gl=force` and confirm the orbs animate and stay
  round. The GLSL default path is already verified live.

Second batch (2026-07-05, production site live on 0.8.0 — scroll-choreography
work; every claim below re-verified against source before recording):

- **Validation — the satellite/SSR resolution chain works as designed:** the
  site fixed a mobile hero-fade bug by keying its tuck animation off the
  boundary's `data-czap-state` attribute and switching SSR to the
  request-aware `resolveInitialState` (UA + Client Hints + edge tier) — regime
  detection and server-side state resolution doing their designed jobs in
  production. Also a live confirmation of the parked height-axis trap:
  height-axis viewport boundaries impose `:root` size containment
  (`packages/vite/src/css-quantize.ts:515-525`) that clamps page wrappers, so
  the site's card-deck pinning had to route around `viewport.height` entirely.
- **Upstream candidate — `CzapLocals.tiers` erases the tier unions:**
  `packages/astro/src/middleware.ts:39` types tiers as
  `Readonly<Record<CapAxis, string>>`, discarding `CapTier`
  (`packages/core/src/caps.ts:13`), `MotionTier` (re-exported from `@czap/core`),
  and `DesignTier` (`packages/detect/src/tiers.ts:71`) — consumers switch on
  tier values with zero exhaustiveness or typo protection. A `Record` cannot
  express per-axis value types; the fix is the keyed struct
  `{ tier: CapTier; motion: MotionTier; design: DesignTier }`.
- **Upstream candidate + docs bug — raw `Request` silently degrades to a
  synthetic 960px:** `ASTRO-RUNTIME-MODEL.md`'s quickstart passes
  `context.request` to `resolveInitialState`; `ServerIslandContext` is
  all-optional (`packages/astro/src/quantize.ts:22-29`) so a `Request`
  type-checks structurally, every field reads `undefined`, and resolution
  falls through to `syntheticValueFromCapTier('reactive')` = 960
  (`quantize.ts:150-156`) — silently. **Snippet fixed 2026-07-06** — the
  `ASTRO-RUNTIME-MODEL.md` quickstart now builds the context from request
  headers (`Object.fromEntries(context.request.headers)`) and names the trap.
  Remaining build task: make the wrong way loud or unrepresentable in the API
  itself (detect a Request-shaped argument and warn, or require at least one
  context field) so the footgun can't recur.
- **Upstream candidate — `@quantize` state bodies cannot nest
  `@supports`/`@media`:** the state-body parser has no at-rule handling
  (`packages/vite/src/css-quantize.ts`); the consumer correctly used the
  documented attr-selector escape hatch. Fork to decide: support nesting, or
  refuse loudly at compile time — silent mis-emission is the only wrong
  option.
- **Upstream design input — no first-party CSS scroll-driven-animations
  story:** zero `scroll-timeline`/`view-timeline`/`animation-timeline`
  surface anywhere in packages, while the repo's own topics advertise
  scroll-driven-animations and `scroll.progress` is a first-class signal. The
  site now pairs native `view()` timelines with boundary regimes by hand —
  that pairing (timeline rides the compiled state machine, reduced-motion
  guarded) is the shape a first-party primitive should take.

Third batch (2026-07-05, same production site — agent-tooling + doctor gaps;
premises re-verified, one corrected):

- **Docs-MCP — highest value, pattern proven downstream:** the consumer lost
  time assuming `@czap/mcp-server` was a docs server (it exposes the czap
  COMMAND catalog — its README says so in line one, but the package name
  invites the misread; one "what this is not" line is cheap insurance), then
  hand-built a stateless Streamable-HTTP docs MCP (list/search/get_doc +
  `docs://` resources) over an R2-hosted bundle. Premise correction from
  source: NO first-party docs-bundle generator exists (`docs:gen` fills
  README registry blocks only; the command catalog has no docs verb) — so
  the upstream shape is two parts, not one: a docs-bundle emitter plus a
  bundle→`/mcp` endpoint helper, making every czap docs site agent-callable
  for free. The consumer's working reference impl is the design input.
- **Boundary-shadowing diagnostic — the consumer's crown bug, still
  unfiled (tracker checked: only #104/#105 exist):** a hand-authored
  `@media`/`@container` rule at equal specificity, loading after the
  boundary's inline `<style>`, silently overrode it — layout flipped at the
  wrong breakpoint while JS reported the right state. No specificity or
  shadowing lint exists anywhere in vite/audit. Candidate: a dev-time
  diagnostic — "non-boundary rule shadows boundary `<id>` output at equal
  specificity" — closing a whole class of silent failure.
- **Workers module-scope Date probe:** module-scope `new Date()`/`Date.now()`
  in Workers reads frozen/epoch time (the 1970 bug, hit live on a czap
  site). The engine-side clock law exists (doctor's own timestamp is
  wallClock-injected, `packages/cli/src/commands/doctor/doctor.ts:67`) but
  no consumer-facing doctor/audit probe flags top-level ambient time reads
  in Workers-targeted code.
- **`czap doctor --deployed <url>` — doctor names this gap itself:**
  `packages/cli/src/commands/doctor/probes-cloudflare.ts:295-298` emits the
  'CSP / isolation' probe as `advisory — doctor cannot read deployed
  response headers` with only a static hint (worker-src/connect-src +
  COOP/COEP for `client:worker`). A `--deployed` mode that fetches the live
  site and verifies CSP/COOP/COEP — and the Accept-CH/Critical-CH pair while
  it's there — closes the self-admitted gap and operationalizes the
  verify-production-not-dev lesson.

Honest scope note: neither consumer exercises the mutation channel or
`bindGraphForm` yet — the dashboard's graph-write plane is its next build. The
doc-05 loop closes when the dashboard ships ON the new primitives, not merely
alongside them.

### 7. Platform-primitive intake — HTTP QUERY + Declarative Partial Updates (2026-07-04)

Two new platform primitives swept against every package (ten recon shards, all
claims source-anchored or empirically tested). They compose rather than
compete: QUERY is the request side (a safe, idempotent HTTP method with a
body — RFC 10008, standards track), DPU is the response side (out-of-order
HTML streaming into `<?marker?>` slots + sanitize-by-default insertion APIs —
Chrome 148 behind a flag, WICG, cross-browser ~2027). The verifiable-patch
envelope below is transport-agnostic and rides both.

**HTTP QUERY — adoptable now; candidate 0.9.0 keystone (the read leg).**
Empirically verified end-to-end: Astro 7.0.3 dispatches `export const QUERY`
(generic `mod[method]`, no verb allowlist), Node/undici round-trips it,
workerd 1.20260603.1 passes it with body intact. Method string must be
uppercase `'QUERY'` (lowercase dies at the parser); Cloudflare front-line
proxy passthrough is workerd-verified but needs one deployed-worker test.

- **The read-leg bundle:** `handleGraphQuery` in core + `graphQueryRoute`
  factory in astro mirroring the mutation channel's 415/400/422 discipline
  (ADR-0030 posture: host mounts). The factory injects only
  `Pick<GraphStore, 'loadGraph'>` — write-freedom proven at the type level.
  Conditional reads: `If-None-Match` on the graph digest → 304, so
  `refreshBase` becomes near-free polling (today the read side is a
  hand-rolled unconditional full-graph GET, `examples/06-mutation-roundtrip`).
  Plus a retrying read sender (spec-idempotent; the POST submit correctly
  never retries) and a loud QUERY→POST-with-`X-Czap-Query` fallback ladder.
- **Validator law (all four shards independently):** the wire validator and
  any body-derived cache key MUST be the sha256 `integrity_digest` /
  canonical-body digest — never 32-bit fnv1a (silent-stale-304 and
  cache-poisoning vector when the input is attacker-supplied). Corollary:
  the digest excludes `meta`, so host projections must never surface meta
  fields or the 304 lies.
- **The write-free gate:** NOT a taint extension (a constant write has zero
  tainted dataflow yet still lies to every cache) — a new region-rooted
  sink-reachability fact class (handler root → `saveGraph`/`kv.put`/
  `writeFileSync`…), hard on syntactic call paths, advisory past checker
  bounds, honestly named write-sink-unreachability. ADR-0034 is next free.
- **Hard nos:** an LLM completion endpoint must never be QUERY (transparent
  intermediary replay = silent double-generation); never QUERY-ify
  content-addressed immutable assets (strict downgrade); no CDN body-keyed
  caching exists in 2026 (Cache API `put` throws on non-GET — tested);
  SSE stays GET (EventSource); QUERY does not fix the navigation Vary gap.

**DPU — watch-and-prepare; adopt-under, never a morph replacement.** DPU
replaces, morph reconciles — different operations; identity preservation,
opaque islands, and the recovery protocol all survive. Chrome-148-flag-only
means every rung must feature-detect with today's path as the permanent floor.

- **The differentiator:** stamped verifiable HTML patches — marker names from
  the stable `logicalKey` (never node ContentAddresses, which self-invalidate),
  fragments stamped with base/result graph ids + sha256 digest = `staleBase`
  lifted to the DOM layer. Nothing in the Turbo/htmx/LiveView class has it.
- **Adopt-under candidates:** native Sanitizer as a wrapped backend beneath
  html-trust (intersection of both, differential drift guard — never
  subsume); a `data-czap-sink` stream-to-element primitive composing with
  morph-opaque (fallback path is the tested default, useful in every browser
  today); `streamHTML()` as an LLM htmlPolicy rung (also cures the O(n²)
  full-string re-parse per frame); split-resolve (sync shell + per-boundary
  promises — only pays on KV-miss/compile; precompiled is already
  zero-latency); zero-JS progressive reveal for stage static exports
  (requires the template-mover shim or it is a content-loss bug).
- **Threats to pin in any adoption ADR:** parser-moved `<template for>`
  content bypasses html-trust entirely; no client hint advertises DPU support
  (fail-closed dual-emit only); the post-navigation runtime keys solely on
  `astro:after-swap`, which platform same-document navigation would not fire;
  late `@property` registration flips `var()` fallbacks forever (any late CSS
  must land as one atomic style+content patch).
- **Declined with evidence:** per-tier CSS patch delivery (≤185 B best case,
  0 B typical — the stylesheet is tier-invariant by design); Critical-CH
  replacement (hint acquisition mid-stream is structurally impossible);
  HTML-patch responses replacing the JSON graph (breaks the CAS base chain).

**Free defects both sweeps surfaced (actionable now, primitive-independent):**
`html-trust.ts` scheme check misses embedded `[\t\n\r]` obfuscation of
`javascript:` (the URL parser strips them — our own `runtime-url.ts` documents
the class); `insertAdjacentHTML`/`document.write` are in no taint registry
(SECURITY.md's "no third unguarded path" claim is machine-unproven) and the
`*Unsafe` DPU family belongs beside them; KV write-back on boundary-cache miss
is awaited on the request path (`waitUntil` it); CDN caching emits no `Vary`
on any client hint while HTML is tier-varying (latent wrong-tier serving);
`ResumptionConfig.timeout` is write-only dead config (no AbortSignal, no
retry, on already-idempotent recovery GETs); `czap:request-snapshot` is
dispatched with no shipping-runtime listener (only a component test subscribes —
dead dispatch); no audit surface ever reads
consumer app code (the `*Unsafe` sinks are exactly what consumers will copy).

### 8. Cross-reference + staleness intake (2026-07-06)

A four-agent cross-reference of this roadmap **and** persistent memory against an
external LiteShip audit, plus a whole-doc staleness sweep (every root doc read
cover-to-cover, not grepped). Every claim below was verified against current
source. Corrections were folded into the Epic-6/7 bullets in place — COEP finding
#6 (inverted framing fixed), the `CzapLocals.tiers` union anchors, the
node-builder framing (the fixture *does* use `sealNode`; the gap is a from-parts
builder), the `czap:request-snapshot` listener wording, and the resolved
`resolveInitialState` doc snippet. New items are recorded here.

Guiding rule for this whole section (per owner directive): where a doc "overclaims,"
the cure is to **build the behavior up to the claim** — usually a few LOC of
plumbing/types — not to nerf the claim. Nerf only what is wrong in intent.

**Net-new engine candidates (external audit, source-checked):**

- **SSR resolution receipt.** Generalize the raw-`Request` fix into a
  fallback-reason artifact: `resolveInitialState` (and the SSR path) should be
  able to report which source drove initial state — explicit context / UA /
  Client Hints / edge tier / synthetic fallback — so the *whole* silent-fallback
  class goes loud, not just the 960px case. Anchor: `resolveInitialState` +
  `syntheticValueFromCapTier` (`packages/astro/src/quantize.ts`). Regression:
  a test asserting the receipt names `synthetic` when no signal is present.
- **Docs-bundle content-hash manifest + staleness gate.** Extends the filed
  Docs-MCP item (batch 3). The emitter should stamp a versioned,
  content-addressed manifest (package version + source-file list + sha256) and
  run a stale-doc detection pass before emit, so agents consume sealed,
  provenance-carrying docs instead of scraping. Premise (verified): no
  docs-bundle generator exists — `scripts/gen-docs.ts` fills README registry
  blocks only. Shape: `docs:bundle` emitter → `docsMcpRoute(bundle)`.
- **Consumer-audit doctor mode.** Concretize the "no audit surface reads
  consumer app code" free defect: a scoped, read-only `czap doctor`/
  `audit --consumer-app` mode that scans consumer *source* for known LiteShip
  integration smells — unsafe HTML sinks, raw-`Request` `resolveInitialState`,
  missing `Vary`, boundary shadowing, module-scope Worker `Date`, hand-built
  `data-czap-*`, direct graph mutation. Seed: the taint registry
  (`packages/cli/src/lib/taint-policy.ts`); today the corpus is framework
  packages only (`packages/gauntlet/src/node-context.ts`), never arbitrary
  consumer app code.

**Staleness-derived build items (build to the claim; do not nerf the doc):**

- **Route the dev inspector through the trust pipeline.** SECURITY.md asserts
  "no third unguarded `innerHTML` path." The dev-only boundary inspector
  (`packages/astro/src/runtime/inspector/panel.ts` — four raw `el.innerHTML = …`
  writes, one interpolating a `data-czap-state` attribute; registered `astro dev`
  only, `integration.ts`) is a third path. Route those writes through
  `createHtmlFragment`/`assignInnerHTML` so the claim is literally true
  everywhere. Small (4 sites), dev-only, low-risk — the point is the claim stays
  ambitious and the code rises to it. (SECURITY.md was scoped to "in the shipped
  runtime" 2026-07-06 as honest interim; this item removes the qualifier.)
- **Canonicalize the URL scheme check (already Free Defect #1, restated as the
  build target).** Strip `[\t\n\r]` from the normalized value before the
  `startsWith('javascript:')` test in `isDangerousAttribute`
  (`packages/web/src/security/html-trust.ts`) — the WHATWG URL parser strips
  them, so `java\tscript:` currently survives and later executes (documented in
  `runtime-url.ts`). Red-team regression in
  `tests/regression/red-team-runtime.test.ts` covering the embedded-whitespace
  variants. Makes SECURITY.md's scheme-strip claim true.
- **Add `insertAdjacentHTML`/`document.write` to the taint registry** as
  defense-in-depth — `packages/cli/src/lib/taint-policy.ts` lists only
  `innerHTML`/`outerHTML` as assignment sinks. No live sink uses them today, so
  this is a gate that catches a future one (and the DPU `*Unsafe` family when it
  lands). Makes SECURITY.md's "no third unguarded path" machine-checkable.
- **Docs-plumbing debt (a subsystem isn't done until it's in the prose chain).**
  The 0.8.0 seams are documented in README/GETTING-STARTED/GLOSSARY/
  PACKAGE-SURFACES/DOCS, but ARCHITECTURE.md and ASTRO-RUNTIME-MODEL.md carry no
  mutation-channel section, and ADR-0025 (Workers static-assets boundary-CSS),
  ADR-0026 (Receipt-DAG compaction), ADR-0027 (Cell value→wire) have no prose
  home in the three architecture docs. STATUS.md got a 0.7→0.8 feature refresh
  2026-07-06; its test-count/timing snapshots still carry the 2026-06-25
  baseline (re-capture from a fresh gauntlet). Confirm exact placement before
  writing — docs are sacred.

**Forgotten-from-memory (cross-ref against memory, source-traced):**

- **WGSL integer/unsigned vector uniforms mis-laid-out and mis-written
  (CONFIRMED 2026-07-06, source-traced).** Scalars are fine end-to-end — the
  compiler infers `i32`/`u32` (`packages/compiler/src/wgsl.ts:120-122`) and the
  runtime writes them via `setUint32` (`packages/astro/src/runtime/wgpu.ts:292`).
  The gap is integer/unsigned *vectors*: `wgslTypeInfo` (`wgpu.ts:169-185`) has
  cases only for `vecNf`, so `vec2i`/`vec3i`/`vec4i` and the
  `vec2<u32>`/`vec2<i32>` spellings fall to `default` →
  `{ align: 4, size: 4, kind: 'float' }`. Three failures at once: (1) layout — a
  `vec2i` is 8 B / 8-align, a `vec4i` 16 B, so 4/4 under-sizes the field and
  miscomputes every later field's offset; (2) write — `kind: 'float'` routes to
  `setFloat32(offset, value as number)` (`wgpu.ts:294`) but the value is an
  array, so `[x,y] as number` → NaN; (3) silent — the `default` swallows the
  unknown type with no warning. Not reachable via inference (the compiler only
  emits `vecNf`, `wgsl.ts:114-117`); reachable only through a hand-authored
  `@wgsl` struct field — the same surface as the unfed-uniform finding. Fix,
  loud-first: (a) `warnOnce` in the `default` branch on any unrecognized uniform
  type (converts the whole class to loud even before support lands); (b) add
  `wgslTypeInfo` cases for the integer-vector types with correct align/size +
  integer kinds, and per-component `setInt32`/`setUint32` write branches
  (`wgpu.ts:296-301`). Compiler side needs no change. Aside: `bool` is in the
  `WGSLType` union but isn't host-shareable in a uniform buffer; it also falls to
  `default` — reject it explicitly.
- **`audit --findings` stdout/stderr contract.** The flag puts findings on stdout
  + receipt on stderr, diverging from the CLI's "one JSON receipt on stdout"
  contract. A 1.0 API-stability decision to settle, not a bug.
- **`audit --consumer --skip-structure` opt-out.** Shipped as surgical-suppress;
  make the choice stated, not a silent default (`upstream-findings-post-040` #4).

**Invariant-drift watch (not a defect yet):**

- **Boundary-CSS self-containment.** LAW: `CompiledOutputs.css` is the full
  ordered stylesheet. `serializeBoundaryCss` (`packages/astro/src/fetch-layer.ts:87-94`)
  now *conditionally* prepends `propertyRegistrations`/`containerQueries` guarded
  by a `!outputs.css.includes(...)` substring check. No doubling today, but a
  whitespace-normalization false-negative on that check re-introduces the
  double-emit. Reassert "emit only `css`," or replace the substring check with a
  structural one.

**External-dep note.** The QUERY `mod[method]` dispatch claim (Astro dispatches
`export const QUERY` with no verb allowlist) is not re-verifiable in-repo (no
`astro` in the tree, only `@czap/astro`); it stays recorded as empirically
verified end-to-end. The read-leg factory it implies
(`graphQueryRoute`/`handleGraphQuery`) is confirmed **absent** — correct, it is a
proposal — and would mirror the existing `graphMutationRoute`
(`packages/astro/src/graph-mutation-route.ts`; 415/400/422 discipline).

### 9. Authored Motion + Self-Managing State over DocumentGraph (2026-07-06)

The keystone direction, from the convergence of a four-agent repo deep-read and two
external passes — all three landed on the same finding independently. Full
impl-ready spec lives in `docs/internal/design-authored-motion-state.md`
(committed working note — `docs/internal/` is normally local, force-committed here
because a canonical doc references it; ratified as ADR-0035 —
`docs/adr/0035-motion-is-intent-not-target.md`).
Tracked as epic **#130**; taxonomy decision **#131**; children **#124**
(reveal/stagger), **#126** (scroll-timeline); sibling **#125** (responsive-media).

**Thesis correction (kill "not a UI framework").** LiteShip is a
**multimedia-native adaptive UI compiler/runtime — not a *component library*.** It
competes with Webflow/Flash by owning the authoring model, projection graph,
runtime, media surfaces, AI-safe patch seam, and compiler — not a button zoo. The
"projection truth engine" framing was academic smoke; the honest boundary is
"no component zoo," not "not a UI framework." (Tagline threaded through README /
ARCHITECTURE / SKILL 2026-07-06; ratified as ADR-0035.)

**The keystone (named in source):** `TransitionNode` is typed, content-addressed,
and in the graph — and **nothing reads it**. `graph-lower.ts` lowers `PoseNode`s to
discrete per-state channels but never consults `TransitionNode.routing`/`durationMs`.
LiteShip is not missing an animation library; it is missing the **interpreter** that
turns the motion data it already models into motion. The substrate is present but
orphaned: `PoseNode` (keyframe), `TransitionNode` (tween) + `EdgeType`
seq/par/choice (sequencing algebra), `PolicyNode` (reduced-motion/tier/budget gate),
`Easing.springToLinearCSS` (spring→CSS `linear()`, works in miniature),
`scene-bridge.writeContinuous` (live per-frame eased→DOM CSS-var writer, ships but
one scalar), `@starting-style`/`@property` emission. Law already type-encoded: a
Pose is content-addressed, per-frame transients are not → continuous writes never
patch the graph per frame. The one real GSAP-core gap: `interpolate` is numeric-only
(no color/unit/transform).

**Step-0 decision (made): motion is an authored INTENT, not a projection target.**
`ProjectionNode.target` (`css/glsl/wgsl/aria/ai/config/svg`), `ExportNode.carrier`
(`astro-page/video/svg/ship-capsule/receipt`), `LadderTarget`
(`css/glsl/wgsl/aria/ai`), and `RuntimePhase` all lack `motion` — deliberately. A
`MotionIntent` lowers into a `css` projection plan + a runtime leaf-write plan
(+ optional gpu/adapter). No change to any target/ladder/phase union.

**The vertical slice (build this first, nothing else):** (1) typed value model
`interpolateTyped` (fix numeric-only), (2) `TransitionNode` interpreter
`interpretTransition` (the keystone), (3) N-property `writeContinuousMap`
(generalize the one-scalar writer), (4) native-CSS `MotionCompiler` arm (reuse
`springToLinearCSS` + `@starting-style`), (5) `StateCell`/`ProjectionState` — a typed
authority over the EXISTING coarse graph/boundary/quantizer/dirty model, **NOT a new
fine-grained reactive runtime (do not build SolidJS)**, (6) one reveal end to end as
proof. Done = that reveal compiles from graph and runs, gauntlet-gated. Then expand.

**Guardrails (Laws):** continuous-write-never-patches; sugar is data over canonical
intent, no behavior authority (precedent: `@czap/scene` already ships
`fade`/`pulse`/`ease`/`syncTo` sugar over primitives); native CSS first + typed
runtime floor forever; **GSAP barred as a first-party dep** (its license restricts
Webflow-competitive no-code animation builders — exactly this product), Motion
(motion.dev, MIT, vanilla, no React) is the eventual optional adapter, **AOS
absorbed not depended-on** (its data-attr+IO+CSS pattern is already LiteShip's, done
better); WGSL honesty (**#106/#107** — unfed-uniform diagnostic + integer-vector
mis-layout) lands **before** motion sugar, because a multimedia-native framework
cannot ship silent shader lies.

**Named "free batteries" (downstream, not yet built — recorded so they are not
lost):** `DocumentGraph` is already the creative-document/design-file format
(content-addressed, `GraphPatch` = undo/redo/collab/AI-edit substrate); `Component`
is a Webflow-symbol-shaped primitive (binds boundary/styles/slots), not a React
component; `@czap/stage` is the export dock (one graph → page + video, proven to
share a source digest); `assets` beat/onset/waveform + `scene` beat-binding = an
audio-reactive path (flagship demo candidate: audio-reactive adaptive landing page
→ web + video from one graph); `cap-ladder` is a capability-aware-design product
engine, not just a guard; `command`/`mcp-server`/docs-bundle is the AI co-author
backplane; QUERY (#119) + GraphMutation are the collaborative-editing sync
skeleton; DPU (#120) is the future live-preview path. Each is a follow-on *after* the
motion/state spine proves — not a parallel build.

**Doctrine — the rigor taxonomy** (now in `SKILL.md` §16): **Law** (never break: security, graph identity, validation, no silent
drift) · **Contract** (public API promise) · **Receipt** (evidence) · **Diagnostic**
(loud, not always blocking) · **Watch item** (known risk) · **Recipe** (example, not
law) · **Preset** (data over intent, not behavior authority). The cure for "models
call everything an invariant and cage the product" — only Laws are inviolable; rigor
is a seatbelt that lets the product carry more expressive UI/media safely, not a
speed limiter.

**Completeness gate (do not build a FeatureContract subsystem).** The gauntlet/audit
machinery already has the authority ratchet (gates earn blocking only via
red/green/mutation fixtures, `authority.ts`), FactGate, the evidence recorder,
`ambition-proof` (the advisory high-ambition/low-proof heat map), and symbol-level
orphan detection (`audit` `OrphanCoverage`). The missing oracle is **field-level**:
an *active* modeled surface must have readers for its load-bearing fields, else a
blocking Finding — a `TransitionNode` with `routing`/`durationMs` that no interpreter
reads is dead data in a live type. First red fixture is the current repo state.
Mechanical certainties block; heuristics advise. Tracked as **#132** (the acceptance
gate for #130 — "done" = this gate green). Obligations derive from the `NodeFamily`
union + a status tag, never a hand-maintained string mirror. `@czap/audit` produces
the field-reader facts; `@czap/gauntlet` decides over them (no `typescript` dep in
gauntlet); ast-grep is a fast smoke detector, not the authority.

**New-brain re-frame of the upstream ledger (2026-07-06).** A dogfood consumer
(signals-only feed) surfaced three stream gaps; re-examined from where LiteShip is
going, not where it is now. **Load-bearing reframe: stop treating stream resumption
as its own recovery protocol — it is the same problem as multi-client collab-sync.**
The mutation channel (`graph-mutation-client.ts`: `currentBase`/`adopt`/`refreshBase`,
`GraphPatch` base/result identity + chained receipts) is already a content-addressed,
receipt-carrying replay machine; the QUERY read-leg (#119) is its read side. The
**discrete/continuous law is the replay discriminator**: only discrete crossings are
replayable graph events; continuous transients (`scroll.progress`/`pointer`/`audio`/
`time`) are correctly ephemeral and must NOT replay. So:
- **#133 (signal gap-replay):** do NOT widen the SSE `{ patches }` payload to carry
  signals — that manufactures a divergent second substrate AND blindly replays
  ephemeral transients. Interim: wire the dead `czap:request-snapshot` to
  `refreshBase`/`adopt` + snapshot re-sync for missed discrete crossings. Full: signals
  as `StateCell`s, patch/receipt-chain replay via #119. The consumer's app-side "WO-8"
  is the workaround until this is native.
- **#134 (wire-contract):** the `czap:*`/`data-czap-*` contract has zero docs coverage
  → GENERATE it from a source registry + drift guard (ADR-0028/0018 pattern), never a
  hand-written page (SKILL §16). Same issue folds gap-3: fix the stale "back-compat"
  docstring — ADR-0028 already decided plain-element `client:*` is first-class.
- **Old-brain corrections applied:** #122's "…or remove it" options for
  `ResumptionConfig.timeout` and `czap:request-snapshot` were struck (both are
  unfinished features, not dead code — complete-don't-nerf); #119 reframed from a
  "polling perf nicety" to the collab-sync/gap-replay substrate.
- **Motion-epic-shaped (build per #130, not standalone):** #112 (node builder, a
  lowering prerequisite), #118 (SSR receipt = proto-`ProjectionState`), #108 (tiers
  struct = typed-state-authority down-payment), #110 (`@quantize` nesting = decide with
  the `MotionCompiler` arm). **Subsumed:** #104 scroll-warning + batch-2 scroll story →
  #126.

**Completeness ledger — what SHIPPED in the Epic-9 slice vs what's still owed (post-merge
audit, 3-agent cross-ref against issues + design note + this roadmap).** The slice landed
clean: #106/#107 (code + tests in `wgsl-honesty.test.ts`), #124 (reveal shipped), #130
(machinery + reveal), #132 (advisory→blocking), #133 (interim), #134 — a contracted
vertical slice, gauntlet-enforced. **#125 responsive-media** projection (`<picture>`/srcset/
image-set) is **NOT-STARTED** — explicitly owed, not implied landed. Four issues are
**PARTIAL — do NOT close as fully-done** (a piece shipped, the whole is owed):
- **#124 stagger:** reveal/`@starting-style` shipped; stagger intent absent.
- **#125 responsive-media:** Save-Data/DPR/Client Hints → `<picture>`/srcset/image-set
  projection NOT-STARTED (zero symbols in packages).
- **#126 scroll-timeline:** the native-CSS `@supports (animation-timeline: view())` floor +
  reveal's `view`/`scroll` trigger shipped (`MotionCompiler`); the *standalone scroll-timeline
  intent primitive* did not.
- **#118 SSR receipt:** `StateCell.StateResolutionReceipt` is a runtime **proto** only; the
  astro SSR-source receipt in `quantize.ts` (name-the-source-that-drove-initial-state) is
  untouched.
- **#122 hardening sweep:** only the dead-`czap:request-snapshot` orphan was cured (wired in
  #133); `waitUntil` / `timeout→AbortSignal` / `Vary` / boundary-css remain.
Next motion primitive (scoped OUT of slice 1, so not a miss): **multi-step `EdgeType`
sequencing** — `interpretTransition` currently treats `seq`/`par`/`choice_then` as a 2-step
start→end; true chained-`TransitionNode` sequencing (the seq/par/choice algebra) is the
natural follow-on, pairs with #126.

**#136 (sharded low-memory docs build) — NOT STARTED (phantom claim corrected 2026-07-08).**
Issue #136 documented fixes "already made on branch `liteship/fullsend-motion-stream-spine`",
but `scripts/build-api-docs.ts` exists in no git ref (never committed). Repo truth: monolith
TypeDoc build. Rebuild is Phase B Tier 3 work (#136 + #113 docs-bundle).

## Completed Since Last Revision (2026-05-17)

**Epics #1 + #2 — hotspot sweep and advisory floor (closed 2026-06-10, PR #11).**
The live runtime-seams top-10 (wgpu 4%, ffmpeg-probe 15%, host-browser
context 15%, scene-dev server 20%, gauntlet cmd 30%, video decoder 47%,
audit CLI adapter 52%, three 1/2-branch harness files) all prove 100%
branches with behavior tests. The 10-warning fallback-laundering floor went
to zero honestly: doctor probes surface read/parse failures as structured
details (`Readout<T>`), the integrity detector credits only catches whose
error binding is meaningfully read before/within the fallback return, and
the two deliberate fail-closed defaults carry allowlist reasons. Same PR:
coverage/load-aware `scaledTimeout` test policy, consumer-mode dist-truth
verification (`export-target-missing`), and a real-browser e2e of the built
Astro example.

**Epic #4 — `@czap/cli` coverage back to package defaults (closed 2026-05-17).**
The v0.1.0 ShipCapsule slice landed with sub-85% coverage on
`capsules/ship-emit.ts` (44%), `commands/ship-verify.ts` (82%), and
`ship-manifest.ts` (75%), and the per-package override at
`scripts/merge-coverage.ts` PACKAGE_THRESHOLD_OVERRIDES.cli temporarily
lowered the thresholds to 75/75/78/60. Post-v0.1.1 (v0.1.2 candidate)
closed the gap across eight targeted commits on
`claude/improve-dev-experience-7f0as`:

- `ship-emit-branches.test.ts` lifted `capsules/ship-emit.ts` to 100%
  across lines/branches/functions/statements via direct invocation of
  the capsule (schema validation, write-path, invariant `check` arms)
  rather than going through the orchestrator.
- `ship-manifest.test.ts` gained hand-crafted tar fixtures covering
  parseTar PAX header (typeflag `'x'`), GNU long-name (typeflag `'L'`),
  and USTAR `prefix`-field path-reassembly arms — lifting line coverage
  from 75.63% → 95.79%, branches 51.06% → 76.59%.
- `ship-verify-verdicts.test.ts` extended with the `--capsule=` equals
  form, three exit-1 emitError arms (missing tarball, tarball-not-found,
  capsule-not-found), the recompute-failure → Incomplete arm, the
  third `ShipCapsuleDecodeError` tag (`invalid_shape`), and the
  individual mismatch arms tested in isolation — lifting `ship-verify.ts`
  to 96.82% lines / 91.66% branches.
- New `tests/unit/cli/commands/ship.test.ts` + `verify.test.ts` filled
  the canonical-location gap so every dispatch verb has a peer smoke
  test alongside doctor/glossary/help/completion/version.
- New `tests/unit/cli/idempotency.test.ts` covered the `tryReadCache`
  force-bypass and file-present arms without going through the
  ffmpeg-gated integration test.
- glossary/version pretty-mode tests covered `prettyEntry` and the
  stderr one-liner.
- dispatch-sugar gained a verb-routing block covering scene / asset /
  capsule case arms + the `verify` (no-args Unknown verdict) path.
- asset-analyze covered the `onset` + `waveform` projections + the
  cache-hit arm.

Final cli aggregate: 85.64% lines / 85.06% statements / 86.84% functions
/ 77.06% branches — all above the 85/85/85/75 package default. The
`cli` override was removed from `scripts/merge-coverage.ts` and the
drift guard at `tests/unit/meta/coverage-config.test.ts` was tightened
to assert the override no longer appears.

## Earlier Completed Work (2026-04-23)

Spec `2026-04-23-capsule-factory-video-stack-design.md` shipped with 5 atomic phases:

- Capsule factory kernel + 7-arm assembly catalog (ADR-0008)
- Spine runtime-gap closure (ADR-0010)
- Scene composition stack on existing ECS (ADR-0009, ADR-0002 amended)
- Asset capsules + analysis cachedProjections
- CLI + MCP dual-audience surfaces
- ADR-0007 (adapter vs peer framing) resolved

`flex:verify` dimensions expanded to 7 (added `CapsuleFactory`).

## Product-Adjacent Future Epics

These are real future LiteShip / CZAP directions, but they are not promises for the current hardening wave.

### Component-local data loading

Goal:
- define a host-safe, boundary-aware data-loading model that does not accidentally turn LiteShip into an RPC layer

Entry criteria:
- current runtime/security/package hardening wave is stable
- dogfooded apps show repeated loader patterns that belong in LiteShip core

**Assembly mapping:** cachedProjection capsules keyed on (url, params, auth-scope). Scenes and hosts reference loaders by capsule id; the factory emits decode + cache-invalidation harnesses.

### Stateful edge AI bindings

Goal:
- offer explicit, host-owned AI/stream bindings at the edge without making the frontend runtime depend on a vendor-specific control plane

Entry criteria:
- current trust boundaries for stream/LLM/runtime URLs are stable
- receipt/authenticity semantics are made explicit enough to build on safely

**Assembly mapping:** receiptedMutation capsules at site: ['edge'], paired with policyGate capsules for authorization.

### Plugin-as-integration sidecar

Goal:
- make the Vite/Astro integration path feel like a coherent sidecar without collapsing package boundaries

Entry criteria:
- package smoke, CI truth, and support-matrix policy stay stable across dogfooding

**Assembly mapping:** refinement of the existing siteAdapter arm. Vite plugin + Astro integration become capsule instances with declared capabilities.

## Explicit Non-Goals For This Wave

- built-in auth/session system
- ORM/storage/queue stack
- general RPC/server-action framework (the 0.8.0 mutation client and form binding still submit one validated graph-patch seam, not arbitrary remote calls)
- backend/router stack expansion
- stateful edge AI substrate implementation
- component-local data loading implementation

## Stop Condition

This hardening wave is done when:

- correctness seams are closed
- adjacent debt surfaced by that work is also closed
- red-team findings are fixed or deliberately justified
- package distribution is proven
- CI truth matches local truth
- dogfooding no longer produces structural product feedback
- remaining work is genuinely micro-optimization or speculative enhancement
