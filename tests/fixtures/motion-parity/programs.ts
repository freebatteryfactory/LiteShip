/**
 * Motion-parity fixture corpus (#130) — a handful of authored motion programs, each
 * lowered to the {@link RuntimeWritePlan} + {@link CssMotionPlan} the differential oracle
 * samples across every target. Programs are built DIRECTLY (no `Reveal` sugar) with
 * `--czap-*` / `opacity` property names so a CSS `property` key equals its runtime `cssVar`
 * — the oracle can then compare the CSS leg (property-keyed) against the kernel reference
 * (cssVar-keyed) without a rename step.
 *
 * Canonical sample times per fixture cover the spec's checkpoints: begin (0), an
 * intermediate (0.5), each seq window boundary, the parallel-overlap point, each choice
 * branch's selected sample, a cancelled-at-0.5 sample, and the reduced-motion final (1).
 *
 * @module
 */

import {
  sealNode,
  sealGraph,
  interpretTransition,
  interpretProgram,
  Easing,
  type CellMeta,
  type ContentAddress,
  type CssMotionPlan,
  type DocumentGraph,
  type DocumentGraphNode,
  type LoweredMotionPlan,
  type PoseNode,
  type RuntimeEasing,
  type RuntimeWritePlan,
  type TransitionNode,
  type EntityNode,
  type ComponentNode,
  type SignalNode,
  type TransitionProgram,
} from '@czap/core';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

const signal = sealNode({
  _tag: 'DocGraphSignalNode',
  _version: 1,
  family: 'signal',
  id: '',
  meta: META,
  input: 'scroll.progress',
} as unknown as SignalNode);

const component = sealNode({
  _tag: 'DocGraphComponentNode',
  _version: 1,
  family: 'component',
  id: '',
  meta: META,
  name: 'hero',
  thresholds: [0, 1],
  states: ['before', 'after'],
} as unknown as ComponentNode);

const entity = sealNode({
  _tag: 'DocGraphEntityNode',
  _version: 1,
  family: 'entity',
  id: '',
  meta: META,
  components: [component.id],
} as unknown as EntityNode);

interface Step {
  readonly transitionId: ContentAddress;
  readonly nodes: DocumentGraphNode[];
}

/** Build a single transition step (from/to poses on the shared hero entity) with an easing. */
function makeStep(
  from: Record<string, number | string>,
  to: Record<string, number | string>,
  durationMs: number,
  easing: RuntimeEasing,
): Step {
  const fromPose = sealNode({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '',
    meta: META,
    entityRef: entity.id,
    state: 'before',
    bindings: from,
  } as unknown as PoseNode);
  const toPose = sealNode({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '',
    meta: META,
    entityRef: entity.id,
    state: 'after',
    bindings: to,
  } as unknown as PoseNode);
  const transition = sealNode({
    _tag: 'DocGraphTransitionNode',
    _version: 1,
    family: 'transition',
    id: '',
    meta: META,
    fromPose: fromPose.id,
    toPose: toPose.id,
    routing: 'seq',
    durationMs,
    easing,
  } as unknown as TransitionNode);
  return { transitionId: transition.id, nodes: [fromPose, toPose, transition] };
}

function makeGraph(steps: Step[]): DocumentGraph {
  return sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta: META,
    nodes: [signal, component, entity, ...steps.flatMap((s) => s.nodes)],
    edges: [{ from: signal.id, to: component.id, type: 'seq' }],
  } as Omit<DocumentGraph, 'id' | 'digest'>);
}

const LINEAR: RuntimeEasing = { kind: 'linear' };
const SPRING: RuntimeEasing = { kind: 'spring' };
const EASE: RuntimeEasing = { kind: 'ease' };

/**
 * Parse a CSS `linear(p0, p1, …, pN)` string back to its numeric point list — the SAME
 * list the JS floor lerps for the `points` descriptor arm (Law 4, the byte-law).
 */
export function parseLinearPoints(css: string): readonly number[] {
  return css.slice('linear('.length, -1).split(', ').map(Number);
}

/**
 * A widened-catalog easing serialized to a `points` descriptor (#148 / Wave-4): a
 * catalog curve (`easeOutBounce`) is sampled ONCE by `Easing.easingToLinearCSS` into
 * the CSS `linear()` point list, and the JS floor carries the IDENTICAL parsed points so
 * `sampleRuntimeEasing` lerps exactly what the native `linear()` renders — bit-exact
 * parity by construction. Non-monotone (the bounce overshoots then settles), which is
 * precisely what a scalar `kind` vocabulary could never serialize.
 */
const BOUNCE_POINTS = parseLinearPoints(Easing.easingToLinearCSS(Easing.easeOutBounce, 32));
const POINTS_BOUNCE: RuntimeEasing = { kind: 'points', points: BOUNCE_POINTS };

/** One lowered fixture: the runtime + CSS plans, the CSS timing easing, and canonical sample times. */
export interface MotionParityFixture {
  readonly name: string;
  /** The lowered runtime plan every non-CSS adapter samples. */
  readonly plan: RuntimeWritePlan;
  /** The CSS projection whose `keyframes` the CSS leg reconstructs. */
  readonly css: CssMotionPlan;
  /**
   * The SINGLE `animation-timing-function` easing the compiled CSS carries. For the
   * spring reveal it is the spring (whose declarative form is the 32-sample `linear()`);
   * for the linear programs it is identity. Programs with per-window easing are all
   * linear here, so one timing function faithfully represents the whole track.
   */
  readonly cssTiming: RuntimeEasing;
  /** Canonical normalized sample times the oracle checks. */
  readonly sampleTimes: readonly number[];
  /** The authored terminal pose (each animated leaf's `to`), keyed by cssVar — the settle target. */
  readonly terminalPose: Readonly<Record<string, string>>;
  /** True for the reduced-motion fixture — the oracle asserts every target settles to `terminalPose` at t=1. */
  readonly reducedMotion?: boolean;
}

// -- 1. Single reveal (SPRING) — exercises the 32-sample linear() approximation ---------
const revealStep = makeStep(
  { opacity: 0, '--czap-hero-y': '24px' },
  { opacity: 1, '--czap-hero-y': '0px' },
  420,
  SPRING,
);
const revealGraph = makeGraph([revealStep]);
const revealPlan = interpretTransition(revealGraph, revealStep.transitionId);

// -- 2. Seq of 2 (LINEAR) — opacity over [0,0.25], then x over [0.25,1] ------------------
const seqA = makeStep({ opacity: 0 }, { opacity: 1 }, 200, LINEAR);
const seqB = makeStep({ '--czap-hero-x': '0px' }, { '--czap-hero-x': '100px' }, 600, LINEAR);
const seqGraph = makeGraph([seqA, seqB]);
const seqProgram: TransitionProgram = {
  kind: 'seq',
  children: [
    { kind: 'step', transitionId: seqA.transitionId },
    { kind: 'step', transitionId: seqB.transitionId },
  ],
};
const seqPlan = interpretProgram(seqGraph, seqProgram);

// -- 3. Par of 2 (LINEAR) — both from 0; short opacity holds after 200/600 --------------
const parProgram: TransitionProgram = {
  kind: 'par',
  children: [
    { kind: 'step', transitionId: seqA.transitionId },
    { kind: 'step', transitionId: seqB.transitionId },
  ],
};
const parPlan = interpretProgram(seqGraph, parProgram);

// -- 4. Choice with 2 branches (LINEAR) — width gates opacity vs x -----------------------
const choiceProgram: TransitionProgram = {
  kind: 'choice',
  branches: [
    {
      when: { op: 'gte', value: 768 },
      source: 'viewport.width' as never,
      body: { kind: 'step', transitionId: seqA.transitionId },
    },
  ],
  otherwise: { kind: 'step', transitionId: seqB.transitionId },
};
const choiceWidePlan = interpretProgram(seqGraph, choiceProgram, { signals: { 'viewport.width': 1024 } });
const choiceNarrowPlan = interpretProgram(seqGraph, choiceProgram, { signals: { 'viewport.width': 320 } });

// -- 5. Widened-catalog easing via a `points` descriptor (bounce) -----------------------
// A single reveal whose easing is the serialized `easeOutBounce` point list. The native
// CSS `linear()` and the JS floor read the SAME points → bit-exact Law 4 across targets.
const pointsBounceStep = makeStep(
  { opacity: 0, '--czap-hero-y': '24px' },
  { opacity: 1, '--czap-hero-y': '0px' },
  420,
  POINTS_BOUNCE,
);
const pointsBounceGraph = makeGraph([pointsBounceStep]);
const pointsBouncePlan = interpretTransition(pointsBounceGraph, pointsBounceStep.transitionId);

// -- 6. Par of DIFFERENTLY-EASED children — the #148 case --------------------------------
// Two overlapping children on distinct properties with DIFFERENT curves (opacity LINEAR,
// x EASE). One per-keyframe `animation-timing-function` cannot serve the overlap, so the
// old planner diagnosed `mixed-easing-overlap-approximated` and dropped the native curve;
// the Wave-4 track lowering renders each child's curve exactly (no diagnostic). The
// runtime floor ALWAYS sampled each window at its own easing — this fixture pins that the
// native/CSS path now matches it too.
const parEasedA = makeStep({ opacity: 0 }, { opacity: 1 }, 200, LINEAR);
const parEasedB = makeStep({ '--czap-hero-x': '0px' }, { '--czap-hero-x': '100px' }, 600, EASE);
const parEasedGraph = makeGraph([parEasedA, parEasedB]);
const parEasedProgram: TransitionProgram = {
  kind: 'par',
  children: [
    { kind: 'step', transitionId: parEasedA.transitionId },
    { kind: 'step', transitionId: parEasedB.transitionId },
  ],
};

/**
 * The lowered differently-eased `par` (#148). Exported whole (not as a
 * {@link MotionParityFixture}) so the oracle can read its `diagnostics` — the assertion
 * that the `mixed-easing-overlap-approximated` approximation is GONE — and its
 * `runtime.windows`, each carrying its child's own easing.
 */
export const differentlyEasedParLowered: LoweredMotionPlan = interpretProgram(parEasedGraph, parEasedProgram);

/** Canonical sample times for the differently-eased par: begin, the short-child seam (200/600), 0.5, terminal. */
export const DIFFERENTLY_EASED_PAR_SAMPLE_TIMES: readonly number[] = [0, 200 / 600, 0.5, 1];

/** The lowered corpus every target samples in the differential oracle. */
export const MOTION_PARITY_FIXTURES: readonly MotionParityFixture[] = [
  {
    name: 'single-reveal-spring',
    plan: revealPlan.runtime!,
    css: revealPlan.css!,
    cssTiming: SPRING,
    // Grid-aligned to the 32-sample linear() so the CSS leg carries no extra
    // piecewise-linear interpolation error (0=0/32, 0.5=16/32, 1=32/32).
    sampleTimes: [0, 0.5, 1],
    terminalPose: { opacity: '1', '--czap-hero-y': '0px' },
  },
  {
    name: 'seq-2-linear',
    plan: seqPlan.runtime!,
    css: seqPlan.css!,
    cssTiming: LINEAR,
    // begin, the seq seam (0.25), a cancelled-at-0.5 point, terminal.
    sampleTimes: [0, 0.25, 0.5, 1],
    terminalPose: { opacity: '1', '--czap-hero-x': '100px' },
  },
  {
    name: 'par-2-linear',
    plan: parPlan.runtime!,
    css: parPlan.css!,
    cssTiming: LINEAR,
    // begin, the parallel-overlap point where the short child completes (200/600), 0.5, terminal.
    sampleTimes: [0, 200 / 600, 0.5, 1],
    terminalPose: { opacity: '1', '--czap-hero-x': '100px' },
  },
  {
    name: 'choice-wide-opacity',
    plan: choiceWidePlan.runtime!,
    css: choiceWidePlan.css!,
    cssTiming: LINEAR,
    sampleTimes: [0, 0.5, 1],
    terminalPose: { opacity: '1' },
  },
  {
    name: 'choice-narrow-x',
    plan: choiceNarrowPlan.runtime!,
    css: choiceNarrowPlan.css!,
    cssTiming: LINEAR,
    sampleTimes: [0, 0.5, 1],
    terminalPose: { '--czap-hero-x': '100px' },
  },
  {
    name: 'catalog-points-bounce',
    plan: pointsBouncePlan.runtime!,
    css: pointsBouncePlan.css!,
    cssTiming: POINTS_BOUNCE,
    // Grid-aligned to the 32-stop point list (0.25·32 = 8, 0.5·32 = 16, …) so the CSS
    // leg lands exactly on stops — no piecewise-linear interpolation error, and the
    // kernel reference (which now samples the SAME points) equals it bit-for-bit.
    sampleTimes: [0, 0.25, 0.5, 0.75, 1],
    terminalPose: { opacity: '1', '--czap-hero-y': '0px' },
  },
  {
    name: 'reduced-motion-settle',
    plan: seqPlan.runtime!,
    css: seqPlan.css!,
    cssTiming: LINEAR,
    // Reduced motion pins t=1; the oracle asserts every target settles to `terminalPose`.
    sampleTimes: [1],
    terminalPose: { opacity: '1', '--czap-hero-x': '100px' },
    reducedMotion: true,
  },
];
