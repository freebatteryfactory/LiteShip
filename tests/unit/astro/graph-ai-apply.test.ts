// @vitest-environment jsdom
/**
 * AI-apply seam (0.4.0 item D) — apply a VALIDATED graph-patch proposal to a live
 * runtime graph (item B), re-casting only the delta.
 *
 * Builds a 1-entity graph (`viewport.width` → mobile|desktop @ [0,768] with a css
 * projection + per-state poses), loads it via `loadGraphRuntime`, and asserts:
 *   (1) `castGraphContext(handle)` returns an AIContext whose base/summary base is
 *       `handle.graph.id` (cast OUT speaks for the LIVE graph);
 *   (2) a VALID candidate (add a second entity + its signal/component/projection/pose)
 *       is admitted: ok, graph id advanced, and the NEW entity is LIVE — it flips
 *       state on a signal crossing through the delta-recast observers;
 *   (3) a FORGED candidate (a node claiming an existing address with a DIFFERENT
 *       payload) is rejected: ok:false, graph UNCHANGED;
 *   (4) after the graph is advanced by a separate patch, REPLAYING an old candidate is
 *       rejected by the apply-time base-guard (stale base), graph UNCHANGED.
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
import { loadGraphRuntime, type GraphRuntimeHandle } from '../../../packages/astro/src/runtime/graph-runtime.js';
import { castGraphContext, admitGraphPatchProposal, adoptAppliedGraph } from '../../../packages/astro/src/runtime/graph-ai-apply.js';

const ts = HLC.increment(HLC.create('test'), 1);
const meta: CellMeta = { created: ts, updated: ts, version: 1 };

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

/** Build a 1-entity graph: `viewport.width` boundary (mobile|desktop @ [0,768]) + css projection + poses. */
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
  const poseAMobile = pose(entA.id, 'mobile', { '--czap-card': '14px' });
  const poseADesktop = pose(entA.id, 'desktop', { '--czap-card': '18px' });

  return sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta,
    nodes: [sigA, compA, entA, projA, poseAMobile, poseADesktop],
    edges: [
      { from: sigA.id, to: compA.id, type: 'seq' },
      { from: compA.id, to: projA.id, type: 'seq' },
      { from: entA.id, to: compA.id, type: 'seq' },
    ],
  });
}

/** The ops that ADD a second entity B (`scroll.progress` → top|bottom @ [0,0.5]) with a css projection + pose. */
function addEntityBOps(): GraphPatch['ops'] {
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
  const poseBBottom = pose(entB.id, 'bottom', { '--czap-rail': '1' });
  return [
    { op: 'add', family: 'signal', node: sigB },
    { op: 'add', family: 'component', node: compB },
    { op: 'add', family: 'entity', node: entB },
    { op: 'add', family: 'projection', node: projB },
    { op: 'add', family: 'pose', node: poseBTop },
    { op: 'add', family: 'pose', node: poseBBottom },
    { op: 'add', edge: { from: sigB.id, to: compB.id, type: 'seq' } },
    { op: 'add', edge: { from: compB.id, to: projB.id, type: 'seq' } },
    { op: 'add', edge: { from: entB.id, to: compB.id, type: 'seq' } },
  ] as GraphPatch['ops'];
}

/** Resolve the entity id owning the named component in a sealed graph. */
function entityIdFor(graph: DocumentGraph, componentName: string): ContentAddress | null {
  const compName = (id: ContentAddress): string => {
    const node = graph.nodes.find((n) => n.id === id);
    return node && node.family === 'component' ? node.name : '';
  };
  const ent = graph.nodes.find(
    (n) => n.family === 'entity' && (n as EntityNode).components.some((c) => compName(c) === componentName),
  );
  return ent ? ent.id : null;
}

describe('admitGraphPatchProposal — apply a validated patch to a live runtime graph', () => {
  let elA: HTMLElement;
  let elB: HTMLElement;
  /** entity id → element; mutated as entities appear (B is added by a patch). */
  let fixtureEls: Record<string, HTMLElement>;

  beforeEach(() => {
    document.body.innerHTML = '';
    elA = document.createElement('div');
    elB = document.createElement('div');
    document.body.append(elA, elB);
    fixtureEls = {};
    vi.stubGlobal(
      'ResizeObserver',
      class MockResizeObserver {
        constructor() {}
        observe = (): void => {};
        disconnect = (): void => {};
      },
    );
  });

  function resolver(id: ContentAddress): HTMLElement | null {
    return fixtureEls[id] ?? null;
  }

  test('(1) castGraphContext builds an AIContext whose base is the live graph id', () => {
    window.innerWidth = 500;
    const graph = buildGraph();
    fixtureEls = { [entityIdFor(graph, 'card')!]: elA };

    const handle = loadGraphRuntime(graph, resolver)!;
    expect(handle).not.toBeNull();

    const ctx = castGraphContext(handle);
    expect(ctx._tag).toBe('AIContext');
    // The context speaks for EXACTLY the live graph.
    expect(ctx.base).toBe(handle.graph.id);
    expect(ctx.summary.base).toBe(handle.graph.id);
    // The advertised graph-patch schema pins `base` to the live graph too.
    const patchSchema = ctx.proposalSchemas.find((s) => s.target === 'graph-patch')!;
    expect((patchSchema.jsonSchema.properties as { base: { const: string } }).base.const).toBe(handle.graph.id);
  });

  test('(2) a VALID candidate is admitted: graph advances and the new entity is LIVE', () => {
    window.innerWidth = 500;
    const graph = buildGraph();
    const idA = entityIdFor(graph, 'card')!;
    fixtureEls = { [idA]: elA };

    const handle = loadGraphRuntime(graph, resolver)!;
    const baseId = handle.graph.id;

    // A producer would fill this from a model; here we craft a well-formed candidate.
    const candidate = GraphPatch.propose(handle.graph, addEntityBOps());

    // Register entity B's element BEFORE admitting, so the delta re-cast resolves it.
    const idB = entityIdFor(GraphPatch.apply(handle.graph, candidate), 'rail')!;
    fixtureEls[idB] = elB;

    const result = admitGraphPatchProposal(handle, candidate);
    expect(result.ok).toBe(true);
    expect(result.errors).toBeUndefined();
    // The graph advanced — a new content address, reflected by the handle.
    expect(result.graph!.id).not.toBe(baseId);
    expect(handle.graph.id).toBe(result.graph!.id);

    // The new entity B is LIVE: it seeded to 'top' at scroll 0, and flips to 'bottom'
    // on a scroll crossing through the freshly-attached delta-recast observer.
    expect(elB.getAttribute('data-czap-state')).toBe('top');
    expect(elB.style.getPropertyValue('--czap-rail')).toBe('0');

    document.documentElement.style.height = '5000px';
    Object.defineProperty(window, 'scrollY', { value: 4000, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    window.dispatchEvent(new Event('scroll'));

    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        expect(elB.getAttribute('data-czap-state')).toBe('bottom');
        expect(elB.style.getPropertyValue('--czap-rail')).toBe('1');
        handle.release();
        resolve();
      });
    });
  });

  test('(3) a FORGED candidate (existing address, different payload) is rejected; graph UNCHANGED', () => {
    window.innerWidth = 500;
    const graph = buildGraph();
    const idA = entityIdFor(graph, 'card')!;
    fixtureEls = { [idA]: elA };

    const handle = loadGraphRuntime(graph, resolver)!;
    const baseId = handle.graph.id;

    // Forge: an 'add' op carrying a node with a LYING content address — the bytes
    // describe a real css projection, but `id` claims a fabricated address the payload
    // does not hash to (a content-address forgery: the id says one thing, the bytes
    // another). A second op adds an edge that PINS that claimed id. The validator
    // re-seals every proposed node (addressing excludes the id field), relocating the
    // forged node to its TRUE address — so the claimed id names nothing and the edge
    // that pinned it DANGLES, caught by the structural preview. No mutation.
    const compA = graph.nodes.find((n) => n.family === 'component') as ComponentNode;
    const realProj = projection('css', compA.id, 'forged-rail');
    const LYING_ID = 'fnv1a:deadbeef' as ContentAddress;
    const forgedCandidate = {
      _tag: 'GraphPatch',
      _version: 1,
      base: baseId,
      ops: [
        // Real projection bytes, but a forged id the payload does not address to.
        { op: 'add', family: 'projection', node: { ...realProj, id: LYING_ID } },
        // Edge pins the forged id — dangles once the node re-seals to its true address.
        { op: 'add', edge: { from: compA.id, to: LYING_ID, type: 'seq' } },
      ],
    };

    const result = admitGraphPatchProposal(handle, forgedCandidate);
    expect(result.ok).toBe(false);
    expect(result.graph).toBeUndefined();
    expect(result.errors && result.errors.length).toBeGreaterThan(0);
    // Graph UNCHANGED — no mutation on rejection.
    expect(handle.graph.id).toBe(baseId);
  });

  test('(4) replaying an OLD candidate after the graph advanced is rejected by the base-guard (stale base)', () => {
    window.innerWidth = 500;
    const graph = buildGraph();
    const idA = entityIdFor(graph, 'card')!;
    fixtureEls = { [idA]: elA };

    const handle = loadGraphRuntime(graph, resolver)!;
    const baseId = handle.graph.id;

    // Craft an OLD candidate against the original graph (a pose tweak on entity A).
    const newPoseMobile = pose(idA, 'mobile', { '--czap-card': '16px' });
    const oldCandidate = GraphPatch.propose(handle.graph, [{ op: 'update', family: 'pose', node: newPoseMobile }]);

    // ADVANCE the graph via a SEPARATE patch (a different pose value) so its id changes.
    const advancePose = pose(idA, 'mobile', { '--czap-card': '20px' });
    const advanceCandidate = GraphPatch.propose(handle.graph, [{ op: 'update', family: 'pose', node: advancePose }]);
    const advanced = admitGraphPatchProposal(handle, advanceCandidate);
    expect(advanced.ok).toBe(true);
    expect(handle.graph.id).not.toBe(baseId);
    const advancedId = handle.graph.id;

    // REPLAY the old candidate: its `base` is the original (now stale) graph id. The
    // validator's base re-pin rejects it (base !== current graph id). Either way it is
    // rejected and the graph is NOT mutated.
    const replay = admitGraphPatchProposal(handle, oldCandidate);
    expect(replay.ok).toBe(false);
    expect(replay.graph).toBeUndefined();
    expect(replay.errors && replay.errors.length).toBeGreaterThan(0);
    // Graph UNCHANGED by the stale replay.
    expect(handle.graph.id).toBe(advancedId);
    handle.release();
  });

  test('adoptAppliedGraph rejects a non-loadGraphRuntime handle', () => {
    const graph = buildGraph();
    const handle: GraphRuntimeHandle = {
      graph,
      recast: () => graph,
      release: () => {},
    };

    const result = adoptAppliedGraph(handle, graph);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      'adoptAppliedGraph: handle is not a loadGraphRuntime handle (no runtime internals).',
    ]);
  });

  test('adoptAppliedGraph rejects malformed wire graphs through the shared verifier', () => {
    const graph = buildGraph();
    fixtureEls = { [entityIdFor(graph, 'card')!]: elA };
    const handle = loadGraphRuntime(graph, resolver)!;

    const result = adoptAppliedGraph(handle, {});

    expect(result.ok).toBe(false);
    expect(result.errors?.[0]).toContain('server returned a malformed applied graph');
    expect(handle.graph.id).toBe(graph.id);
    handle.release();
  });

  test('adoptAppliedGraph advances the live graph and re-casts the applied delta', () => {
    window.innerWidth = 500;
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    const graph = buildGraph();
    const idA = entityIdFor(graph, 'card')!;
    fixtureEls = { [idA]: elA };
    const handle = loadGraphRuntime(graph, resolver)!;
    const patch = GraphPatch.propose(handle.graph, addEntityBOps());
    const next = GraphPatch.apply(handle.graph, patch);
    const idB = entityIdFor(next, 'rail')!;
    fixtureEls[idB] = elB;

    const result = adoptAppliedGraph(handle, JSON.parse(JSON.stringify(next)));

    expect(result.ok).toBe(true);
    expect(result.graph!.id).toBe(next.id);
    expect(handle.graph.id).toBe(next.id);
    expect(elB.getAttribute('data-czap-state')).toBe('top');
    expect(elB.style.getPropertyValue('--czap-rail')).toBe('0');

    document.documentElement.style.height = '5000px';
    Object.defineProperty(window, 'scrollY', { value: 4000, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    window.dispatchEvent(new Event('scroll'));

    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        expect(elB.getAttribute('data-czap-state')).toBe('bottom');
        expect(elB.style.getPropertyValue('--czap-rail')).toBe('1');
        handle.release();
        resolve();
      });
    });
  });
});
