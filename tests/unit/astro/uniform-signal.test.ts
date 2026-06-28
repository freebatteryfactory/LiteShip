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

// Cleanup is collected here and run UNCONDITIONALLY in afterEach, so a failed
// assertion can't leak a live signal subscription or a patched global descriptor
// into the next test (which would make this file order-dependent).
const stops: Array<() => void> = [];
const restores: Array<() => void> = [];

function track(stop: () => void): () => void {
  stops.push(stop);
  return stop;
}

function defineProp(target: object, prop: string, value: number): void {
  const original = Object.getOwnPropertyDescriptor(target, prop);
  restores.push(() => {
    if (original) Object.defineProperty(target, prop, original);
    else delete (target as Record<string, unknown>)[prop];
  });
  Object.defineProperty(target, prop, { value, configurable: true });
}

function setScroll(scrollY: number, scrollHeight: number, innerHeight: number): void {
  defineProp(window, 'innerHeight', innerHeight);
  defineProp(window, 'scrollY', scrollY);
  defineProp(document.documentElement, 'scrollHeight', scrollHeight);
}

function capture(el: HTMLElement): BoundaryStateDetail[] {
  const seen: BoundaryStateDetail[] = [];
  el.addEventListener('czap:uniform-update', (e) => seen.push((e as CustomEvent<BoundaryStateDetail>).detail));
  return seen;
}

describe('driveUniformFromSignal', () => {
  afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    for (const restore of restores.splice(0).reverse()) restore();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('writes the scroll.progress value to glsl + wgsl under the uniform name', () => {
    setScroll(500, 1600, 600); // max 1000 -> progress 0.5
    const el = document.createElement('canvas');
    const events = capture(el);

    track(driveUniformFromSignal(el, 'scroll.progress', 'u_progress'));

    expect(events.length).toBeGreaterThanOrEqual(1); // initial frame is synchronous
    const detail = events[0]!;
    expect(detail.glsl.u_progress).toBeCloseTo(0.5, 6);
    expect(detail.wgsl.u_progress).toBeCloseTo(0.5, 6);
    expect(detail.discrete).toEqual({});
    expect(detail.css).toEqual({});
    expect(detail.aria).toEqual({});
  });

  test('is general over continuous signals (viewport.width)', () => {
    defineProp(window, 'innerWidth', 1024);
    const el = document.createElement('canvas');
    const events = capture(el);

    track(driveUniformFromSignal(el, 'viewport.width', 'u_w'));

    expect(events[0]?.glsl.u_w).toBe(1024);
    expect(events[0]?.wgsl.u_w).toBe(1024);
  });

  test('an unknown signal family emits nothing and stop() is a safe no-op', () => {
    const el = document.createElement('canvas');
    const events = capture(el);

    const stop = track(driveUniformFromSignal(el, 'totally.bogus', 'u_x'));

    expect(events).toHaveLength(0);
    expect(() => stop()).not.toThrow();
  });
});
