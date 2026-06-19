// @vitest-environment jsdom
/**
 * Runtime DocumentGraph loader (0.4.0 item B) — lower a serialized graph onto the
 * EXISTING live cast pipeline, with the delta re-cast seam.
 *
 * Builds a 2-entity graph (A: viewport.width mobile|desktop @ [0,768] with a css
 * projection + a glsl pose uniform; B: scroll.progress), loads it, and asserts:
 *   - each element is seeded (data-czap-state + the css var / glsl uniform);
 *   - resizing past 768 + firing resize flips A to 'desktop', updates the css var,
 *     and dispatches the czap:uniform-update CustomEvent;
 *   - a recast that adds a pose re-casts the affected entity WITHOUT detaching the
 *     untouched entity B's observer (the delta seam is surgical).
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { sealNode, sealGraph, AddressedDigest, CanonicalCbor, GraphPatch, projectionKeys, HLC } from '@czap/core';
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
import { loadGraphRuntime } from '../../../packages/astro/src/runtime/graph-runtime.js';

const ts = HLC.increment(HLC.create('test'), 1);
const meta: CellMeta = { created: ts, updated: ts, version: 1 };

/** A signal node for `input`. */
function signal(input: string): SignalNode {
  return sealNode<SignalNode>({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '' as ContentAddress,
    meta,
    input: input as SignalNode['input'],
  });
}

/** A component (boundary) `name` with the given thresholds/states. */
function component(name: string, thresholds: number[], states: string[]): ComponentNode {
  return sealNode<ComponentNode>({
    _tag: 'DocGraphComponentNode',
    _version: 1,
    family: 'component',
    id: '' as ContentAddress,
    meta,
    name,
    thresholds: thresholds as ComponentNode['thresholds'],
    states: states as ComponentNode['states'],
  });
}

function projection(target: ProjectionNode['target'], sourceRef: ContentAddress, name: string): ProjectionNode {
  return sealNode<ProjectionNode>({
    _tag: 'DocGraphProjectionNode',
    _version: 1,
    family: 'projection',
    id: '' as ContentAddress,
    meta,
    target,
    sourceRef,
    keys: projectionKeys(name),
    resultDigest: AddressedDigest.of(CanonicalCbor.encode({ target, name })),
  });
}

function pose(entityRef: ContentAddress, state: string, bindings: Record<string, number | string>): PoseNode {
  return sealNode<PoseNode>({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '' as ContentAddress,
    meta,
    entityRef,
    state: state as PoseNode['state'],
    bindings,
  });
}

/**
 * Build the 2-entity acceptance graph. Entity A: a `viewport.width` boundary
 * (mobile|desktop @ [0,768]) with a css projection and per-state poses carrying a
 * `--czap-card` CSS var + a `u_blur` GLSL uniform. Entity B: a `scroll.progress`
 * boundary (top|bottom @ [0,0.5]) with a css projection.
 */
function buildGraph(): DocumentGraph {
  const sigA = signal('viewport.width');
  const compA = component('card', [0, 768], ['mobile', 'desktop']);
  const entA = sealNode<EntityNode>({
    _tag: 'DocGraphEntityNode',
    _version: 1,
    family: 'entity',
    id: '' as ContentAddress,
    meta,
    components: [compA.id],
  });
  const projA = projection('css', compA.id, 'card');
  const poseAMobile = pose(entA.id, 'mobile', { '--czap-card': '14px', u_blur: 2 });
  const poseADesktop = pose(entA.id, 'desktop', { '--czap-card': '18px', u_blur: 8 });

  const sigB = signal('scroll.progress');
  const compB = component('rail', [0, 0.5], ['top', 'bottom']);
  const entB = sealNode<EntityNode>({
    _tag: 'DocGraphEntityNode',
    _version: 1,
    family: 'entity',
    id: '' as ContentAddress,
    meta,
    components: [compB.id],
  });
  const projB = projection('css', compB.id, 'rail');
  const poseBTop = pose(entB.id, 'top', { '--czap-rail': '0' });

  return sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta,
    nodes: [sigA, compA, entA, projA, poseAMobile, poseADesktop, sigB, compB, entB, projB, poseBTop],
    edges: [
      { from: sigA.id, to: compA.id, type: 'seq' },
      { from: compA.id, to: projA.id, type: 'seq' },
      { from: entA.id, to: compA.id, type: 'seq' },
      { from: sigB.id, to: compB.id, type: 'seq' },
      { from: compB.id, to: projB.id, type: 'seq' },
      { from: entB.id, to: compB.id, type: 'seq' },
    ],
  });
}

/** Map the entity ids in a sealed graph to their content addresses by entity-marker. */
function entityIds(graph: DocumentGraph): { a: ContentAddress; b: ContentAddress } {
  const entities = graph.nodes.filter((n) => n.family === 'entity') as EntityNode[];
  // Entity A owns the 'card' component; B owns 'rail'. Resolve by the component name.
  const compName = (id: ContentAddress): string => {
    const node = graph.nodes.find((n) => n.id === id);
    return node && node.family === 'component' ? node.name : '';
  };
  const a = entities.find((e) => e.components.some((c) => compName(c) === 'card'))!.id;
  const b = entities.find((e) => e.components.some((c) => compName(c) === 'rail'))!.id;
  return { a, b };
}

describe('loadGraphRuntime — lower a graph onto the live cast pipeline', () => {
  let fixtureEls: Record<string, HTMLElement>;
  let elA: HTMLElement;
  let elB: HTMLElement;
  // jsdom has no real ResizeObserver wiring; capture the boundary runtime's
  // viewport-observer callback so the test can fire it after changing innerWidth
  // (the existing satellite/worker runtime tests use this same mock).
  let fireResize: (() => void) | null;

  beforeEach(() => {
    document.body.innerHTML = '';
    elA = document.createElement('div');
    elB = document.createElement('div');
    document.body.append(elA, elB);
    fixtureEls = {};
    fireResize = null;
    vi.stubGlobal(
      'ResizeObserver',
      class MockResizeObserver {
        constructor(callback: () => void) {
          fireResize = callback;
        }
        observe = (): void => {};
        disconnect = (): void => {};
      },
    );
  });

  function resolverFor(graph: DocumentGraph): (id: ContentAddress) => HTMLElement | null {
    const ids = entityIds(graph);
    fixtureEls = { [ids.a]: elA, [ids.b]: elB };
    return (id) => fixtureEls[id] ?? null;
  }

  test('seeds each element with state + css var/uniform, flips on resize, and recasts surgically', () => {
    window.innerWidth = 500; // mobile

    const graph = buildGraph();

    const uniformSpy = vi.fn();
    elA.addEventListener('czap:uniform-update', uniformSpy);

    const handle = loadGraphRuntime(graph, resolverFor(graph));
    expect(handle).not.toBeNull();

    // SEED: A starts mobile — data-czap-state + the css var + (via uniform event) the glsl uniform.
    expect(elA.getAttribute('data-czap-state')).toBe('mobile');
    expect(elA.style.getPropertyValue('--czap-card')).toBe('14px');
    // The seed dispatched a uniform-update carrying the mobile glsl uniform.
    expect(uniformSpy).toHaveBeenCalled();
    const seedDetail = uniformSpy.mock.calls.at(-1)![0].detail as { glsl: Record<string, number> };
    expect(seedDetail.glsl.u_blur).toBe(2);

    // B starts at scroll.progress 0 → 'top'.
    expect(elB.getAttribute('data-czap-state')).toBe('top');

    // FLIP: resize past 768 → A becomes 'desktop', css var updates, uniform event fires.
    uniformSpy.mockClear();
    window.innerWidth = 1024;
    fireResize!();

    expect(elA.getAttribute('data-czap-state')).toBe('desktop');
    expect(elA.style.getPropertyValue('--czap-card')).toBe('18px');
    expect(uniformSpy).toHaveBeenCalled();
    const flipDetail = uniformSpy.mock.calls.at(-1)![0].detail as { glsl: Record<string, number> };
    expect(flipDetail.glsl.u_blur).toBe(8);
  });

  test('recast re-casts the affected entity but leaves the untouched entity B observer attached', () => {
    window.innerWidth = 500;
    const graph = buildGraph();

    const handle = loadGraphRuntime(graph, resolverFor(graph))!;

    // Spy on B's observer cleanup: B's scroll observer should NOT be detached by a
    // recast that only touches A. We detect "still attached" by asserting B keeps
    // re-evaluating after the recast (a detached observer would freeze B).
    // First, confirm B reacts to scroll before the recast.
    // Change A's mobile pose binding (new --czap-card value) via a patch — only A is touched.
    const compA = graph.nodes.find((n) => n.family === 'component' && n.name === 'card') as ComponentNode;
    const entA = graph.nodes.find(
      (n) => n.family === 'entity' && (n as EntityNode).components.includes(compA.id),
    ) as EntityNode;
    const newPose = pose(entA.id, 'mobile', { '--czap-card': '15px', u_blur: 3 });
    const patch = GraphPatch.propose(graph, [{ op: 'update', family: 'pose', node: newPose }]);

    // B's element state before recast.
    const bStateBefore = elB.getAttribute('data-czap-state');

    // SPY on observer teardown: B's scroll observer cleanup calls
    // window.removeEventListener('scroll', ...). A surgical recast that only
    // touches A must NEVER detach B's observer, so removeEventListener('scroll')
    // must not fire during recast.
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const next = handle.recast(patch);
    expect(next.id).not.toBe(graph.id); // re-addressed.

    const detachedScroll = removeSpy.mock.calls.some(([type]) => type === 'scroll');
    expect(detachedScroll).toBe(false); // B (scroll) observer was NOT detached.
    removeSpy.mockRestore();

    // A re-cast: the new mobile binding applied (still mobile at width 500).
    expect(elA.getAttribute('data-czap-state')).toBe('mobile');
    expect(elA.style.getPropertyValue('--czap-card')).toBe('15px');

    // B's observer survived: a scroll change still flips B (a detached observer would not).
    // Drive scroll.progress past 0.5 by making the document scrollable and scrolling.
    document.documentElement.style.height = '5000px';
    Object.defineProperty(window, 'scrollY', { value: 4000, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    window.dispatchEvent(new Event('scroll'));

    // The scroll listener is rAF-throttled — flush the frame.
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        expect(bStateBefore).toBe('top');
        expect(elB.getAttribute('data-czap-state')).toBe('bottom');
        handle.release();
        resolve();
      });
    });
  });

  test('returns null for a malformed serialized graph (parseBoundary posture)', () => {
    expect(loadGraphRuntime('{ not json', () => null)).toBeNull();
    expect(loadGraphRuntime('{"nodes":[{"bogus":true}],"edges":[]}', () => null)).toBeNull();
  });
});
