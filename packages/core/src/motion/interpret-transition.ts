/**
 * TransitionNode interpreter — the keystone motion reader (#130 child 2).
 *
 * Walks the existing graph chain (no schema change):
 *   TransitionNode.fromPose → PoseNode.entityRef → EntityNode → ComponentNode
 *
 * Diffs pose bindings into typed (from,to) pairs, maps discrete state crossings,
 * and reads routing/durationMs for keyframe sequencing and timing. Emits both a
 * CSS projection plan and a runtime leaf-write plan (motion is intent, not a target).
 *
 * @module
 */

import type { ContentAddress, SignalInput, StateName } from '../schema/brands.js';
import type {
  ComponentNode,
  DocumentGraph,
  DocumentGraphNode,
  EntityNode,
  PoseNode,
  SignalNode,
  TransitionNode,
} from '../graph/document-graph.js';
import type { DiagnosticPayload } from '../evidence/diagnostics.js';
import type { EdgeType } from '../authoring/plan.js';
import type { RuntimeEasing } from './easing.js';
import { formatTypedValue, parseTypedBinding, type TypedValue } from './interpolate.js';

/** One property tween with typed endpoints. */
export interface MotionPropertyTween {
  readonly property: string;
  readonly from: TypedValue;
  readonly to: TypedValue;
}

/** A single CSS keyframe step for sequential routing. */
export interface CssKeyframeStep {
  readonly offset: number;
  readonly properties: Readonly<Record<string, string>>;
  /**
   * The easing curve governing the SEGMENT that starts at this stop (until the next
   * stop), emitted as a per-keyframe `animation-timing-function`. Present on a composed
   * program that uses any NON-DEFAULT easing, where the animation-level timing function
   * (which the compiler defaults to `ease`) cannot serve the segment — a native
   * `animation-timeline` browser would otherwise sample it as `ease` while the
   * JS/stage/worker floors use the authored curve (uniform or mixed). Absent on
   * default-`ease` plans (the compiler default already matches) and on single-step
   * transitions; also absent on a segment where overlapping windows disagree on easing (a
   * `par` of differently-eased children), which no single per-keyframe curve can express —
   * that composed case is rendered exactly by the per-window RUNTIME floor
   * ({@link RuntimeWriteWindow.easing}), the native single-`@keyframes` leg being reserved
   * for single transitions and uniform-easing programs (#148, no approximation diagnostic).
   *
   * When present, the descriptor may carry a serialized `points` arm (a widened-catalog
   * curve, e.g. `easeOutBounce`) which the compiler emits verbatim as a `linear()` timing
   * function — the SAME stop list the JS floor lerps (Law 4, the byte-law).
   */
  readonly easing?: RuntimeEasing;
}

/**
 * Whether this plan may OWN a native CSS `animation-timeline` (a scroll/view
 * `animation-name` binding). A single transition and a UNIFORM-easing composed program
 * are `eligible` — one native `@keyframes` renders them faithfully. A composed program
 * whose OVERLAPPING windows disagree on easing (a `par` of differently-eased children,
 * #148) is NOT: no single native `@keyframes` timing-function can serve both curves over
 * their shared segment, so a native timeline would silently render the wrong easing. The
 * LOWERER decides this — it alone sees the overlapping windows and their curves — and
 * records it here as DATA, so the compiler never has to guess eligibility from the
 * keyframe stops (an absent per-keyframe easing is ambiguous: it can also mean ordinary
 * default `ease`). When `eligible: false` the compiler emits NO native ownership block,
 * so `getComputedStyle(el).animationName` carries no `liteship-motion-*` name and the
 * per-window RUNTIME floor (`client:motion`, which samples each window at its OWN easing)
 * stays the faithful renderer (ADR-0041).
 */
export type NativeTimelineEligibility =
  { readonly eligible: true } | { readonly eligible: false; readonly reason: 'mixed-easing-overlap' };

/** The shared `{ eligible: true }` verdict — a single transition is always native-eligible. */
const eligibleNativeTimeline: NativeTimelineEligibility = { eligible: true };

/** CSS projection plan — keyframes / transition keyed on discrete state. */
export interface CssMotionPlan {
  readonly selector: string;
  readonly fromState: StateName;
  readonly toState: StateName;
  readonly properties: readonly MotionPropertyTween[];
  readonly durationMs: number;
  readonly routing: EdgeType;
  readonly keyframes: readonly CssKeyframeStep[];
  readonly transitionProperty: string;
  /**
   * Whether this plan may own a native `animation-timeline`. `interpretTransition` always
   * mints the eligible verdict (a single transition is uniform by construction);
   * `interpretProgram` computes it from the composed windows — the ineligible
   * `mixed-easing-overlap` verdict when overlapping windows disagree on easing. The compiler
   * reads this to decide whether to emit the native ownership block.
   */
  readonly nativeTimeline: NativeTimelineEligibility;
}

/** One runtime leaf-write descriptor (typed CSS custom property floor). */
export interface RuntimeWriteProperty {
  readonly cssVar: string;
  readonly from: TypedValue;
  readonly to: TypedValue;
}

/**
 * A per-window runtime sub-sampler for a composed {@link TransitionProgram}: the
 * properties one transition tweens over its `[windowStart, windowEnd]` slice of the
 * global `[0,1]` timeline, with its OWN easing descriptor. Populated by
 * `interpretProgram`; absent on a single-step plan (the flat `properties`/`easing`
 * path). The `client:motion` floor samples these to scrub a multi-step chain.
 */
export interface RuntimeWriteWindow {
  readonly windowStart: number;
  readonly windowEnd: number;
  readonly properties: readonly RuntimeWriteProperty[];
  readonly easing: RuntimeEasing;
}

/** Runtime leaf-write plan — the permanent floor when native CSS is unavailable. */
export interface RuntimeWritePlan {
  readonly properties: readonly RuntimeWriteProperty[];
  readonly durationMs: number;
  readonly routing: EdgeType;
  readonly fromState: StateName;
  readonly toState: StateName;
  /**
   * The easing descriptor the JS floor samples (`sampleRuntimeEasing`). Self-describing
   * so the floor never depends on a driver to hand it a curve — and read from the
   * SAME authored source (`TransitionNode.easing`) the native CSS path compiles into
   * `linear()`, so the two floors sample one identical `Easing.spring` (Law 4).
   */
  readonly easing: RuntimeEasing;
  /**
   * Per-window sub-samplers for a composed {@link TransitionProgram} (from
   * `interpretProgram`). Present ⇒ the floor scrubs each window at its own local
   * eased progress (a multi-step chain); absent ⇒ the flat `properties`/`easing`
   * single-tween path. The composite `durationMs`/`fromState`/`toState` describe the
   * whole program.
   */
  readonly windows?: readonly RuntimeWriteWindow[];
}

/** Lowered motion intent — CSS projection + runtime floor + diagnostics. */
export interface LoweredMotionPlan {
  readonly graphId: ContentAddress;
  readonly target: string;
  readonly signals: readonly SignalInput[];
  readonly css?: CssMotionPlan;
  readonly runtime?: RuntimeWritePlan;
  readonly diagnostics: readonly DiagnosticPayload[];
}

const DEFAULT_DURATION_MS = 300;

function nodeById(graph: DocumentGraph): Map<ContentAddress, DocumentGraphNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

function incomingEdges(graph: DocumentGraph): Map<ContentAddress, ContentAddress[]> {
  const incoming = new Map<ContentAddress, ContentAddress[]>();
  for (const edge of graph.edges) {
    (incoming.get(edge.to) ?? incoming.set(edge.to, []).get(edge.to)!).push(edge.from);
  }
  return incoming;
}

function resolveComponent(entity: EntityNode, byId: Map<ContentAddress, DocumentGraphNode>): ComponentNode | undefined {
  for (const componentId of entity.components) {
    const node = byId.get(componentId);
    if (node?.family === 'component') return node;
  }
  return undefined;
}

function resolveSignal(
  componentId: ContentAddress,
  incoming: Map<ContentAddress, ContentAddress[]>,
  byId: Map<ContentAddress, DocumentGraphNode>,
): SignalNode | undefined {
  for (const fromId of incoming.get(componentId) ?? []) {
    const node = byId.get(fromId);
    if (node?.family === 'signal') return node;
  }
  return undefined;
}

function cssVarForProperty(property: string): string {
  if (property.startsWith('--')) return property;
  if (property === 'opacity') return 'opacity';
  return `--liteship-${property.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
}

function diffBindings(
  fromBindings: Readonly<Record<string, number | string>>,
  toBindings: Readonly<Record<string, number | string>>,
): MotionPropertyTween[] {
  const keys = new Set([...Object.keys(fromBindings), ...Object.keys(toBindings)]);
  const tweens: MotionPropertyTween[] = [];
  for (const property of keys) {
    const fromRaw = fromBindings[property] ?? toBindings[property]!;
    const toRaw = toBindings[property] ?? fromBindings[property]!;
    tweens.push({
      property,
      from: parseTypedBinding(property, fromRaw),
      to: parseTypedBinding(property, toRaw),
    });
  }
  return tweens;
}

/**
 * A single transition is ONE pose→pose tween: a trivial two-frame lowering
 * (`from` at `0%`, `to` at `100%`). The old `keyframesForRouting` switched on
 * `routing` here and collapsed `seq`/`par`/`choice_then` to these SAME two frames
 * (`choice_else` reversed them) — a routing LABEL pretending to be a sequencing
 * algebra. That overload is DELETED (#141, Law 8): real multi-transition composition
 * now lives in `interpretProgram` ({@link TransitionProgram}), which emits genuine
 * multi-offset windows. `routing` remains the edge flavor BETWEEN adjacent
 * transitions (the program tree reads it), not a per-node keyframe selector.
 */
function twoFrameKeyframes(properties: readonly MotionPropertyTween[]): readonly CssKeyframeStep[] {
  return [
    { offset: 0, properties: Object.fromEntries(properties.map((p) => [p.property, formatTypedValue(p.from)])) },
    { offset: 1, properties: Object.fromEntries(properties.map((p) => [p.property, formatTypedValue(p.to)])) },
  ];
}

function runtimeProperties(properties: readonly MotionPropertyTween[]): RuntimeWriteProperty[] {
  return properties.map((p) => ({
    cssVar: cssVarForProperty(p.property),
    from: p.from,
    to: p.to,
  }));
}

function emptyPlan(graphId: ContentAddress, diagnostics: DiagnosticPayload[]): LoweredMotionPlan {
  return Object.freeze({
    graphId,
    target: '',
    signals: Object.freeze([]),
    diagnostics: Object.freeze(diagnostics),
  });
}

/**
 * Interpret a {@link TransitionNode} into CSS + runtime motion plans.
 *
 * Reads `fromPose`, `toPose`, `routing`, and `durationMs`; resolves the boundary
 * transitively via pose → entity → component; diffs bindings into typed tweens.
 */
export function interpretTransition(graph: DocumentGraph, transitionId: ContentAddress): LoweredMotionPlan {
  const byId = nodeById(graph);
  const node = byId.get(transitionId);
  const diagnostics: DiagnosticPayload[] = [];

  if (!node || node.family !== 'transition') {
    diagnostics.push({
      source: 'interpretTransition',
      code: 'not-found',
      message: `transition node not found: ${transitionId}`,
    });
    return emptyPlan(graph.id, diagnostics);
  }

  const transition: TransitionNode = node;
  const fromPoseNode = byId.get(transition.fromPose);
  const toPoseNode = byId.get(transition.toPose);

  if (!fromPoseNode || fromPoseNode.family !== 'pose') {
    diagnostics.push({
      source: 'interpretTransition',
      code: 'missing-from-pose',
      message: `fromPose not found or not a pose: ${transition.fromPose}`,
    });
    return emptyPlan(graph.id, diagnostics);
  }
  if (!toPoseNode || toPoseNode.family !== 'pose') {
    diagnostics.push({
      source: 'interpretTransition',
      code: 'missing-to-pose',
      message: `toPose not found or not a pose: ${transition.toPose}`,
    });
    return emptyPlan(graph.id, diagnostics);
  }

  const fromPose: PoseNode = fromPoseNode;
  const toPose: PoseNode = toPoseNode;

  if (fromPose.entityRef !== toPose.entityRef) {
    diagnostics.push({
      source: 'interpretTransition',
      code: 'entity-mismatch',
      message: 'fromPose and toPose must reference the same entity',
      detail: { fromEntity: fromPose.entityRef, toEntity: toPose.entityRef },
    });
    return emptyPlan(graph.id, diagnostics);
  }

  const entityNode = byId.get(fromPose.entityRef);
  if (!entityNode || entityNode.family !== 'entity') {
    diagnostics.push({
      source: 'interpretTransition',
      code: 'missing-entity',
      message: `entity not found: ${fromPose.entityRef}`,
    });
    return emptyPlan(graph.id, diagnostics);
  }

  const entity: EntityNode = entityNode;
  const component = resolveComponent(entity, byId);
  if (!component) {
    diagnostics.push({
      source: 'interpretTransition',
      code: 'missing-component',
      message: `no component found for entity ${entity.id}`,
    });
    return emptyPlan(graph.id, diagnostics);
  }

  const incoming = incomingEdges(graph);
  const signal = resolveSignal(component.id, incoming, byId);
  const signals: SignalInput[] = signal ? [signal.input] : [];

  const durationMs = transition.durationMs ?? DEFAULT_DURATION_MS;
  const routing = transition.routing;
  const properties = diffBindings(fromPose.bindings, toPose.bindings);
  const keyframes = twoFrameKeyframes(properties);
  const selector = `[data-liteship-boundary="${component.name}"]`;
  const transitionProperty = properties.map((p) => p.property).join(', ');

  const css: CssMotionPlan = Object.freeze({
    selector,
    fromState: fromPose.state,
    toState: toPose.state,
    properties: Object.freeze(properties),
    durationMs,
    routing,
    keyframes: Object.freeze(keyframes),
    transitionProperty,
    // A single transition is uniform by construction — one native `@keyframes` renders it
    // faithfully, so it is always eligible to own a native timeline.
    nativeTimeline: eligibleNativeTimeline,
  });

  const runtime: RuntimeWritePlan = Object.freeze({
    properties: Object.freeze(runtimeProperties(properties)),
    durationMs,
    routing,
    fromState: fromPose.state,
    toState: toPose.state,
    // Read the authored curve off the node; default to `ease` (the CSS `transition`
    // default) so the floor and the native path stay matched even when unspecified.
    easing: transition.easing ?? { kind: 'ease' as const },
  });

  return Object.freeze({
    graphId: graph.id,
    target: component.name,
    signals: Object.freeze(signals),
    css,
    runtime,
    diagnostics: Object.freeze(diagnostics),
  });
}
