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
  lowerRevealChain,
  interpretTransition,
  interpretProgram,
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

  test('native timeline CSS owns the CONTINUOUS scrub, but the DISCRETE crossing still fires', () => {
    vi.stubGlobal('CSS', { supports: () => true, escape: (s: string) => s });
    // Simulate the emitted MotionCompiler CSS: this element carries a czap-motion
    // animation bound to a scroll/view timeline, so native CSS actually owns the scrub.
    vi.stubGlobal('getComputedStyle', () => ({ animationName: 'czap-motion-hero-before-after' }));
    const el = makeEl(buildProgram());
    let uniformCount = 0;
    const graphStates: Array<{ state: string }> = [];
    el.addEventListener('czap:uniform-update', () => uniformCount++);
    el.addEventListener('czap:graph-state', (e) => graphStates.push((e as CustomEvent).detail));

    motionDirective(noop, {}, el);
    // First paint: discrete initial state set; NO continuous leaf writes (CSS owns those).
    expect(el.getAttribute('data-czap-state')).toBe('before');
    expect(uniformCount).toBe(0);

    // Scroll past the threshold: CSS keyframes cannot flip the semantic state, so the JS
    // threshold observer MUST — data-czap-state advances + czap:graph-state fires — while
    // the continuous leaf writes stay idle (opacity is never written by the floor).
    stepScroll(0.5);
    stepScroll(1);
    expect(el.getAttribute('data-czap-state')).toBe('after');
    expect(graphStates.some((s) => s.state === 'after')).toBe(true);
    expect(uniformCount).toBe(0);
    expect(el.style.opacity).toBe('');
  });

  test('capable browser but NO native CSS emitted for this element ⇒ floor RUNS (program-only surface)', () => {
    // animation-timeline is supported, but this surface emitted no MotionCompiler CSS
    // (a Reveal.chain / program inlines the program but no @keyframes) — animationName
    // is 'none'. A global capability check would strand it at first paint; the
    // per-element check keeps the floor as the guarantee, so it scrubs normally.
    vi.stubGlobal('CSS', { supports: () => true, escape: (s: string) => s });
    vi.stubGlobal('getComputedStyle', () => ({ animationName: 'none' }));
    const el = makeEl(buildProgram());
    let uniformCount = 0;
    el.addEventListener('czap:uniform-update', () => uniformCount++);

    motionDirective(noop, {}, el);
    // The floor ran: the seed frame wrote leaf values, so first paint is NOT stuck.
    expect(uniformCount).toBe(1);
    expect(el.style.opacity).not.toBe('');
    stepScroll(0.5);
    expect(uniformCount).toBe(2); // continues to scrub on scroll
  });

  /**
   * #141 — a composed TransitionProgram RUNS through the SAME production floor. A
   * two-step `seq` chain (`opacity` over `[0,0.25]`, then `translateY` over
   * `[0.25,1]`) is authored via `lowerRevealChain`, interpreted to per-window
   * sub-samplers, and scrubbed by the real `client:motion` directive with native OFF.
   * The seam at 0.25 and the mid-window sample prove `writeContinuousMap` reads the
   * windows (Law 16), not the flat single-tween path.
   */
  describe('client:motion — multi-step TransitionProgram drives through the floor (#141)', () => {
    /** seq[ opacity 0→1 over 300ms, translateY 24px→0px over 900ms ] → windows [0,.25],[.25,1]. */
    function buildChainProgram(reducedMotion: 'settle' | 'none' = 'none'): SerializedMotionProgram {
      const chain = lowerRevealChain({
        target: 'hero',
        trigger: { type: 'scroll', axis: 'progress' },
        steps: [
          { from: { opacity: 0 }, to: { opacity: 1 }, transition: { durationMs: 300, easing: 'linear' } },
          {
            from: { translateY: '24px' },
            to: { translateY: '0px' },
            transition: { durationMs: 900, easing: 'linear' },
          },
        ],
        policy: { reducedMotion, motionTier: 'transitions' },
      });
      const plan = interpretProgram(chain.graph, chain.program);
      const runtime = plan.runtime as RuntimeWritePlan;
      const intent = Reveal.intent({
        target: 'hero',
        trigger: { type: 'scroll', axis: 'progress' },
        from: { opacity: 0, translateY: '24px' },
        to: { opacity: 1, translateY: '0px' },
        transition: { durationMs: runtime.durationMs, easing: 'linear' },
        policy: { reducedMotion, motionTier: 'transitions' },
      });
      return { intent, runtime, signals: plan.signals, threshold: 0.5 };
    }

    test('per-window sub-samplers scrub through the real directive (seam at 0.25, mid-window at 0.625)', () => {
      const program = buildChainProgram();
      // Sanity: the runtime plan carries two windows the floor must read.
      expect(program.runtime.windows).toHaveLength(2);
      const el = makeEl(program);
      motionDirective(noop, {}, el);

      // At the seam (0.25): step A (opacity) is complete; step B (y) has NOT started.
      stepScroll(0.25);
      expect(Number(el.style.opacity)).toBeCloseTo(1, 8);
      expect(readY(el)).toBeCloseTo(24, 8); // y holds its `from` until window B opens

      // Mid window B (0.625): local = (0.625-0.25)/0.75 = 0.5 → y = 24 - 24*0.5 = 12px.
      stepScroll(0.625);
      expect(Number(el.style.opacity)).toBe(1); // A holds its `to`
      expect(readY(el)).toBeCloseTo(12, 6);

      // Terminal (1): both windows complete.
      stepScroll(1);
      expect(Number(el.style.opacity)).toBe(1);
      expect(readY(el)).toBeCloseTo(0, 8);
    });

    test('reduced-motion settles a chain to the TERMINAL pose once (last window `to`), no tween', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
      const el = makeEl(buildChainProgram('settle'));
      let uniformCount = 0;
      el.addEventListener('czap:uniform-update', () => uniformCount++);

      motionDirective(noop, {}, el);
      // Terminal semantic state + every window at its `to` — the whole chain settled.
      expect(el.getAttribute('data-czap-state')).toBe('after');
      expect(Number(el.style.opacity)).toBe(1);
      expect(readY(el)).toBe(0);
      expect(uniformCount).toBe(1);
      stepScroll(0.5);
      expect(uniformCount).toBe(1); // loop skipped — no per-frame writes
    });
  });
});
