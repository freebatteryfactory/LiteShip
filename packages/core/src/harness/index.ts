/**
 * Harness — per-arm templates that emit test + bench + audit files
 * from a capsule declaration. Each arm has its own generator.
 *
 * @module
 */

export { generatePureTransform } from './pure-transform.js';
export type { HarnessOutput, HarnessContext } from './pure-transform.js';
export { ArbitraryFromSchema, schemaToArbitrary } from './arbitrary-from-schema.js';
export { generateReceiptedMutation } from './receipted-mutation.js';
export { generateStateMachine } from './state-machine.js';
export { generateSiteAdapter, SITE_ADAPTER_CHECKS } from './site-adapter.js';
export type { SiteAdapterCheckDisposition, SiteAdapterDriver } from './site-adapter.js';
export { generatePolicyGate } from './policy-gate.js';
export { generateCachedProjection } from './cached-projection.js';
export { generateSceneComposition, SCENE_CHECKS } from './scene-composition.js';
export type { HarnessLane, SceneCheckDisposition, SceneDriver } from './scene-composition.js';
// Compatibility re-exports: evidence owns these pure classifiers so consumers
// that do not use the fast-check-backed harness never load its entrypoint.
export {
  BENCH_NOT_APPLICABLE_MARKER,
  BENCH_NOT_APPLICABLE_RE,
  benchNotApplicableMarker,
} from '../evidence/bench-marker.js';
export { classifyBenchSource, benchHonestyError } from '../evidence/bench-classify.js';
