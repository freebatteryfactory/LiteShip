# ADR-0050 — defineAdaptive: a pure-lowering facade with proven equivalence

**Status:** Accepted
**Date:** 2026-07-21

## Context

Authoring a constraint-driven adaptive today means calling five constructors by
hand and threading one through the next: `defineBoundary` produces the boundary,
`defineStyle` needs that boundary spliced in, `defineQuantizer` needs it too, and
`defineToken` / `defineTheme` sit alongside. The wiring is mechanical, easy to get
subtly wrong (a boundary constructed twice with drifting config), and there was no
single authored noun that carried "this adaptive, as one addressable thing".

The obvious way to add that noun is dangerous: a `defineAdaptive` that
re-implements any part of boundary/style/quantizer construction would become a
second source of truth that drifts from the constructors it shadows. The P8
`Adaptive` ASTRO component already owns a `data-liteship-boundary` serializer
(`adaptiveAttrs`), so a headless core attr path risked a THIRD copy of the same
boundary-identity JSON.

The `Adaptive`/`defineAdaptive` budget slots were reserved in P13
(`export-budget.ts`), so the surface was pre-committed; what remained was to add
the value WITHOUT adding a parallel implementation.

## Decision

`defineAdaptive(spec)` is a **pure lowering facade**. It CALLS the five sibling
constructors and returns their outputs verbatim — it reimplements nothing:

- `boundary = defineBoundary(spec.boundary)`
- `style = defineStyle({ ...spec.style, boundary })` (the generated boundary is authoritative)
- `quantizer = spec.quantize ? defineQuantizer(boundary, spec.quantize) : undefined`
- `tokens = spec.tokens?.map(defineToken)`, `theme = spec.theme && defineTheme(spec.theme)`
- `id = fnv1aBytes(CanonicalCbor.encode({ _tag: 'AdaptiveDef', _version: 1, boundary: boundary.id, style: style.id, quantizer: quantizer?.id ?? null, tokens: …, theme: … }))`

**The referential-identity thesis.** The aggregate `id` addresses the MEMBER IDS,
not the member data — the same shape every sibling constructor uses. And because
`@liteship/quantizer`'s `defineQuantizer` memoizes on content address
(`configCache`), an adaptive's `quantizer` member is not merely equal to the
hand-lowered `defineQuantizer(boundary, options)` call — it is the SAME OBJECT
INSTANCE. Referential `===` is the strongest possible statement that the facade
lowers through the real constructor rather than shadowing it.

**The attrs hoist (core→astro layering).** The boundary-identity object serialized
into `data-liteship-boundary` — `{ id, input, thresholds, states, hysteresis? }`
in exactly that key order — is hoisted into ONE core function
(`boundaryAttrIdentity` / `serializeBoundaryAttrValue` in `authoring/adaptive.ts`).
Core's headless `Adaptive.attrs()` stringifies it directly; `@liteship/astro`'s
`adaptiveAttrs` spreads the same core object and appends its component extras. One
serializer, no drift, and the astro byte-identical pin (`tests/unit/astro`) still
holds. This resolves the layering the right direction: the shared identity lives
in core (which astro already depends on), never duplicated upward.

**The explicit composition seam.** `@liteship/quantizer` and
`@liteship/compiler` both depend on core, so core cannot import them back (a
runtime edge would close the project-reference cycle). Core therefore exposes a
pure `lowerAdaptive(spec, lowering)` kernel typed against structural twins. The
`liteship` facade is the composition root: on every call it explicitly supplies
the real memoized `defineQuantizer`, the real target resolver, and the real
compiler projection. There is no mutable registry, side-effect import, or
import-order contract. The same module instance a hand-lowered consumer imports
is supplied directly, so quantizer config-cache referential identity survives.

**The state-marker CSS projection.** The paved road is driven by the runtime's
discrete state, not by an independently evaluated CSS query. `attrs()` carries
both `data-liteship-state` and `data-liteship-style=<style.id>`.
`StyleCSSCompiler.compileAdaptive(style)` emits a self-contained component layer
whose base, state, pseudo, shadow, transition, and starting-style rules all use
that style-address scope. The low-level `StyleCSSCompiler.compile(style)` native
container projection remains available unchanged for direct compiler consumers.

**New types.** `ConstraintTrace` is introduced — the per-threshold row of
`explain()` (`{ index, threshold, state, satisfied }`, where `state` is
`boundary.states[index]` and `satisfied` is `value >= threshold`). `tier` is a
**spec-level, width-independent** `TierChoice` (`{ tier, admittedTargets:
tierTargets(tier) }`, default `'styled'`) — it reports the authored capability
tier and its admitted projection targets; it is NOT a runtime `chooseTier` over an
observed value.

**Three equivalence proofs.** `tests/property/adaptive-lowering-equivalence.prop.test.ts`
proves the facade is pure lowering over a seeded fast-check space, each proof
computing its reference path INDEPENDENTLY from the spec configs (never read back
off the adaptive's members — non-tautological):

- `INV-ADAPTIVE-LOWERING-PURE` — member ids equal, member defs deep-equal, and the
  quantizer member is referentially the memoized `defineQuantizer` object.
- `INV-ADAPTIVE-CSS-BYTE-EQUAL` — public `adaptive.plan().css` and an
  independently hand-lowered `StyleCSSCompiler.compileAdaptive(style)` call are
  byte-equal (`Buffer.compare === 0`). The native boundary container projection
  retains its separate lower-level equality proof.
- `INV-ADAPTIVE-TRACE-EQUAL` — `Boundary.evaluateBatch` over a below/at/above
  sweep agrees index-for-index, and the content-addressed `traceDigest` of the
  `evaluateResult` sweep is identical.

## Consequences

- There is ONE authored noun for an adaptive, content-addressed by what it lowers
  to. Two identical specs mint the same aggregate `id`; changing any member
  changes it.
- No parallel implementation exists to drift. The proofs are the enforcement: any
  future edit that makes `defineAdaptive` diverge from the hand-lowered path (a
  reshaped config, a recomputed id, an extra CSS byte) reds an L4 property gate.
- The boundary-attr serializer is single-sourced; the astro component and the
  headless core path can never disagree on `data-liteship-boundary`.
- `attrs()` plus `plan().css` is self-contained: the runtime marker that records
  hysteresis and activation decisions is the same marker the CSS selects, and
  style-address scoping prevents cross-definition bleed.
- Root `defineAdaptive(...).plan()` works with one `liteship` import because the
  facade explicitly owns composition; direct core consumers must supply a
  lowering object to `lowerAdaptive` rather than relying on ambient state.
- The core `.` and `liteship` `.` barrels GAIN `defineAdaptive` (value) and
  `Adaptive` (type-only). The `0.19.0` release projection records that additive
  Adaptive surface and the compiler-owned state-marker projection; the API
  snapshot was regenerated only after the version gate accepted the minor bump.

## Evidence

- `packages/core/src/authoring/adaptive.ts` — the lowering kernel, aggregate-id
  kernel, boundary-attr serializer, and structural composition contract.
- `packages/liteship/src/authoring/adaptive.ts` — the explicit facade composition
  root supplying quantizer and compiler owners.
- `packages/compiler/src/style-css.ts` — native container and Adaptive
  state-marker projections sharing one style-layer serializer.
- `tests/property/adaptive-lowering-equivalence.prop.test.ts` — the three proofs,
  200 runs each at seed `0xada9741e`.
- `tests/unit/core/authoring/adaptive.test.ts` — the unit pin, including the
  `adaptive.quantizer === hq` referential assertion.
- `tests/e2e/astro-directives.e2e.ts` — real-browser attrs + plan proof,
  cross-definition isolation, and hysteresis-driven computed CSS.
- `traceability/invariants.yaml` / `traceability/testing-ledger.yaml` — the three
  L4 laws enrolled and traced (bridge green).

## Rejected alternatives

- **A `defineAdaptive` that reimplements any construction step** — creates a
  second source of truth that drifts from the constructors; the entire ADR exists
  to forbid this.
- **Address the adaptive by its member DATA rather than member IDS** — would
  duplicate the sub-addressing the constructors already do and diverge from the
  house content-address shape (id-of-ids).
- **Ambient load-time registration** — makes correctness depend on import order
  and lets the root facade advertise a method it has not actually wired.
- **A core-local quantizer/compiler** — a parallel implementation by another
  name; loses the referential-identity thesis.
- **Global or self-query-container setup for the paved road** — either hides a
  prerequisite or re-evaluates a different signal than the runtime. The marker
  projection follows the runtime decision directly.
- **Duplicate the boundary-attr JSON in a headless core path** — a third copy of
  the astro serializer; hoisting to one core function is the whole point of the
  layering decision.
- **A runtime `chooseTier(value)` tier** — `tier` is authored, width-independent
  metadata for `explain()`; a value-driven tier would conflate authoring with
  evaluation.

## References

- `packages/core/src/authoring/adaptive.ts` — `defineAdaptive`, `Adaptive`,
  `AdaptiveSpec`, `AdaptiveExplanation`, `AdaptivePlan`, `ConstraintTrace`,
  `serializeBoundaryAttrValue`
- `packages/core/src/authoring/boundary.ts:287` — `defineBoundary`
- `packages/core/src/authoring/style.ts:222` — `defineStyle`
- `packages/quantizer/src/quantizer.ts:462` — `defineQuantizer` (configCache)
- `packages/compiler/src/style-css.ts`, `packages/compiler/src/css.ts` —
  `StyleCSSCompiler.compileAdaptive`, `StyleCSSCompiler.compile`, `CSSCompiler.compile`
- `packages/core/src/simulation/trace.ts:84` — `traceDigest`
- `packages/astro/src/Adaptive.ts` — `adaptiveAttrs` (the byte-identical pin)
- ADR-0044 (brand consolidation), ADR-0045 (source grammar), ADR-0048 (export budget)
