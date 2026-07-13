/**
 * Off-thread motion sampler — the MINIMAL `@czap/worker` MOTION ADAPTER (#130).
 *
 * Net-new, and deliberately THIN: a worker runs the ONE shared kernel `sampleProgram`
 * (`@czap/core`, Law 4) off the main thread and posts the sampled leaves back so the host
 * dispatches them on the EXISTING `czap:uniform-update` channel — the same channel the
 * main-thread floor (`writeContinuousMap`) already dispatches. There is no new compositor,
 * no render loop, no protocol subsystem: the value production is `sampleProgramUniforms`
 * (shared verbatim with the browser floor, so the leaf a worker posts and the leaf a
 * browser writes are byte-identical), and this module adds only the postMessage envelope.
 *
 * @module
 */

import { sampleProgramUniforms, type ProgramUniforms, type RuntimeWritePlan } from '@czap/core';

// Re-export the shared uniform sampler so a worker script imports its off-thread producer
// from `@czap/worker` without reaching around into `@czap/core` internals.
export { sampleProgramUniforms };
export type { ProgramUniforms };

/**
 * The message a worker posts for one sampled motion frame. The host relays `css`/`wgsl`
 * onto a bound element via `dispatchCzapEvent(el, 'czap:uniform-update', { css, wgsl })`.
 * Kept OUTSIDE the compositor/render `FromWorkerMessage` union on purpose — the motion
 * sampler is a self-contained adapter, not an extension of the render protocol.
 */
export interface MotionSampleMessage {
  readonly type: 'motion-sample';
  /** Normalized program time this sample was taken at. */
  readonly t: number;
  /** Formatted leaf values → `czap:uniform-update` `detail.css`. */
  readonly css: Record<string, string>;
  /** GPU-bound numeric leaves → `czap:uniform-update` `detail.wgsl`. */
  readonly wgsl: Record<string, number>;
}

/**
 * Build the {@link MotionSampleMessage} for progress `t` by sampling the shared kernel
 * off-thread. This is the ENTIRE worker adapter: sample once, wrap in a structured-clone
 * safe envelope. A worker's `message` handler calls this and `self.postMessage(msg)`.
 */
export function motionSampleMessage(plan: RuntimeWritePlan, t: number): MotionSampleMessage {
  const { css, wgsl } = sampleProgramUniforms(plan, t);
  return { type: 'motion-sample', t, css, wgsl };
}
