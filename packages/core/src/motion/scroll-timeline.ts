/**
 * Scroll-timeline intent — standalone scroll-driven motion primitive (#126).
 *
 * Lowers to Signal → Entity → Component → Pose×2 → Transition → Policy → Projection
 * and compiles through `interpretTransition` with native `animation-timeline: scroll()`
 * plus a runtime leaf-write floor when scroll timelines are unsupported.
 *
 * @module
 */

import type { ContentAddress, IntegrityDigest, StateName } from '../schema/brands.js';
import { Cap, type CapTier } from '../evidence/caps.js';
import { sealGraph, sealNode } from '../graph/document-graph-address.js';
import type {
  ComponentNode,
  DocumentGraph,
  DocumentGraphEdge,
  EntityNode,
  PolicyNode,
  PoseNode,
  ProjectionNode,
  SignalNode,
  TransitionNode,
} from '../graph/document-graph.js';
import { projectionKeys } from '../graph/projection.js';
import type { CellMeta } from '../schema/protocol.js';
import { sourceToInput } from '../reactive/signal-input.js';
import type { MotionTier } from '../evidence/ui-quality.js';
import { motionPropToBinding, type RevealPolicy, type RevealTransition } from './reveal.js';

/** Scroll axis for the timeline signal and CSS `scroll()` scroller. */
export type ScrollTimelineAxis = 'progress' | 'y' | 'x' | 'block' | 'inline';

/** Authoring input to {@link ScrollTimeline.intent}. */
export interface ScrollTimelineIntentInput {
  readonly target: string;
  readonly axis?: ScrollTimelineAxis;
  readonly range: readonly [string, string];
  readonly from: Readonly<Record<string, number | string>>;
  readonly to: Readonly<Record<string, number | string>>;
  readonly transition: RevealTransition;
  readonly policy: RevealPolicy;
}

/** Sealed scroll-timeline intent — data over graph, no behavior authority. */
export interface ScrollTimelineIntent extends ScrollTimelineIntentInput {
  readonly _tag: 'ScrollTimelineIntent';
}

/** Graph bundle produced by {@link lowerScrollTimelineIntent}. */
export interface LoweredScrollTimeline {
  readonly graph: DocumentGraph;
  readonly intent: ScrollTimelineIntent;
  readonly transitionId: ContentAddress;
  readonly componentId: ContentAddress;
  readonly entityId: ContentAddress;
  readonly policyId: ContentAddress;
  readonly projectionId: ContentAddress;
}

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'scroll-timeline' },
  updated: { wall_ms: 0, counter: 0, node_id: 'scroll-timeline' },
  version: 1,
};

const BEFORE: StateName = 'before' as StateName;
const AFTER: StateName = 'after' as StateName;

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

function axisToSignalInput(axis: ScrollTimelineAxis | undefined): ReturnType<typeof sourceToInput> {
  switch (axis) {
    case 'y':
    case 'block':
      return sourceToInput({ type: 'scroll', axis: 'y' });
    case 'x':
    case 'inline':
      return sourceToInput({ type: 'scroll', axis: 'x' });
    case 'progress':
    default:
      return sourceToInput({ type: 'scroll', axis: 'progress' });
  }
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
 * Lower a {@link ScrollTimelineIntent} into real DocumentGraph node families.
 *
 * The signal always maps to a scroll axis; CSS compilation uses
 * `animation-timeline: scroll()` with the authored `range`.
 */
export function lowerScrollTimelineIntent(intent: ScrollTimelineIntent): LoweredScrollTimeline {
  const signal = sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '' as ContentAddress,
    meta: META,
    input: axisToSignalInput(intent.axis),
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
    routing: 'seq',
    durationMs: intent.transition.durationMs,
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

/**
 * Resolve the discrete state for SSR / reduced-motion first paint (#126).
 * When `reducedMotion: 'settle'` and the user prefers reduced motion, settle
 * immediately to the `after` pose — no scroll-driven tween.
 */
export function resolveScrollTimelineInitialState(
  intent: ScrollTimelineIntent,
  opts: { prefersReducedMotion: boolean },
): 'before' | 'after' {
  if (opts.prefersReducedMotion && intent.policy.reducedMotion === 'settle') {
    return 'after';
  }
  return 'before';
}

/** Authoring sugar namespace — data over intent, no behavior authority. */
export const ScrollTimeline = {
  /** Seal a scroll-timeline intent from authoring input. */
  intent(input: ScrollTimelineIntentInput): ScrollTimelineIntent {
    return Object.freeze({ _tag: 'ScrollTimelineIntent', ...input });
  },
} as const;
