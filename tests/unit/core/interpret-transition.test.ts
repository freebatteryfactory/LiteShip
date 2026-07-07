/**
 * TransitionNode interpreter — keystone motion reader (#130 child 2).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import {
  sealNode,
  sealGraph,
  interpretTransition,
  type ContentAddress,
  type CellMeta,
  type DocumentGraph,
  type DocumentGraphNode,
  type DocumentGraphEdge,
  type PoseNode,
  type TransitionNode,
  type EntityNode,
  type ComponentNode,
  type SignalNode,
} from '@czap/core';

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

function revealFixture(durationMs = 420): { graph: DocumentGraph; transitionId: ContentAddress } {
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
    durationMs,
  } as unknown as TransitionNode);

  const g = graph(
    [signal, component, entity, fromPose, toPose, transition],
    [{ from: signal.id, to: component.id, type: 'seq' }],
  );

  return { graph: g, transitionId: transition.id };
}

describe('interpretTransition', () => {
  test('reads routing and durationMs into CSS + runtime plans', () => {
    const { graph: g, transitionId } = revealFixture(420);
    const plan = interpretTransition(g, transitionId);

    expect(plan.target).toBe('hero');
    expect(plan.signals).toEqual(['scroll.progress']);
    expect(plan.css?.durationMs).toBe(420);
    expect(plan.css?.routing).toBe('seq');
    expect(plan.runtime?.durationMs).toBe(420);
    expect(plan.runtime?.routing).toBe('seq');
    expect(plan.css?.fromState).toBe('before');
    expect(plan.css?.toState).toBe('after');
  });

  test('diffs pose bindings into typed property tweens', () => {
    const { graph: g, transitionId } = revealFixture();
    const plan = interpretTransition(g, transitionId);

    const opacity = plan.css?.properties.find((p) => p.property === 'opacity');
    expect(opacity?.from).toEqual({ k: 'opacity', v: 0 });
    expect(opacity?.to).toEqual({ k: 'opacity', v: 1 });

    const y = plan.css?.properties.find((p) => p.property === '--czap-hero-y');
    expect(y?.from).toEqual({ k: 'length', v: 24, unit: 'px' });
    expect(y?.to).toEqual({ k: 'length', v: 0, unit: 'px' });
  });

  test('seq routing emits sequential keyframe offsets', () => {
    const { graph: g, transitionId } = revealFixture();
    const plan = interpretTransition(g, transitionId);

    expect(plan.css?.keyframes).toHaveLength(2);
    expect(plan.css?.keyframes[0]?.offset).toBe(0);
    expect(plan.css?.keyframes[1]?.offset).toBe(1);
    expect(plan.css?.keyframes[0]?.properties.opacity).toBe('0');
    expect(plan.css?.keyframes[1]?.properties.opacity).toBe('1');
  });

  test('runtime plan maps properties to CSS custom-property vars', () => {
    const { graph: g, transitionId } = revealFixture();
    const plan = interpretTransition(g, transitionId);

    const opacityVar = plan.runtime?.properties.find((p) => p.cssVar === '--czap-opacity');
    expect(opacityVar?.from).toEqual({ k: 'opacity', v: 0 });
    expect(opacityVar?.to).toEqual({ k: 'opacity', v: 1 });

    const yVar = plan.runtime?.properties.find((p) => p.cssVar === '--czap-hero-y');
    expect(yVar?.cssVar).toBe('--czap-hero-y');
  });

  test('par routing keeps from-pose at 0% and to-pose at 100%', () => {
    const { graph: g, transitionId: baseId } = revealFixture();
    const transitionNode = g.nodes.find((n) => n.id === baseId);
    expect(transitionNode?.family).toBe('transition');

    const parTransition = sealNode({
      ...(transitionNode as TransitionNode),
      routing: 'par',
    } as unknown as TransitionNode);

    const nodes = g.nodes.map((n) => (n.id === baseId ? parTransition : n));
    const parGraph = sealGraph({ ...g, nodes } as Omit<DocumentGraph, 'id' | 'digest'>);
    const plan = interpretTransition(parGraph, parTransition.id);

    expect(plan.css?.routing).toBe('par');
    expect(plan.css?.keyframes[0]?.properties.opacity).toBe('0');
    expect(plan.css?.keyframes[1]?.properties.opacity).toBe('1');
    expect(plan.css?.keyframes[0]?.properties.opacity).not.toBe(plan.css?.keyframes[1]?.properties.opacity);
  });

  test('returns diagnostics when transition id is missing', () => {
    const { graph: g } = revealFixture();
    const plan = interpretTransition(g, 'fnv1a:deadbeef' as ContentAddress);
    expect(plan.diagnostics.length).toBeGreaterThan(0);
    expect(plan.css).toBeUndefined();
    expect(plan.graphId).toBe(g.id);
  });
});
