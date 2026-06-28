// @vitest-environment jsdom
/**
 * driveUniformFromSignal: continuous signal -> czap:uniform-update bridge.
 *
 * Pins the contract the GPU runtime consumes: a continuous signal value is
 * written to BOTH the glsl and wgsl uniform maps under the requested name, the
 * other BoundaryStateDetail maps stay empty, an initial frame is emitted
 * synchronously, and an unknown signal family is a safe no-op.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { BoundaryStateDetail } from '../../../packages/astro/src/runtime/boundary.js';
import { driveUniformFromSignal } from '../../../packages/astro/src/runtime/uniform-signal.js';

function setScroll(scrollY: number, scrollHeight: number, innerHeight: number): void {
  Object.defineProperty(window, 'innerHeight', { value: innerHeight, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: scrollY, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: scrollHeight, configurable: true });
}

function capture(el: HTMLElement): BoundaryStateDetail[] {
  const seen: BoundaryStateDetail[] = [];
  el.addEventListener('czap:uniform-update', (e) => seen.push((e as CustomEvent<BoundaryStateDetail>).detail));
  return seen;
}

describe('driveUniformFromSignal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('writes the scroll.progress value to glsl + wgsl under the uniform name', () => {
    setScroll(500, 1600, 600); // max 1000 -> progress 0.5
    const el = document.createElement('canvas');
    const events = capture(el);

    const stop = driveUniformFromSignal(el, 'scroll.progress', 'u_progress');

    expect(events.length).toBeGreaterThanOrEqual(1); // initial frame is synchronous
    const detail = events[0]!;
    expect(detail.glsl.u_progress).toBeCloseTo(0.5, 6);
    expect(detail.wgsl.u_progress).toBeCloseTo(0.5, 6);
    expect(detail.discrete).toEqual({});
    expect(detail.css).toEqual({});
    expect(detail.aria).toEqual({});

    stop();
  });

  test('is general over continuous signals (viewport.width)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    const el = document.createElement('canvas');
    const events = capture(el);

    const stop = driveUniformFromSignal(el, 'viewport.width', 'u_w');

    expect(events[0]?.glsl.u_w).toBe(1024);
    expect(events[0]?.wgsl.u_w).toBe(1024);
    stop();
  });

  test('an unknown signal family emits nothing and stop() is a safe no-op', () => {
    const el = document.createElement('canvas');
    const events = capture(el);

    const stop = driveUniformFromSignal(el, 'totally.bogus', 'u_x');

    expect(events).toHaveLength(0);
    expect(() => stop()).not.toThrow();
  });
});
