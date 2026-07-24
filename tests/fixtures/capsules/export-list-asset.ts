/**
 * Capsule-detector fixture — capsules bound via an export LIST instead of
 * an inline `export const`. Pins that the detector classifies
 * `const x = defineAsset(...); export { x };` (and the `export { x as y }`
 * alias form, reporting the EXPORTED name) as importable, while a binding
 * never named by any export stays non-exported.
 *
 * @module
 */

import { defineAsset } from '@liteship/assets';

const listExported = defineAsset({
  id: 'fixture-list-exported',
  source: 'examples/scenes/intro-bed.wav',
  kind: 'audio',
  budgets: { decodeP95Ms: 50 },
  invariants: [],
});

const aliasLocal = defineAsset({
  id: 'fixture-alias-exported',
  source: 'examples/scenes/intro-bed.wav',
  kind: 'audio',
  budgets: { decodeP95Ms: 50 },
  invariants: [],
});

const neverExported = defineAsset({
  id: 'fixture-never-exported',
  source: 'examples/scenes/intro-bed.wav',
  kind: 'audio',
  budgets: { decodeP95Ms: 50 },
  invariants: [],
});

/** Keeps `neverExported` used without exporting its capsule binding. */
export const fixtureRegisteredIds: readonly string[] = [neverExported.name];

export { listExported, aliasLocal as aliasExported };
