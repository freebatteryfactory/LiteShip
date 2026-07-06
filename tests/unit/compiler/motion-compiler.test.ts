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
  type CellMeta,
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
    expect(result.keyframes).toContain('@keyframes czap-motion-before-after');
    expect(result.keyframes).toContain('0% {');
    expect(result.keyframes).toContain('opacity: 0');
    expect(result.keyframes).toContain('100% {');
    expect(result.keyframes).toContain('opacity: 1');
    expect(result.startingStyle).toContain('@starting-style');
    expect(result.startingStyle).toContain('[data-czap-boundary="hero"]');
    expect(result.transition).toContain('[data-czap-state="after"]');
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
