/**
 * Scene → live-runtime BRIDGE (0.4.0 item C).
 *
 * Lets a signal-indexed `@liteship/scene` drive the LIVE DOM/GPU runtime — not just
 * an offline video encode. It composes item B's runtime DocumentGraph spine
 * (`graph-runtime.ts`'s {@link GraphRuntimeHandle}) with a `@liteship/scene`
 * {@link SceneRuntimeHandle}: every frame it ticks the scene, then routes the
 * scene's per-track output across the ONE design boundary that keeps the graph
 * from being re-sealed 60×/s.
 *
 * THE DISCRETE/CONTINUOUS SPLIT (the LAW under test):
 *
 *   - DISCRETE — a STATE CROSSING. A `TransitionSystem` blend passing 0→1 (the
 *     active pose flips from the "from" side to the "to" side). This is SPARSE.
 *     On a crossing we build a MINIMAL {@link GraphPatch} that re-points the
 *     owning entity's pose to the new state and feed it to the live graph
 *     handle's `recast`, so the cast pipeline flips `data-liteship-state` through the
 *     exact same delta seam `client:adaptive` already drives. The graph is
 *     re-sealed ONLY on a crossing — cheap, because crossings are rare.
 *
 *   - CONTINUOUS — the in-between TWEEN value (`_blend`, eased). This moves EVERY
 *     frame. We write it to a `--liteship-*` CSS custom property AND dispatch a
 *     `liteship:uniform-update` GPU uniform on the resolved leaf element directly.
 *     This NEVER touches the graph — patching per frame would re-seal the graph
 *     60×/s, defeating the IR's content-addressing entirely.
 *
 * Put plainly: the discrete crossing is a graph mutation; the continuous tween is
 * a leaf write. {@link bridgeSceneToGraph} `recast`s ONLY on a crossing and
 * NEVER on a continuous frame.
 *
 * SSR-safe: the clock (rAF / signal observer) and all DOM writes are guarded —
 * importing this module on the server is inert, and `bridgeSceneToGraph` with a
 * `time` clock no-ops its loop off-DOM (no `requestAnimationFrame`). The element
 * resolution reuses item B's {@link EntityElementResolver}, so the host owns the
 * entity → element mapping exactly as the graph loader does.
 *
 * @module
 */

import {
  GraphPatch,
  sealNode,
  startRafLoop,
  type ContentAddress,
  type DocumentGraph,
  type PoseNode,
} from '@liteship/core';
import { dispatchLiteshipEvent } from '@liteship/web';
import type { SceneRuntime } from '@liteship/scene';
import { attachSignalObserver, readSignalValue, warnIfSignalUnserved } from './boundary.js';
import { graphRuntimeInternals, type EntityElementResolver, type GraphRuntimeHandle } from './graph-runtime.js';

/**
 * The minimal `@liteship/scene` runtime surface the bridge consumes: a clock-driven
 * `tick` plus a queryable `world`. The full `SceneRuntime.Handle` satisfies this
 * structurally (it exposes both), so a caller passes the real handle directly;
 * a test can pass a fake of exactly this shape to exercise the routing law
 * without compiling a scene.
 */
export interface BridgeableScene {
  /** Advance the scene simulation by `dtMs`, running every system once. */
  readonly tick: (dtMs: number) => Promise<void>;
  /** The live ECS world — the bridge reads each transition track's discrete/continuous state off it. */
  readonly world: SceneWorld;
}

/** The narrow `world.query` surface the bridge reads — the `@liteship/core` World exposes exactly this. */
export interface SceneWorld {
  /**
   * Query entities carrying ALL named components. `@liteship/core`'s `World.query`
   * is SYNCHRONOUS and returns the matched entities directly, so the bridge reads
   * the result inline ({@link SceneQueryEffect} = `readonly SceneEntity[]`). The
   * real `SceneRuntime.Handle.world` (whose `query` returns the world's entity
   * rows) satisfies this structurally; each entity carries its live component map,
   * and a host may still supply a `runQuery` projection to lift `trackId` out of
   * that map (the real World stores it as a component — see `scene-stage.ts`).
   */
  readonly query: (...componentNames: string[]) => SceneQueryEffect;
}

/**
 * Compile-time anchor: a real `@liteship/scene` {@link SceneRuntime.Handle} MUST be a
 * valid {@link BridgeableScene} (it exposes `tick` + a queryable `world`). This is
 * what makes `@liteship/scene` a runtime CONSUMER of the bridge — a host passes the
 * real handle straight in, no adapter. If the handle's shape drifts, this fails to
 * compile rather than failing silently at a call site.
 */
const _sceneHandleIsBridgeable = (handle: SceneRuntime.Handle): BridgeableScene => handle;
void _sceneHandleIsBridgeable;

/**
 * The value `world.query(...)` returns: the matched entities, synchronously.
 * `@liteship/core`'s `World.query` is sync, so the bridge reads this inline (no
 * runner). A host may inject a `runQuery` projection to reshape it (e.g. lift
 * `trackId` out of the component map) before the routing loop reads each entity.
 */
export type SceneQueryEffect = readonly SceneEntity[];

/**
 * One queried entity as the bridge reads it: a track id plus its live component
 * map. `trackId` is OPTIONAL because the raw `@liteship/core` World stores it as a
 * component rather than a top-level field — the reference `runQuery` projection
 * (`scene-stage.ts`) lifts it up; a fake scene supplies it directly.
 */
interface SceneEntity {
  readonly trackId?: unknown;
  readonly components: ReadonlyMap<string, unknown>;
}

/**
 * Clock that drives the bridge's tick loop:
 *
 *   - `{ kind: 'time' }` — a plain rAF wall-clock; `dt` is the real frame delta.
 *   - `{ kind: 'signal', input, durationMs }` — a SIGNAL clock: the scene's
 *     timeline position is `signal(input) * durationMs` (e.g. `scroll.progress`
 *     scrubs a `durationMs` scene). The bridge attaches the signal observer and
 *     ticks the DELTA needed to reach the new timeline position on every change.
 */
export type BridgeClock =
  { readonly kind: 'time' } | { readonly kind: 'signal'; readonly input: string; readonly durationMs: number };

/** Handle returned by {@link bridgeSceneToGraph}: stop the clock and release. */
export interface SceneBridgeHandle {
  /** Cancel the rAF / detach the signal observer. Idempotent. */
  readonly stop: () => void;
}

/** Options for {@link bridgeSceneToGraph}. */
export interface BridgeOptions {
  /**
   * Map a scene `trackId` to the {@link DocumentGraph} `EntityNode.id` it drives —
   * the scene's PROJECTION into the graph. Built into a stable map ONCE at bridge
   * construction (never re-derived per tick). Returning `undefined` skips that
   * track (no graph entity backs it). Defaults to a string-equality match against
   * the graph's entity ids (a scene whose track ids ARE the entity ids needs no
   * mapper).
   */
  readonly projectTrack?: (trackId: string) => ContentAddress | undefined;
  /**
   * Optional projection over the world-query result. `world.query(...)` is read
   * DIRECTLY (it is synchronous); when supplied, `runQuery` reshapes the rows
   * before the routing loop reads them — the reference consumer injects the
   * `trackId`-lifting projection here (`scene-stage.ts`). May be sync or async;
   * the bridge awaits it either way. Omitted, the query rows are used as-is.
   */
  readonly runQuery?: (query: SceneQueryEffect) => readonly SceneEntity[] | Promise<readonly SceneEntity[]>;
  /**
   * The `--liteship-*` CSS custom property the continuous blend is written to.
   * Defaults to `--liteship-blend`. The leaf write + `liteship:uniform-update` dispatch
   * use this key so a GPU shader binds `u_blend` (the canonical `glslIdent` of
   * `blend`).
   */
  readonly continuousVar?: string;
}

/** The two-sided discrete state a transition track resolves to, by which side of the crossing `_blend` is on. */
const FROM_STATE = 'from';
const TO_STATE = 'to';
/** The crossing threshold: `_blend >= 0.5` is the "to" side. A single, deterministic split point. */
const CROSSING = 0.5;

/** Quantize a continuous blend [0,1] to its DISCRETE side of the crossing — the active pose this frame. */
function discreteStateOf(blend: number): string {
  return blend >= CROSSING ? TO_STATE : FROM_STATE;
}

/**
 * Build the MINIMAL {@link GraphPatch} that re-points an entity's active pose to
 * `nextState` — the discrete-crossing mutation. We mint a fresh {@link PoseNode}
 * for the entity at the new state (the address is content-derived) and emit a
 * single `update` op for the `pose` family. `GraphPatch.apply` re-addresses, so
 * the runtime's `recast` flips `data-liteship-state` through the one delta seam.
 *
 * The pose carries NO continuous value (no `_blend` binding) — the continuous
 * tween is a LEAF write, never a graph payload, so the patch stays minimal and a
 * crossing is the ONLY thing that re-seals the graph.
 */
function crossingPatch(graph: DocumentGraph, entityId: ContentAddress, nextState: string): GraphPatch {
  const existing = graph.nodes.find(
    (node) =>
      node.family === 'pose' && (node as PoseNode).entityRef === entityId && (node as PoseNode).state === nextState,
  ) as PoseNode | undefined;

  // Reuse the entity's existing pose for this state if the authored graph already
  // carries one (re-addressing it is a no-op `update`); else mint a minimal pose.
  const pose: PoseNode =
    existing ??
    sealNode<PoseNode>({
      _tag: 'DocGraphPoseNode',
      _version: 1,
      family: 'pose',
      id: '' as ContentAddress,
      meta: graph.meta,
      entityRef: entityId,
      state: nextState as PoseNode['state'],
      bindings: {},
    });

  return GraphPatch.propose(graph, [{ op: 'update', family: 'pose', node: pose }]);
}

/**
 * Write the CONTINUOUS blend to a resolved leaf element: set the `--liteship-*` CSS
 * custom property AND dispatch a `liteship:uniform-update` carrying the blend so the
 * GPU runtime (`gpu.ts`'s `onElementUniformUpdate`) binds the live uniform. This
 * is the per-frame write that NEVER touches the graph.
 */
function writeContinuous(element: HTMLElement, cssVar: string, blend: number): void {
  const value = String(blend);
  element.style.setProperty(cssVar, value);
  dispatchLiteshipEvent(element, 'liteship:uniform-update', { css: { [cssVar]: value } });
}

/** The custom-event name the discrete crossing dispatches on (mirrors the graph runtime's default). */
const GRAPH_STATE_EVENT = 'liteship:graph-state';

/**
 * Apply a DISCRETE state to the leaf element: flip `data-liteship-state` and dispatch
 * the canonical `liteship:graph-state` event so downstream listeners (and the
 * inspector) see the crossing — the same attribute + event the cast pipeline's
 * `applyBoundaryState` writes. The scene is the state AUTHORITY here, so this is
 * the authoritative flip; the companion `recast` keeps the graph IR in sync.
 */
function applyDiscreteState(element: HTMLElement, state: string): void {
  if (element.getAttribute('data-liteship-state') !== state) {
    element.setAttribute('data-liteship-state', state);
  }
  dispatchLiteshipEvent(element, GRAPH_STATE_EVENT, { discrete: { [state]: state }, state });
}

/**
 * Bridge a signal-indexed scene to the LIVE graph runtime. Drives the scene's
 * clock, routing each transition track's output across the discrete/continuous
 * boundary:
 *
 *   - a DISCRETE crossing (`_blend` passing the 0.5 split) → a minimal
 *     {@link GraphPatch} fed to `graphHandle.recast` (flips `data-liteship-state`);
 *   - the CONTINUOUS `_blend` → a `--liteship-*` CSS var + `liteship:uniform-update` on
 *     the leaf element EVERY frame (never a graph patch).
 *
 * The `trackId → EntityNode.id` projection is built ONCE here (it never changes
 * across the scene's lifetime) and reused per tick. Returns a handle whose
 * `stop()` cancels the clock and is idempotent.
 *
 * SSR-safe: with a `time` clock and no `requestAnimationFrame` (server), the loop
 * never starts; with a `signal` clock, `attachSignalObserver` returns `null`
 * off-DOM. Either way `stop()` is safe to call.
 */
export function bridgeSceneToGraph(
  scene: BridgeableScene,
  graphHandle: GraphRuntimeHandle,
  resolve: EntityElementResolver,
  clock: BridgeClock,
  opts: BridgeOptions = {},
): SceneBridgeHandle {
  const projectTrack = opts.projectTrack ?? ((trackId: string) => trackId as ContentAddress);
  const runQuery = opts.runQuery;
  const continuousVar = opts.continuousVar ?? '--liteship-blend';

  // The scene's projection into the graph: a STABLE trackId → EntityNode.id map.
  // Built ONCE, never re-derived per tick. Lazily populated on the first tick
  // (the world's entities are known after build), then frozen for the lifetime.
  const trackToEntity = new Map<string, ContentAddress>();
  // Last DISCRETE state applied per track — a crossing is "state changed vs last
  // tick". `undefined` before the first observation so the first resolved state
  // seeds without a spurious crossing.
  const lastState = new Map<string, string>();
  let mappedOnce = false;
  let stopped = false;

  /**
   * One bridge step: tick the scene `dt`, then read each transition track's
   * discrete + continuous state off the world and route it. Async because the
   * scene tick is Promise-shaped; a frame fires-and-forgets it.
   */
  async function step(dtMs: number): Promise<void> {
    if (stopped) return;
    await scene.tick(dtMs);
    if (stopped) return;

    // Read the live transition tracks: entities carrying `_blend` (written by
    // TransitionSystem this tick) plus their `trackId`. `world.query` is
    // SYNCHRONOUS — read it directly; an optional `runQuery` projection reshapes
    // the rows (e.g. lifts `trackId` out of the component map for a real scene).
    const queried = scene.world.query('_blend');
    const entities = runQuery ? await runQuery(queried) : queried;
    if (stopped) return;

    for (const entity of entities) {
      const trackId = typeof entity.trackId === 'string' ? entity.trackId : String(entity.trackId);
      const blendRaw = entity.components.get('_blend');
      if (typeof blendRaw !== 'number') continue;
      const blend = blendRaw;

      // PROJECTION (built once): trackId → EntityNode.id. Resolve+cache lazily.
      if (!mappedOnce && !trackToEntity.has(trackId)) {
        const entityId = projectTrack(trackId);
        if (entityId !== undefined) trackToEntity.set(trackId, entityId);
      }
      const entityId = trackToEntity.get(trackId);
      if (entityId === undefined) continue;

      // CONTINUOUS: write the tween to the leaf element EVERY frame — never patches.
      const element = resolve(entityId);
      if (element) writeContinuous(element, continuousVar, blend);

      // DISCRETE: a crossing is a change in the quantized side vs last tick. Only
      // then do we mutate the graph (recast) AND flip the leaf's discrete state.
      const nextState = discreteStateOf(blend);
      const prevState = lastState.get(trackId);
      if (prevState !== nextState) {
        lastState.set(trackId, nextState);
        // Skip the FIRST observation (seed): there is no prior state to cross FROM,
        // so seeding is not a crossing. A real 0→1 pass on a later frame is the
        // crossing that recasts.
        if (prevState !== undefined) {
          // Mutate the IR: feed a minimal GraphPatch to `recast` so the graph
          // reflects the new active pose through the one delta seam (re-addresses).
          const patch = crossingPatch(graphHandle.graph, entityId, nextState);
          graphHandle.recast(patch);
          const applied = graphRuntimeInternals(graphHandle)?.applyState(entityId, nextState) ?? false;
          // The SCENE is the discrete-state authority (the active pose is the
          // scene's, not a viewport signal's), so flip `data-liteship-state` on the
          // leaf directly here. The cast pipeline's signal re-seed would otherwise
          // pull the state back to the signal's quantization; for a scene-driven
          // entity the scene's crossing IS the source of truth. We apply through
          // the same attribute + `liteship:graph-state` event the cast pipeline uses.
          if (!applied && element) applyDiscreteState(element, nextState);
        }
      }
    }

    // The projection map is complete after the first tick saw every entity.
    mappedOnce = true;
  }

  // ----- Clock wiring -------------------------------------------------------

  if (clock.kind === 'signal') {
    // SIGNAL clock: the scene's timeline position is signal * durationMs. On every
    // signal change, tick the signed DELTA to reach the new position. Negative
    // deltas are intentional: scroll/signal scrubbing must be able to move the
    // scene back to an earlier timeline position.
    // Warn once at setup if the clock signal will never tick (typo or no live
    // producer here) — self-guarded for SSR so the inert-on-server contract holds.
    warnIfSignalUnserved(clock.input, { source: 'liteship/astro.scene-bridge', what: 'scene signal clock' });
    let lastPositionMs = 0;
    const cleanup =
      typeof window === 'undefined'
        ? null
        : attachSignalObserver(clock.input, () => {
            const value = readSignalValue(clock.input);
            if (value === undefined) return;
            const positionMs = value * clock.durationMs;
            const dt = positionMs - lastPositionMs;
            lastPositionMs = positionMs;
            void step(dt);
          });
    return {
      stop(): void {
        if (stopped) return;
        stopped = true;
        cleanup?.();
        graphHandle.release();
      },
    };
  }

  // TIME clock: a plain rAF wall-clock loop. SSR-guarded via startRafLoop — no
  // requestAnimationFrame means no loop (the bridge is inert on the server).
  // startRafLoop hands elapsed-since-first-frame; the per-frame `dt` the step
  // consumes is the difference between successive elapsed readings (0 on frame 1).
  let lastElapsed = 0;
  const stopLoop = startRafLoop((elapsedMs) => {
    if (stopped) return;
    const dt = elapsedMs - lastElapsed;
    lastElapsed = elapsedMs;
    void step(dt);
  });

  return {
    stop(): void {
      if (stopped) return;
      stopped = true;
      stopLoop();
      graphHandle.release();
    },
  };
}
