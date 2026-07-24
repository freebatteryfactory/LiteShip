/**
 * Test-only entrypoint for `@liteship/core`. Imported as `@liteship/core/testing`.
 *
 * These helpers mutate global registry state and would be footguns in
 * production code paths (an edge worker warm-start that calls
 * `resetCapsuleCatalog` would silently wipe every registered capsule,
 * causing dispatch to fail intermittently). They are intentionally
 * partitioned off the main package entry so a consumer cannot reach
 * them by importing `@liteship/core` directly.
 *
 * @module
 */

export { resetCapsuleCatalog } from './authoring/assembly.js';
