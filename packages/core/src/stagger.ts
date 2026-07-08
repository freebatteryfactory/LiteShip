/**
 * Stagger intent — authoring sugar over parallel TransitionNodes (#124).
 *
 * Lowers N child boundaries sharing one signal; each child gets a
 * `TransitionNode` with `routing: 'par'` and a compile-time delay derived
 * from `stepMs * index`. Motion compiles through `interpretTransition` →
 * CSS projection + runtime leaf-write floor.
 *
 * @module
 */

import { ValidationError } from '@czap/error';
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
import { projectionKeys } from './projection.js';
import type { CellMeta } from './protocol.js';
import { sourceToInput } from './signal-input.js';
import type { MotionTier } from './ui-quality.js';
import { motionPropToBinding, type RevealPolicy, type RevealTransition, type RevealTrigger } from './reveal.js';

/** One staggered child boundary. */
export interface StaggerChild {
  readonly target: string;
  readonly from: Readonly<Record<string, number | string>>;
  readonly to: Readonly<Record<string, number | string>>;
}

/** Authoring input to {@link Stagger.intent}. */
export interface StaggerIntentInput {
  readonly trigger: RevealTrigger;
  readonly children: readonly StaggerChild[];
  readonly stepMs: number;
  readonly transition: RevealTransition;
  readonly policy: RevealPolicy;
}

/** Sealed stagger intent — data over graph, no behavior authority. */
export interface StaggerIntent extends StaggerIntentInput {
  readonly _tag: 'StaggerIntent';
}

/** One lowered child with its transition id and computed delay. */
export interface LoweredStaggerItem {
  readonly target: string;
  readonly transitionId: ContentAddress;
  readonly componentId: ContentAddress;
  readonly delayMs: number;
}

/** Graph bundle produced by {@link lowerStaggerIntent}. */
export interface LoweredStagger {
  readonly graph: DocumentGraph;
  readonly intent: StaggerIntent;
  readonly items: readonly LoweredStaggerItem[];
  readonly signalId: ContentAddress;
}

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'stagger' },
  updated: { wall_ms: 0, counter: 0, node_id: 'stagger' },
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

function triggerToSignalInput(trigger: RevealTrigger): ReturnType<typeof sourceToInput> {
  if (trigger.type === 'view') {
    return sourceToInput({ type: 'scroll', axis: 'progress' });
  }
  const axis = trigger.axis ?? 'progress';
  return sourceToInput({ type: 'scroll', axis });
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
 * Lower a {@link StaggerIntent} into parallel TransitionNodes sharing one signal.
 *
 * Each child gets `routing: 'par'` and the same `durationMs`; stagger offset is
 * applied at compile time as `animation-delay` / `transition-delay`.
 */
export function lowerStaggerIntent(intent: StaggerIntent): LoweredStagger {
  if (intent.children.length === 0) {
    throw ValidationError('lowerStaggerIntent', 'StaggerIntent.children must be non-empty');
  }
  if (intent.stepMs < 0 || !Number.isFinite(intent.stepMs)) {
    throw ValidationError('lowerStaggerIntent', 'StaggerIntent.stepMs must be a non-negative finite number');
  }

  const signal = sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '' as ContentAddress,
    meta: META,
    input: triggerToSignalInput(intent.trigger),
  } as unknown as SignalNode);

  const nodes: DocumentGraphNode[] = [signal];
  const edges: DocumentGraphEdge[] = [];
  const items: LoweredStaggerItem[] = [];

  for (let index = 0; index < intent.children.length; index++) {
    const child = intent.children[index]!;
    const delayMs = index * intent.stepMs;

    const component = sealNode({
      _tag: 'DocGraphComponentNode',
      _version: 1,
      family: 'component',
      id: '' as ContentAddress,
      meta: META,
      name: child.target,
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
      bindings: normalizeBindings(child.target, child.from),
    } as unknown as PoseNode);

    const toPose = sealNode({
      _tag: 'DocGraphPoseNode',
      _version: 1,
      family: 'pose',
      id: '' as ContentAddress,
      meta: META,
      entityRef: entity.id,
      state: AFTER,
      bindings: normalizeBindings(child.target, child.to),
    } as unknown as PoseNode);

    const transition = sealNode({
      _tag: 'DocGraphTransitionNode',
      _version: 1,
      family: 'transition',
      id: '' as ContentAddress,
      meta: META,
      fromPose: fromPose.id,
      toPose: toPose.id,
      routing: 'par',
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
      keys: projectionKeys(child.target),
      resultDigest: {
        display_id: '' as ContentAddress,
        integrity_digest: '' as IntegrityDigest,
        algo: 'sha256',
      },
    } as unknown as ProjectionNode);

    nodes.push(entity, component, fromPose, toPose, transition, policy, projection);
    edges.push(
      { from: signal.id, to: component.id, type: 'par' },
      { from: component.id, to: projection.id, type: 'seq' },
      { from: transition.id, to: projection.id, type: 'seq' },
    );

    items.push(
      Object.freeze({
        target: child.target,
        transitionId: transition.id,
        componentId: component.id,
        delayMs,
      }),
    );
  }

  const graph = sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta: META,
    nodes,
    edges,
  } as Omit<DocumentGraph, 'id' | 'digest'>);

  return Object.freeze({
    graph,
    intent,
    items: Object.freeze(items),
    signalId: signal.id,
  });
}

/**
 * Resolve the discrete state for SSR / reduced-motion first paint (#124).
 * When `reducedMotion: 'settle'` and the user prefers reduced motion, settle
 * immediately to the `to` pose — no tween, no stagger delay.
 */
export function resolveStaggerInitialState(
  intent: StaggerIntent,
  opts: { prefersReducedMotion: boolean },
): 'before' | 'after' {
  if (opts.prefersReducedMotion && intent.policy.reducedMotion === 'settle') {
    return 'after';
  }
  return 'before';
}

/** Authoring sugar namespace — data over intent, no behavior authority. */
export const Stagger = {
  /** Seal a stagger intent from authoring input. */
  intent(input: StaggerIntentInput): StaggerIntent {
    return Object.freeze({ _tag: 'StaggerIntent', ...input });
  },
} as const;
