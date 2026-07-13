/**
 * MotionCompiler — native-CSS motion backend (#130 child 4).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import {
  sealNode,
  sealGraph,
  interpretTransition,
  interpretProgram,
  type CellMeta,
  type ContentAddress,
  type DocumentGraph,
  type DocumentGraphNode,
  type DocumentGraphEdge,
  type PoseNode,
  type TransitionNode,
  type EntityNode,
  type ComponentNode,
  type SignalNode,
  type CssMotionPlan,
  type RuntimeEasing,
} from '@czap/core';
import { MotionCompiler, dispatch } from '@czap/compiler';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

function graph(nodes: DocumentGraphNode[], edges: DocumentGraphEdge[] = []): DocumentGraph {
  return sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges } as Omit<
    DocumentGraph,
    'id' | 'digest'
  >);
}

function revealCssPlan(): CssMotionPlan {
  const signal = sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '',
    meta: META,
    input: 'scroll.progress',
  } as unknown as SignalNode);

  const component = sealNode({
    _tag: 'DocGraphComponentNode',
    _version: 1,
    family: 'component',
    id: '',
    meta: META,
    name: 'hero',
    thresholds: [0, 1],
    states: ['before', 'after'],
  } as unknown as ComponentNode);

  const entity = sealNode({
    _tag: 'DocGraphEntityNode',
    _version: 1,
    family: 'entity',
    id: '',
    meta: META,
    components: [component.id],
  } as unknown as EntityNode);

  const fromPose = sealNode({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '',
    meta: META,
    entityRef: entity.id,
    state: 'before',
    bindings: { opacity: 0, '--czap-hero-y': '24px' },
  } as unknown as PoseNode);

  const toPose = sealNode({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '',
    meta: META,
    entityRef: entity.id,
    state: 'after',
    bindings: { opacity: 1, '--czap-hero-y': '0px' },
  } as unknown as PoseNode);

  const transition = sealNode({
    _tag: 'DocGraphTransitionNode',
    _version: 1,
    family: 'transition',
    id: '',
    meta: META,
    fromPose: fromPose.id,
    toPose: toPose.id,
    routing: 'seq',
    durationMs: 420,
  } as unknown as TransitionNode);

  const g = graph(
    [signal, component, entity, fromPose, toPose, transition],
    [{ from: signal.id, to: component.id, type: 'seq' }],
  );

  const plan = interpretTransition(g, transition.id);
  if (!plan.css) throw new Error('expected css plan');
  return plan.css;
}

describe('MotionCompiler', () => {
  test('emits @property, @keyframes, @starting-style, and state-keyed transition', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({ plan });

    expect(result.propertyRegistrations).toContain('@property --czap-hero-y');
    expect(result.propertyRegistrations).toContain('syntax: "<length>"');
    expect(result.keyframes).toContain('@keyframes czap-motion-hero-before-after');
    expect(result.keyframes).toContain('0% {');
    expect(result.keyframes).toContain('opacity: 0');
    expect(result.keyframes).toContain('100% {');
    expect(result.keyframes).toContain('opacity: 1');
    expect(result.startingStyle).toContain('@starting-style');
    expect(result.startingStyle).toContain('[data-czap-boundary="hero"]');
    expect(result.transition).toContain('[data-czap-state="after"]');
    expect(result.transition).toContain('opacity: 1');
    expect(result.transition).toContain('420ms');
    expect(result.raw).toContain(result.keyframes);
  });

  test('spring easing uses springToLinearCSS linear()', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({
      plan,
      easing: 'spring',
      spring: { stiffness: 200, damping: 15 },
    });

    expect(result.transition).toMatch(/linear\(/);
  });

  test('@supports-gated animation-timeline when viewTimeline is provided', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({
      plan,
      viewTimeline: { range: ['entry 0%', 'cover 60%'] },
    });

    expect(result.scrollTimeline).toContain('@supports (animation-timeline: view())');
    expect(result.scrollTimeline).toContain('animation-timeline: view()');
    expect(result.scrollTimeline).toContain('animation-range: entry 0% cover 60%');
    expect(result.scrollTimeline).toContain('@supports not (animation-timeline: view())');
  });

  test('view-timeline fallback emits per-property transition durations', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({
      plan,
      viewTimeline: { range: ['entry 0%', 'cover 60%'] },
    });

    expect(result.scrollTimeline).toContain('opacity 420ms ease');
    expect(result.scrollTimeline).toContain('--czap-hero-y 420ms ease');
    expect(result.scrollTimeline).not.toMatch(/opacity, --czap-hero-y 420ms/);
  });

  test('view-timeline supported path declares explicit animation-duration (not iteration-count shorthand)', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({
      plan,
      easing: 'spring',
      spring: { stiffness: 200, damping: 15 },
      viewTimeline: { range: ['entry 0%', 'cover 60%'] },
    });

    const supportedBlock = result.scrollTimeline.split('@supports not')[0] ?? '';
    expect(supportedBlock).toContain('animation-duration: auto');
    expect(supportedBlock).toContain('animation-timing-function:');
    expect(supportedBlock).not.toMatch(/animation:\s*czap-motion/);
    expect(supportedBlock).toMatch(/animation-timing-function:\s*linear\(/);
  });

  test('percent endpoints register @property with length-percentage syntax', () => {
    const base = revealCssPlan();
    const plan: CssMotionPlan = {
      ...base,
      properties: [
        {
          property: '--czap-hero-y',
          from: { k: 'length', v: 0, unit: '%' },
          to: { k: 'length', v: 100, unit: '%' },
        },
      ],
    };
    const result = MotionCompiler.compile({ plan });
    expect(result.propertyRegistrations).toContain('syntax: "<length-percentage>"');
    expect(result.propertyRegistrations).not.toMatch(/syntax: "<length>"/);
  });

  test('from-state persists in base rule outside @starting-style only', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({ plan });
    expect(result.raw).toMatch(/\[data-czap-boundary="hero"\] \{[^}]*opacity: 0/);
    expect(result.startingStyle).toContain('opacity: 0');
    expect(result.transition).toContain('[data-czap-state="after"]');
    expect(result.transition).toContain('opacity: 1');
  });

  test('view-timeline block includes animation-fill-mode: both', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({
      plan,
      viewTimeline: { range: ['entry 0%', 'cover 60%'] },
    });
    const supportedBlock = result.scrollTimeline.split('@supports not')[0] ?? '';
    expect(supportedBlock).toContain('animation-fill-mode: both');
  });

  test('distinct targets do not collide on @keyframes names', () => {
    const heroPlan = revealCssPlan();
    const footerPlan = {
      ...heroPlan,
      selector: '[data-czap-boundary="footer"]',
    };

    const hero = MotionCompiler.compile({ plan: heroPlan });
    const footer = MotionCompiler.compile({ plan: footerPlan });

    expect(hero.keyframes).toContain('@keyframes czap-motion-hero-before-after');
    expect(footer.keyframes).toContain('@keyframes czap-motion-footer-before-after');
    expect(hero.keyframes).not.toContain('@keyframes czap-motion-footer-before-after');
  });
});

/**
 * The backend needs NO change for the multi-transition algebra (#141): once
 * `interpretProgram` feeds it RICHER multi-offset keyframes, `MotionCompiler.compile`
 * emits them verbatim through the same `emitKeyframeStep` (`step.offset`) path.
 */
describe('MotionCompiler — composed TransitionProgram keyframes (#141, backend unchanged)', () => {
  function twoStepGraph(
    easingA?: RuntimeEasing,
    easingB?: RuntimeEasing,
  ): { graph: DocumentGraph; a: ContentAddress; b: ContentAddress } {
    const signal = sealNode({
      _tag: 'DocGraphSignalNode',
      _version: 1,
      family: 'signal',
      id: '',
      meta: META,
      input: 'scroll.progress',
    } as unknown as SignalNode);
    const component = sealNode({
      _tag: 'DocGraphComponentNode',
      _version: 1,
      family: 'component',
      id: '',
      meta: META,
      name: 'hero',
      thresholds: [0, 1],
      states: ['before', 'after'],
    } as unknown as ComponentNode);
    const entity = sealNode({
      _tag: 'DocGraphEntityNode',
      _version: 1,
      family: 'entity',
      id: '',
      meta: META,
      components: [component.id],
    } as unknown as EntityNode);
    const mkStep = (
      from: Record<string, number | string>,
      to: Record<string, number | string>,
      durationMs: number,
      easing?: RuntimeEasing,
    ): TransitionNode & { fp: PoseNode; tp: PoseNode } => {
      const fp = sealNode({
        _tag: 'DocGraphPoseNode',
        _version: 1,
        family: 'pose',
        id: '',
        meta: META,
        entityRef: entity.id,
        state: 'before',
        bindings: from,
      } as unknown as PoseNode);
      const tp = sealNode({
        _tag: 'DocGraphPoseNode',
        _version: 1,
        family: 'pose',
        id: '',
        meta: META,
        entityRef: entity.id,
        state: 'after',
        bindings: to,
      } as unknown as PoseNode);
      const tr = sealNode({
        _tag: 'DocGraphTransitionNode',
        _version: 1,
        family: 'transition',
        id: '',
        meta: META,
        fromPose: fp.id,
        toPose: tp.id,
        routing: 'seq',
        durationMs,
        ...(easing ? { easing } : {}),
      } as unknown as TransitionNode);
      return Object.assign(tr, { fp, tp });
    };
    const a = mkStep({ opacity: 0 }, { opacity: 1 }, 200, easingA);
    const b = mkStep({ '--czap-hero-x': '0px' }, { '--czap-hero-x': '100px' }, 600, easingB);
    const g = graph(
      [signal, component, entity, a.fp, a.tp, a, b.fp, b.tp, b],
      [{ from: signal.id, to: component.id, type: 'seq' }],
    );
    return { graph: g, a: a.id, b: b.id };
  }

  test('a seq program compiles to multi-offset @keyframes (0% / 25% / 100%)', () => {
    const { graph: g, a, b } = twoStepGraph();
    const plan = interpretProgram(g, {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    const result = MotionCompiler.compile({ plan: plan.css! });
    // Three stops, not the two-endpoint collapse — the seq seam is a real 25% stop.
    expect(result.keyframes).toContain('  0% {');
    expect(result.keyframes).toContain('  25% {');
    expect(result.keyframes).toContain('  100% {');
    // At the 25% seam: opacity fully 1 (A done), x still 0px (B not started).
    const seam = result.keyframes.slice(result.keyframes.indexOf('  25% {'));
    expect(seam).toContain('opacity: 1;');
    expect(seam).toContain('--czap-hero-x: 0px;');
  });

  test('a par program compiles to distinct offsets from seq (max vs Σ duration)', () => {
    const { graph: g, a, b } = twoStepGraph();
    const par = interpretProgram(g, {
      kind: 'par',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    const result = MotionCompiler.compile({ plan: par.css! });
    // par total = max(200,600)=600 → A's window ends at 200/600 = 1/3, emitted as the EXACT
    // fractional 33.3333% (not integer-rounded 33%, which would diverge from the JS/stage/worker
    // samplers that read the exact offset).
    expect(result.keyframes).toContain('  33.3333% {');
    expect(result.keyframes).not.toContain('  25% {');
  });

  test('par transition fallback uses PER-PROPERTY durations — a short child finishes early', () => {
    // Greptile P1: opacity completes at 200/600 of the composed 600ms, so the transition
    // fallback must animate it for 200ms — not the composed total for every property,
    // which would diverge from the keyframe / JS-floor path (cross-target parity).
    const { graph: g, a, b } = twoStepGraph();
    const par = interpretProgram(g, {
      kind: 'par',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    const result = MotionCompiler.compile({ plan: par.css! });
    expect(result.transition).toContain('opacity 200ms ease');
    expect(result.transition).toContain('--czap-hero-x 600ms ease');
    // The bug animated opacity for the full composed duration.
    expect(result.transition).not.toContain('opacity 600ms');
  });

  test('a property that re-reaches its final value late keeps the fallback open to the end', () => {
    // Non-monotonic: opacity hits its final 1 at 25%, LEAVES to 0.5, then RETURNS to 1
    // at 100%. The fallback must animate the FULL 1000ms — a first-final-stop scan would
    // finish and hold at 250ms while the keyframe / JS paths keep going (Greptile P1).
    const plan: CssMotionPlan = {
      ...revealCssPlan(),
      properties: [{ property: 'opacity', from: { k: 'opacity', v: 0 }, to: { k: 'opacity', v: 1 } }],
      transitionProperty: 'opacity',
      durationMs: 1000,
      keyframes: [
        { offset: 0, properties: { opacity: '0' } },
        { offset: 0.25, properties: { opacity: '1' } },
        { offset: 0.5, properties: { opacity: '0.5' } },
        { offset: 1, properties: { opacity: '1' } },
      ],
    };
    const result = MotionCompiler.compile({ plan });
    expect(result.transition).toContain('opacity 1000ms ease');
    expect(result.transition).not.toContain('opacity 250ms');
  });

  test('seq transition fallback carries per-property delay — a later step starts at its seam', () => {
    // seq total = 200+600 = 800ms. Step A (opacity) owns [0, 0.25]; step B (x) owns
    // [0.25, 1] → duration 600ms after a 200ms delay, so the fallback holds x until B
    // opens, mirroring the seq seam the keyframes encode at 25%.
    const { graph: g, a, b } = twoStepGraph();
    const seq = interpretProgram(g, {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    const result = MotionCompiler.compile({ plan: seq.css! });
    expect(result.transition).toContain('opacity 200ms ease');
    expect(result.transition).toContain('--czap-hero-x 600ms ease 200ms');
  });

  test('a UNIFORM-easing seq carries NO per-keyframe animation-timing-function (byte-identical keyframes)', () => {
    // Both steps default to `ease`, so the animation-level curve serves every segment —
    // per-keyframe timing functions would be redundant churn. None must be emitted.
    const { graph: g, a, b } = twoStepGraph();
    const seq = interpretProgram(g, {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    expect(seq.css!.keyframes.every((k) => k.easing === undefined)).toBe(true);
    expect(MotionCompiler.compile({ plan: seq.css! }).keyframes).not.toContain('animation-timing-function');
  });

  test('a MIXED-easing seq carries each segment its own animation-timing-function (Codex P2 parity)', () => {
    // Step A springs, step B eases. Native `animation-timeline` browsers must sample each
    // segment with its OWN curve — matching the JS/stage/worker per-window floors — instead
    // of one animation-level curve for the whole plan. The seam stop (25%) begins B's `ease`
    // segment; the 0% stop begins A's spring segment (a `linear(...)` sampled from the spring).
    const spring: RuntimeEasing = { kind: 'spring', spring: { stiffness: 210, damping: 18 } };
    const { graph: g, a, b } = twoStepGraph(spring, { kind: 'ease' });
    const seq = interpretProgram(g, {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    // The seam is a real 25% stop (200 of 800ms); A owns [0,0.25], B owns [0.25,1].
    const startStop = seq.css!.keyframes.find((k) => k.offset === 0);
    const seamStop = seq.css!.keyframes.find((k) => k.offset === 0.25);
    expect(startStop?.easing).toEqual(spring);
    expect(seamStop?.easing).toEqual({ kind: 'ease' });

    const result = MotionCompiler.compile({ plan: seq.css! });
    // Emitted: the spring compiles to a `linear()` sampling; B's segment is plain `ease`.
    expect(result.keyframes).toContain('animation-timing-function: linear(');
    expect(result.keyframes).toMatch(/25% \{[^}]*animation-timing-function: ease;/s);
  });

  test('fractional keyframe offsets are preserved, not rounded to integer percent (Codex P2 parity)', () => {
    // Composed programs (delays, stagger, uneven step durations) produce non-round offsets.
    // Integer rounding would collapse a 1/3 seam onto 33% and a 0.1% seam onto 0%, so native
    // @keyframes would diverge from the exact offsets the JS/stage/worker samplers read.
    const base = revealCssPlan();
    const plan: CssMotionPlan = {
      ...base,
      keyframes: [
        { offset: 0, properties: { opacity: '0' } },
        { offset: 0.001, properties: { opacity: '0.01' } },
        { offset: 1 / 3, properties: { opacity: '0.5' } },
        { offset: 1, properties: { opacity: '1' } },
      ],
    };
    const out = MotionCompiler.compile({ plan });
    expect(out.keyframes).toContain('0.1% {');
    expect(out.keyframes).toContain('33.3333% {');
    expect(out.keyframes).toContain('100% {');
    // The 0.1% seam must NOT have collapsed onto a duplicate 0% stop.
    expect(out.keyframes).not.toContain('0.001');
  });

  test('a PAR of differently-eased children cannot carry one per-keyframe curve — diagnosed LOUDLY', () => {
    // Overlapping windows [0,0.33] (spring) and [0,1] (ease) both cover the [0,0.33]
    // segment with DIFFERENT easing; one `animation-timing-function` cannot serve both, so
    // interpretProgram approximates with the plan-level curve and emits a loud diagnostic
    // (Law 1: no silent drift) rather than pretending the fallback is faithful.
    const spring: RuntimeEasing = { kind: 'spring', spring: { stiffness: 210, damping: 18 } };
    const { graph: g, a, b } = twoStepGraph(spring, { kind: 'ease' });
    const par = interpretProgram(g, {
      kind: 'par',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    expect(par.diagnostics.some((d) => d.code === 'mixed-easing-overlap-approximated')).toBe(true);
  });
});

describe('dispatch() MotionCompiler arm', () => {
  test('MotionCompiler def returns { target: "motion" }', () => {
    const plan = revealCssPlan();
    const result = dispatch({ _tag: 'MotionCompiler', input: { plan } });
    expect(result.target).toBe('motion');
    if (result.target === 'motion') {
      expect(result.result.keyframes).toContain('@keyframes');
    }
  });
});
