# Design note: Authored Motion + Self-Managing State over DocumentGraph

Status: **ratified** — the taxonomy decision (§1) is now **ADR-0035**
(`docs/adr/0035-motion-is-intent-not-target.md`); this note remains the impl-ready
spec, the ADR is the canonical decision record. (ADR-0034 stays reserved for the
QUERY write-sink-unreachability gate.)

Origin: three independent investigations (a 4-agent repo deep-read + two external
passes) converged on one keystone without coordinating — so it is recorded here as
the load-bearing finding, not a hunch.

---

## 0. The keystone, in one sentence

`TransitionNode` is typed, content-addressed, and sitting in the graph — and
**nothing reads it.** `graph-lower.ts` lowers `PoseNode`s into discrete per-state
channels but never consults `TransitionNode.routing` / `durationMs`. LiteShip is
not missing an animation library; it is missing the **interpreter** that turns the
motion data it already models into motion. Everything below is how we wake it up
without lighting scope on fire.

Verified substrate (source-anchored, all present today):
- `PoseNode { entityRef, state, bindings: Record<string, number|string> }` — a **keyframe** (`document-graph.ts:83-88`).
- `TransitionNode { fromPose, toPose, routing: EdgeType, durationMs? }` — a **tween** (`document-graph.ts:91-96`); `EdgeType = seq|par|choice_then|choice_else` (`plan.ts`) — the **sequencing algebra**.
- `PolicyNode { requires: CapTier, grants: CapSet, budgets }` — the **reduced-motion / tier / budget gate** (`document-graph.ts:115-125`).
- `Easing.springToLinearCSS(config, sampleCount?)` — spring physics → CSS `linear()`; a motion-to-CSS compiler, **already working in miniature** (`easing.ts:296-303`).
- `scene-bridge.writeContinuous(el, cssVar, blend)` — a live per-frame eased value → DOM CSS-custom-property writer that **ships** (`scene-bridge.ts:203`); today it writes **one scalar**.
- `style-css.ts` already emits `@starting-style` / `@scope` / `@layer` / `@container`; `css.ts` already emits `@property` registrations.
- **Law, already type-encoded:** a Pose is content-addressed; per-frame transients are not (`PoseNode` docstring). Discrete crossings may patch the graph; continuous tweens are leaf writes and never patch per frame.

The single gap that is genuinely GSAP-core-shaped: `interpolate<T extends
Record<string, number>>` is **numeric-only** (`interpolate.ts:14`); `AnimatedQuantizer`
snaps non-numeric values at 50%. No color / unit / transform interpolation.

---

## 1. Step 0 — Target-taxonomy decision (do this before any interpreter code)

**Current vocabularies (verified):**

| Vocabulary | Values | File |
|---|---|---|
| `ProjectionNode.target` (output surface) | `css, glsl, wgsl, aria, ai, config, svg` | `document-graph.ts:104` |
| `ExportNode.carrier` (produced artifact) | `astro-page, video, svg, ship-capsule, receipt` | `document-graph.ts:133` |
| `QualityTierTarget` (quality tier) | `css, glsl, wgsl, aria, ai` | `quality-tiers.ts:29` |
| `RuntimePhase` (execution lane) | `compute-discrete, compute-blend, emit-css/glsl/wgsl/aria` | `runtime-coordinator.ts:23` |

`motion` / `html` / `runtime` / `dom` appear in **none** of them. `video` is a
carrier, not a target. `svg` is in both target and carrier.

**Decision: `motion` is an authored INTENT, not a projection target.**

A projection target names an *output surface*. Motion does not name a surface — it
names *transition semantics* that lower into existing surfaces. Adding a `motion`
target would create a junk-drawer target that means "some CSS + some runtime."
Instead:

```
MotionIntent  (authored)  lowers into ->
  1. CSS projection plan     (target: 'css')   — @property, @keyframes, transitions, @starting-style, animation-timeline
  2. Runtime write plan      (NOT a projection) — typed leaf writes to CSS custom props / data-liteship-* attrs
  3. GPU uniform plan (opt.)  — liteship:uniform-update for shader-bound values
  4. Export plan     (opt.)   — stage/remotion frame consumption (carrier: 'video')
  5. Adapter plan    (opt.)   — Motion/GSAP/user backend, LATER, only when CSS+runtime cannot express it
```

Consequences: **no change** to `ProjectionNode.target`, `QualityTierTarget`, or
`RuntimePhase`. The runtime write plan rides the existing continuous-writer law
(leaf write, never a per-frame patch). This keeps the taxonomy clean and is the
whole content of the Step-0 ADR.

---

## 2. The keystone epic

**Epic: Authored Motion + Self-Managing State over DocumentGraph.** Interpret
`PoseNode` + `TransitionNode` as graph-native motion/state, with typed value
interpolation, native-CSS emission, and a runtime leaf-write floor — reusing the
substrate above rather than bundling an engine.

Children (build in order; each gauntlet-gated):
0. **Target-taxonomy decision** (§1) — one-page ADR, no code.
1. **Typed value model** — the numeric-only interpolation gap.
2. **`TransitionNode` interpreter** — the keystone; reads Pose bindings + routing.
3. **N-property continuous writer** — generalize `writeContinuous`.
4. **Native-CSS motion backend** — `@keyframes`/`@property`/`animation-timeline`, reusing `springToLinearCSS`.
5. **`StateCell` / `ProjectionState`** — typed state authority over the *existing* coarse model (NOT a new reactive runtime).
6. **One vertical slice** — a single reveal, end to end, as proof.

---

## 3. The vertical slice (impl-ready — build this first, nothing else)

### 3a. Typed value model (child 1)
Replace bare-numeric interpolation with a typed value union; interpolate
within-kind, **refuse cross-kind loudly** (no 50% snap):

```ts
export type TypedValue =
  | { readonly k: 'number'; readonly v: number }
  | { readonly k: 'opacity'; readonly v: number }
  | { readonly k: 'length'; readonly v: number; readonly unit: 'px' | 'rem' | '%' | 'vw' | 'vh' }
  | { readonly k: 'angle'; readonly v: number; readonly unit: 'deg' | 'rad' | 'turn' }
  | { readonly k: 'transform'; readonly parts: readonly TransformPart[] };
// color (rgb/hsl/oklch), filter, shadow, path: later — out of the first slice.

export function interpolateTyped(from: TypedValue, to: TypedValue, eased: number): TypedValue;
// same k -> lerp component-wise (unit must match, else a loud Diagnostics.warnOnce + hold `to`)
// length px<->rem etc.: convert or refuse (decide in impl; refuse-loud is the safe default)
```
Upgrades `interpolate.ts`; fixes the `AnimatedQuantizer` snap-at-50% bug as a side effect.

### 3b. `TransitionNode` interpreter (child 2 — the keystone)
```ts
export interface LoweredMotionPlan {
  readonly graphId: ContentAddress;
  readonly target: string;              // element selector / data-liteship-* key
  readonly signals: readonly SignalInput[];
  readonly css?: CssMotionPlan;         // @keyframes + @property + (animation-timeline | transition)
  readonly runtime?: RuntimeWritePlan;  // per-property leaf-write descriptors (the floor)
  readonly diagnostics: readonly Diagnostic[];
}

export function interpretTransition(graph: DocumentGraph, transitionId: ContentAddress): LoweredMotionPlan;
// read TransitionNode { fromPose, toPose, routing, durationMs }
// read PoseNode(fromPose).bindings, PoseNode(toPose).bindings
// diff bindings -> per-property (fromTyped, toTyped) pairs (parse strings -> TypedValue)
// single step: a trivial two-frame lowering (from @0%, to @100%) — one pose→pose tween
// emit css plan AND runtime plan (both — CSS is the native path, runtime is the permanent floor)
```

**SHIPPED (#141, ADR-0039).** The initial cut folded sequencing into the `TransitionNode`'s
`routing: EdgeType` field, and the interpreter's `keyframesForRouting` collapsed
`seq`/`par`/`choice_then` to the SAME two endpoint frames — a routing LABEL, not an
algebra. That is DELETED. Real multi-transition composition is now an explicit
`TransitionProgram` IR over transitions:

```ts
type TransitionProgram =
  | { kind:'step';  transitionId; delayMs? }
  | { kind:'seq';   children: TransitionProgram[] }   // total = Σ children + delays; disjoint sub-windows
  | { kind:'par';   children: TransitionProgram[] }   // total = max child; shared window; short child holds
  | { kind:'choice'; branches:{ when:BranchCondition; source:SignalInput; body }[]; otherwise? }; // exactly one arm

// lowerTransitionProgram(graph, program, env?) -> deterministic [0,1] timeline of windows (Plan.topoSort ordering)
// interpretProgram(graph, program, env?)       -> LoweredMotionPlan: REAL multi-offset css.keyframes
//                                                 + runtime.windows (per-window sub-samplers, each with its easing)
// sampleProgramWindows(windows, t)             -> the ONE runtime reader the client:motion floor + tests share
```

`interpretTransition` stays the per-step leaf reader (the trivial two-frame path above);
`interpretProgram` walks the composition tree over it. `EdgeType` remains the edge
flavor BETWEEN adjacent transitions, not a per-node keyframe selector. Authoring sugar:
`lowerRevealChain` (seq + optional choice) and `staggerProgram` (par). See ADR-0039.

### 3c. N-property continuous writer (child 3)
Generalize the shipping one-scalar writer, preserving the law:
```ts
// today: writeContinuous(element, cssVar, blend)  — one scalar
export function writeContinuousMap(el: HTMLElement, plan: RuntimeWritePlan, t: number): void;
// for each prop: el.style.setProperty(prop.var, formatTyped(interpolateTyped(prop.from, prop.to, ease(t))))
// dispatch liteship:uniform-update for gpu-bound props (existing channel)
// NEVER GraphPatch here — continuous write is a leaf write (law)
```

### 3d. Native-CSS backend (child 4)
A `MotionCompiler` (new `CompilerDef` union arm — exhaustiveness-checked, so the
switch tells you every seam to touch) that emits `@keyframes` + `@property` +
`@starting-style` (reuse existing emit) + optional `animation-timeline: view()`,
with `springToLinearCSS` supplying `linear()` for spring easing. `@supports`-gate
the scroll-timeline path; the runtime write plan is the permanent floor.

### 3e. The one reveal (child 6 — the proof)
Authoring sugar (data over intent — no behavior authority):
```ts
const hero = Reveal.intent({
  target: 'hero',
  trigger: { type: 'view', range: ['entry 0%', 'cover 60%'] },
  from: { opacity: 0, translateY: '24px' },
  to:   { opacity: 1, translateY: '0px' },
  transition: { durationMs: 420, easing: 'spring' },
  policy: { reducedMotion: 'settle', motionTier: 'transitions' },
});
```
Lowers to REAL node families:
```
SignalNode(input: 'scroll.progress' | view-timeline range)
EntityNode(hero) + ComponentNode(hero)
PoseNode(entityRef, state:'before', bindings:{ opacity:0, '--liteship-hero-y':'24px' })
PoseNode(entityRef, state:'after',  bindings:{ opacity:1, '--liteship-hero-y':'0px' })
TransitionNode(fromPose:before, toPose:after, routing:'seq', durationMs:420)
PolicyNode(appliesTo:[hero], requires:<CapTier>, grants:<CapSet+motion>, sites, budgets)   // reduced-motion/tier gate
ProjectionNode(target:'css', sourceRef, keys, resultDigest)                                 // native cast — motion is NOT a new target
```
Emits native CSS (`@starting-style` + `@property --liteship-hero-y` + `@keyframes` +
`[data-liteship-reveal="hero"]`) with a runtime typed-property floor when the native
timeline is unavailable. Gauntlet fixture pins: graph→CSS equivalence, reduced-motion
resolves to `after` (settle), no per-frame patch, SSR first paint = resolved pose.

**Done = that one reveal compiles from graph and runs, gated. Then — and only then — expand.**

---

## 4. Guardrails (Laws for this epic)

- Continuous writes **never** `GraphPatch` per frame. Discrete crossings may patch/recast. (Already type-encoded via Pose addressing.)
- `StateCell`/`ProjectionState` is a **typed authority over the existing** graph/boundary/quantizer/dirty model — **do not build fine-grained auto-tracking reactivity (SolidJS).** LiteShip is compile-first.
- Sugar (`Reveal.intent`, presets) is **data over canonical intent**; it has no behavior authority and cannot bypass graph identity. (Precedent: `@liteship/scene` already ships `fade`/`pulse`/`ease`/`syncTo`/`Beat` as sugar over primitives.)
- Native CSS first; **typed runtime floor forever** (`@supports`-gated, feature-detected). Reduced-motion is honored at the primitive, once.
- External adapters (Motion/GSAP) wait until the graph-native interpreter exists; **GSAP is barred as a first-party dep** while LiteShip is Webflow-competitive (license). Motion (MIT, vanilla) is the eventual first optional adapter.
- WGSL honesty (#106/#107) lands **before** motion sugar — a multimedia-native framework cannot ship silent shader lies.

---

## 5. Proposed doctrine — the rigor taxonomy (candidate for SKILL.md, pending signoff)

The cure for "models call everything an invariant and cage the product." Only
**Laws** are inviolable:

| Tier | Meaning |
|---|---|
| **Law** | Must never break: security, graph identity, validation, no silent drift. |
| **Contract** | Public API promise. |
| **Receipt** | Evidence of what happened. |
| **Diagnostic** | Loud signal for bad usage — not always a blocker. |
| **Watch item** | Known risk under observation. |
| **Recipe** | Example / sugar — not law. |
| **Preset** | Data over canonical intent — not behavior authority. |

Rigor is a seatbelt that lets the product carry more expressive UI/media safely —
not a speed limiter.

---

## 6. The anti-koolaid sweep (run before trusting any "we already have it")

Negative-space search: category 1 should be EMPTY today; later categories are the
existing substrate. Keep as the standing "are we hallucinating?" check.

```bash
rg -n "MotionIntent|RevealIntent|StaggerIntent|ScrollTimelineIntent|ResponsiveMediaIntent|StateCell|ProjectionState|AnimationBackend|MotionCompiler" packages docs tests   # EMPTY
rg -n "TransitionNode|PoseNode|durationMs|routing|choice_then|choice_else|fromPose|toPose" packages docs tests                                                            # PRESENT (data)
rg -n "animation-timeline|view-timeline|scroll-timeline|transition-behavior|interpolate-size|calc-size|view-transition" packages docs tests                               # mostly ABSENT
rg -n "writeContinuous|--liteship-blend|liteship:uniform-update|style\.setProperty" packages/astro packages/web packages/scene tests                                               # PRESENT (scalar)
rg -n "AnimatedQuantizer|interpolated|Animation\.run|springToLinearCSS|lerpOutputs|interpolate\(" packages tests                                                           # PRESENT (orphaned)
rg -n "LiveCell|BoundaryCrossing|publishCrossing|RuntimeCoordinator|dirtyEpoch|stateIndex" packages tests                                                                 # PRESENT (state seed)
rg -n "gsap|framer-motion|motion/react|motion/mini|motion/dom|AOS|data-aos" packages docs tests examples                                                                  # EMPTY (no engine leak)
```

---

## 7. Tracker mapping (proposed — not yet executed)

- **New epic issue** — "epic: authored motion + self-managing state over DocumentGraph" (this note as body).
- **New issue** — "architecture: settle projection-target vs export-carrier vs runtime motion plan" (§1 decision).
- **#124** → `feat: reveal/stagger intent over @starting-style + TransitionNode interpreter` (child of epic).
- **#126** → `feat: scroll-timeline intent over TransitionNode interpreter, native CSS first + runtime floor` (child).
- **#125** → `feat: responsive-media intent over Save-Data/DPR/Client Hints` (sibling; ProjectionState, media selection not tweening).
- **#106 / #107** stay sequenced ahead of motion sugar (WGSL honesty first).
