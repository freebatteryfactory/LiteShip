// @vitest-environment jsdom
/**
 * Scene → live-runtime bridge (0.4.0 item C) — the discrete-vs-continuous LAW.
 *
 * A signal-indexed scene with ONE transition track drives the live graph runtime.
 * The transition crosses its 0→1 blend at a KNOWN frame. We assert the bridge's
 * routing law directly:
 *
 *   (1) BEFORE the crossing (blend < 0.5 every frame): NO graph `recast` fires
 *       (spied), but the entity's CONTINUOUS state moves — the `--czap-blend` CSS
 *       var updates and a `czap:uniform-update` dispatches every frame.
 *   (2) PAST the crossing (blend passes 0.5): EXACTLY ONE recast fires and the
 *       entity's `data-czap-state` flips to the new discrete pose.
 *   (3) `stop()` cancels the rAF and releases the graph handle cleanly.
 *
 * The scene is faked to the exact shape the bridge consumes (`tick` + a queryable
 * `world` exposing each track's `_blend`), and the rAF is pumped manually, so the
 * test exercises the bridge's routing — "discrete→recast, continuous→leaf, never
 * patch per frame" — deterministically, without compiling a scene in jsdom.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
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
import { loadGraphRuntime } from '../../../packages/astro/src/runtime/graph-runtime.js';
import { bridgeSceneToGraph } from '../../../packages/astro/src/runtime/scene-bridge.js';
import type { BridgeableScene, SceneQueryEffect } from '../../../packages/astro/src/runtime/scene-bridge.js';

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

/**
 * One transition-backed entity: a component named `fx` whose states are the
 * bridge's discrete sides (`from`|`to`), a css projection (so it lowers onto a
 * live channel), and a pose per state. The signal input is immaterial for the
 * bridge path (the bridge drives state via recast, not a live signal observer) —
 * `viewport.width` lets the loader seed an initial state without DOM scroll.
 */
function buildSceneGraph(): { graph: DocumentGraph; entityId: ContentAddress } {
  const sig = signal('viewport.width');
  const comp = component('fx', [0, 1000000], ['from', 'to']);
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

  // Re-find the entity id in the sealed graph (sealing re-addresses).
  const sealedEnt = graph.nodes.find((n) => n.family === 'entity') as EntityNode;
  return { graph, entityId: sealedEnt.id };
}

/**
 * Fake scene: ONE transition track. `tick(dt)` accumulates time and recomputes
 * `_blend` as the local progress over `[0, durationMs]`; the crossing (0→0.5→1)
 * lands deterministically at the half-duration frame. The world exposes the
 * track's `_blend` via `query('_blend')`, matching the shape the bridge reads.
 */
function makeFakeScene(
  trackId: string,
  durationMs: number,
): {
  scene: BridgeableScene;
  ticks: number;
  blend: () => number;
} {
  let timeMs = 0;
  let ticks = 0;
  const blend = (): number => Math.max(0, Math.min(1, timeMs / durationMs));
  const scene: BridgeableScene = {
    tick: async (dt: number): Promise<void> => {
      timeMs += dt;
      ticks += 1;
    },
    world: {
      query: ((..._names: string[]): SceneQueryEffect => {
        // The injected `runQuery` ignores this opaque value and reads the closure,
        // so we return a marker the bridge passes straight to `runQuery`.
        return { __track: trackId, __blend: blend } as unknown as SceneQueryEffect;
      }) as BridgeableScene['world']['query'],
    },
  };
  return {
    scene,
    get ticks(): number {
      return ticks;
    },
    blend,
  };
}

/** Resolve the fake scene's query marker to the bridge's entity shape, reading the live blend. */
function runFakeQuery(
  query: SceneQueryEffect,
): Promise<readonly { trackId: unknown; components: ReadonlyMap<string, unknown> }[]> {
  const marker = query as unknown as { __track: string; __blend: () => number };
  return Promise.resolve([
    { trackId: marker.__track, components: new Map<string, unknown>([['_blend', marker.__blend()]]) },
  ]);
}

describe('bridgeSceneToGraph — discrete crossing recasts, continuous tween never does', () => {
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

    // Manual rAF pump: requestAnimationFrame enqueues; `pump()` runs one frame.
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

  /** Run exactly one queued rAF frame at wall-time `tsMs`, awaiting the async step it kicks off. */
  async function pump(tsMs: number): Promise<void> {
    const cb = rafQueue.shift();
    if (!cb) return;
    cb(tsMs);
    // The bridge's loop fires-and-forgets an async `step`; flush microtasks so the
    // world query + routing complete before assertions.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  test('before crossing: no recast, but continuous CSS var + uniform-update move each frame', async () => {
    const { graph, entityId } = buildSceneGraph();
    const handle = loadGraphRuntime(graph, () => el)!;
    expect(handle).not.toBeNull();
    const recastSpy = vi.spyOn(handle, 'recast');

    const durationMs = 1000; // crossing (blend 0.5) at t = 500ms.
    const fake = makeFakeScene('fx', durationMs);

    const uniformSpy = vi.fn();
    el.addEventListener('czap:uniform-update', uniformSpy);
    const setPropSpy = vi.spyOn(el.style, 'setProperty');

    const bridge = bridgeSceneToGraph(
      fake.scene,
      handle,
      () => el,
      { kind: 'time' },
      {
        projectTrack: (t) => (t === 'fx' ? entityId : undefined),
        runQuery: runFakeQuery,
      },
    );

    // Pump frames staying BELOW the crossing: ts 0, 100, 200 → blend 0, 0.1, 0.3.
    await pump(0);
    await pump(100);
    await pump(200);

    // No discrete crossing happened (blend never reached 0.5) → NO recast.
    expect(recastSpy).not.toHaveBeenCalled();

    // But the CONTINUOUS tween moved every frame: the leaf CSS var was written and
    // a czap:uniform-update dispatched with the rising blend.
    const blendWrites = setPropSpy.mock.calls.filter(([k]) => k === '--czap-blend');
    expect(blendWrites.length).toBeGreaterThanOrEqual(2);
    const lastBlend = Number(blendWrites.at(-1)![1]);
    expect(lastBlend).toBeGreaterThan(0);
    expect(lastBlend).toBeLessThan(0.5);
    expect(uniformSpy).toHaveBeenCalled();
    const uniformDetail = uniformSpy.mock.calls.at(-1)![0].detail as { css: Record<string, string> };
    expect(typeof uniformDetail.css['--czap-blend']).toBe('string');

    bridge.stop();
  });

  test('past crossing: exactly one recast fires and data-czap-state flips to the to-pose', async () => {
    const { graph, entityId } = buildSceneGraph();
    const handle = loadGraphRuntime(graph, () => el)!;
    const recastSpy = vi.spyOn(handle, 'recast');

    const durationMs = 1000;
    const fake = makeFakeScene('fx', durationMs);

    const bridge = bridgeSceneToGraph(
      fake.scene,
      handle,
      () => el,
      { kind: 'time' },
      {
        projectTrack: (t) => (t === 'fx' ? entityId : undefined),
        runQuery: runFakeQuery,
      },
    );

    // Seed below the crossing, then advance PAST it. dt between frames is ts-delta.
    await pump(0); // blend 0 → seeds discrete 'from', no recast (seed is not a crossing).
    await pump(100); // blend 0.1
    expect(recastSpy).not.toHaveBeenCalled();
    expect(el.getAttribute('data-czap-state')).toBe('from');

    await pump(600); // dt 500 → time 600ms → blend 0.6 ≥ 0.5 → CROSSING.

    // Exactly ONE recast fired on the single crossing.
    expect(recastSpy).toHaveBeenCalledTimes(1);
    // The discrete pose flipped through the cast pipeline.
    expect(el.getAttribute('data-czap-state')).toBe('to');
    expect(el.style.getPropertyValue('--czap-fx')).toBe('1');

    // Staying past the crossing does NOT recast again (no new crossing).
    await pump(700); // blend 0.7, still 'to' side.
    await pump(800);
    expect(recastSpy).toHaveBeenCalledTimes(1);

    bridge.stop();
  });

  test('signal clock uses signed deltas so reverse scrubbing moves the scene backward', async () => {
    const { graph, entityId } = buildSceneGraph();
    const handle = loadGraphRuntime(graph, () => el)!;
    const fake = makeFakeScene('fx', 1000);

    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });

    const bridge = bridgeSceneToGraph(
      fake.scene,
      handle,
      () => el,
      {
        kind: 'signal',
        input: 'scroll.progress',
        durationMs: 1000,
      },
      {
        projectTrack: (t) => (t === 'fx' ? entityId : undefined),
        runQuery: runFakeQuery,
      },
    );

    Object.defineProperty(window, 'scrollY', { value: 800, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    await pump(0);
    expect(fake.blend()).toBeCloseTo(0.8, 5);

    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    await pump(16);
    expect(fake.blend()).toBeCloseTo(0.2, 5);

    bridge.stop();
  });

  test('stop() cancels the rAF and releases the graph handle cleanly', async () => {
    const { graph, entityId } = buildSceneGraph();
    const handle = loadGraphRuntime(graph, () => el)!;
    const releaseSpy = vi.spyOn(handle, 'release');
    const recastSpy = vi.spyOn(handle, 'recast');

    const fake = makeFakeScene('fx', 1000);
    const bridge = bridgeSceneToGraph(
      fake.scene,
      handle,
      () => el,
      { kind: 'time' },
      {
        projectTrack: (t) => (t === 'fx' ? entityId : undefined),
        runQuery: runFakeQuery,
      },
    );

    await pump(0);
    const ticksBefore = fake.ticks;

    bridge.stop();
    expect(releaseSpy).toHaveBeenCalledTimes(1);

    // After stop, no further frames are queued and a stray pump is inert.
    await pump(500);
    expect(fake.ticks).toBe(ticksBefore); // scene did not tick again.

    // stop() is idempotent.
    bridge.stop();
    expect(releaseSpy).toHaveBeenCalledTimes(1);
    expect(recastSpy).not.toHaveBeenCalled();
  });
});
