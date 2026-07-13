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
  type CellMeta,
  type ContentAddress,
  type CssMotionPlan,
  type DocumentGraph,
  type DocumentGraphNode,
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
