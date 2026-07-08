/**
 * DPU watch-and-prepare — stamped verifiable HTML patches with feature detection
 * and a permanent floor path (#120).
 *
 * Marker names ride the stable `nodeLogicalKey` from `@czap/core` (never node
 * ContentAddresses, which self-invalidate on payload change). Each fragment is stamped
 * with base/result graph ids plus a sha256 {@link AddressedDigest} so `staleBase`
 * lifts to the DOM layer — the same CAS discipline as a GraphPatch, transport-agnostic.
 *
 * Native DPU (`setHTML` / streaming patch APIs) is feature-detected; when absent the
 * floor path sanitizes HTML and applies via {@link morphPure} — tested in every browser
 * today and never removed when native support lands.
 *
 * @module
 */
import type { AddressedDigest, ContentAddress } from '@czap/core';
import { AddressedDigest as AddressedDigestNS } from '@czap/core';
import { morphPure } from '../morph/diff-pure.js';

/** DOM attribute carrying the stable DPU marker name (a logicalKey, not a content address). */
export const DPU_MARKER_ATTR = 'data-czap-dpu-marker';
/** DOM attribute stamped with the base graph id the patch was prepared against. */
export const DPU_BASE_ATTR = 'data-czap-dpu-base';
/** DOM attribute stamped with the result graph id after a successful apply. */
export const DPU_RESULT_ATTR = 'data-czap-dpu-result';
/** DOM attribute stamped with the sha256 integrity digest of the applied HTML. */
export const DPU_DIGEST_ATTR = 'data-czap-dpu-digest';

/** Which rung applied or will apply a verifiable patch. */
export type DpuRung = 'native-sethtml' | 'floor-morph';

/** Feature-detected DPU capability — floor-morph is always available. */
export type DpuCapability =
  | { readonly available: true; readonly rung: 'native-sethtml' }
  | { readonly available: false; readonly rung: 'floor-morph' };

/**
 * Stamped verifiable-patch envelope — marker + CAS base/result ids + sha256 digest
 * over the HTML fragment bytes (meta excluded; same law as graph 304 validators).
 */
export interface VerifiablePatchEnvelope {
  /** Stable logical marker name (from `nodeLogicalKey`), never a node id. */
  readonly marker: string;
  readonly baseGraphId: ContentAddress;
  readonly resultGraphId: ContentAddress;
  readonly digest: AddressedDigest;
  readonly html: string;
}

/** Outcome of verifying a stamped patch against the current base graph. */
export type VerifiablePatchVerification =
  | { readonly _tag: 'verified' }
  | { readonly _tag: 'staleBase'; readonly expected: ContentAddress; readonly received: ContentAddress }
  | { readonly _tag: 'digestMismatch'; readonly expected: string; readonly actual: string };

/** Outcome of applying a verifiable patch (applied or refused). */
export type ApplyVerifiablePatchResult =
  | { readonly _tag: 'applied'; readonly rung: DpuRung; readonly envelope: VerifiablePatchEnvelope }
  | {
      readonly _tag: 'refused';
      readonly verification: Exclude<VerifiablePatchVerification, { readonly _tag: 'verified' }>;
    };

/** Handle returned by {@link watchAndPrepare} — stamps and applies verifiable patches. */
export interface WatchAndPrepareHandle {
  readonly marker: string;
  readonly target: Element;
  readonly capability: DpuCapability;
  stamp(input: {
    readonly baseGraphId: ContentAddress;
    readonly resultGraphId: ContentAddress;
    readonly html: string;
  }): VerifiablePatchEnvelope;
  apply(envelope: VerifiablePatchEnvelope, currentBaseGraphId: ContentAddress): ApplyVerifiablePatchResult;
}

type ElementWithSetHtml = Element & { setHTML?: (html: string, options?: object) => void };

/** Detect native DPU `setHTML` support; floor-morph is the permanent fallback. */
export function detectDpuCapability(): DpuCapability {
  if (typeof Element !== 'undefined') {
    const probe = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (probe && typeof (probe as ElementWithSetHtml).setHTML === 'function') {
      return { available: true, rung: 'native-sethtml' };
    }
  }
  return { available: false, rung: 'floor-morph' };
}

/** Mint the sha256 digest for an HTML fragment (UTF-8 bytes, content-address kernel). */
export function digestHtmlFragment(html: string): AddressedDigest {
  return AddressedDigestNS.of(new TextEncoder().encode(html), 'sha256');
}

/** Stamp a verifiable-patch envelope for a marker + graph CAS chain + HTML fragment. */
export function stampVerifiablePatch(input: {
  readonly marker: string;
  readonly baseGraphId: ContentAddress;
  readonly resultGraphId: ContentAddress;
  readonly html: string;
}): VerifiablePatchEnvelope {
  return {
    marker: input.marker,
    baseGraphId: input.baseGraphId,
    resultGraphId: input.resultGraphId,
    digest: digestHtmlFragment(input.html),
    html: input.html,
  };
}

/** Verify a stamped envelope against the live base graph id and fragment bytes. */
export function verifyVerifiablePatch(
  envelope: VerifiablePatchEnvelope,
  currentBaseGraphId: ContentAddress,
): VerifiablePatchVerification {
  if (envelope.baseGraphId !== currentBaseGraphId) {
    return { _tag: 'staleBase', expected: currentBaseGraphId, received: envelope.baseGraphId };
  }
  const actual = digestHtmlFragment(envelope.html);
  if (actual.integrity_digest !== envelope.digest.integrity_digest) {
    return { _tag: 'digestMismatch', expected: envelope.digest.integrity_digest, actual: actual.integrity_digest };
  }
  return { _tag: 'verified' };
}

function stampTarget(target: Element, envelope: VerifiablePatchEnvelope): void {
  target.setAttribute(DPU_MARKER_ATTR, envelope.marker);
  target.setAttribute(DPU_BASE_ATTR, envelope.baseGraphId);
  target.setAttribute(DPU_RESULT_ATTR, envelope.resultGraphId);
  target.setAttribute(DPU_DIGEST_ATTR, envelope.digest.integrity_digest);
}

function applyFloor(target: Element, html: string): void {
  morphPure(target, html);
}

function applyNative(target: Element, html: string): void {
  (target as ElementWithSetHtml).setHTML!(html);
}

/** Apply a verified envelope to `target`, using native DPU when available or the floor path. */
export function applyVerifiablePatch(
  target: Element,
  envelope: VerifiablePatchEnvelope,
  currentBaseGraphId: ContentAddress,
  capability: DpuCapability = detectDpuCapability(),
): ApplyVerifiablePatchResult {
  const verification = verifyVerifiablePatch(envelope, currentBaseGraphId);
  if (verification._tag !== 'verified') {
    return { _tag: 'refused', verification };
  }
  if (capability.available) {
    applyNative(target, envelope.html);
    stampTarget(target, envelope);
    return { _tag: 'applied', rung: 'native-sethtml', envelope };
  }
  applyFloor(target, envelope.html);
  stampTarget(target, envelope);
  return { _tag: 'applied', rung: 'floor-morph', envelope };
}

/**
 * Watch a DOM slot under `marker` and prepare stamped verifiable patches against it.
 * The target is annotated with `data-czap-dpu-marker` immediately; successful applies
 * also stamp base/result ids and the fragment digest on the element.
 */
export function watchAndPrepare(marker: string, target: Element): WatchAndPrepareHandle {
  const capability = detectDpuCapability();
  target.setAttribute(DPU_MARKER_ATTR, marker);
  return {
    marker,
    target,
    capability,
    stamp(input) {
      return stampVerifiablePatch({ marker, ...input });
    },
    apply(envelope, currentBaseGraphId) {
      return applyVerifiablePatch(target, envelope, currentBaseGraphId, capability);
    },
  };
}
