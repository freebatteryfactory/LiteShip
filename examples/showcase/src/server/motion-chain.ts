/**
 * A REAL multi-step motion CHAIN (#141) — the runnable cookbook for the explicit
 * transition algebra. `lowerRevealChain` authors ONE graph + a `TransitionProgram`:
 * a `seq` of a rise (opacity + translateY) FOLLOWED BY a `choice` that picks the
 * final hue by viewport width. `interpretProgram` lowers it to REAL multi-offset
 * keyframes + per-window sub-samplers; `client:motion` scrubs those windows through
 * the SAME floor the single reveal uses.
 *
 * The choice is resolved ONCE at build against a snapshot env (the selected branch
 * rides `diagnostics` as an auditable receipt); only that branch's window is inlined,
 * so the unchosen arm never writes. The analogue of `server/motion-program.ts`.
 *
 * @module
 */
import {
  lowerRevealChain,
  interpretProgram,
  Reveal,
  ssrRevealPaint,
  SignalInput,
  type ProgramEnv,
  type RevealIntent,
  type RuntimeWritePlan,
} from '@czap/core';
import type { SerializedMotionProgram } from '@czap/astro/runtime';

/** The authored chain: rise, THEN choose the terminal hue by viewport width. */
const CHAIN = lowerRevealChain({
  target: 'chain-hero',
  trigger: { type: 'scroll', axis: 'progress' },
  steps: [
    {
      from: { opacity: 0, translateY: '48px' },
      to: { opacity: 1, translateY: '0px' },
      transition: { durationMs: 400, easing: 'ease' },
    },
  ],
  choice: {
    branches: [
      {
        when: { op: 'gte', value: 768 },
        source: SignalInput('viewport.width'),
        step: { from: { color: '#4f46e5' }, to: { color: '#2dd4bf' }, transition: { durationMs: 400, easing: 'ease' } },
      },
    ],
    otherwise: {
      from: { color: '#4f46e5' },
      to: { color: '#f59e0b' },
      transition: { durationMs: 400, easing: 'ease' },
    },
  },
  policy: { reducedMotion: 'settle', motionTier: 'transitions' },
});

/** Snapshot env the `choice` resolves against at build (wide viewport → the teal arm). */
const CHAIN_ENV: ProgramEnv = { signals: { 'viewport.width': 1280 } };

const chainPlan = interpretProgram(CHAIN.graph, CHAIN.program, CHAIN_ENV);
const runtime = chainPlan.runtime as RuntimeWritePlan;

/** Overall intent — drives reduced-motion first paint (settles to the terminal pose). */
const CHAIN_INTENT: RevealIntent = Reveal.intent({
  target: 'chain-hero',
  trigger: { type: 'scroll', axis: 'progress' },
  from: { opacity: 0, translateY: '48px', color: '#4f46e5' },
  to: { opacity: 1, translateY: '0px', color: '#2dd4bf' },
  transition: { durationMs: runtime.durationMs, easing: 'ease' },
  policy: { reducedMotion: 'settle', motionTier: 'transitions' },
});

/** The serialized program `client:motion` inlines — its `runtime` carries the windows. */
export const CHAIN_PROGRAM: SerializedMotionProgram = {
  intent: CHAIN_INTENT,
  runtime,
  signals: chainPlan.signals,
  threshold: 0.5,
};

/** SSR first-paint state + custom properties (reduced-motion settles to the final pose). */
export const CHAIN_SSR_PAINT = ssrRevealPaint(CHAIN_INTENT, { prefersReducedMotion: false });

/** The auditable choice receipt: which branch the snapshot env selected. */
export const CHAIN_SELECTED = chainPlan.diagnostics.find((d) => d.code === 'choice-selected')?.detail as
  { branchId: string; source: string } | undefined;

/** Total composed duration (ms) — `Σ` of the rise + the selected hue window. */
export const CHAIN_TOTAL_MS = runtime.durationMs;

/** Window boundaries in `[0,1]` — the seq seam the chain scrubs across. */
export const CHAIN_WINDOWS = (runtime.windows ?? []).map((w) => [w.windowStart, w.windowEnd] as const);
