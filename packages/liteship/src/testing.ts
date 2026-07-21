/**
 * `liteship/testing` — the curated test-only facade over `@liteship/core/testing`
 * (the global-registry reset that would be a production footgun) and
 * `@liteship/core/harness` (the per-arm generators that emit test + bench + audit
 * files from a capsule declaration). Partitioned off the root so a consumer cannot
 * reach these by importing `liteship` directly. Curated named re-exports only — no
 * behavior lives here.
 * @module
 */

export { resetCapsuleCatalog } from '@liteship/core/testing';

export { generatePureTransform } from '@liteship/core/harness';
export type { HarnessOutput, HarnessContext } from '@liteship/core/harness';
export { ArbitraryFromSchema, schemaToArbitrary } from '@liteship/core/harness';
export { generateReceiptedMutation } from '@liteship/core/harness';
export { generateStateMachine } from '@liteship/core/harness';
export { generateSiteAdapter, SITE_ADAPTER_CHECKS } from '@liteship/core/harness';
export type { SiteAdapterCheckDisposition, SiteAdapterDriver } from '@liteship/core/harness';
export { generatePolicyGate } from '@liteship/core/harness';
export { generateCachedProjection } from '@liteship/core/harness';
export { generateSceneComposition, SCENE_CHECKS } from '@liteship/core/harness';
export type { HarnessLane, SceneCheckDisposition, SceneDriver } from '@liteship/core/harness';
export { BENCH_NOT_APPLICABLE_MARKER, BENCH_NOT_APPLICABLE_RE, benchNotApplicableMarker } from '@liteship/core/harness';
export { classifyBenchSource, benchHonestyError } from '@liteship/core/harness';
