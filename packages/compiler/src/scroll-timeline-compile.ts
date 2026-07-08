/**
 * Scroll-timeline compile orchestrator — graph → CSS + runtime floor (#126).
 *
 * @module
 */

import { ValidationError } from '@czap/error';
import {
  AddressedDigest,
  interpretTransition,
  sealGraph,
  sealNode,
  type DocumentGraph,
  type ContentAddress,
  type LoweredMotionPlan,
  type ProjectionNode,
  type ScrollTimelineIntent,
  type ScrollTimelineAxis,
} from '@czap/core';
import { MotionCompiler } from './motion.js';
import type { MotionCompileResult, MotionEasing, MotionScrollTimeline } from './motion.js';
import { appendTranslateConsumer } from './motion-utils.js';

/** Compiled scroll-timeline artifacts. */
export interface CompiledScrollTimeline {
  readonly css: MotionCompileResult;
  readonly motion: LoweredMotionPlan;
  readonly graph: DocumentGraph;
  readonly projectionId: ContentAddress;
  readonly scrollTimeline: MotionScrollTimeline;
  readonly resultDigest: ReturnType<typeof AddressedDigest.of>;
}

function sealProjectionDigest(
  graph: DocumentGraph,
  transitionId: ContentAddress,
  resultDigest: ReturnType<typeof AddressedDigest.of>,
): { graph: DocumentGraph; projectionId: ContentAddress } {
  let projectionId = '' as ContentAddress;
  let previousProjectionId = '' as ContentAddress;
  const nodes = graph.nodes.map((node) => {
    if (node.family !== 'projection') return node;
    const projection = node as ProjectionNode;
    if (projection.sourceRef !== transitionId) return node;
    previousProjectionId = projection.id;
    const resealed = sealNode({ ...projection, resultDigest });
    projectionId = resealed.id;
    return resealed;
  });

  const edges =
    previousProjectionId.length > 0
      ? graph.edges.map((edge) => {
          if (edge.to === previousProjectionId) return { ...edge, to: projectionId };
          if (edge.from === previousProjectionId) return { ...edge, from: projectionId };
          return edge;
        })
      : graph.edges;

  return { graph: sealGraph({ ...graph, nodes, edges }), projectionId };
}

function scrollTimelineFromIntent(intent: ScrollTimelineIntent): MotionScrollTimeline {
  const axis = axisToCss(intent.axis);
  return { axis, range: intent.range };
}

function axisToCss(axis: ScrollTimelineAxis | undefined): MotionScrollTimeline['axis'] {
  switch (axis) {
    case 'x':
      return 'x';
    case 'y':
      return 'y';
    case 'inline':
      return 'inline';
    case 'block':
      return 'block';
    case 'progress':
    default:
      return 'block';
  }
}

function easingFromIntent(easing: 'linear' | 'ease' | 'spring' | undefined): MotionEasing | undefined {
  return easing;
}

/**
 * Compile a lowered scroll-timeline graph into native CSS + a runtime write plan.
 */
export function compileScrollTimeline(
  graph: DocumentGraph,
  transitionId: ContentAddress,
  intent: ScrollTimelineIntent,
): CompiledScrollTimeline {
  const motion = interpretTransition(graph, transitionId);
  if (!motion.css) {
    throw ValidationError('compileScrollTimeline', 'interpretTransition produced no css plan');
  }

  const scrollTimeline = scrollTimelineFromIntent(intent);
  const css = appendTranslateConsumer(
    MotionCompiler.compile({
      plan: motion.css,
      easing: easingFromIntent(intent.transition.easing),
      scrollTimeline,
    }),
    motion.css,
  );

  const resultDigest = AddressedDigest.of(new TextEncoder().encode(css.raw));
  const { graph: graphWithDigest, projectionId } = sealProjectionDigest(graph, transitionId, resultDigest);

  return Object.freeze({
    css,
    motion,
    graph: graphWithDigest,
    projectionId,
    scrollTimeline,
    resultDigest,
  });
}
