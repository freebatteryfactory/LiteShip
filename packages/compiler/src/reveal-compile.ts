/**
 * Reveal compile orchestrator — graph → CSS + runtime floor (#124).
 *
 * Wires `interpretTransition` + `MotionCompiler` for a lowered reveal graph.
 * Motion is intent, not a projection target: CSS lands on `target: 'css'`.
 *
 * @module
 */

import {
  AddressedDigest,
  interpretTransition,
  type DocumentGraph,
  type ContentAddress,
  type LoweredMotionPlan,
  type RevealIntent,
  type RevealTrigger,
} from '@czap/core';
import { MotionCompiler } from './motion.js';
import type { MotionCompileResult, MotionEasing, MotionViewTimeline } from './motion.js';

/** Compiled reveal artifacts — CSS projection + runtime floor. */
export interface CompiledReveal {
  readonly css: MotionCompileResult;
  readonly motion: LoweredMotionPlan;
  readonly viewTimeline?: MotionViewTimeline;
  readonly resultDigest: ReturnType<typeof AddressedDigest.of>;
}

function viewTimelineFromTrigger(trigger: RevealTrigger): MotionViewTimeline | undefined {
  if (trigger.type !== 'view') return undefined;
  return { range: trigger.range };
}

function easingFromIntent(intent: RevealIntent): MotionEasing | undefined {
  return intent.transition.easing;
}

/**
 * Compile a lowered reveal graph into native CSS + a runtime write plan.
 *
 * Reads `TransitionNode.routing` / `durationMs` via {@link interpretTransition}
 * and emits `@property`, `@keyframes`, `@starting-style`, and state-keyed
 * transitions through {@link MotionCompiler}.
 */
export function compileReveal(
  graph: DocumentGraph,
  transitionId: ContentAddress,
  intent: RevealIntent,
): CompiledReveal {
  const motion = interpretTransition(graph, transitionId);
  if (!motion.css) {
    throw new Error('compileReveal: interpretTransition produced no css plan');
  }

  const viewTimeline = viewTimelineFromTrigger(intent.trigger);
  const css = MotionCompiler.compile({
    plan: motion.css,
    easing: easingFromIntent(intent),
    viewTimeline,
  });

  const resultDigest = AddressedDigest.of(new TextEncoder().encode(css.raw));

  return Object.freeze({
    css,
    motion,
    ...(viewTimeline ? { viewTimeline } : {}),
    resultDigest,
  });
}
