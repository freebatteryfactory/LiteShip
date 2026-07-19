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
 * at the threshold, `liteship:uniform-update` each frame; reduced-motion settles to t=1
 * with no tween; teardown frees the store and re-init does not double-hold.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  Reveal,
  lowerRevealIntent,
  lowerRevealChain,
  interpretTransition,
  interpretProgram,
  sealNode,
  sealGraph,
  Easing,
  Diagnostics,
  DEFAULT_MOTION_SPRING,
  type RevealIntent,
  type RuntimeWritePlan,
  type CssMotionPlan,
  type CellMeta,
  type DocumentGraph,
  type DocumentGraphNode,
  type DocumentGraphEdge,
  type PoseNode,
  type TransitionNode,
  type EntityNode,
  type ComponentNode,
  type SignalNode,
} from '@liteship/core';
import { MotionCompiler } from '@liteship/compiler';
import motionDirective from '../../../packages/astro/src/client-directives/motion.js';
import { parseMotionProgram } from '../../../packages/astro/src/runtime/motion.js';
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

const PAR_META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

/**
 * A mixed-easing OVERLAPPING `par` on ONE target `hero`: opacity tweens `linear`, `--liteship-hero-y`
 * tweens `ease`, both over the shared window. The lowerer denies this native ownership (#148,
 * ADR-0041); the compiler emits no `liteship-motion-*` binding, so a CAPABLE browser reports no native
 * ownership (getComputedStyle carries no liteship-motion name) and the per-window RUNTIME floor renders
 * each child at its OWN easing. Returns the serialized program the directive drives PLUS the plan's
 * `css` (so the test derives the element's real animation-name from the compiled output — a true
 * core → compiler → runtime chain, not a hand-picked stub value).
 */
function buildMixedEasingParProgram(): { serialized: SerializedMotionProgram; css: CssMotionPlan } {
  const node = <T>(n: unknown): T => sealNode(n as never) as unknown as T;
  const signal = node<SignalNode>({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '',
    meta: PAR_META,
    input: 'scroll.progress',
  });
  const component = node<ComponentNode>({
    _tag: 'DocGraphComponentNode',
    _version: 1,
    family: 'component',
    id: '',
    meta: PAR_META,
    name: 'hero',
    thresholds: [0, 1],
    states: ['before', 'after'],
  });
  const entity = node<EntityNode>({
    _tag: 'DocGraphEntityNode',
    _version: 1,
    family: 'entity',
    id: '',
    meta: PAR_META,
    components: [component.id],
  });
  const mkStep = (
    from: Record<string, number | string>,
    to: Record<string, number | string>,
    easing: unknown,
  ): TransitionNode & { fp: PoseNode; tp: PoseNode } => {
    const fp = node<PoseNode>({
      _tag: 'DocGraphPoseNode',
      _version: 1,
      family: 'pose',
      id: '',
      meta: PAR_META,
      entityRef: entity.id,
      state: 'before',
      bindings: from,
    });
    const tp = node<PoseNode>({
      _tag: 'DocGraphPoseNode',
      _version: 1,
      family: 'pose',
      id: '',
      meta: PAR_META,
      entityRef: entity.id,
      state: 'after',
      bindings: to,
    });
    const tr = node<TransitionNode>({
      _tag: 'DocGraphTransitionNode',
      _version: 1,
      family: 'transition',
      id: '',
      meta: PAR_META,
      fromPose: fp.id,
      toPose: tp.id,
      routing: 'seq',
      durationMs: 600,
      easing,
    });
    return Object.assign(tr, { fp, tp });
  };
  // opacity animates LINEAR; y animates EASE — the two children DISAGREE on easing over their
  // shared window, the exact #148 mixed-overlap case.
  const a = mkStep({ opacity: 0 }, { opacity: 1 }, { kind: 'linear' });
  const b = mkStep({ '--liteship-hero-y': '24px' }, { '--liteship-hero-y': '0px' }, { kind: 'ease' });
  const nodes: DocumentGraphNode[] = [signal, component, entity, a.fp, a.tp, a, b.fp, b.tp, b];
  const edges: DocumentGraphEdge[] = [{ from: signal.id, to: component.id, type: 'seq' }];
  const g: DocumentGraph = sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: PAR_META, nodes, edges } as Omit<
    DocumentGraph,
    'id' | 'digest'
  >);
  const plan = interpretProgram(g, {
    kind: 'par',
    children: [
      { kind: 'step', transitionId: a.id },
      { kind: 'step', transitionId: b.id },
    ],
  });
  const runtime = plan.runtime as RuntimeWritePlan;
  const intent = Reveal.intent({
    target: 'hero',
    trigger: { type: 'scroll', axis: 'progress' },
    from: { opacity: 0, translateY: '24px' },
    to: { opacity: 1, translateY: '0px' },
    transition: { durationMs: runtime.durationMs, easing: 'linear' },
    policy: { reducedMotion: 'none', motionTier: 'transitions' },
  });
  return { serialized: { intent, runtime, signals: plan.signals, threshold: 0.5 }, css: plan.css! };
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
  el.setAttribute('data-liteship-boundary', 'hero');
  el.setAttribute('data-liteship-motion-program', typeof program === 'string' ? program : JSON.stringify(program));
  document.body.appendChild(el);
  return el;
}

function readY(el: HTMLElement): number {
  return Number.parseFloat(el.style.getPropertyValue('--liteship-hero-y'));
}
function readColor(el: HTMLElement): number[] {
  const m = /^rgb\(([^)]+)\)$/.exec(el.style.getPropertyValue('--liteship-hero-color'));
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
    document.querySelectorAll<HTMLElement>('*').forEach((el) => el.dispatchEvent(new CustomEvent('liteship:teardown')));
    for (const restore of restores.splice(0).reverse()) restore();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  test('sampled custom properties equal the Easing.spring kernel AND the CSS linear() stop at each offset', () => {
    const el = makeEl(buildProgram());
    const uniforms: number = 0;
    const uniformFrames: unknown[] = [];
    el.addEventListener('liteship:uniform-update', (e) => uniformFrames.push((e as CustomEvent).detail));

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
    // liteship:uniform-update fired once PER FRAME (seed + 4 steps = 5 leaf writes).
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
    el.addEventListener('liteship:graph-state', (e) => graphStates.push((e as CustomEvent).detail));
    el.addEventListener('liteship:uniform-update', () => uniformCount++);

    motionDirective(noop, {}, el);
    // Seed: initial discrete 'before' applied once.
    expect(el.getAttribute('data-liteship-state')).toBe('before');

    stepScroll(0.25); // below threshold — no crossing
    expect(el.getAttribute('data-liteship-state')).toBe('before');
    stepScroll(0.5); // crosses 0.5 → 'after'
    stepScroll(0.75); // stays past — no re-cross
    stepScroll(1);

    expect(el.getAttribute('data-liteship-state')).toBe('after');
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
    el.addEventListener('liteship:uniform-update', () => uniformCount++);

    motionDirective(noop, {}, el);

    // Settled to the FINAL semantic state + endpoint values, no tween.
    expect(el.getAttribute('data-liteship-state')).toBe('after');
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
    el.addEventListener('liteship:uniform-update', () => uniformCount++);

    motionDirective(noop, {}, el); // seed = 1
    stepScroll(0.25); // = 2
    expect(uniformCount).toBe(2);

    // Teardown: the driver stops — a further scroll writes nothing.
    el.dispatchEvent(new CustomEvent('liteship:teardown'));
    stepScroll(0.5);
    expect(uniformCount).toBe(2);

    // Re-init: re-arms a SINGLE fresh driver (dispose-before-register). One scroll
    // ⇒ exactly ONE new write, not two — proof the old registration was freed.
    el.dispatchEvent(new CustomEvent('liteship:reinit')); // seed on reinit = +1 → 3
    expect(uniformCount).toBe(3);
    stepScroll(0.75); // exactly one more → 4 (not 5)
    expect(uniformCount).toBe(4);
  });

  test('native timeline CSS owns the CONTINUOUS scrub, but the DISCRETE crossing still fires', () => {
    vi.stubGlobal('CSS', { supports: () => true, escape: (s: string) => s });
    // Simulate the emitted MotionCompiler CSS: this element carries a liteship-motion
    // animation bound to a scroll/view timeline, so native CSS actually owns the scrub.
    vi.stubGlobal('getComputedStyle', () => ({ animationName: 'liteship-motion-hero-before-after' }));
    const el = makeEl(buildProgram());
    let uniformCount = 0;
    const graphStates: Array<{ state: string }> = [];
    el.addEventListener('liteship:uniform-update', () => uniformCount++);
    el.addEventListener('liteship:graph-state', (e) => graphStates.push((e as CustomEvent).detail));

    motionDirective(noop, {}, el);
    // First paint: discrete initial state set; NO continuous leaf writes (CSS owns those).
    expect(el.getAttribute('data-liteship-state')).toBe('before');
    expect(uniformCount).toBe(0);

    // Scroll past the threshold: CSS keyframes cannot flip the semantic state, so the JS
    // threshold observer MUST — data-liteship-state advances + liteship:graph-state fires — while
    // the continuous leaf writes stay idle (opacity is never written by the floor).
    stepScroll(0.5);
    stepScroll(1);
    expect(el.getAttribute('data-liteship-state')).toBe('after');
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
    el.addEventListener('liteship:uniform-update', () => uniformCount++);

    motionDirective(noop, {}, el);
    // The floor ran: the seed frame wrote leaf values, so first paint is NOT stuck.
    expect(uniformCount).toBe(1);
    expect(el.style.opacity).not.toBe('');
    stepScroll(0.5);
    expect(uniformCount).toBe(2); // continues to scrub on scroll
  });

  test('#148 E2E: a mixed-easing par is denied native ownership, so a capable browser runs the floor for BOTH children', () => {
    // The full core → compiler → runtime chain. The lowerer denies the mixed-easing par native
    // ownership; the compiler emits no `liteship-motion-*` binding; a CAPABLE browser therefore reports
    // no native ownership and the per-window floor renders each child at its OWN easing (ADR-0041).
    const { serialized, css } = buildMixedEasingParProgram();
    expect(css.nativeTimeline).toEqual({ eligible: false, reason: 'mixed-easing-overlap' });

    // Compile with a scroll timeline and DERIVE the element's real animation-name from the output —
    // there is no ownership binding, so a capable browser's getComputedStyle carries no liteship-motion
    // name (we assert that, then feed it to the runtime rather than hand-picking 'none').
    const compiled = MotionCompiler.compile({ plan: css, scrollTimeline: { range: ['0%', '100%'] } });
    const boundAnimationName = /animation-name:\s*(liteship-motion-[\w-]+)/.exec(compiled.scrollTimeline)?.[1];
    expect(boundAnimationName).toBeUndefined();
    const computedAnimationName = boundAnimationName ?? 'none';

    // Simulate a CAPABLE browser (animation-timeline supported) that nonetheless carries no
    // liteship-motion name for this element (the compiled reality above).
    vi.stubGlobal('CSS', { supports: () => true, escape: (s: string) => s });
    vi.stubGlobal('getComputedStyle', () => ({ animationName: computedAnimationName }));

    // The runtime plan hands the floor TWO windows carrying DIFFERENT easings (the per-child curves).
    const kinds = (serialized.runtime.windows ?? []).map((w) => w.easing.kind);
    expect(kinds).toContain('linear');
    expect(kinds).toContain('ease');

    const el = makeEl(serialized);
    let uniformCount = 0;
    el.addEventListener('liteship:uniform-update', () => uniformCount++);

    motionDirective(noop, {}, el);
    // The floor RUNS (native ownership was denied): first paint wrote both children, not stuck.
    expect(uniformCount).toBe(1);
    expect(el.style.opacity).not.toBe('');
    expect(el.style.getPropertyValue('--liteship-hero-y')).not.toBe('');

    // Scrub to completion: both children reach their terminal values through the floor.
    stepScroll(0.5);
    stepScroll(1);
    expect(uniformCount).toBe(3);
    expect(Number(el.style.opacity)).toBeCloseTo(1, 6);
    expect(readY(el)).toBeCloseTo(0, 6);
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
      el.addEventListener('liteship:uniform-update', () => uniformCount++);

      motionDirective(noop, {}, el);
      // Terminal semantic state + every window at its `to` — the whole chain settled.
      expect(el.getAttribute('data-liteship-state')).toBe('after');
      expect(Number(el.style.opacity)).toBe(1);
      expect(readY(el)).toBe(0);
      expect(uniformCount).toBe(1);
      stepScroll(0.5);
      expect(uniformCount).toBe(1); // loop skipped — no per-frame writes
    });
  });
});

/**
 * parseMotionProgram — SSR-inlined program validation over the WIDENED easing
 * descriptor (#CSS). The authoring vocabulary grew beyond `linear|ease|spring` to
 * the full Easing catalog (bounce/elastic/back/cubicBezier), each serialized as a
 * sampled-points arm so the JS floor lerps the IDENTICAL point list the CSS
 * `linear()` uses (Law 4). `isRuntimeWritePlan` must ACCEPT those descriptors so a
 * page inlining a widened-catalog reveal parses — and must still REJECT malformed
 * payloads LOUDLY (a diagnostic + `null`, leaving the native/CSS floor untouched).
 */
describe('parseMotionProgram — widened easing descriptor validation (#CSS)', () => {
  /** A minimal, otherwise-valid serialized program carrying `easing` verbatim. */
  function programJson(easing: unknown): string {
    return JSON.stringify({
      intent: { policy: { reducedMotion: 'none' } },
      runtime: {
        properties: [],
        fromState: 'before',
        toState: 'after',
        durationMs: 420,
        easing,
      },
      signals: [],
    });
  }

  let sink: ReturnType<typeof Diagnostics.createBufferSink>;

  beforeEach(() => {
    Diagnostics.reset();
    sink = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink.sink);
  });

  afterEach(() => {
    Diagnostics.reset();
  });

  test('accepts the narrow legacy descriptors (linear / ease / spring)', () => {
    expect(parseMotionProgram(programJson({ kind: 'linear' }))).not.toBeNull();
    expect(parseMotionProgram(programJson({ kind: 'ease' }))).not.toBeNull();
    expect(parseMotionProgram(programJson({ kind: 'spring', spring: DEFAULT_MOTION_SPRING }))).not.toBeNull();
    expect(sink.events).toHaveLength(0);
  });

  test('accepts a widened-catalog kind carrying a serialized sampled-points arm', () => {
    const points = [0, 0.03, 0.34, 0.62, 0.88, 1];
    for (const kind of ['bounce', 'elastic', 'back', 'cubicBezier'] as const) {
      const program = parseMotionProgram(programJson({ kind, points }));
      // Accept = a parsed program (not null); the widened kind + points arm survive parse.
      expect(program).not.toBeNull();
    }
    expect(sink.events).toHaveLength(0);
  });

  test('rejects a POINT-BASED kind that is MISSING its points arm (silent-linear divergence closed, #158)', () => {
    // sampleRuntimeEasing has NO analytic fallback for these kinds: without a points
    // arm the JS floor silently lerps a straight LINE (points/cubicBezier) or a keyword
    // approximation (bounce/elastic/back), diverging from the CSS linear() floor that
    // reads the SAME sampled points. So a point-based descriptor carrying no points is a
    // lowering bug and the guard must reject it LOUDLY, not accept it and draw a line.
    for (const kind of ['points', 'bounce', 'elastic', 'back', 'cubicBezier'] as const) {
      expect(parseMotionProgram(programJson({ kind })), `${kind} without points must reject`).toBeNull();
    }
    expect(sink.events.some((e) => e.code === 'motion-program-shape-invalid')).toBe(true);
  });

  test('accepts the `points` kind WITH a valid arm (the analytic kinds need none — covered above)', () => {
    // Point-based `points` is accepted once its arm is present; linear (analytic) needs
    // no arm. Together with the reject-without-points case this pins the split.
    expect(parseMotionProgram(programJson({ kind: 'points', points: [0, 0.5, 1] }))).not.toBeNull();
    expect(parseMotionProgram(programJson({ kind: 'linear' }))).not.toBeNull();
    expect(sink.events).toHaveLength(0);
  });

  test('rejects an easing with no kind LOUDLY (null + diagnostic)', () => {
    expect(parseMotionProgram(programJson({ points: [0, 1] }))).toBeNull();
    expect(sink.events.some((e) => e.code === 'motion-program-shape-invalid')).toBe(true);
  });

  test('rejects an unknown easing kind LOUDLY', () => {
    expect(parseMotionProgram(programJson({ kind: 'wobble' }))).toBeNull();
    expect(sink.events.some((e) => e.code === 'motion-program-shape-invalid')).toBe(true);
  });

  test('rejects a malformed points arm (degenerate length or non-finite members)', () => {
    expect(parseMotionProgram(programJson({ kind: 'bounce', points: [0.5] }))).toBeNull();
    expect(parseMotionProgram(programJson({ kind: 'bounce', points: 'nope' }))).toBeNull();
    expect(parseMotionProgram(programJson({ kind: 'bounce', points: [0, 'x', 1] }))).toBeNull();
    expect(parseMotionProgram(programJson({ kind: 'bounce', points: [0, Number.NaN, 1] }))).toBeNull();
    expect(sink.events.some((e) => e.code === 'motion-program-shape-invalid')).toBe(true);
  });

  test('rejects a missing easing entirely LOUDLY', () => {
    expect(parseMotionProgram(programJson(undefined))).toBeNull();
    expect(sink.events.some((e) => e.code === 'motion-program-shape-invalid')).toBe(true);
  });

  // The floor dereferences leaf entries (`p.cssVar`, `p.from`/`p.to`, and each
  // `window.properties.map(...)`), so the guard must validate them — a shallow
  // "properties is an array" check let a malformed tween or `windows: [{}]` through
  // to crash `sampleProgram` instead of leaving the JS floor inert (#158).
  const validProperty = { cssVar: '--x', from: { k: 'number', v: 0 }, to: { k: 'number', v: 1 } };
  const runtimeProgram = (runtime: Record<string, unknown>): string =>
    JSON.stringify({ intent: { policy: { reducedMotion: 'none' } }, runtime, signals: [] });

  test('rejects a plan whose windows entry is structurally malformed (windows: [{}]) LOUDLY', () => {
    const withBadWindow = runtimeProgram({
      properties: [validProperty],
      fromState: 'a',
      toState: 'b',
      durationMs: 300,
      easing: { kind: 'linear' },
      windows: [{}], // no properties/easing → sampleProgram's `w.properties.map(...)` would throw
    });
    expect(parseMotionProgram(withBadWindow)).toBeNull();
    expect(sink.events.some((e) => e.code === 'motion-program-shape-invalid')).toBe(true);
  });

  test('rejects a malformed properties entry ({}), and still ACCEPTS a well-formed windowed plan', () => {
    // A property missing cssVar/from/to reaches the sampler's `interpolateTyped` → reject.
    expect(
      parseMotionProgram(
        runtimeProgram({
          properties: [{}],
          fromState: 'a',
          toState: 'b',
          durationMs: 300,
          easing: { kind: 'linear' },
        }),
      ),
    ).toBeNull();
    // A fully-formed multi-window plan is NOT over-rejected by the stricter guard.
    const goodWindows = runtimeProgram({
      properties: [validProperty],
      fromState: 'a',
      toState: 'b',
      durationMs: 300,
      easing: { kind: 'linear' },
      windows: [
        { windowStart: 0, windowEnd: 0.5, properties: [validProperty], easing: { kind: 'linear' } },
        { windowStart: 0.5, windowEnd: 1, properties: [validProperty], easing: { kind: 'ease' } },
      ],
    });
    expect(parseMotionProgram(goodWindows)).not.toBeNull();
  });
});
