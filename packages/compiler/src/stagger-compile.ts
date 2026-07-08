/**
 * Stagger compile orchestrator — graph → CSS + runtime floor (#124).
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
  type LoweredStagger,
} from '@czap/core';
import { MotionCompiler } from './motion.js';
import type { MotionCompileResult, MotionEasing } from './motion.js';
import { appendReducedMotionGuard, appendTranslateConsumer } from './motion-utils.js';

/** One compiled stagger child. */
export interface CompiledStaggerItem {
  readonly target: string;
  readonly delayMs: number;
  readonly css: MotionCompileResult;
  readonly motion: LoweredMotionPlan;
  readonly projectionId: ContentAddress;
}

/** Compiled stagger artifacts. */
export interface CompiledStagger {
  readonly items: readonly CompiledStaggerItem[];
  readonly raw: string;
  readonly graph: DocumentGraph;
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

function easingFromIntent(easing: 'linear' | 'ease' | 'spring' | undefined): MotionEasing | undefined {
  return easing;
}

/**
 * Compile a lowered stagger graph into native CSS + runtime write plans per child.
 */
export function compileStagger(
  lowered: LoweredStagger,
  opts: { prefersReducedMotion?: boolean } = {},
): CompiledStagger {
  let graph = lowered.graph;
  const compiledItems: CompiledStaggerItem[] = [];
  const cssSections: string[] = [];
  const settle = opts.prefersReducedMotion === true && lowered.intent.policy.reducedMotion === 'settle';

  for (const item of lowered.items) {
    const motion = interpretTransition(graph, item.transitionId);
    if (!motion.css) {
      throw ValidationError('compileStagger', `interpretTransition produced no css plan for ${item.target}`);
    }

    const plan = settle ? { ...motion.css, durationMs: 0 } : motion.css;
    const css = appendTranslateConsumer(
      MotionCompiler.compile({
        plan,
        easing: settle ? 'linear' : easingFromIntent(lowered.intent.transition.easing),
        delayMs: settle ? 0 : item.delayMs,
        viewTimeline: lowered.intent.trigger.type === 'view' ? { range: lowered.intent.trigger.range } : undefined,
      }),
      plan,
    );

    // The @media guard rides EVERY settle-policy compile — the server-side
    // `prefersReducedMotion` hint only additionally zeroes durations. A user
    // whose request lacked the client hint still gets the OS preference honored.
    const gatedCss =
      lowered.intent.policy.reducedMotion === 'settle' ? Object.freeze(appendReducedMotionGuard(css, plan)) : css;

    const resultDigest = AddressedDigest.of(new TextEncoder().encode(gatedCss.raw));
    const sealed = sealProjectionDigest(graph, item.transitionId, resultDigest);
    graph = sealed.graph;

    compiledItems.push(
      Object.freeze({
        target: item.target,
        delayMs: settle ? 0 : item.delayMs,
        css: gatedCss,
        motion,
        projectionId: sealed.projectionId,
      }),
    );
    cssSections.push(gatedCss.raw);
  }

  const raw = cssSections.join('\n\n');
  return Object.freeze({
    items: Object.freeze(compiledItems),
    raw,
    graph,
    resultDigest: AddressedDigest.of(new TextEncoder().encode(raw)),
  });
}
