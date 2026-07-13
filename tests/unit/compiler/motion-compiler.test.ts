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
  function twoStepGraph(): { graph: DocumentGraph; a: ContentAddress; b: ContentAddress } {
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
      } as unknown as TransitionNode);
      return Object.assign(tr, { fp, tp });
    };
    const a = mkStep({ opacity: 0 }, { opacity: 1 }, 200);
    const b = mkStep({ '--czap-hero-x': '0px' }, { '--czap-hero-x': '100px' }, 600);
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
    // par total = max(200,600)=600 → A's window ends at 200/600 ≈ 33% (Math.round → 33%).
    expect(result.keyframes).toContain('  33% {');
    expect(result.keyframes).not.toContain('  25% {');
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
