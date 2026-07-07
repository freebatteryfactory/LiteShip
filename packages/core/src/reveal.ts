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
  EntityNode,
  PolicyNode,
  PoseNode,
  ProjectionNode,
  SignalNode,
  TransitionNode,
} from './document-graph.js';
import { formatTypedValue, parseTypedBinding } from './interpolate.js';
import { projectionKeys } from './projection.js';
import type { CellMeta } from './protocol.js';
import { sourceToInput } from './signal-input.js';
import type { SignalSource } from './signal.js';
import type { MotionTier } from './ui-quality.js';

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

/** Authoring sugar namespace — data over intent, no behavior authority. */
export const Reveal = {
  /** Seal a reveal intent from authoring input. */
  intent(input: RevealIntentInput): RevealIntent {
    return Object.freeze({ _tag: 'RevealIntent', ...input });
  },
} as const;
