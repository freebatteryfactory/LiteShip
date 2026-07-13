# ADR-0040 — Cross-target motion parity: sample ONE kernel, prove it by a differential oracle

**Status:** Accepted
**Date:** 2026-07-13

## Context

ADR-0035 established that authored motion is an intent that lowers to a CSS
projection plan + a runtime leaf-write floor; ADR-0039 replaced the routing LABEL
with a `TransitionProgram` algebra whose `runtime.windows` are per-window
sub-samplers. But authored motion only ever reached TWO surfaces: the native CSS
`@keyframes` (`MotionCompiler`) and the browser runtime floor (`client:motion` →
`writeContinuousMap`). The other render targets modelled a DIFFERENT concept —
`@czap/scene`'s video-CROSSFADE `_blend` (`systems/transition.ts`, a compositor mix
between two `Between` entities) — and `@czap/worker` had no motion surface at all.

Two risks followed from having no shared reader across targets (#130, the capstone):

1. **Drift.** Each surface that wanted authored motion would re-derive it, and the
   value a browser scrubs, a video export bakes, and a worker posts could silently
   diverge — with nothing asserting they agree.
2. **The declarative gap.** The CSS `@keyframes` were built by a PARALLEL code path
   (`sampleTween`, a linear interpolator distinct from the runtime `sampleProgramWindows`),
   so "the CSS and the runtime render the same curve" was an unverified claim.

## Decision

**Formalize ONE shared kernel `sampleProgram` (`@czap/core`) that EVERY non-CSS target
samples, generate the declarative CSS `@keyframes` from that SAME kernel, and pin all
targets to it with a differential oracle.** Authored-motion sampling is ADDITIVE to the
video-crossfade `_blend`, never a merge (see NON-GOAL).

- `sampleProgram(plan, t) → { cssVar, value }[]` (`transition-program.ts`) generalizes
  `sampleProgramWindows`: it handles BOTH a composed program (per-window sub-samplers)
  AND a flat single-tween plan (one implicit window `[0,1]` carrying `plan.easing`). It
  is the ONE reader the browser runtime floor, the scene system, the stage/remotion
  video legs, and the worker off-thread sampler all call. `sampleProgramUniforms`
  projects a sample to the `{ css, wgsl }` `czap:uniform-update` payload — shared verbatim
  by the browser floor (which adds the DOM writes) and the worker (which posts it).
- The declarative CSS `@keyframes` are generated from the SAME kernel: `buildKeyframes`
  and `sampleProgramWindows` both route through ONE internal window-walk (`walkWindows`).
  The CSS keyframe VALUES use `'identity'` easing — the spring/ease SHAPE rides the
  compiled `linear()` timing function, so it is never DOUBLE-eased into the stop values;
  the runtime uses the `'authored'` easing. The old `sampleTween` parallel path is gone.
- Thin per-target ADAPTERS, each a few lines wrapping `sampleProgram`:
  - `@czap/scene` — `MotionSampleSystem` / `sampleSceneMotion`: writes each sampled leaf
    as a `motion:<cssVar>` component (the `world.setComponent` seam `TransitionSystem`
    uses for `_blend`). ADDITIVE — it never reads or writes `_blend`.
  - `@czap/stage` — `sampleMotionFrames` / `exportMotionTrack`: samples per `FrameRange`
    index and content-addresses the folded frames through the SAME
    `CanonicalCbor.encode` → `AddressedDigest.of` kernel `dual-export.ts` uses.
  - `@czap/remotion` — `sampleMotionFrame` / `motionCssVars`: samples per composition
    frame for a Remotion `style`.
  - `@czap/worker` — `motionSampleMessage`: the MINIMAL net-new adapter — run
    `sampleProgramUniforms` off-thread and post the uniforms; the host relays them on the
    EXISTING `czap:uniform-update` channel. No new compositor, loop, or protocol.
- The DIFFERENTIAL ORACLE (`tests/unit/core/motion-parity.test.ts`) over a fixture corpus
  (`tests/fixtures/motion-parity/`): for each fixture × canonical sample time it computes
  the reference from `sampleProgram` and asserts EVERY target yields the same typed values.

## The epsilon (blueprint risk #6)

The non-CSS targets all CALL `sampleProgram`, so they equal the continuous reference to
`EPSILON_KERNEL = 1e-9` (float slack only). Browser CSS is DECLARATIVE: its spring is a
32-sample `linear()` approximation (`Easing.springToLinearCSS`, each stop `.toFixed(4)`),
so the CSS leg is reconstructed through the SAME 32-sample `linear()` the compiler emits —
NOT the continuous spring, which would flap. The oracle asserts the CSS leg is (a) EXACTLY
equal to that 32-sample approximation OF THE KERNEL (proving the keyframes come from
`sampleProgram`), and (b) within `EPSILON_CSS = 2e-3` of the continuous kernel. That 2e-3
is sourced from the `.toFixed(4)` quantization (≤ 5e-5) scaled by the largest fixture leaf
delta (24px translateY → ≤ 1.2e-3); spring sample times are grid-aligned to the 32 stops
so no extra piecewise-linear interpolation error enters.

## NON-GOAL

Authored-motion sampling does NOT replace or merge with `@czap/scene`'s video-crossfade
`_blend` (`systems/transition.ts`). `_blend` is a compositor mix factor between two
`Between` entities; `sampleProgram` is the authored motion program. They are different
concepts that coexist on the same world / export path. `TransitionSystem` is untouched.

## Consequences

- One authored program provably renders identically across browser CSS, browser runtime,
  scene, stage, remotion, and worker. A future target is one thin `sampleProgram` adapter
  - one oracle row.
- The differential oracle is the READER that makes each adapter load-bearing (Law 16): an
  adapter with no parity row is dead data. The oracle is verified to FAIL under a forked
  parallel path (a 0.01 perturbation of any adapter reddens 12 rows).
- Reduced-motion parity: every target settles to the identical terminal pose at `t=1`.
- New additive public surface (minor, pre-1.0): `@czap/core` `sampleProgram` /
  `sampleProgramUniforms` (+ `ProgramSample` / `ProgramUniforms`); `@czap/scene`
  `MotionSampleSystem` / `sampleSceneMotion` / `motionComponentName`; `@czap/stage`
  `sampleMotionFrames` / `exportMotionTrack`; `@czap/remotion` `sampleMotionFrame` /
  `motionCssVars`; `@czap/worker` `motionSampleMessage` / `sampleProgramUniforms`. No
  existing signature changed. `writeContinuousMap` / `buildKeyframes` were refactored to
  route through the kernel with byte-identical output (all W8/W9 tests unchanged).

## Rejected alternatives

- **Bake per-window easing into dense CSS keyframe stops + a linear timing function** —
  would let declarative CSS carry per-window springs, but re-architects `MotionCompiler`'s
  timing model and breaks the W8/W9 CSS tests. Out of scope for a parity capstone; the
  single-timing-function structure is faithful for the fixtures (single-window spring or
  multi-window linear), and the oracle documents the approximation instead.
- **Merge authored motion into the scene crossfade `_blend`** — conflates two distinct
  concepts (owner-ruled NON-GOAL). Kept additive.
- **A large worker motion subsystem** — the owner capped the worker leg at "a thin
  off-thread sampler posting a uniform." It is exactly that.

## References

- `packages/core/src/transition-program.ts` — `sampleProgram`, `sampleProgramUniforms`,
  the shared `walkWindows` kernel, `buildKeyframes` (routed through it)
- `packages/astro/src/runtime/write-continuous-map.ts` — the browser-runtime adapter
- `packages/scene/src/systems/motion.ts` — the scene adapter (ADDITIVE to `TransitionSystem`)
- `packages/stage/src/motion-export.ts` — the video-leg adapter (content-addressed)
- `packages/remotion/src/motion.ts` — the remotion adapter
- `packages/worker/src/motion-sample.ts` — the MINIMAL worker adapter
- `tests/fixtures/motion-parity/programs.ts` — the fixture corpus
- `tests/unit/core/motion-parity.test.ts` — the differential oracle
- Builds on **ADR-0035** (motion is intent) and **ADR-0039** (the `TransitionProgram`
  algebra); the shared-source parity is the motion analogue of `dual-export.ts`'s
  shared-digest proof (one source, N carriers).
- Epic #130 (this decision, the capstone); builds on #126 (the floor), #141 (the algebra).
