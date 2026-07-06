# ADR-0035 — Motion is an authored intent, not a projection target

**Status:** Accepted
**Date:** 2026-07-06

## Context

LiteShip is growing an authored-motion + self-managing-state layer over the
DocumentGraph (epic #130). The keystone: `PoseNode` (a keyframe) and `TransitionNode`
(a tween with `fromPose`/`toPose`/`routing: EdgeType`/`durationMs`) are typed and
content-addressed, but nothing interprets them — the sequencing algebra has no reader
(`graph-lower.ts` lowers Poses to discrete channels and never consults `routing`/
`durationMs`). Building that interpreter forces a taxonomy question: is `motion` a new
projection target?

Four distinct target/output vocabularies exist today, and `motion`/`html`/`runtime`/
`dom` appear in none of them (`video` is a carrier, not a target; `svg` is in both
target and carrier):

| Vocabulary | Values | Source |
|---|---|---|
| `ProjectionNode.target` (output surface) | `css, glsl, wgsl, aria, ai, config, svg` | `packages/core/src/document-graph.ts:104` |
| `ExportNode.carrier` (produced artifact) | `astro-page, video, svg, ship-capsule, receipt` | `document-graph.ts:133` |
| `LadderTarget` (capability rung) | `css, glsl, wgsl, aria, ai` | `packages/core/src/cap-ladder.ts:29` |
| `RuntimePhase` (execution lane) | `compute-discrete, compute-blend, emit-css/glsl/wgsl/aria` | `packages/core/src/runtime-coordinator.ts:23` |

## Decision

**Motion is an authored intent, not a projection target.** A projection target names an
*output surface*; motion names *transition semantics* that lower into existing surfaces.

A `MotionIntent` lowers into:
1. a **CSS projection plan** (`target: 'css'` — `@property` / `@keyframes` /
   `@starting-style` / `animation-timeline` / transitions);
2. a **runtime leaf-write plan** — NOT a projection; it rides the law that discrete
   crossings patch the graph while continuous transients are leaf writes (ADR-0021,
   ADR-0027);
3. an optional **GPU uniform plan**;
4. an optional **export/video plan** (`carrier: 'video'`);
5. an optional **external adapter plan** (Motion; later — GSAP is barred as a
   first-party dependency by its Webflow-competitive license).

No change is made to `ProjectionNode.target`, `LadderTarget`, or `RuntimePhase`.

## Consequences

- The target / carrier / ladder / phase unions stay closed and exhaustiveness-checked;
  there is no junk-drawer `motion` target meaning "some CSS + some runtime."
- The `TransitionNode` interpreter (`interpretTransition`, #130 child 2) emits a `css`
  projection plan + a runtime write plan, not a new node target.
- The continuous-writer law is preserved: only discrete crossings patch the graph;
  continuous transients (`scroll.progress`, `pointer`, `audio.amplitude`, `time`) are
  leaf writes and never replayable graph events (this is also the #133 stream-replay
  discriminator).
- Adding a genuinely new output surface later (e.g. `html` when DPU lands) is a
  deliberate union change gated by a taxonomy-drift guard, not an accident.

## Evidence

- Target vocabularies verified: `document-graph.ts:104,133`, `cap-ladder.ts:29`,
  `runtime-coordinator.ts:23`.
- `PoseNode` / `TransitionNode` model + `EdgeType` sequencing algebra:
  `document-graph.ts:83-96`, `plan.ts`.
- Existing CSS motion substrate that a `MotionCompiler` reuses: `style-css.ts`
  (`@starting-style`), `css.ts:352` (`@property` registration), `easing.ts:296`
  (`springToLinearCSS` — spring physics → CSS `linear()`).

## Rejected alternatives

- **A `motion` projection target** — it names no output surface; it would be a junk
  drawer for "some CSS + some runtime" and would drift from the css/runtime split the
  interpreter actually produces.
- **A `motion` runtime phase or capability-ladder rung** — motion is authored, not an
  execution lane or a capability tier; it consumes the existing css/runtime lanes.
- **Bundling GSAP as the motion engine** — its Standard License restricts no-code
  visual-animation builders that compete with Webflow, which is exactly this product's
  stated direction; motion compiles to LiteShip's own graph instead.

## References

- `docs/internal/design-authored-motion-state.md` §1 — full taxonomy write-up + slice spec
- ROADMAP.md Epic 9 — Authored Motion + Self-Managing State
- Epic #130 (authored motion), #131 (this decision), #132 (completeness gate), #133 (stream replay), #134 (wire contract)
- Related: ADR-0021 (scene live bridge — discrete crossing vs continuous tween), ADR-0027 (reactive primitives are value→wire, never value→DOM)
