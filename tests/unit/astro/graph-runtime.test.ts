// @vitest-environment jsdom
/**
 * Runtime DocumentGraph loader (0.4.0 item B) — lower a serialized graph onto the
 * EXISTING live cast pipeline, with the delta re-cast seam.
 *
 * Builds a 2-entity graph (A: viewport.width mobile|desktop @ [0,768] with a css
 * projection + a glsl pose uniform; B: scroll.progress), loads it, and asserts:
 *   - each element is seeded (data-liteship-state + the css var / glsl uniform);
 *   - resizing past 768 + firing resize flips A to 'desktop', updates the css var,
 *     and dispatches the liteship:uniform-update CustomEvent;
 *   - a recast that adds a pose re-casts the affected entity WITHOUT detaching the
 *     untouched entity B's observer (the delta seam is surgical).
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  sealNode,
  sealGraph,
  AddressedDigest,
  CanonicalCbor,
  ContentAddress,
  GraphPatch,
  projectionKeys,
  HLC,
} from '@liteship/core';
import type {
  DocumentGraph,
  SignalNode,
  ComponentNode,
  EntityNode,
  ProjectionNode,
  PoseNode,
  CellMeta,
} from '@liteship/core';
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
 * `--liteship-card` CSS var + a `u_blur` GLSL uniform. Entity B: a `scroll.progress`
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
  const poseAMobile = pose(entA.id, 'mobile', { '--liteship-card': '14px', u_blur: 2 });
  const poseADesktop = pose(entA.id, 'desktop', { '--liteship-card': '18px', u_blur: 8 });

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
  const poseBTop = pose(entB.id, 'top', { '--liteship-rail': '0' });

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
  // (the existing adaptive/worker runtime tests use this same mock).
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
    elA.addEventListener('liteship:uniform-update', uniformSpy);

    const handle = loadGraphRuntime(graph, resolverFor(graph));
    expect(handle).not.toBeNull();

    // SEED: A starts mobile — data-liteship-state + the css var + (via uniform event) the glsl uniform.
    expect(elA.getAttribute('data-liteship-state')).toBe('mobile');
    expect(elA.style.getPropertyValue('--liteship-card')).toBe('14px');
    // The seed dispatched a uniform-update carrying the mobile glsl uniform.
    expect(uniformSpy).toHaveBeenCalled();
    const seedDetail = uniformSpy.mock.calls.at(-1)![0].detail as { glsl: Record<string, number> };
    expect(seedDetail.glsl.u_blur).toBe(2);

    // B starts at scroll.progress 0 → 'top'.
    expect(elB.getAttribute('data-liteship-state')).toBe('top');

    // FLIP: resize past 768 → A becomes 'desktop', css var updates, uniform event fires.
    uniformSpy.mockClear();
    window.innerWidth = 1024;
    fireResize!();

    expect(elA.getAttribute('data-liteship-state')).toBe('desktop');
    expect(elA.style.getPropertyValue('--liteship-card')).toBe('18px');
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
    // Change A's mobile pose binding (new --liteship-card value) via a patch — only A is touched.
    const compA = graph.nodes.find((n) => n.family === 'component' && n.name === 'card') as ComponentNode;
    const entA = graph.nodes.find(
      (n) => n.family === 'entity' && (n as EntityNode).components.includes(compA.id),
    ) as EntityNode;
    const newPose = pose(entA.id, 'mobile', { '--liteship-card': '15px', u_blur: 3 });
    const patch = GraphPatch.propose(graph, [{ op: 'update', family: 'pose', node: newPose }]);

    // B's element state before recast.
    const bStateBefore = elB.getAttribute('data-liteship-state');

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
    expect(elA.getAttribute('data-liteship-state')).toBe('mobile');
    expect(elA.style.getPropertyValue('--liteship-card')).toBe('15px');

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
        expect(elB.getAttribute('data-liteship-state')).toBe('bottom');
        handle.release();
        resolve();
      });
    });
  });

  test('returns null for a malformed serialized graph (parseBoundary posture)', () => {
    expect(loadGraphRuntime('{ not json', () => null)).toBeNull();
    expect(loadGraphRuntime('{"nodes":[{"bogus":true}],"edges":[]}', () => null)).toBeNull();
  });

  test('returns null for malformed edge entries before validateGraph can throw', () => {
    const graph = buildGraph();
    const malformed: DocumentGraph = { ...graph, edges: [null as unknown as DocumentGraph['edges'][number]] };
    expect(loadGraphRuntime(JSON.stringify(malformed), () => null)).toBeNull();
  });

  // FINDING 1 [P1 SECURITY]: sealGraph only re-addresses the TOP-LEVEL graph id
  // from the supplied node ids — it does NOT re-seal each node, so a payload with
  // a FORGED node id (id ≠ its payload bytes) used to be accepted unchallenged.
  // The loader now re-seals every node and remaps edges; a forged id is either
  // resealed to its canonical address (and the runtime trusts only canonical ids)
  // or — if it leaves a dangling edge — rejected.
  test('re-seals forged node ids and never trusts a tampered address', () => {
    window.innerWidth = 500;
    const graph = buildGraph();

    // Tamper: swap one node's id to a WRONG (but well-formed-looking) address.
    // Keep the edges pointing at the forged id so reseal must remap, not reject.
    const realId = graph.nodes.find((n) => n.family === 'signal')!.id;
    const forgedId = ContentAddress('fnv1a:ffffffff');
    const tampered: DocumentGraph = {
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === realId ? { ...n, id: forgedId } : n)),
      edges: graph.edges.map((e) => ({
        from: e.from === realId ? forgedId : e.from,
        to: e.to === realId ? forgedId : e.to,
        type: e.type,
      })),
    };

    const handle = loadGraphRuntime(JSON.stringify(tampered), () => null);
    // The graph still lowers (the signal reseals to its canonical address), so we
    // get a handle — but EVERY node id it carries is canonical (none is forged).
    expect(handle).not.toBeNull();
    const ids = handle!.graph.nodes.map((n) => String(n.id));
    expect(ids).not.toContain(String(forgedId));
    // And the resealed signal id equals the address sealNode mints from its payload.
    const sealedSignal = sealNode(tampered.nodes.find((n) => n.family === 'signal') as SignalNode);
    expect(ids).toContain(String(sealedSignal.id));
  });

  // FINDING 1 (rejection arm): a forged id that leaves an edge endpoint pointing
  // at no resealed node is REJECTED (loadGraphRuntime → null), never silently
  // dropped.
  test('rejects a graph whose edge references a forged id with no node', () => {
    const graph = buildGraph();
    const danglingId = ContentAddress('fnv1a:eeeeeeee');
    // Add an edge to a node id that does not exist; validateGraph would catch a
    // dangling edge BEFORE reseal, so instead point an EXISTING edge's `to` at the
    // dangling id after the fact — but keep it past validateGraph by also adding a
    // node whose id we then forge away. Simplest: forge a node id WITHOUT updating
    // the edges that reference its old id → after reseal those edges dangle.
    const target = graph.nodes.find((n) => n.family === 'projection')!;
    const tampered: DocumentGraph = {
      ...graph,
      // Replace the projection node's id with a forged one, but leave the
      // component→projection edge pointing at the ORIGINAL id. validateGraph reads
      // the supplied (consistent-with-edges) ids and passes; after reseal the
      // projection gets its canonical id, so the edge's `to` (original id) maps to
      // nothing → reject.
      nodes: graph.nodes.map((n) => (n.id === target.id ? { ...n, id: danglingId } : n)),
    };
    expect(loadGraphRuntime(JSON.stringify(tampered), () => null)).toBeNull();
  });

  test('rejects embedded node refs that point at forged supplied ids', () => {
    const graph = buildGraph();
    const comp = graph.nodes.find((n) => n.family === 'component' && n.name === 'card') as ComponentNode;
    const forgedCompId = ContentAddress('fnv1a:cccccccc');

    const tampered: DocumentGraph = {
      ...graph,
      nodes: graph.nodes.map((node) => {
        if (node.id === comp.id) return { ...node, id: forgedCompId };
        if (node.family === 'entity' && node.components.includes(comp.id)) {
          return { ...node, components: [forgedCompId] };
        }
        if (node.family === 'projection' && node.sourceRef === comp.id) {
          return { ...node, sourceRef: forgedCompId };
        }
        return node;
      }),
      edges: graph.edges.map((edge) => ({
        from: edge.from === comp.id ? forgedCompId : edge.from,
        to: edge.to === comp.id ? forgedCompId : edge.to,
        type: edge.type,
      })),
    };

    expect(loadGraphRuntime(JSON.stringify(tampered), () => null)).toBeNull();
  });

  test('rejects remapped edges that become invalid after canonical reseal', () => {
    const graph = buildGraph();
    const signalNode = graph.nodes.find((n) => n.family === 'signal') as SignalNode;
    const suppliedA: SignalNode = { ...signalNode, id: ContentAddress('fnv1a:11111111') };
    const suppliedB: SignalNode = { ...signalNode, id: ContentAddress('fnv1a:22222222') };
    const tampered: DocumentGraph = {
      ...graph,
      nodes: [suppliedA, suppliedB],
      edges: [{ from: suppliedA.id, to: suppliedB.id, type: 'seq' }],
    };

    expect(loadGraphRuntime(JSON.stringify(tampered), () => null)).toBeNull();
  });

  // FINDING 2 [P2]: an EntityNode with TWO components lowers to TWO bindings that
  // share the same entityId. The registry must keep BOTH (not overwrite/leak the
  // first), seed both, and release() must detach BOTH.
  test('keeps all observers for a 1-entity, 2-component graph; release detaches both', () => {
    window.innerWidth = 500; // viewport.width → mobile
    // Reset scroll state (a prior test leaves scrollY high) so scroll.progress
    // seeds deterministically to 'top'.
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });

    const disconnectSpy = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class MockResizeObserver {
        constructor(_callback: () => void) {}
        observe = (): void => {};
        disconnect = disconnectSpy;
      },
    );

    const sig1 = signal('viewport.width');
    const comp1 = component('card', [0, 768], ['mobile', 'desktop']);
    const sig2 = signal('scroll.progress');
    const comp2 = component('rail', [0, 0.5], ['top', 'bottom']);
    const ent = sealNode<EntityNode>({
      _tag: 'DocGraphEntityNode',
      _version: 1,
      family: 'entity',
      id: '' as ContentAddress,
      meta,
      components: [comp1.id, comp2.id],
    });
    const proj1 = projection('css', comp1.id, 'card');
    const proj2 = projection('css', comp2.id, 'rail');
    const poseMobile = pose(ent.id, 'mobile', { '--liteship-card': '14px' });
    const poseTop = pose(ent.id, 'top', { '--liteship-rail': '0' });

    const graph = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta,
      nodes: [sig1, comp1, sig2, comp2, ent, proj1, proj2, poseMobile, poseTop],
      edges: [
        { from: sig1.id, to: comp1.id, type: 'seq' },
        { from: comp1.id, to: proj1.id, type: 'seq' },
        { from: ent.id, to: comp1.id, type: 'seq' },
        { from: sig2.id, to: comp2.id, type: 'seq' },
        { from: comp2.id, to: proj2.id, type: 'seq' },
        { from: ent.id, to: comp2.id, type: 'seq' },
      ],
    });

    // Both boundaries cast onto the SAME element (one entity).
    const handle = loadGraphRuntime(graph, () => elA)!;
    expect(handle).not.toBeNull();

    // BOTH boundaries seeded onto the element: the viewport boundary applied
    // `--liteship-card`, the scroll boundary applied `--liteship-rail`. If the second
    // binding had overwritten the first in the registry, only one would seed —
    // but seeding happens in loadGraphRuntime regardless; the real leak shows up
    // at release. Assert both observers detach: spy on BOTH removeEventListener
    // channels (resize observer via disconnect; scroll via removeEventListener).
    expect(elA.style.getPropertyValue('--liteship-card')).toBe('14px');
    expect(elA.style.getPropertyValue('--liteship-rail')).toBe('0');

    // release() must detach BOTH observers. The scroll observer detaches via
    // window.removeEventListener('scroll', …); if the first (viewport) binding had
    // leaked, release() would still leave one observer attached. We assert the
    // scroll teardown fires (proves the 2nd binding is tracked) AND that no error
    // is thrown tearing down both.
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    expect(() => handle.release()).not.toThrow();
    const detachedScroll = removeSpy.mock.calls.some(([type]) => type === 'scroll');
    expect(disconnectSpy).toHaveBeenCalled();
    expect(detachedScroll).toBe(true); // the 2nd (scroll) binding's observer WAS tracked + detached.
    removeSpy.mockRestore();
  });

  // FINDING 3 [P2]: a component whose thresholds are NOT strictly ascending makes
  // defineBoundary throw; that throw must NOT escape loadGraphRuntime. The bad
  // entity is omitted (lowering stays total), the loader returns a handle, and the
  // good entity still casts.
  test('omits a non-ascending-threshold component without throwing', () => {
    window.innerWidth = 500;
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });

    // Bad component: thresholds descending [768, 0] (not strictly ascending).
    const badSig = signal('viewport.width');
    const badComp = component('bad', [768, 0], ['a', 'b']);
    const badEnt = sealNode<EntityNode>({
      _tag: 'DocGraphEntityNode',
      _version: 1,
      family: 'entity',
      id: '' as ContentAddress,
      meta,
      components: [badComp.id],
    });
    const badProj = projection('css', badComp.id, 'bad');

    // Good component alongside it.
    const goodSig = signal('scroll.progress');
    const goodComp = component('rail', [0, 0.5], ['top', 'bottom']);
    const goodEnt = sealNode<EntityNode>({
      _tag: 'DocGraphEntityNode',
      _version: 1,
      family: 'entity',
      id: '' as ContentAddress,
      meta,
      components: [goodComp.id],
    });
    const goodProj = projection('css', goodComp.id, 'rail');
    const goodPose = pose(goodEnt.id, 'top', { '--liteship-rail': '0' });

    const graph = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta,
      nodes: [badSig, badComp, badEnt, badProj, goodSig, goodComp, goodEnt, goodProj, goodPose],
      edges: [
        { from: badSig.id, to: badComp.id, type: 'seq' },
        { from: badComp.id, to: badProj.id, type: 'seq' },
        { from: badEnt.id, to: badComp.id, type: 'seq' },
        { from: goodSig.id, to: goodComp.id, type: 'seq' },
        { from: goodComp.id, to: goodProj.id, type: 'seq' },
        { from: goodEnt.id, to: goodComp.id, type: 'seq' },
      ],
    });

    const resolved: Record<string, HTMLElement> = { [String(badEnt.id)]: elA, [String(goodEnt.id)]: elB };
    let handle: ReturnType<typeof loadGraphRuntime> = null;
    expect(() => {
      handle = loadGraphRuntime(graph, (id) => resolved[String(id)] ?? null);
    }).not.toThrow();
    expect(handle).not.toBeNull();

    // The bad entity was OMITTED (no state seeded onto elA); the good entity cast.
    expect(elA.getAttribute('data-liteship-state')).toBeNull();
    expect(elB.getAttribute('data-liteship-state')).toBe('top');
  });
});
