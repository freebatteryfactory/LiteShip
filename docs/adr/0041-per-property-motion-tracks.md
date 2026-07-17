# ADR-0041 — Individual transforms, a generalized `linear()` easing vocabulary, and the runtime floor as the differently-eased renderer

**Status:** Accepted
**Date:** 2026-07-17

## Context

ADR-0040 pinned every render target to ONE `sampleProgram` kernel and proved it
with a differential oracle. It left two seams open, both recorded there as the
FIRST rejected alternative ("bake per-window easing into dense CSS keyframe stops
… the oracle documents the approximation instead"):

1. **A scalar easing vocabulary.** `RuntimeEasing.kind` was `'linear' | 'ease' |
   'spring'`. The full `Easing` catalog (`cubicBezier`, `easeOutBounce`,
   `easeOutElastic`, `easeOutBack`) could not be carried on the runtime floor or
   emitted natively — a spring was the only non-analytic curve that lowered to a
   CSS `linear()`. Any other catalog curve had nowhere to live.

2. **The differently-eased `par` (#148).** A `par` of children with DIFFERENT
   curves over one overlapping segment cannot be served by ONE per-keyframe
   `animation-timing-function`. The planner emitted a loud
   `mixed-easing-overlap-approximated` diagnostic and dropped the native curve for
   that segment. But that diagnostic guarded a native path composed programs never
   take: in production a composed program (`interpretProgram`) ships via the
   per-window RUNTIME floor (`client:motion` inlines `runtime.windows`), NOT the
   single native `@keyframes` — the native leg is only compiled for a single
   `interpretTransition` reveal. The diagnostic was warning about an approximation
   that does not ship.

A third, smaller seam: the native transform consumer emitted a composite
`transform: translate3d(var(--czap-<t>-x),var(--czap-<t>-y),var(--czap-<t>-z))`.
A single `transform` clobbers any author-set `rotate`/`scale`/`transform` on the
same boundary — the axes could not compose independently.

## Decision

**Serialize any catalog curve to a sampled `points` descriptor read by ONE producer
(Law 4), emit translation through the INDIVIDUAL `translate:` CSS property, and route
the differently-eased composed case to the per-window runtime floor — retiring the
`mixed-easing-overlap-approximated` diagnostic.**

- **Generalized `linear()` easing (one producer, both floors).**
  `Easing.easingToLinearCSS(fn, sampleCount)` (`packages/core/src/easing.ts`) is the
  SINGLE sampler that turns ANY easing function into a `linear(p0, …, pN)` string.
  `Easing.springToLinearCSS` now delegates to it (byte-identical output).
  `RuntimeEasing` gains a serialized `points?: readonly number[]` arm and a widened
  `kind` (`… | 'points' | 'bounce' | 'elastic' | 'back' | 'cubicBezier'`).
  `sampleRuntimeEasing`'s new `points` arm lerps that list piecewise-linearly —
  `x = clamp01(t)·(n)`, floor to the bracketing stop, lerp the fraction — which IS the
  browser's reading of the emitted `linear()` stops. The native leg emits the SAME
  stops (`resolveStepEasing` in `packages/compiler/src/motion.ts` prints the stored
  `points` verbatim). A browser scrubbing the JS floor and a browser running native
  `linear(...)` therefore sample one curve BY CONSTRUCTION — the byte-law extended
  from spring to the whole catalog. The differential oracle
  (`tests/unit/core/motion-parity.test.ts`) adds a `catalog-points-bounce` fixture and
  bit-exact points-descriptor rows that pin it.

- **Individual transform property.** `appendTranslateConsumer`
  (`packages/compiler/src/motion-utils.ts`) emits
  `translate: var(--czap-<t>-x,0px) var(--czap-<t>-y,0px) var(--czap-<t>-z,0px)` — the
  CSS individual `translate` property, which composes independently of `rotate`,
  `scale`, and any author `transform`. The runtime floor keeps writing the SAME
  `--czap-<t>-*` vars, so both legs still read one source. No `translate3d` is emitted.

- **The runtime floor is the differently-eased renderer; the diagnostic is retired.**
  `buildKeyframes` (`packages/core/src/transition-program.ts`) no longer emits
  `mixed-easing-overlap-approximated`. A composed program's faithful renderer is the
  per-window runtime floor, which samples each `RuntimeWriteWindow.easing` at its own
  eased progress — verified by the oracle's `differently-eased par` rows (each non-CSS
  target equals the per-window kernel exactly; each window's curve serializes to a
  `linear()` the floor lerps bit-exactly). The native single-`@keyframes` leg is
  reserved for single transitions and uniform-easing programs, where one
  `animation-timing-function` is faithful.

## Consequences

- The full `Easing` catalog is now expressible on every floor: a bounce/elastic/back/
  cubic-bezier curve is serialized once and read identically by the JS floor and native
  CSS. New additive public surface (minor bump, pre-1.0): `@czap/core`
  `Easing.easingToLinearCSS` and the widened `RuntimeEasing`. `springToLinearCSS` is
  retained (delegates), so its consumers (`@czap/quantizer`) are untouched.
- Translation composes with other individual transforms — a boundary can carry a
  `translate` track alongside an author `rotate`/`scale` without one clobbering the
  other.
- The motion diagnostic set loses `mixed-easing-overlap-approximated`. This is not a
  silenced approximation: the composed differently-eased case now has a faithful
  renderer (the runtime floor) that is asserted exact, and the native leg that could not
  express it is no longer asked to.
- Lockstep version bump 0.13.0 → 0.14.0 (all `@czap/*`), api-surface snapshot regen,
  api-health registry entry for `easingToLinearCSS`.

## Evidence

- `tests/unit/core/motion-parity.test.ts` — `points-descriptor easings … bit-exact
  (Law 4)` (floor lands on every emitted stop; intermediate is piecewise-linear),
  `catalog-points-bounce` oracle rows across every target, and `differently-eased par —
  the #148 case` (no diagnostic; per-window kernel parity; per-window Law-4).
- `tests/property/easing.prop.test.ts` — `easingToLinearCSS` == direct fn samples.
- `tests/unit/core/reveal.test.ts` / `scroll-timeline.test.ts` /
  `motion-primitives.prop.test.ts` — native leg emits `translate:`, never `translate3d`.
- `tests/unit/astro/motion-runtime.test.ts` — `parseMotionProgram` accepts the widened
  kinds + serialized `points` arm and rejects malformed ones LOUDLY.

## Rejected alternatives

- **Split every composed program into per-property `@keyframes` tracks with
  `animation-composition: accumulate`.** This would let the NATIVE leg render a
  differently-eased `par` exactly (not only the runtime floor). It is the natural next
  step, but it re-shapes the frozen `CssMotionPlan` (a `tracks` field), the compiler
  emission model (N `@keyframes` + an N-entry `animation` list), and every plan
  consumer + the api-surface snapshot + docs — a large change carrying real regression
  risk across 25 packages. Deferred: the runtime floor already renders the case
  faithfully and is where composed programs ship, so the native-track split buys native
  fidelity for a path production does not currently take. Tracked as future work; NOT
  built in this change.
- **Keep the `mixed-easing-overlap-approximated` diagnostic.** It flagged a native
  approximation composed programs never emit (they ship on the runtime floor). Retiring
  it removes a false alarm; keeping it would imply the native leg is the renderer for
  composed motion, which it is not.
- **Widen `RevealTransition.easing` to author catalog curves directly, and wire a
  view-transition compile surface into `reveal-compile`.** Out of scope here. Authoring
  still resolves to `linear|ease|spring`; catalog curves reach the floor via the
  serialized `points` arm (e.g. a pre-sampled descriptor). Deferred.
- **Emit `transform: translate3d(...)`** (the prior consumer) — a composite `transform`
  clobbers author `rotate`/`scale`/`transform`. The individual `translate` property
  composes; chosen.

## Follow-up (explicitly NOT built in this change)

- Per-property native `@keyframes` tracks + `animation-composition` (native fidelity for
  differently-eased `par`).
- Time-trigger state-keyed `@keyframes` fallback + the monotonic-only `transition`
  contract, and `transition-behavior: allow-discrete` (#149).
- `RevealTransition.easing` catalog authoring and the `view-transition` compile-surface
  wiring (`packages/compiler/src/view-transition-compile.ts` exists and is unit-tested
  but is not yet barrel-exported or wired into `reveal-compile`).

## References

- `packages/core/src/easing.ts` — `easingToLinearCSS`, `sampleRuntimeEasing` points arm,
  widened `RuntimeEasing`
- `packages/core/src/transition-program.ts` — `buildKeyframes` (diagnostic retired)
- `packages/core/src/interpret-transition.ts` — `CssKeyframeStep.easing` (points arm)
- `packages/compiler/src/motion.ts` — `resolveStepEasing` (generalized per-keyframe
  timing function)
- `packages/compiler/src/motion-utils.ts` — `appendTranslateConsumer` (individual
  `translate:`)
- `packages/astro/src/runtime/motion.ts` — `parseMotionProgram` widened-easing guard
- Supersedes the FIRST rejected alternative of **ADR-0040**; builds on **ADR-0035**
  (motion is intent) and **ADR-0039** (the `TransitionProgram` algebra).
- Epic #148 (this decision); #149 parked in Follow-up.
