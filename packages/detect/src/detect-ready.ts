/**
 * The `liteship:detect-ready` event contract — the ONE consolidated "detection
 * settled" signal the head-inline GPU probe dispatches once `__LITESHIP_DETECT__` and
 * the `data-liteship-*` attributes are final.
 *
 * `@liteship/detect` OWNS this event: the name literal ({@link DETECT_READY_EVENT}),
 * the payload shape ({@link DetectReadyDetail}), and the DUAL-DISPATCH invariant —
 * the probe dispatches `detect-ready` on BOTH its success path (with the resolved
 * tiers) AND its error path (`{ error: true }`), so a consumer that subscribes via
 * {@link onDetectReady} is guaranteed exactly one settle and never hangs on a
 * thrown probe. Consumers (e.g. `@liteship/astro`'s GPU directive) import this helper
 * instead of hand-typing the raw string literal + `addEventListener` plumbing.
 *
 * @module
 */

import type { CapTier, MotionTier } from '@liteship/core';
import type { GPUTier } from './detect.js';

/** The canonical event name the head-inline probe dispatches on `document`. */
export const DETECT_READY_EVENT = 'liteship:detect-ready' as const;

/** A teardown function — call it to remove the listener. */
export type Disposer = () => void;

/**
 * The `liteship:detect-ready` payload. On the probe's SUCCESS path it carries the
 * resolved cap/motion/GPU tiers; on its ERROR path it carries `{ error: true }`
 * (the provisional tier stands). Either way the event fires exactly once.
 */
export type DetectReadyDetail =
  | {
      readonly tier: CapTier;
      readonly gpuTier: GPUTier;
      readonly webgpu: boolean;
      readonly motionTier: MotionTier;
      readonly error?: undefined;
    }
  | { readonly error: true };

/**
 * Subscribe to the `liteship:detect-ready` event on `document`, returning a
 * {@link Disposer} that removes the listener.
 *
 * The callback receives the final {@link DetectReadyDetail} (or `null` if a
 * synthetic event without a typed detail was dispatched). The probe guarantees a
 * single settle (success or error), so `{ once: true }` self-removes — no leak
 * even if the event lands after a View-Transition swap. Calling the returned
 * disposer before settle removes the pending listener.
 *
 * SSR-safe: with no `document`, the subscription is inert and the disposer is a
 * no-op.
 */
export function onDetectReady(callback: (detail: DetectReadyDetail | null) => void): Disposer {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const handler = (event: Event): void => {
    const detail = event instanceof CustomEvent ? (event.detail as DetectReadyDetail | null) : null;
    callback(detail ?? null);
  };

  document.addEventListener(DETECT_READY_EVENT, handler, { once: true });
  return () => document.removeEventListener(DETECT_READY_EVENT, handler);
}
