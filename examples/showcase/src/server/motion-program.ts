/**
 * The authority side of the continuous-motion FLOOR (#126, F-MOT-2/3) — the
 * in-memory source both the native CSS path and the JS floor derive from.
 *
 * ONE authored {@link RevealIntent} is lowered ONCE and projected two ways:
 *   - `MOTION_CSS` — the native `MotionCompiler` output (`@property` + `@keyframes`
 *     + an `@supports (animation-timeline: scroll())` block), the path a modern
 *     browser scrubs with zero JS.
 *   - `MOTION_PROGRAM` — the serialized lowered program (`interpretTransition`'s
 *     runtime leaf-write plan + the resolved signal), inlined on the element so
 *     `client:motion` scrubs the SAME curve everywhere `animation-timeline` is
 *     unavailable.
 *
 * Both read the intent's ONE easing config (`spring`), so the CSS `linear()` and
 * the JS floor sample one identical `Easing.spring` (Law 4). A real host would
 * author intents from its own content; this deterministic module is what the
 * showcase route shares. The analogue of `server/stream-graph.ts`.
 *
 * @module
 */
import {
  Reveal,
  lowerRevealIntent,
  interpretTransition,
  ssrRevealPaint,
  type RevealIntent,
  type RuntimeWritePlan,
} from '@czap/core';
import { MotionCompiler } from '@czap/compiler';
import type { SerializedMotionProgram } from '@czap/astro/runtime';

/** The spring authored once and read by BOTH projections (one kernel). */
const HERO_SPRING = { stiffness: 200, damping: 20 } as const;

/**
 * The authored reveal: the hero card rises and shifts hue as the page scrolls.
 * Animates a transform (`translateY`) AND a color (`color`) — exercising the
 * F-MOT-3 color TypedValue arm end to end.
 */
export const HERO_REVEAL: RevealIntent = Reveal.intent({
  target: 'hero',
  trigger: { type: 'scroll', axis: 'progress' },
  from: { opacity: 0, translateY: '48px', color: '#4f46e5' },
  to: { opacity: 1, translateY: '0px', color: '#2dd4bf' },
  transition: { durationMs: 600, easing: 'spring', spring: HERO_SPRING },
  policy: { reducedMotion: 'settle', motionTier: 'transitions' },
});

const lowered = lowerRevealIntent(HERO_REVEAL);
const plan = interpretTransition(lowered.graph, lowered.transitionId);
const runtime = plan.runtime as RuntimeWritePlan;

/** The serialized lowered program `client:motion` inlines and drives when native CSS is unavailable. */
export const MOTION_PROGRAM: SerializedMotionProgram = {
  intent: HERO_REVEAL,
  runtime,
  signals: plan.signals,
  threshold: 0.5,
};

/**
 * The native-CSS projection: `@property`/`@keyframes` plus the
 * `@supports (animation-timeline: scroll())` scrub block, with `linear()` spring
 * easing from the SAME `HERO_SPRING`. Emitted verbatim into the page `<style>`.
 */
export const MOTION_CSS: string = MotionCompiler.compile({
  plan: plan.css!,
  easing: HERO_REVEAL.transition.easing,
  spring: HERO_REVEAL.transition.spring,
  scrollTimeline: { axis: 'block', range: ['0%', '100%'] },
}).raw;

/** SSR first-paint state + CSS custom properties (reduced-motion settles to the final pose). */
export const MOTION_SSR_PAINT = ssrRevealPaint(HERO_REVEAL, { prefersReducedMotion: false });
