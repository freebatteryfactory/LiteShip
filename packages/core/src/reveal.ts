/**
 * Reveal intent — authoring sugar over Pose/Transition/Policy graph nodes (#124).
 *
 * `Reveal.intent` is data over canonical intent: it lowers to real DocumentGraph
 * node families and has no behavior authority. Motion compiles through
 * `interpretTransition` → CSS projection + runtime leaf-write floor.
 *
 * @module
 */

import type { ContentAddress, IntegrityDigest, StateName } from './brands.js';
import { Cap, type CapTier } from './caps.js';
import { sealGraph, sealNode } from './document-graph-address.js';
import type {
  ComponentNode,
  DocumentGraph,
  DocumentGraphEdge,
  DocumentGraphNode,
  EntityNode,
  PolicyNode,
  PoseNode,
  ProjectionNode,
  SignalNode,
  TransitionNode,
} from './document-graph.js';
import type { Easing, RuntimeEasing } from './easing.js';
import { formatTypedValue, parseTypedBinding } from './interpolate.js';
import { projectionKeys } from './projection.js';
import type { CellMeta } from './protocol.js';
import { sourceToInput } from './signal-input.js';
import type { SignalSource } from './signal.js';
import type { MotionTier } from './ui-quality.js';
import type { BranchCondition, TransitionProgram } from './transition-program.js';

/** Reduced-motion handling for a reveal. */
export type RevealReducedMotion = 'settle' | 'none';

/** View-timeline or scroll trigger for a reveal. */
export type RevealTrigger =
  | { readonly type: 'view'; readonly range: readonly [string, string] }
  | { readonly type: 'scroll'; readonly axis?: 'progress' | 'y' | 'x' };

/** Timing config for the reveal transition. */
export interface RevealTransition {
  readonly durationMs: number;
  readonly easing?: 'linear' | 'ease' | 'spring';
  /**
   * Spring physics for `easing: 'spring'` (ignored otherwise). Carried through to
   * the lowered {@link TransitionNode} so BOTH the CSS `linear()` and the JS floor
   * sample this ONE config; omitted ⇒ the shared `DEFAULT_MOTION_SPRING`.
   */
  readonly spring?: Easing.Config;
}

/** Policy gate for reduced-motion and motion tier. */
export interface RevealPolicy {
  readonly reducedMotion: RevealReducedMotion;
  readonly motionTier: MotionTier;
}

/** Authoring input to {@link Reveal.intent}. */
export interface RevealIntentInput {
  readonly target: string;
  readonly trigger: RevealTrigger;
  readonly from: Readonly<Record<string, number | string>>;
  readonly to: Readonly<Record<string, number | string>>;
  readonly transition: RevealTransition;
  readonly policy: RevealPolicy;
}

/** Sealed reveal intent — data over graph, no behavior authority. */
export interface RevealIntent extends RevealIntentInput {
  readonly _tag: 'RevealIntent';
}

/** Graph bundle produced by {@link lowerRevealIntent}. */
export interface LoweredReveal {
  readonly graph: DocumentGraph;
  readonly intent: RevealIntent;
  readonly transitionId: ContentAddress;
  readonly componentId: ContentAddress;
  readonly entityId: ContentAddress;
  readonly policyId: ContentAddress;
  readonly projectionId: ContentAddress;
}

/** SSR first-paint payload for a reveal boundary. */
export interface RevealSsrPaint {
  readonly state: StateName;
  readonly cssVars: Readonly<Record<string, string>>;
  readonly boundaryAttr: string;
}

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'reveal' },
  updated: { wall_ms: 0, counter: 0, node_id: 'reveal' },
  version: 1,
};

const BEFORE: StateName = 'before' as StateName;
const AFTER: StateName = 'after' as StateName;

/** Map a motion property key to a CSS custom-property binding for a target. */
export function motionPropToBinding(target: string, key: string): string {
  if (key.startsWith('--')) return key;
  if (key === 'opacity') return 'opacity';
  const motionMatch = /^translate([XYZ])$/i.exec(key);
  if (motionMatch) {
    const axis = motionMatch[1]!.toLowerCase();
    return `--czap-${target}-${axis}`;
  }
  return `--czap-${target}-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
}

function normalizeBindings(
  target: string,
  bindings: Readonly<Record<string, number | string>>,
): Readonly<Record<string, number | string>> {
  const out: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(bindings)) {
    out[motionPropToBinding(target, key)] = value;
  }
  return Object.freeze(out);
}

/** Project the authored reveal timing onto the self-describing runtime easing descriptor. */
function revealEasingDescriptor(transition: RevealTransition): RuntimeEasing {
  const kind = transition.easing ?? 'ease';
  return kind === 'spring' && transition.spring ? { kind, spring: transition.spring } : { kind };
}

function triggerToSignalInput(trigger: RevealTrigger): ReturnType<typeof sourceToInput> {
  if (trigger.type === 'view') {
    return sourceToInput({ type: 'scroll', axis: 'progress' });
  }
  const source: SignalSource =
    trigger.axis === 'y' || trigger.axis === 'x'
      ? { type: 'scroll', axis: trigger.axis }
      : { type: 'scroll', axis: 'progress' };
  return sourceToInput(source);
}

function capTierForMotionTier(tier: MotionTier): CapTier {
  switch (tier) {
    case 'none':
      return 'static';
    case 'transitions':
      return 'styled';
    case 'animations':
    case 'physics':
      return 'animated';
    case 'compute':
      return 'gpu';
  }
}

function grantsForMotionTier(tier: MotionTier): ReturnType<typeof Cap.from> {
  switch (tier) {
    case 'none':
      return Cap.from(['static']);
    case 'transitions':
      return Cap.from(['static', 'styled', 'reactive']);
    case 'animations':
      return Cap.from(['static', 'styled', 'reactive', 'animated']);
    case 'physics':
      return Cap.from(['static', 'styled', 'reactive', 'animated']);
    case 'compute':
      return Cap.from(['static', 'styled', 'reactive', 'animated', 'gpu']);
  }
}

/**
 * Resolve the discrete state for SSR / reduced-motion first paint.
 *
 * When `reducedMotion: 'settle'` and the user prefers reduced motion, the reveal
 * settles immediately to the `after` pose — no tween, no per-frame patch.
 */
export function resolveRevealInitialState(intent: RevealIntent, opts: { prefersReducedMotion: boolean }): StateName {
  if (opts.prefersReducedMotion && intent.policy.reducedMotion === 'settle') {
    return AFTER;
  }
  return BEFORE;
}

/** Compute SSR first-paint CSS custom properties for a reveal boundary. */
export function ssrRevealPaint(intent: RevealIntent, opts: { prefersReducedMotion: boolean }): RevealSsrPaint {
  const state = resolveRevealInitialState(intent, opts);
  const bindings = state === AFTER ? intent.to : intent.from;
  const normalized = normalizeBindings(intent.target, bindings);
  const cssVars: Record<string, string> = {};

  for (const [key, raw] of Object.entries(normalized)) {
    const typed = parseTypedBinding(key, raw);
    const cssKey = key.startsWith('--') ? key : projectionKeys(key).cssKey;
    cssVars[cssKey] = formatTypedValue(typed);
  }

  return Object.freeze({
    state,
    cssVars: Object.freeze(cssVars),
    boundaryAttr: intent.target,
  });
}

/**
 * Lower a {@link RevealIntent} into real DocumentGraph node families:
 * Signal → Entity → Component → Pose×2 → Transition → Policy → Projection.
 */
export function lowerRevealIntent(intent: RevealIntent): LoweredReveal {
  const signal = sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '' as ContentAddress,
    meta: META,
    input: triggerToSignalInput(intent.trigger),
  } as unknown as SignalNode);

  const component = sealNode({
    _tag: 'DocGraphComponentNode',
    _version: 1,
    family: 'component',
    id: '' as ContentAddress,
    meta: META,
    name: intent.target,
    thresholds: [0, 1],
    states: [BEFORE, AFTER],
  } as unknown as ComponentNode);

  const entity = sealNode({
    _tag: 'DocGraphEntityNode',
    _version: 1,
    family: 'entity',
    id: '' as ContentAddress,
    meta: META,
    components: [component.id],
  } as unknown as EntityNode);

  const fromPose = sealNode({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '' as ContentAddress,
    meta: META,
    entityRef: entity.id,
    state: BEFORE,
    bindings: normalizeBindings(intent.target, intent.from),
  } as unknown as PoseNode);

  const toPose = sealNode({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '' as ContentAddress,
    meta: META,
    entityRef: entity.id,
    state: AFTER,
    bindings: normalizeBindings(intent.target, intent.to),
  } as unknown as PoseNode);

  const transition = sealNode({
    _tag: 'DocGraphTransitionNode',
    _version: 1,
    family: 'transition',
    id: '' as ContentAddress,
    meta: META,
    fromPose: fromPose.id,
    toPose: toPose.id,
    // A lone reveal is ONE pose→pose step: `routing` (the edge flavor BETWEEN
    // adjacent transitions) has no adjacent edge to describe, so it is inert here
    // and defaults to `seq`. Real multi-step sequencing is a `TransitionProgram`
    // over this node (see `lowerRevealChain`), NOT this per-node label (#141).
    routing: 'seq',
    durationMs: intent.transition.durationMs,
    easing: revealEasingDescriptor(intent.transition),
  } as unknown as TransitionNode);

  const policy = sealNode({
    _tag: 'DocGraphPolicyNode',
    _version: 1,
    family: 'policy',
    id: '' as ContentAddress,
    meta: META,
    appliesTo: [component.id],
    requires: capTierForMotionTier(intent.policy.motionTier),
    grants: grantsForMotionTier(intent.policy.motionTier),
    sites: ['node', 'browser', 'worker', 'edge'],
  } as unknown as PolicyNode);

  const projection = sealNode({
    _tag: 'DocGraphProjectionNode',
    _version: 1,
    family: 'projection',
    id: '' as ContentAddress,
    meta: META,
    target: 'css',
    sourceRef: transition.id,
    keys: projectionKeys(intent.target),
    resultDigest: {
      display_id: '' as ContentAddress,
      integrity_digest: '' as IntegrityDigest,
      algo: 'sha256',
    },
  } as unknown as ProjectionNode);

  const edges: DocumentGraphEdge[] = [
    { from: signal.id, to: component.id, type: 'seq' },
    { from: component.id, to: projection.id, type: 'seq' },
    { from: transition.id, to: projection.id, type: 'seq' },
  ];

  const graph = sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta: META,
    nodes: [signal, component, entity, fromPose, toPose, transition, policy, projection],
    edges,
  } as Omit<DocumentGraph, 'id' | 'digest'>);

  return Object.freeze({
    graph,
    intent,
    transitionId: transition.id,
    componentId: component.id,
    entityId: entity.id,
    policyId: policy.id,
    projectionId: projection.id,
  });
}

/** One authored step in a {@link RevealChainInput}: a pose→pose tween on the target. */
export interface RevealChainStep {
  readonly from: Readonly<Record<string, number | string>>;
  readonly to: Readonly<Record<string, number | string>>;
  readonly transition: RevealTransition;
  /** Dead time before this step within the sequence (rides the seq offset). */
  readonly delayMs?: number;
}

/** One `choice` arm appended to a chain: a condition over a named signal → a step. */
export interface RevealChainBranch {
  readonly when: BranchCondition;
  readonly source: ReturnType<typeof sourceToInput>;
  readonly step: RevealChainStep;
}

/**
 * Authoring input to {@link lowerRevealChain} — a REAL multi-step chain on ONE
 * target: a `seq` of steps, optionally followed by a `choice` (branches + an
 * `otherwise`). Lowers to one graph + a {@link TransitionProgram} the motion floor
 * drives, replacing the pre-W9 routing-label collapse (#141).
 */
export interface RevealChainInput {
  readonly target: string;
  readonly trigger: RevealTrigger;
  readonly steps: readonly RevealChainStep[];
  readonly choice?: { readonly branches: readonly RevealChainBranch[]; readonly otherwise?: RevealChainStep };
  readonly policy: RevealPolicy;
}

/** Graph bundle + composed program produced by {@link lowerRevealChain}. */
export interface LoweredRevealChain {
  readonly graph: DocumentGraph;
  readonly program: TransitionProgram;
  readonly transitionIds: readonly ContentAddress[];
  readonly componentId: ContentAddress;
  readonly signalId: ContentAddress;
  readonly policyId: ContentAddress;
}

/**
 * Lower a {@link RevealChainInput} into ONE DocumentGraph (one signal + component +
 * entity, N pose pairs + N transitions) plus a {@link TransitionProgram} composing
 * them: `seq` over the steps, with an optional trailing `choice`. This is the
 * authoring sugar for the explicit multi-transition algebra — `interpretProgram`
 * lowers the returned program to multi-offset keyframes + per-window sub-samplers.
 */
export function lowerRevealChain(input: RevealChainInput): LoweredRevealChain {
  const signal = sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '' as ContentAddress,
    meta: META,
    input: triggerToSignalInput(input.trigger),
  } as unknown as SignalNode);

  const component = sealNode({
    _tag: 'DocGraphComponentNode',
    _version: 1,
    family: 'component',
    id: '' as ContentAddress,
    meta: META,
    name: input.target,
    thresholds: [0, 1],
    states: [BEFORE, AFTER],
  } as unknown as ComponentNode);

  const entity = sealNode({
    _tag: 'DocGraphEntityNode',
    _version: 1,
    family: 'entity',
    id: '' as ContentAddress,
    meta: META,
    components: [component.id],
  } as unknown as EntityNode);

  // Materialize the capability policy into the graph (parity with lowerRevealIntent) so
  // downstream consumers that inspect PolicyNodes — escalation / AI-cast surfaces — see the
  // chain's motion-tier policy. `RevealChainInput.policy` is required, so this is unconditional.
  const policy = sealNode({
    _tag: 'DocGraphPolicyNode',
    _version: 1,
    family: 'policy',
    id: '' as ContentAddress,
    meta: META,
    appliesTo: [component.id],
    requires: capTierForMotionTier(input.policy.motionTier),
    grants: grantsForMotionTier(input.policy.motionTier),
    sites: ['node', 'browser', 'worker', 'edge'],
  } as unknown as PolicyNode);

  const nodes: DocumentGraphNode[] = [signal, component, entity, policy];
  const transitionIds: ContentAddress[] = [];

  const mkStep = (step: RevealChainStep): ContentAddress => {
    const fromPose = sealNode({
      _tag: 'DocGraphPoseNode',
      _version: 1,
      family: 'pose',
      id: '' as ContentAddress,
      meta: META,
      entityRef: entity.id,
      state: BEFORE,
      bindings: normalizeBindings(input.target, step.from),
    } as unknown as PoseNode);
    const toPose = sealNode({
      _tag: 'DocGraphPoseNode',
      _version: 1,
      family: 'pose',
      id: '' as ContentAddress,
      meta: META,
      entityRef: entity.id,
      state: AFTER,
      bindings: normalizeBindings(input.target, step.to),
    } as unknown as PoseNode);
    const transition = sealNode({
      _tag: 'DocGraphTransitionNode',
      _version: 1,
      family: 'transition',
      id: '' as ContentAddress,
      meta: META,
      fromPose: fromPose.id,
      toPose: toPose.id,
      routing: 'seq',
      durationMs: step.transition.durationMs,
      easing: revealEasingDescriptor(step.transition),
    } as unknown as TransitionNode);
    nodes.push(fromPose, toPose, transition);
    transitionIds.push(transition.id);
    return transition.id;
  };

  // ONE step-body builder for every arm — a top-level seq child AND a choice arm are
  // both `step`s, so each must carry its `delayMs` into the TransitionProgram step.
  // (The choice arms previously dropped it, so a selected branch started immediately and
  // the lowered total/window offsets came out too short.)
  const mkStepBody = (step: RevealChainStep): TransitionProgram => ({
    kind: 'step',
    transitionId: mkStep(step),
    ...(step.delayMs !== undefined ? { delayMs: step.delayMs } : {}),
  });

  const seqChildren: TransitionProgram[] = input.steps.map(mkStepBody);

  if (input.choice) {
    const branches = input.choice.branches.map((branch) => ({
      when: branch.when,
      source: branch.source,
      body: mkStepBody(branch.step),
    }));
    const choiceProgram: TransitionProgram = {
      kind: 'choice',
      branches,
      ...(input.choice.otherwise ? { otherwise: mkStepBody(input.choice.otherwise) } : {}),
    };
    seqChildren.push(choiceProgram);
  }

  const graph = sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta: META,
    nodes,
    edges: [{ from: signal.id, to: component.id, type: 'seq' }],
  } as Omit<DocumentGraph, 'id' | 'digest'>);

  return Object.freeze({
    graph,
    program: { kind: 'seq', children: seqChildren } as TransitionProgram,
    transitionIds: Object.freeze(transitionIds),
    componentId: component.id,
    signalId: signal.id,
    policyId: policy.id,
  });
}

/** Authoring sugar namespace — data over intent, no behavior authority. */
export const Reveal = {
  /** Seal a reveal intent from authoring input. */
  intent(input: RevealIntentInput): RevealIntent {
    return Object.freeze({ _tag: 'RevealIntent', ...input });
  },
  /** Author a multi-step chain (`seq` + optional `choice`) → graph + {@link TransitionProgram}. */
  chain: lowerRevealChain,
} as const;
