/**
 * Example asset declarations for the reference intro scene.
 * Registers the audio bed and its derived beat-marker projection.
 *
 * @module
 */

import { defineAsset, AssetRegistry, BeatMarkerProjection, WavMetadataProjection } from '@czap/assets';

/** Intro audio bed — silent 1-second fixture for testing. */
export const introBed = defineAsset({
  id: 'intro-bed',
  source: 'examples/scenes/intro-bed.wav',
  kind: 'audio',
  budgets: { decodeP95Ms: 50, memoryMb: 30 },
  invariants: [],
  attribution: {
    license: 'CC-BY-4.0',
    author: 'Hobby Musician',
  },
});

/**
 * Immutable registry assembled from the scene's asset capsules. The
 * projection factories and `intro.ts`'s `ref('intro-bed')` validate against
 * THIS registry — there is no module-global lookup or import-order dependence.
 */
export const assetRegistry = AssetRegistry.make([introBed]);

/** Beat-marker projection derived from introBed, validated against the registry. */
export const introBedBeats = BeatMarkerProjection(assetRegistry, 'intro-bed');

/** WAV LIST/INFO metadata projection derived from introBed. */
export const introBedMetadata = WavMetadataProjection(assetRegistry, 'intro-bed');
