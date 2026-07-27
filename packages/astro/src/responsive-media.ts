/**
 * Responsive-media HOST projection for `@liteship/astro` (#140).
 *
 * The production wiring of the edge `ClientHints.responsiveMediaCapabilities` /
 * `responsiveMediaVaryHeader` helpers (correct but test-only before this): derive
 * Save-Data / DPR caps from a request's Client Hints, project the intent through the
 * ONE effective-candidate law (`selectCandidates` in `@liteship/core`), and merge the
 * responsive-media `Vary` axis into the response — unioning, never clobbering, any
 * pre-existing `Vary` (RFC 9110 §12.5.5, via the Wave-1 `mergeVaryHeader`).
 *
 * `liteshipMiddleware` exposes the per-request projector on `Astro.locals.liteship.responsiveMedia`
 * and emits the merged `Vary`; `@liteship/cloudflare`'s `cloudflareMiddleware` inherits both
 * because it wraps `liteshipMiddleware`, so the same law drives both host paths.
 *
 * @module
 */

import { projectResponsiveMediaPicture } from '@liteship/core';
import type { ResponsiveMediaIntent, ResponsiveMediaPictureProjection } from '@liteship/core';
import { ClientHints } from '@liteship/edge';
import type { ClientHintsHeaders } from '@liteship/edge';
import type { ExtendedDeviceCapabilities } from '@liteship/detect';
import { mergeVaryHeader } from './headers.js';

/**
 * Where a host derives Save-Data / DPR caps from: raw request `Headers`, a plain
 * Client-Hints header bag, or already-parsed `ExtendedDeviceCapabilities` (so a
 * middleware that parsed them once does not re-parse).
 */
export type ResponsiveMediaCapsSource = Headers | ClientHintsHeaders | ExtendedDeviceCapabilities;

/** A host-projected responsive image plus the `Vary` axis the caller must merge. */
export interface ResponsiveMediaHostProjection {
  /** The `<picture>` / `<img>` / preload projection, every artifact from the effective set. */
  readonly projection: ResponsiveMediaPictureProjection;
  /** The responsive-media `Vary` axis (`Sec-CH-DPR, Save-Data`) to merge into the response. */
  readonly vary: string;
}

/**
 * Project a responsive-media intent for THIS request: derive Save-Data / DPR caps
 * from Client Hints, project through the effective-candidate law, and return the
 * responsive `Vary` axis to merge into the response. Under Save-Data + high DPR the
 * projection advertises ONLY the light candidate — never a heavy one — through every
 * artifact (`src` / `srcset` / `<source>` / preload `imagesrcset`).
 */
export function projectResponsiveMediaForRequest(
  intent: ResponsiveMediaIntent,
  source: ResponsiveMediaCapsSource,
): ResponsiveMediaHostProjection {
  const caps = ClientHints.responsiveMediaCapabilities(source);
  return Object.freeze({
    projection: projectResponsiveMediaPicture(intent, caps),
    vary: ClientHints.responsiveMediaVaryHeader(),
  });
}

/**
 * Merge the responsive-media `Vary` axis (`Sec-CH-DPR, Save-Data`) into a response's
 * `Vary`, unioning rather than clobbering any pre-existing tokens (`Cookie`,
 * `Accept-Encoding`, app axes). A CDN then keys a Save-Data / high-DPR representation
 * apart from the normal one, so it cannot serve one for the other (Law 1).
 */
export function applyResponsiveMediaVary(headers: Headers): Headers {
  headers.set('Vary', mergeVaryHeader(headers.get('Vary'), ClientHints.responsiveMediaVaryHeader()));
  return headers;
}
