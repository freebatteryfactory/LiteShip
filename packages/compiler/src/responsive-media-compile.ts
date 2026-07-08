/**
 * Responsive-media compile orchestrator — intent → picture / image-set (#125).
 *
 * @module
 */

import {
  AddressedDigest,
  projectResponsiveMediaPicture,
  buildResponsiveImageSet,
  type ResponsiveMediaCapabilities,
  type ResponsiveMediaIntent,
  type ResponsiveMediaPictureProjection,
} from '@czap/core';

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
  const imageSet = buildResponsiveImageSet(intent.variants);
  const digestPayload = `${picture.picture}\n${imageSet}`;
  return Object.freeze({
    picture,
    imageSet,
    resultDigest: AddressedDigest.of(new TextEncoder().encode(digestPayload)),
  });
}
