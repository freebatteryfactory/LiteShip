// @vitest-environment jsdom

/**
 * client:motion — the production continuous-motion FLOOR (#126, F-MOT-2/3).
 *
 * NO-MOCK integration proof (retires the LATENT tag on writeContinuousMap /
 * StateCellStore.writeContinuous / the compile pipeline): a REAL lowered program
 * (Reveal.intent → lowerRevealIntent → interpretTransition) drives the REAL
 * directive with native `animation-timeline` forced OFF, so the JS floor executes.
 *
 * The DIFFERENTIAL ORACLE (Law 4 — one kernel): the sampled typed custom
 * properties at scroll offsets [0, 0.25, 0.5, 0.75, 1] EQUAL the values computed
 * from the SAME `Easing.spring` the CSS `linear()` compiles from — and equal the
 * `linear()` stop at the matching offset. The floor and native CSS provably read
 * one identical curve.
 *
 * Plus: NO per-frame graph mutation (continuous law), exactly one discrete crossing
 * at the threshold, `czap:uniform-update` each frame; reduced-motion settles to t=1
 * with no tween; teardown frees the store and re-init does not double-hold.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  Reveal,
  lowerRevealIntent,
  interpretTransition,
  Easing,
  DEFAULT_MOTION_SPRING,
  type RevealIntent,
  type RuntimeWritePlan,
} from '@czap/core';
import motionDirective from '../../../packages/astro/src/client-directives/motion.js';
import type { SerializedMotionProgram } from '../../../packages/astro/src/runtime/motion.js';

const noop = (): Promise<void> => Promise.resolve();

const OFFSETS = [0, 0.25, 0.5, 0.75, 1] as const;
const SPRING = DEFAULT_MOTION_SPRING;
const kernel = Easing.spring(SPRING);

/** Author a spring reveal and lower it to the serialized program the SSR page inlines. */
function buildProgram(reducedMotion: 'settle' | 'none' = 'none'): SerializedMotionProgram {
  const intent: RevealIntent = Reveal.intent({
    target: 'hero',
    trigger: { type: 'scroll', axis: 'progress' },
    from: { opacity: 0, translateY: '24px', color: '#000000' },
    to: { opacity: 1, translateY: '0px', color: '#ffffff' },
    transition: { durationMs: 420, easing: 'spring', spring: SPRING },
    policy: { reducedMotion, motionTier: 'transitions' },
  });
  const lowered = lowerRevealIntent(intent);
  const plan = interpretTransition(lowered.graph, lowered.transitionId);
  const runtime = plan.runtime as RuntimeWritePlan;
  return { intent, runtime, signals: plan.signals, threshold: 0.5 };
}

/** The CSS `linear()` stop value at `offset` — the native path's sample of the SAME kernel. */
function cssLinearStopAt(offset: number, sampleCount = 32): number {
  const css = Easing.springToLinearCSS(SPRING, sampleCount);
  const stops = css.slice('linear('.length, -1).split(', ').map(Number);
  return stops[Math.round(offset * sampleCount)]!;
}

// -- rAF pump + scroll driver (mirrors scene-bridge.test.ts) -------------------
let rafQueue: FrameRequestCallback[];
let restores: Array<() => void>;

function defineProp(target: object, prop: string, value: number): void {
  const original = Object.getOwnPropertyDescriptor(target, prop);
  restores.push(() => {
    if (original) Object.defineProperty(target, prop, original);
    else delete (target as Record<string, unknown>)[prop];
  });
  Object.defineProperty(target, prop, { value, configurable: true });
}

/** Set scroll geometry so `scroll.progress === offset` (max travel 1000px). */
function setProgress(offset: number): void {
  defineProp(window, 'innerHeight', 1000);
  defineProp(document.documentElement, 'scrollHeight', 2000);
  defineProp(window, 'scrollY', offset * 1000);
}

/** Fire a scroll event and run the coalesced rAF frame it schedules. */
function stepScroll(offset: number): void {
  setProgress(offset);
  window.dispatchEvent(new Event('scroll'));
  const cb = rafQueue.shift();
  cb?.(performance.now());
}

function makeEl(program: SerializedMotionProgram | string): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-czap-boundary', 'hero');
  el.setAttribute('data-czap-motion-program', typeof program === 'string' ? program : JSON.stringify(program));
  document.body.appendChild(el);
  return el;
}

function readY(el: HTMLElement): number {
  return Number.parseFloat(el.style.getPropertyValue('--czap-hero-y'));
}
function readColor(el: HTMLElement): number[] {
  const m = /^rgb\(([^)]+)\)$/.exec(el.style.getPropertyValue('--czap-hero-color'));
  return m![1]!.split(' ').map(Number);
}

describe('client:motion — JS floor is the production driver (retires LATENT)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    rafQueue = [];
    restores = [];
    let nextId = 1;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      rafQueue.push(cb);
      return nextId++;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    // Force NATIVE OFF so the JS floor executes.
    vi.stubGlobal('CSS', { supports: () => false, escape: (s: string) => s });
    setProgress(0);
  });

  afterEach(() => {
    document.querySelectorAll<HTMLElement>('*').forEach((el) => el.dispatchEvent(new CustomEvent('czap:teardown')));
    for (const restore of restores.splice(0).reverse()) restore();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  test('sampled custom properties equal the Easing.spring kernel AND the CSS linear() stop at each offset', () => {
    const el = makeEl(buildProgram());
    const uniforms: number = 0;
    const uniformFrames: unknown[] = [];
    el.addEventListener('czap:uniform-update', (e) => uniformFrames.push((e as CustomEvent).detail));

    motionDirective(noop, {}, el); // seed frame at progress 0 runs synchronously

    // Differential oracle at every offset.
    for (const offset of OFFSETS) {
      if (offset !== 0) stepScroll(offset);
      const eased = kernel(offset);

      // (1) floor == kernel(offset)
      expect(Number(el.style.opacity)).toBeCloseTo(eased, 10); // opacity lerps 0→1 → value IS eased
      expect(readY(el)).toBeCloseTo(24 - 24 * eased, 8); // 24px → 0px
      for (const channel of readColor(el)) {
        expect(channel).toBeCloseTo(255 * eased, 6); // #000 → #fff, sRGB channels
      }

      // (2) floor == native CSS linear() stop at the same offset (ONE kernel).
      expect(Number(el.style.opacity)).toBeCloseTo(cssLinearStopAt(offset), 4);
    }
    void uniforms;
    // czap:uniform-update fired once PER FRAME (seed + 4 steps = 5 leaf writes).
    expect(uniformFrames).toHaveLength(5);
    // Every frame carried the css leaf payload — never a graph payload.
    for (const detail of uniformFrames) {
      expect(detail).toHaveProperty('css');
      expect(detail).not.toHaveProperty('patch');
    }
  });

  test('discrete crossing is SPARSE (one at the threshold) while continuous writes are per-frame (Law 15)', () => {
    const el = makeEl(buildProgram());
    const graphStates: Array<{ state: string }> = [];
    let uniformCount = 0;
    el.addEventListener('czap:graph-state', (e) => graphStates.push((e as CustomEvent).detail));
    el.addEventListener('czap:uniform-update', () => uniformCount++);

    motionDirective(noop, {}, el);
    // Seed: initial discrete 'before' applied once.
    expect(el.getAttribute('data-czap-state')).toBe('before');

    stepScroll(0.25); // below threshold — no crossing
    expect(el.getAttribute('data-czap-state')).toBe('before');
    stepScroll(0.5); // crosses 0.5 → 'after'
    stepScroll(0.75); // stays past — no re-cross
    stepScroll(1);

    expect(el.getAttribute('data-czap-state')).toBe('after');
    // EXACTLY ONE crossing to 'after' (sparse) — not one per frame.
    expect(graphStates.filter((s) => s.state === 'after')).toHaveLength(1);
    // Continuous leaf writes moved EVERY frame (seed + 4 steps = 5), far more than
    // the 2 discrete applies (initial 'before' + the single 'after' crossing).
    expect(uniformCount).toBe(5);
    expect(graphStates).toHaveLength(2);
  });

  test('reduced-motion + settle pins the t=1 endpoint ONCE, no tween, no intermediate writes', () => {
    // matchMedia(reduce) → true so the settle branch fires.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

    const el = makeEl(buildProgram('settle'));
    let uniformCount = 0;
    el.addEventListener('czap:uniform-update', () => uniformCount++);

    motionDirective(noop, {}, el);

    // Settled to the FINAL semantic state + endpoint values, no tween.
    expect(el.getAttribute('data-czap-state')).toBe('after');
    expect(Number(el.style.opacity)).toBe(1);
    expect(readY(el)).toBe(0);
    expect(readColor(el)).toEqual([255, 255, 255]);
    expect(uniformCount).toBe(1); // the single settle write

    // Scrolling produces NO further writes — the loop was skipped.
    stepScroll(0.5);
    stepScroll(1);
    expect(uniformCount).toBe(1);
  });

  test('teardown frees the store and re-init does not double-hold', () => {
    const el = makeEl(buildProgram());
    let uniformCount = 0;
    el.addEventListener('czap:uniform-update', () => uniformCount++);

    motionDirective(noop, {}, el); // seed = 1
    stepScroll(0.25); // = 2
    expect(uniformCount).toBe(2);

    // Teardown: the driver stops — a further scroll writes nothing.
    el.dispatchEvent(new CustomEvent('czap:teardown'));
    stepScroll(0.5);
    expect(uniformCount).toBe(2);

    // Re-init: re-arms a SINGLE fresh driver (dispose-before-register). One scroll
    // ⇒ exactly ONE new write, not two — proof the old registration was freed.
    el.dispatchEvent(new CustomEvent('czap:reinit')); // seed on reinit = +1 → 3
    expect(uniformCount).toBe(3);
    stepScroll(0.75); // exactly one more → 4 (not 5)
    expect(uniformCount).toBe(4);
  });

  test('native timeline SUPPORTED ⇒ JS floor idle (CSS owns the scrub), initial state still set', () => {
    vi.stubGlobal('CSS', { supports: () => true, escape: (s: string) => s });
    const el = makeEl(buildProgram());
    let uniformCount = 0;
    el.addEventListener('czap:uniform-update', () => uniformCount++);

    motionDirective(noop, {}, el);
    // Discrete first-paint state is applied, but NO continuous leaf writes run.
    expect(el.getAttribute('data-czap-state')).toBe('before');
    expect(uniformCount).toBe(0);
    stepScroll(0.5);
    stepScroll(1);
    expect(uniformCount).toBe(0);
    expect(el.style.opacity).toBe(''); // never written by the floor
  });
});
