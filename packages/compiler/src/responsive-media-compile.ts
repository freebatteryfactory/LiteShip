/**
 * Responsive-media compile orchestrator — intent → picture / image-set (#125).
 *
 * @module
 */

import {
  AddressedDigest,
  projectResponsiveMediaPicture,
  buildResponsiveImageSet,
  selectCandidates,
  type ResponsiveMediaCapabilities,
  type ResponsiveMediaIntent,
  type ResponsiveMediaPictureProjection,
} from '@liteship/core';

/** Compiled responsive-media artifacts. */
export interface CompiledResponsiveMedia {
  readonly picture: ResponsiveMediaPictureProjection;
  readonly imageSet: string;
  readonly resultDigest: ReturnType<typeof AddressedDigest.of>;
}

/**
 * Compile a responsive-media intent into `<picture>` markup and CSS `image-set()`.
 */
export function compileResponsiveMedia(
  intent: ResponsiveMediaIntent,
  caps: ResponsiveMediaCapabilities,
): CompiledResponsiveMedia {
  const picture = projectResponsiveMediaPicture(intent, caps);
  // image-set() enumerates the SAME effective candidate set the picture does — under
  // Save-Data it lists only the light candidate, never the heavy DPR-matched one.
  const imageSet = buildResponsiveImageSet(selectCandidates(intent, caps).candidates);
  // The result digest (the content-addressed cache key) folds the EFFECTIVE markup, so
  // a Save-Data representation and a normal one address differently — a CDN keyed by it
  // (+ the `Save-Data` / `Sec-CH-DPR` Vary axis) cannot serve one for the other.
  const digestPayload = `${picture.picture}\n${picture.preload}\n${imageSet}`;
  return Object.freeze({
    picture,
    imageSet,
    resultDigest: AddressedDigest.of(new TextEncoder().encode(digestPayload)),
  });
}
