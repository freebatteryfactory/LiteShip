/**
 * Scene-stage — the in-repo REFERENCE CONSUMER that drives the runtime's two
 * 0.4.0 seams end-to-end: the scene→graph bridge (item C, `scene-bridge.ts`) and
 * the AI-apply seam (item D, `graph-ai-apply.ts`).
 *
 * Both seams ship as real, tested PRODUCERS but, until now, stopped at `export` —
 * nothing in the repo drove a REAL compiled `@liteship/scene` through
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

import type { AIContext, CastContextOptions } from '@liteship/core';
import type { SceneRuntime } from '@liteship/scene';
import { bridgeSceneToGraph } from './scene-bridge.js';
import type { BridgeClock, BridgeOptions, SceneBridgeHandle, SceneQueryEffect } from './scene-bridge.js';
import { admitGraphPatchProposal, castGraphContext } from './graph-ai-apply.js';
import type { AdmitPatchResult } from './graph-ai-apply.js';
import type { EntityElementResolver, GraphRuntimeHandle } from './graph-runtime.js';

/**
 * Identity projection retained for hosts that previously named the stage query
 * seam. Typed ECS entities already expose their canonical Part reads, so no
 * `trackId` lifting adapter remains.
 */
export function sceneStageRunQuery(query: SceneQueryEffect): SceneQueryEffect {
  return query;
}

/**
 * Options for {@link driveSceneStage}. A host controls `projectTrack` and the
 * transition blend custom-property name.
 */
export type SceneStageOptions = BridgeOptions;

/**
 * Drive a REAL compiled `@liteship/scene` runtime handle through the live graph
 * runtime — the reference wiring of {@link bridgeSceneToGraph}.
 *
 * The `@liteship/scene` {@link SceneRuntime.Handle} satisfies the bridge's
 * `BridgeableScene` contract directly (it exposes `tick` + a queryable `world`),
 * so it is passed straight in. The result is a real producer→consumer path: the
 * scene's TransitionSystem writes `_blend`, the bridge
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
  return bridgeSceneToGraph(scene, graphHandle, resolve, clock, opts);
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
