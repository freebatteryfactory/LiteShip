// @vitest-environment jsdom
/**
 * writeContinuousMap — N-property continuous leaf writer (#130 child 3).
 *
 * @module
 */

import { describe, test, expect, vi } from 'vitest';
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
  type RuntimeWritePlan,
} from '@czap/core';
import { writeContinuousMap } from '@czap/astro/runtime';

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

function revealFixture(): { graph: DocumentGraph; transitionId: ContentAddress; plan: RuntimeWritePlan } {
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

  const lowered = interpretTransition(g, transition.id);
  if (!lowered.runtime) throw new Error('expected runtime plan');
  return { graph: g, transitionId: transition.id, plan: lowered.runtime };
}

describe('writeContinuousMap', () => {
  test('interpolates all properties and writes CSS custom properties at t=0.5', () => {
    const { plan } = revealFixture();
    const el = document.createElement('div');
    writeContinuousMap(el, plan, 0.5);

    expect(el.style.getPropertyValue('--czap-opacity')).toBe('0.5');
    expect(el.style.getPropertyValue('--czap-hero-y')).toBe('12px');
  });

  test('dispatches czap:uniform-update with detail.css always and detail.wgsl for numeric props', () => {
    const { plan } = revealFixture();
    const el = document.createElement('div');
    const spy = vi.fn();
    el.addEventListener('czap:uniform-update', spy);

    writeContinuousMap(el, plan, 0.25);

    expect(spy).toHaveBeenCalledTimes(1);
    const detail = (spy.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.css).toEqual({
      '--czap-opacity': '0.25',
      '--czap-hero-y': '18px',
    });
    expect(detail.wgsl).toEqual({ opacity: 0.25 });
    expect(detail.wgsl).not.toHaveProperty('hero_y');
  });

  test('endpoint values at t=0 and t=1', () => {
    const { plan } = revealFixture();
    const el = document.createElement('div');

    writeContinuousMap(el, plan, 0);
    expect(el.style.getPropertyValue('--czap-opacity')).toBe('0');
    expect(el.style.getPropertyValue('--czap-hero-y')).toBe('24px');

    writeContinuousMap(el, plan, 1);
    expect(el.style.getPropertyValue('--czap-opacity')).toBe('1');
    expect(el.style.getPropertyValue('--czap-hero-y')).toBe('0px');
  });
});
