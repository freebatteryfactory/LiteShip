# LiteShip roadmap

> Verified against the 2026-04-08 hardening wave. See `STATUS.md` for live counts, gate totals, coverage numbers, and current telemetry watch items.

## Current Phase

The pre-1.0 hardening arc closed through 0.6.0 (gates, fail-closed security defaults,
CI/release truth, the front-door cut). 0.7.0 and 0.8.0 were dogfood-driven keystone
waves: the client→server mutation channel, the form/mutation-binding primitive,
morph-opaque subtrees, Standard Schema interop, and the Cloudflare dev-path fix —
the five dashboard-blocking upstreams, all landed. The current phase is road-to-1.0
stabilization: prove the keystones downstream, then freeze what has earned it.

Active priorities:

1. Downstream dogfood on 0.8.0 — the keystone wave is finished only when the consuming
   app stops producing structural product feedback, not when the packages publish.
2. Keep runtime correctness and hotspot coverage moving (standing watch on
   `reports/runtime-seams.*`).
3. Keep security defaults fail-closed for HTML, URL, selector, style, and boundary-state surfaces.
4. Keep CI truth aligned with the canonical local gauntlet, and packaging truth aligned
   with what ships to consumers.
5. Stability ledger toward 1.0: `_spine` as the freeze ledger; freeze less than tempted.

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
  cast it self-describes as deliberately fragile glue, so the root gap is
  public node constructors, not just a Boundary converter; a tier-aware
  reveal/stagger primitive and a Save-Data/DPR responsive-image primitive are
  net-new surface whose ingredients exist (Client Hints already parse
  `Save-Data`; tiers ride `locals.czap`) but which sit on the
  primitive-vs-UI-kit thesis line — owner design fork, not intake nods.
- **Still open from the 0.6.0 findings batch:** COEP is not overridable
  (finding #6). Neither dogfood site is bitten today — both want
  `crossOriginIsolated` — parked, not forgotten.
- **Owner eyeball task:** the WGSL render path needs a real WebGPU device
  (headless has no `navigator.gpu`): open
  `https://heyoub.dev/?cast=wgsl&gl=force` and confirm the orbs animate and stay
  round. The GLSL default path is already verified live.

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
dispatched with zero listeners repo-wide; no audit surface ever reads
consumer app code (the `*Unsafe` sinks are exactly what consumers will copy).

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
