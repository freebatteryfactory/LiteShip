// @vitest-environment jsdom
/**
 * The `client:graph` and `client:svg` directive entrypoints (the default-export
 * wrappers + the init that reads the payload off the element and drives the
 * runtime). Items B/E test the runtime functions directly; this drives the
 * directive boot path the wrappers own — discover the payload, lower/apply it,
 * wire `czap:dispose`.
 */
import { describe, test, expect, vi, beforeAll } from 'vitest';
import { sealNode, sealGraph, AddressedDigest, CanonicalCbor, projectionKeys, HLC } from '@czap/core';
import type {
  DocumentGraph,
  SignalNode,
  ComponentNode,
  EntityNode,
  ProjectionNode,
  PoseNode,
  ContentAddress,
  CellMeta,
} from '@czap/core';
import graphDirective from '../../../packages/astro/src/client-directives/graph.js';
import svgDirective from '../../../packages/astro/src/client-directives/svg.js';

const ts = HLC.increment(HLC.create('test'), 1);
const meta: CellMeta = { created: ts, updated: ts, version: 1 };

function minimalGraph(): { graph: DocumentGraph; entId: ContentAddress } {
  const sig = sealNode<SignalNode>({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '' as ContentAddress,
    meta,
    input: 'viewport.width' as SignalNode['input'],
  });
  const comp = sealNode<ComponentNode>({
    _tag: 'DocGraphComponentNode',
    _version: 1,
    family: 'component',
    id: '' as ContentAddress,
    meta,
    name: 'card',
    thresholds: [0, 768] as ComponentNode['thresholds'],
    states: ['mobile', 'desktop'] as ComponentNode['states'],
  });
  const ent = sealNode<EntityNode>({
    _tag: 'DocGraphEntityNode',
    _version: 1,
    family: 'entity',
    id: '' as ContentAddress,
    meta,
    components: [comp.id],
  });
  const proj = sealNode<ProjectionNode>({
    _tag: 'DocGraphProjectionNode',
    _version: 1,
    family: 'projection',
    id: '' as ContentAddress,
    meta,
    target: 'css',
    sourceRef: comp.id,
    keys: projectionKeys('card'),
    resultDigest: AddressedDigest.of(CanonicalCbor.encode({ t: 'css' })),
  });
  const poseMobile = sealNode<PoseNode>({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '' as ContentAddress,
    meta,
    entityRef: ent.id,
    state: 'mobile' as PoseNode['state'],
    bindings: { '--czap-card': '14px' },
  });
  const desktop = sealNode<PoseNode>({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '' as ContentAddress,
    meta,
    entityRef: ent.id,
    state: 'desktop' as PoseNode['state'],
    bindings: { '--czap-card': '18px' },
  });
  const graph = sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta,
    nodes: [sig, comp, ent, proj, poseMobile, desktop],
    edges: [
      { from: sig.id, to: comp.id, type: 'seq' },
      { from: comp.id, to: proj.id, type: 'seq' },
      { from: ent.id, to: comp.id, type: 'seq' },
    ],
  });
  return { graph, entId: ent.id };
}

// jsdom doesn't implement `CSS.escape` (a browser global the directive uses to
// escape the graph-supplied entity id); provide a passthrough for the test realm.
beforeAll(() => {
  if (typeof (globalThis as { CSS?: unknown }).CSS === 'undefined') {
    vi.stubGlobal('CSS', { escape: (s: string) => s });
  }
});

describe('client:graph + client:svg directive entrypoints', () => {
  test('client:graph lowers the data-czap-graph payload onto the entity element + releases on dispose', () => {
    const { graph, entId } = minimalGraph();
    const root = document.createElement('div');
    root.setAttribute('data-czap-graph', JSON.stringify(graph));
    const entityEl = document.createElement('div');
    entityEl.setAttribute('data-czap-entity', String(entId));
    root.appendChild(entityEl);
    document.body.appendChild(root);
    const load = vi.fn(async () => {});

    graphDirective(load, {}, root);

    // The entity was cast: a boundary state was seeded onto the element.
    const state = entityEl.getAttribute('data-czap-state');
    expect(state === 'mobile' || state === 'desktop').toBe(true);
    expect(load).toHaveBeenCalled();
    // Dispose releases the runtime without throwing.
    expect(() => root.dispatchEvent(new CustomEvent('czap:dispose'))).not.toThrow();
    document.body.innerHTML = '';
  });

  test('client:graph is inert for a missing or malformed payload (no throw)', () => {
    const root = document.createElement('div');
    const load = vi.fn(async () => {});
    expect(() => graphDirective(load, {}, root)).not.toThrow(); // no data-czap-graph → early return
    expect(load).not.toHaveBeenCalled();
    root.setAttribute('data-czap-graph', '{bad json');
    expect(() => graphDirective(load, {}, root)).not.toThrow(); // malformed → loader returns null
    // FINDING 4 [Minor]: a malformed payload (loader → null) must stay fully inert
    // — consistent with the missing-payload early return, `load()` is NOT called.
    expect(load).not.toHaveBeenCalled();
  });

  test('client:svg activates on an SVG root carrying authored per-state attrs', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('data-czap-entity', 'hero');
    rect.setAttribute('data-czap-svg', JSON.stringify({ a: { opacity: '0.3' }, b: { opacity: '1' } }));
    svg.appendChild(rect);
    document.body.appendChild(svg);
    const load = vi.fn(async () => {});

    expect(() => svgDirective(load, {}, svg as unknown as HTMLElement)).not.toThrow();
    expect(() => svg.dispatchEvent(new CustomEvent('czap:dispose'))).not.toThrow();
    document.body.innerHTML = '';
  });
});
