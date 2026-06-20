// @vitest-environment jsdom
/**
 * Scene-stage REFERENCE CONSUMER (0.4.0 items C + D) — the REAL producer→consumer
 * path, driven by a REAL compiled `@czap/scene`, NOT a hand-faked scene.
 *
 * `scene-bridge.test.ts` proves the bridge's routing LAW with a fake scene (the
 * exact shape the bridge reads). This file proves the IN-REPO REFERENCE CONSUMER
 * (`scene-stage.ts`) drives that seam end-to-end with the genuine article:
 *
 *   - a real `compileScene(...)` + `SceneRuntime.build(...)` handle whose
 *     TransitionSystem actually writes `_blend` onto a real ECS world;
 *   - `driveSceneStage(...)` wiring it through `bridgeSceneToGraph` onto a live
 *     `loadGraphRuntime` graph, with the reference `sceneStageRunQuery` lifting
 *     `trackId` out of the world entity's component map (the projection a fake
 *     scene hand-waves and a real one MUST perform);
 *   - the transition crosses 0.5 at a KNOWN frame → EXACTLY ONE recast fires and
 *     `data-czap-state` flips, while the continuous `--czap-blend` var moves on
 *     intermediate frames and never recasts.
 *
 * And for item D, the AI-apply reference consumer (`applyGraphSuggestion`) admits
 * a REAL validated `GraphPatch` onto a live handle, advancing the graph — proving
 * the cast-IN path has a real in-repo caller.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  sealNode,
  sealGraph,
  AddressedDigest,
  CanonicalCbor,
  GraphPatch,
  projectionKeys,
  HLC,
} from '@czap/core';
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
import { Track, compileScene, SceneRuntime } from '@czap/scene';
import type { SceneContract } from '@czap/scene';
import { loadGraphRuntime } from '../../../packages/astro/src/runtime/graph-runtime.js';
import {
  driveSceneStage,
  castStageContext,
  applyGraphSuggestion,
} from '../../../packages/astro/src/runtime/scene-stage.js';

const tstamp = HLC.increment(HLC.create('test'), 1);
const meta: CellMeta = { created: tstamp, updated: tstamp, version: 1 };

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

/**
 * A graph with ONE transition-backed entity: component `fx` whose states are the
 * bridge's discrete sides (`from`|`to`), a css projection, and a pose per state.
 */
function buildSceneGraph(): { graph: DocumentGraph; entityId: ContentAddress } {
  const sig = signal('viewport.width');
  const comp = component('fx', [0, 1_000_000], ['from', 'to']);
  const ent = sealNode<EntityNode>({
    _tag: 'DocGraphEntityNode',
    _version: 1,
    family: 'entity',
    id: '' as ContentAddress,
    meta,
    components: [comp.id],
  });
  const proj = projection('css', comp.id, 'fx');
  const poseFrom = pose(ent.id, 'from', { '--czap-fx': '0' });
  const poseTo = pose(ent.id, 'to', { '--czap-fx': '1' });

  const graph = sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta,
    nodes: [sig, comp, ent, proj, poseFrom, poseTo],
    edges: [
      { from: sig.id, to: comp.id, type: 'seq' },
      { from: comp.id, to: proj.id, type: 'seq' },
      { from: ent.id, to: comp.id, type: 'seq' },
    ],
  });

  const sealedEnt = graph.nodes.find((n) => n.family === 'entity') as EntityNode;
  return { graph, entityId: sealedEnt.id };
}

/**
 * A REAL scene with ONE transition track `fade` over frames [0,30] at 60fps. The
 * TransitionSystem writes `_blend = (frame - 0)/30`, so blend crosses 0.5 at
 * frame 15 → t = (15/60)*1000 = 250ms. The track's id (`'fade'`) is the trackId
 * the bridge projects onto the graph entity.
 */
function buildScene(): SceneContract {
  const hero = Track.videoId('hero');
  return {
    name: 'scene-stage-fixture',
    duration: 1000,
    fps: 60,
    bpm: 120,
    tracks: [
      Track.video('hero', { from: 0, to: 60, source: { _t: 'quantizer' } }),
      Track.transition('fade', { from: 0, to: 30, kind: 'crossfade', between: [hero, hero] }),
    ],
    invariants: [],
    budgets: { p95FrameMs: 16 },
    site: ['node'],
  };
}

describe('scene-stage reference consumer — a REAL compiled scene drives the live graph', () => {
  let el: HTMLElement;
  let rafQueue: FrameRequestCallback[];
  let rafIds: Map<number, FrameRequestCallback>;
  let nextRafId: number;

  beforeEach(() => {
    document.body.innerHTML = '';
    el = document.createElement('div');
    el.id = 'fx-host';
    document.body.append(el);
    window.innerWidth = 500;

    rafQueue = [];
    rafIds = new Map();
    nextRafId = 1;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      const id = nextRafId++;
      rafIds.set(id, cb);
      rafQueue.push(cb);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
      const cb = rafIds.get(id);
      rafIds.delete(id);
      if (cb) rafQueue = rafQueue.filter((q) => q !== cb);
    });
  });

  /** Run one queued rAF frame at wall-time `tsMs`, flushing the async step it kicks off. */
  async function pump(tsMs: number): Promise<void> {
    const cb = rafQueue.shift();
    if (!cb) return;
    cb(tsMs);
    // The bridge fires-and-forgets an async `step` that awaits a REAL scene tick +
    // world query (chained `Effect.runPromise` macrotasks). Yield to the macrotask
    // queue so the query + routing fully settle before assertions.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  }

  test('real TransitionSystem _blend drives a discrete crossing recast + continuous tween', async () => {
    const { graph, entityId } = buildSceneGraph();
    const handle = loadGraphRuntime(graph, () => el)!;
    expect(handle).not.toBeNull();
    const recastSpy = vi.spyOn(handle, 'recast');

    const compiled = compileScene(buildScene());
    const scene = await SceneRuntime.build(compiled);

    const uniformSpy = vi.fn();
    el.addEventListener('czap:uniform-update', uniformSpy);
    const setPropSpy = vi.spyOn(el.style, 'setProperty');

    // Drive the REAL scene handle through the reference consumer.
    const stage = driveSceneStage(scene, handle, () => el, { kind: 'time' }, {
      projectTrack: (t) => (t === 'fade' ? entityId : undefined),
    });

    try {
      // Frame deltas: pump(ts) ticks dt = ts - lastTs. Stay BELOW the crossing first.
      await pump(0); // t 0 → blend 0 → seeds discrete 'from' (seed, no recast).
      await pump(100); // t 100ms → frame 6 → blend 0.2.
      await pump(200); // t 200ms → frame 12 → blend 0.4.

      // No crossing yet (blend < 0.5) → NO recast, state still 'from'.
      expect(recastSpy).not.toHaveBeenCalled();
      expect(el.getAttribute('data-czap-state')).toBe('from');

      // The CONTINUOUS tween moved every frame: the leaf CSS var was written with a
      // rising blend and a czap:uniform-update dispatched — driven by REAL _blend.
      const blendWrites = setPropSpy.mock.calls.filter(([k]) => k === '--czap-blend');
      expect(blendWrites.length).toBeGreaterThanOrEqual(2);
      const lastBelow = Number(blendWrites.at(-1)![1]);
      expect(lastBelow).toBeGreaterThan(0);
      expect(lastBelow).toBeLessThan(0.5);
      expect(uniformSpy).toHaveBeenCalled();

      // Advance PAST the crossing: t 300ms → frame 18 → blend 0.6 ≥ 0.5.
      await pump(300);
      expect(recastSpy).toHaveBeenCalledTimes(1);
      expect(el.getAttribute('data-czap-state')).toBe('to');

      // Staying past the crossing does NOT recast again (no new crossing).
      await pump(400); // frame 24 → blend 0.8.
      await pump(500); // frame 30 → blend 1.0.
      expect(recastSpy).toHaveBeenCalledTimes(1);
    } finally {
      stage.stop();
      await scene.release();
    }
  });

  test('stop() releases the graph handle and stops ticking the scene', async () => {
    const { graph, entityId } = buildSceneGraph();
    const handle = loadGraphRuntime(graph, () => el)!;
    const releaseSpy = vi.spyOn(handle, 'release');

    const compiled = compileScene(buildScene());
    const scene = await SceneRuntime.build(compiled);

    const stage = driveSceneStage(scene, handle, () => el, { kind: 'time' }, {
      projectTrack: (t) => (t === 'fade' ? entityId : undefined),
    });

    await pump(0);
    const frameBefore = scene.currentFrame();

    stage.stop();
    expect(releaseSpy).toHaveBeenCalledTimes(1);

    // After stop, a stray pump is inert — the scene does not advance.
    await pump(500);
    expect(scene.currentFrame()).toBe(frameBefore);

    // stop() is idempotent.
    stage.stop();
    expect(releaseSpy).toHaveBeenCalledTimes(1);

    await scene.release();
  });
});

describe('scene-stage reference consumer — the AI-apply seam (item D)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = (): void => {};
        disconnect = (): void => {};
      },
    );
  });

  test('castStageContext speaks for the live graph; applyGraphSuggestion admits a real validated patch', () => {
    window.innerWidth = 500;
    const sig = signal('viewport.width');
    const comp = component('card', [0, 768], ['mobile', 'desktop']);
    const ent = sealNode<EntityNode>({
      _tag: 'DocGraphEntityNode',
      _version: 1,
      family: 'entity',
      id: '' as ContentAddress,
      meta,
      components: [comp.id],
    });
    const proj = projection('css', comp.id, 'card');
    const poseMobile = pose(ent.id, 'mobile', { '--czap-card': '14px' });
    const poseDesktop = pose(ent.id, 'desktop', { '--czap-card': '18px' });
    const graph = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta,
      nodes: [sig, comp, ent, proj, poseMobile, poseDesktop],
      edges: [
        { from: sig.id, to: comp.id, type: 'seq' },
        { from: comp.id, to: proj.id, type: 'seq' },
        { from: ent.id, to: comp.id, type: 'seq' },
      ],
    });

    const el = document.createElement('div');
    document.body.append(el);
    const entId = (graph.nodes.find((n) => n.family === 'entity') as EntityNode).id;
    const handle = loadGraphRuntime(graph, (id) => (id === entId ? el : null))!;
    const baseId = handle.graph.id;

    // Cast OUT: the reference consumer projects the LIVE graph for a producer.
    const ctx = castStageContext(handle);
    expect(ctx._tag).toBe('AIContext');
    expect(ctx.base).toBe(baseId);

    // Cast IN: a REAL validated candidate (a pose tweak) admitted onto the live graph.
    const newPose = pose(entId, 'mobile', { '--czap-card': '16px' });
    const candidate = GraphPatch.propose(handle.graph, [{ op: 'update', family: 'pose', node: newPose }]);
    const result = applyGraphSuggestion(handle, candidate);

    expect(result.ok).toBe(true);
    expect(result.errors).toBeUndefined();
    // The graph advanced through the token-witness chain — a new content address.
    expect(result.graph!.id).not.toBe(baseId);
    expect(handle.graph.id).toBe(result.graph!.id);

    handle.release();
  });

  test('applyGraphSuggestion rejects a forged candidate and leaves the graph UNCHANGED', () => {
    window.innerWidth = 500;
    const sig = signal('viewport.width');
    const comp = component('card', [0, 768], ['mobile', 'desktop']);
    const ent = sealNode<EntityNode>({
      _tag: 'DocGraphEntityNode',
      _version: 1,
      family: 'entity',
      id: '' as ContentAddress,
      meta,
      components: [comp.id],
    });
    const proj = projection('css', comp.id, 'card');
    const poseMobile = pose(ent.id, 'mobile', { '--czap-card': '14px' });
    const graph = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta,
      nodes: [sig, comp, ent, proj, poseMobile],
      edges: [
        { from: sig.id, to: comp.id, type: 'seq' },
        { from: comp.id, to: proj.id, type: 'seq' },
        { from: ent.id, to: comp.id, type: 'seq' },
      ],
    });

    const el = document.createElement('div');
    document.body.append(el);
    const entId = (graph.nodes.find((n) => n.family === 'entity') as EntityNode).id;
    const handle = loadGraphRuntime(graph, (id) => (id === entId ? el : null))!;
    const baseId = handle.graph.id;

    // Forge: a node claiming a fabricated address its bytes do not hash to, pinned
    // by an edge — the validator re-seals it to its true address, the edge dangles.
    const realProj = projection('css', comp.id, 'forged');
    const LYING_ID = 'fnv1a:deadbeef' as ContentAddress;
    const forged = {
      _tag: 'GraphPatch',
      _version: 1,
      base: baseId,
      ops: [
        { op: 'add', family: 'projection', node: { ...realProj, id: LYING_ID } },
        { op: 'add', edge: { from: comp.id, to: LYING_ID, type: 'seq' } },
      ],
    };

    const result = applyGraphSuggestion(handle, forged);
    expect(result.ok).toBe(false);
    expect(result.graph).toBeUndefined();
    expect(result.errors && result.errors.length).toBeGreaterThan(0);
    expect(handle.graph.id).toBe(baseId);

    handle.release();
  });
});
