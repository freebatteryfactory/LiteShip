/**
 * Scene-stage — the in-repo REFERENCE CONSUMER that drives the runtime's two
 * 0.4.0 seams end-to-end: the scene→graph bridge (item C, `scene-bridge.ts`) and
 * the AI-apply seam (item D, `graph-ai-apply.ts`).
 *
 * Both seams ship as real, tested PRODUCERS but, until now, stopped at `export` —
 * nothing in the repo drove a REAL compiled `@czap/scene` through
 * {@link bridgeSceneToGraph} onto a live graph, and the AI seam's apply path had
 * no reference caller composing cast-OUT → admit-IN. This module is that caller:
 * a host integrates a stage by composing these two functions, so the
 * producer→consumer path is exercised by real in-repo code, not only by a test
 * with a hand-faked scene.
 *
 * NOTHING here calls a model or a provider — that boundary stays downstream (the
 * LiteShip rule). {@link applyGraphSuggestion} ADMITS a candidate a producer
 * already parsed; it does not produce one. {@link castStageContext} projects the
 * live graph OUT to the deterministic, content-addressed {@link AIContext} a
 * producer would feed to a model. The seam is the deliverable; the producer is not.
 *
 * @module
 */

import type { AIContext, CastContextOptions } from '@czap/core';
import type { SceneRuntime } from '@czap/scene';
import { bridgeSceneToGraph } from './scene-bridge.js';
import type { BridgeClock, BridgeOptions, SceneBridgeHandle } from './scene-bridge.js';
import { admitGraphPatchProposal, castGraphContext } from './graph-ai-apply.js';
import type { AdmitPatchResult } from './graph-ai-apply.js';
import type { EntityElementResolver, GraphRuntimeHandle } from './graph-runtime.js';

/**
 * The shape the bridge reads each queried entity as: a `trackId` plus its live
 * component map. The real `@czap/core` World's `query(...)` resolves to
 * `{ id, components }` entities where `trackId` is itself a COMPONENT (a scene
 * spawns `world.spawn({ trackId, ...components })`), so {@link sceneStageRunQuery}
 * below lifts `components.get('trackId')` up to the top-level `trackId` the bridge
 * expects. This is exactly the projection a fake scene hand-waves and a real one
 * must perform — the reason this reference consumer exists.
 */
interface BridgeEntity {
  readonly trackId: unknown;
  readonly components: ReadonlyMap<string, unknown>;
}

/** The minimal queried-entity shape the real World yields: an id + a component map. */
interface WorldEntity {
  readonly components: ReadonlyMap<string, unknown>;
}

/**
 * Run a real `@czap/scene` world query (an Effect) and project each resolved
 * `{ components }` entity into the bridge's `{ trackId, components }` shape by
 * lifting the `trackId` component to the top level. The scene runtime already
 * depends on Effect, so the query value resolves through `Effect.runPromise`.
 *
 * Exported so the real-path test (and any host) can reuse the EXACT projection
 * the reference consumer wires — no second, drifting copy.
 */
export async function sceneStageRunQuery(query: unknown): Promise<readonly BridgeEntity[]> {
  // Imported lazily so this module carries no static Effect dep — the scene that
  // produced `query` already depends on Effect, so the import resolves at runtime.
  const { Effect } = await import('effect');
  const entities = (await Effect.runPromise(
    query as Parameters<typeof Effect.runPromise>[0],
  )) as readonly WorldEntity[];
  return entities.map((entity) => ({
    // The real World stores `trackId` as a component; lift it so the bridge's
    // `entity.trackId` read resolves against the genuine scene track id.
    trackId: entity.components.get('trackId'),
    components: entity.components,
  }));
}

/**
 * Options for {@link driveSceneStage} — the bridge options MINUS `runQuery`, which
 * the reference consumer fixes to {@link sceneStageRunQuery} (the real-scene
 * trackId projection). A host still controls `projectTrack` / `continuousVar`.
 */
export type SceneStageOptions = Omit<BridgeOptions, 'runQuery'>;

/**
 * Drive a REAL compiled `@czap/scene` runtime handle through the live graph
 * runtime — the reference wiring of {@link bridgeSceneToGraph}.
 *
 * The `@czap/scene` {@link SceneRuntime.Handle} satisfies the bridge's
 * `BridgeableScene` contract directly (it exposes `tick` + a queryable `world`),
 * so it is passed straight in. The one piece a real scene needs that a fake does
 * not — lifting `trackId` out of the world entity's component map — is supplied as
 * the bridge's `runQuery` via {@link sceneStageRunQuery}. The result is a real
 * producer→consumer path: the scene's TransitionSystem writes `_blend`, the bridge
 * routes each discrete crossing to `graphHandle.recast` and the continuous tween to
 * the leaf element, and the live DOM/graph reflect the scene.
 *
 * Returns the bridge handle; `stop()` cancels the clock and releases the graph.
 */
export function driveSceneStage(
  scene: SceneRuntime.Handle,
  graphHandle: GraphRuntimeHandle,
  resolve: EntityElementResolver,
  clock: BridgeClock,
  opts: SceneStageOptions = {},
): SceneBridgeHandle {
  return bridgeSceneToGraph(scene, graphHandle, resolve, clock, {
    ...opts,
    runQuery: sceneStageRunQuery,
  });
}

/**
 * Cast the live graph OUT to the model-facing {@link AIContext} — the reference
 * wiring of {@link castGraphContext}. Inert: LiteShip never calls a model; this
 * only projects the current graph into the deterministic context a downstream
 * producer would feed to one.
 */
export function castStageContext(handle: GraphRuntimeHandle, opts?: CastContextOptions): AIContext {
  return castGraphContext(handle, opts);
}

/**
 * Admit a model-produced `candidate` patch onto the live graph — the reference
 * wiring of {@link admitGraphPatchProposal}. The candidate is whatever a producer
 * already parsed from a model's output; this consumer runs it through the
 * token-witness validation chain and re-casts only the delta on success, leaving
 * the runtime UNCHANGED on any rejection. It calls no model and mints no proposal
 * of its own — the producer boundary stays downstream.
 */
export function applyGraphSuggestion(handle: GraphRuntimeHandle, candidate: unknown): AdmitPatchResult {
  return admitGraphPatchProposal(handle, candidate);
}
