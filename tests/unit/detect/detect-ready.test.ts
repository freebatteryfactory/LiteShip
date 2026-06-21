// @vitest-environment jsdom

/**
 * `onDetectReady` — the typed `czap:detect-ready` subscription `@czap/detect`
 * owns (event name + dual-dispatch invariant), consumed by `@czap/astro`'s GPU
 * directive instead of a raw string literal (F-4).
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { DETECT_READY_EVENT, onDetectReady } from '../../../packages/detect/src/detect-ready.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('onDetectReady', () => {
  test('exposes the canonical event name', () => {
    expect(DETECT_READY_EVENT).toBe('czap:detect-ready');
  });

  test('invokes the callback once with the resolved detail (success path)', () => {
    const cb = vi.fn();
    onDetectReady(cb);

    document.dispatchEvent(
      new CustomEvent(DETECT_READY_EVENT, {
        detail: { tier: 'gpu', gpuTier: 3, webgpu: true, motionTier: 'compute' },
      }),
    );

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ tier: 'gpu', gpuTier: 3, webgpu: true, motionTier: 'compute' });
  });

  test('fires on the error path too (dual-dispatch invariant)', () => {
    const cb = vi.fn();
    onDetectReady(cb);

    document.dispatchEvent(new CustomEvent(DETECT_READY_EVENT, { detail: { error: true } }));

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ error: true });
  });

  test('is one-shot: a second detect-ready does not re-invoke', () => {
    const cb = vi.fn();
    onDetectReady(cb);

    document.dispatchEvent(new CustomEvent(DETECT_READY_EVENT, { detail: { error: true } }));
    document.dispatchEvent(new CustomEvent(DETECT_READY_EVENT, { detail: { error: true } }));

    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('the returned disposer removes the pending listener before settle', () => {
    const cb = vi.fn();
    const dispose = onDetectReady(cb);

    dispose();
    document.dispatchEvent(new CustomEvent(DETECT_READY_EVENT, { detail: { error: true } }));

    expect(cb).not.toHaveBeenCalled();
  });

  test('passes null when a detail-less event is dispatched', () => {
    const cb = vi.fn();
    onDetectReady(cb);

    document.dispatchEvent(new Event(DETECT_READY_EVENT));

    expect(cb).toHaveBeenCalledWith(null);
  });
});
