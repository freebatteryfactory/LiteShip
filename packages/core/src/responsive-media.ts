/**
 * Responsive-media intent — Save-Data / DPR / Client Hints projection (#125).
 *
 * Pure resolution and srcset/image-set builders. Hosts inject capabilities from
 * `@czap/edge` `ClientHints` or `@czap/detect`; core stays dependency-free.
 *
 * @module
 */

import { ValidationError } from '@czap/error';

/** Capability slice required to resolve a responsive media intent. */
export interface ResponsiveMediaCapabilities {
  readonly devicePixelRatio: number;
  readonly saveData: boolean;
}

/** One candidate source in a responsive set. */
export interface ResponsiveMediaVariant {
  readonly src: string;
  /** Intrinsic width in CSS pixels — used for `Nw` descriptors. */
  readonly width?: number;
  /** Explicit density descriptor (e.g. `2x`); overrides width-based DPR inference. */
  readonly descriptor?: string;
}

/** Authoring input to {@link ResponsiveMedia.intent}. */
export interface ResponsiveMediaIntentInput {
  readonly id: string;
  readonly alt: string;
  readonly variants: readonly ResponsiveMediaVariant[];
  /** Lighter asset used when Save-Data is on. */
  readonly saveDataVariant?: ResponsiveMediaVariant;
  readonly sizes?: string;
}

/** Sealed responsive-media intent — data over graph, no behavior authority. */
export interface ResponsiveMediaIntent extends ResponsiveMediaIntentInput {
  readonly _tag: 'ResponsiveMediaIntent';
}

/** Why a particular variant was chosen. */
export type ResponsiveMediaResolutionReason = 'save-data' | 'save-data-floor' | 'dpr-match' | 'dpr-floor' | 'fallback';

/** Resolved single source for SSR or runtime `<img src>`. */
export interface ResolvedResponsiveMedia {
  readonly src: string;
  readonly reason: ResponsiveMediaResolutionReason;
}

/**
 * The EFFECTIVE candidate set — the single law every responsive-media output derives
 * from ({@link selectCandidates}). Under `caps.saveData` the set is capped to the ONE
 * light/floor variant, so no artifact (`srcset`, `<source>`, the preload `imagesrcset`,
 * CSS `image-set()`, the cache-key digest) can ever advertise a heavier candidate — the
 * browser cannot re-fetch what no output lists (F-RM-1a..e).
 */
export interface ResponsiveMediaCandidateSet {
  /**
   * The candidates safe to advertise under `caps`. Save-Data caps this to a single
   * light/floor variant; otherwise it is the full authored set. `srcset`, the general
   * `<source>`, the preload `imagesrcset`, and CSS `image-set()` all enumerate THIS.
   */
  readonly candidates: readonly ResponsiveMediaVariant[];
  /** The single best variant for `<img src>` — the DPR pick WITHIN `candidates`. */
  readonly resolved: ResponsiveMediaVariant;
  /** Why `resolved` was chosen and how `candidates` was capped. */
  readonly reason: ResponsiveMediaResolutionReason;
}

/** Structured `<picture>` projection. */
export interface ResponsiveMediaPictureProjection {
  readonly picture: string;
  readonly img: string;
  readonly srcset: string;
  readonly sizes: string;
  readonly resolved: ResolvedResponsiveMedia;
  /**
   * Optional `<link rel="preload" as="image">` for the resolved (or full srcset)
   * asset — hosts put this in `<head>` for LCP (#125).
   */
  readonly preload: string;
}

function parseDescriptorDpr(descriptor: string): number | undefined {
  const match = /^([\d.]+)x$/i.exec(descriptor.trim());
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function variantDpr(variant: ResponsiveMediaVariant, fallbackWidth: number): number | undefined {
  if (variant.descriptor !== undefined) {
    const explicit = parseDescriptorDpr(variant.descriptor);
    if (explicit !== undefined) return explicit;
    const widthMatch = /^(\d+)w$/i.exec(variant.descriptor.trim());
    if (widthMatch) {
      const w = Number(widthMatch[1]);
      return w > 0 && fallbackWidth > 0 ? w / fallbackWidth : undefined;
    }
  }
  if (variant.width !== undefined && variant.width > 0 && fallbackWidth > 0) {
    return variant.width / fallbackWidth;
  }
  return undefined;
}

function minPositiveWidth(variants: readonly ResponsiveMediaVariant[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (const variant of variants) {
    if (variant.width !== undefined && variant.width > 0) {
      min = Math.min(min, variant.width);
    }
  }
  return Number.isFinite(min) ? min : 0;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Build a `srcset` string from variants with `w` or `x` descriptors.
 *
 * Variants without enough metadata are skipped; result is empty when none qualify.
 */
export function buildResponsiveSrcset(variants: readonly ResponsiveMediaVariant[], baseWidth?: number): string {
  const parts: string[] = [];
  for (const variant of variants) {
    if (variant.descriptor !== undefined) {
      parts.push(`${variant.src} ${variant.descriptor}`);
      continue;
    }
    if (variant.width !== undefined && variant.width > 0) {
      parts.push(`${variant.src} ${variant.width}w`);
      continue;
    }
    const inferred = baseWidth !== undefined ? variantDpr(variant, baseWidth) : undefined;
    if (inferred !== undefined) {
      parts.push(`${variant.src} ${inferred}x`);
    }
  }
  return parts.join(', ');
}

/**
 * Build a CSS `image-set()` value from variants (native CSS first).
 *
 * Uses `type()` only when variants carry standard image extensions; unknown
 * types are omitted rather than guessed.
 */
export function buildResponsiveImageSet(variants: readonly ResponsiveMediaVariant[], baseWidth?: number): string {
  const parts: string[] = [];
  const inferredBase = baseWidth ?? minPositiveWidth(variants);
  for (const variant of variants) {
    let descriptor: string | undefined;
    if (variant.descriptor !== undefined) {
      const trimmed = variant.descriptor.trim();
      if (/^[\d.]+x$/i.test(trimmed)) {
        descriptor = trimmed;
      } else {
        const explicit = parseDescriptorDpr(trimmed);
        if (explicit !== undefined) descriptor = `${explicit}x`;
      }
      // `Nw` width descriptors are invalid inside CSS image-set() — skip.
    }
    if (descriptor === undefined && variant.width !== undefined && inferredBase > 0) {
      const dpr = variant.width / inferredBase;
      if (Number.isFinite(dpr) && dpr > 0) {
        descriptor = `${dpr}x`;
      }
    }
    if (descriptor === undefined) {
      continue;
    }
    parts.push(`url("${variant.src}") ${descriptor}`);
  }
  if (parts.length === 0) {
    // A lone candidate with no derivable descriptor — a bare Save-Data light asset `{ src }` —
    // still belongs in image-set(): default it to `1x` so CSS consumers advertise the light URL
    // rather than `none`, matching the reduced-data <source> path (Codex P2). Multiple
    // descriptor-less candidates have a genuinely ambiguous DPR, so those still yield `none`.
    if (variants.length === 1) return `image-set(url("${variants[0]!.src}") 1x)`;
    return 'none';
  }
  return `image-set(${parts.join(', ')})`;
}

/**
 * THE one effective-candidate law — the single function every responsive-media
 * output consumes (#140). Returns the {@link ResponsiveMediaCandidateSet}: the
 * candidates safe to advertise under `caps`, the single best `src`, and the reason.
 *
 * Save-Data wins over DPR and caps ALL candidates to the floor: the authored
 * `saveDataVariant` when present (`save-data`), else the LIGHTEST available variant
 * (`save-data-floor`) — a Save-Data client must never be advertised a heavier
 * candidate through ANY artifact, even when the author skipped the explicit light
 * variant. Otherwise the full authored set is advertised and `resolved` is the DPR
 * pick: the variant whose DPR is closest without going under the device ratio
 * (`dpr-match`), else the largest available (`dpr-floor`), else the first (`fallback`).
 */
export function selectCandidates(
  intent: ResponsiveMediaIntent,
  caps: ResponsiveMediaCapabilities,
): ResponsiveMediaCandidateSet {
  if (intent.variants.length === 0) {
    throw ValidationError('selectCandidates', 'ResponsiveMediaIntent.variants must be non-empty');
  }

  const dpr = Number.isFinite(caps.devicePixelRatio) && caps.devicePixelRatio > 0 ? caps.devicePixelRatio : 1;
  const baseWidth = minPositiveWidth(intent.variants);
  const scored = intent.variants
    .map((variant) => ({ variant, dpr: variantDpr(variant, baseWidth) ?? 1 }))
    .sort((a, b) => a.dpr - b.dpr);

  // Save-Data caps the WHOLE set to one light candidate — the browser cannot
  // re-fetch a heavy asset that no output advertises (F-RM-1a..e).
  if (caps.saveData) {
    if (intent.saveDataVariant !== undefined) {
      const only = intent.saveDataVariant;
      return Object.freeze({ candidates: Object.freeze([only]), resolved: only, reason: 'save-data' });
    }
    // No authored light variant — honor Save-Data with the smallest candidate
    // rather than silently falling through to the heavy DPR match (F-RM-1c).
    const smallest = scored[0]!.variant;
    return Object.freeze({ candidates: Object.freeze([smallest]), resolved: smallest, reason: 'save-data-floor' });
  }

  // Normal path: advertise the FULL authored set; `resolved` is the DPR pick.
  const candidates = intent.variants;
  const atOrAbove = scored.filter((entry) => entry.dpr >= dpr);
  if (atOrAbove.length > 0) {
    return Object.freeze({ candidates, resolved: atOrAbove[0]!.variant, reason: 'dpr-match' });
  }
  const floor = scored[scored.length - 1];
  if (floor !== undefined) {
    return Object.freeze({ candidates, resolved: floor.variant, reason: 'dpr-floor' });
  }
  return Object.freeze({ candidates, resolved: intent.variants[0]!, reason: 'fallback' });
}

/**
 * Resolve the single best `src` for SSR / fallback `<img>` given capabilities.
 *
 * A thin projection of {@link selectCandidates}: takes its `resolved` variant and
 * `reason`. Kept as its own export for hosts that only need the one `src` — but it
 * derives from the SAME law as `srcset` / `<source>` / preload / image-set, so a
 * Save-Data client is never SILENTLY served a light `src` while a heavy candidate
 * leaks through another artifact.
 */
export function resolveResponsiveMedia(
  intent: ResponsiveMediaIntent,
  caps: ResponsiveMediaCapabilities,
): ResolvedResponsiveMedia {
  const selection = selectCandidates(intent, caps);
  return Object.freeze({ src: selection.resolved.src, reason: selection.reason });
}

/**
 * Project a responsive-media intent to a `<picture>` + fallback `<img>`.
 *
 * Native markup first: `<source srcset>` per density band; runtime/SSR picks
 * `resolved.src` on the inner `<img>` for hosts without picture support.
 */
export function projectResponsiveMediaPicture(
  intent: ResponsiveMediaIntent,
  caps: ResponsiveMediaCapabilities,
): ResponsiveMediaPictureProjection {
  // ONE source: every artifact below enumerates the SAME effective candidate set.
  const selection = selectCandidates(intent, caps);
  const resolved = Object.freeze({ src: selection.resolved.src, reason: selection.reason });
  const sizes = intent.sizes ?? '100vw';
  const srcset = buildResponsiveSrcset(selection.candidates);

  // The reduced-data <source> advertises ONLY the authored light asset — a client
  // that reports `prefers-reduced-data` picks it even when the server never saw a
  // Save-Data header — so this branch NEVER lists a heavy candidate either. A
  // `saveDataVariant` may omit width/descriptor (a single bare light asset), in which
  // case `buildResponsiveSrcset` returns '' — falling back to a bare-URL srcset (valid,
  // defaults to `1x`) keeps the reduced-data <source> present so those clients are never
  // dropped onto the heavy `srcset` (Codex P2).
  const saveDataSrcset =
    intent.saveDataVariant !== undefined
      ? buildResponsiveSrcset([intent.saveDataVariant]) || intent.saveDataVariant.src
      : '';

  const sources: string[] = [];
  if (saveDataSrcset.length > 0) {
    sources.push(
      `<source media="(prefers-reduced-data: reduce)" srcset="${escapeAttr(saveDataSrcset)}" sizes="${escapeAttr(sizes)}" />`,
    );
  }
  if (srcset.length > 0) {
    sources.push(`<source srcset="${escapeAttr(srcset)}" sizes="${escapeAttr(sizes)}" />`);
  }

  const img = `<img id="${escapeAttr(intent.id)}" alt="${escapeAttr(intent.alt)}" src="${escapeAttr(resolved.src)}" srcset="${escapeAttr(srcset)}" sizes="${escapeAttr(sizes)}" loading="lazy" decoding="async" />`;
  const picture =
    sources.length > 0
      ? `<picture data-czap-responsive="${escapeAttr(intent.id)}">${sources.join('')}${img}</picture>`
      : img;

  // Preload the EFFECTIVE set only (F-RM-1d, the worst leak — it drove the LCP):
  // under Save-Data `srcset` is already the light set, so the LCP preload can
  // never pull the heavy DPR-matched asset.
  const preload =
    srcset.length > 0
      ? `<link rel="preload" as="image" href="${escapeAttr(resolved.src)}" imagesrcset="${escapeAttr(srcset)}" imagesizes="${escapeAttr(sizes)}" />`
      : `<link rel="preload" as="image" href="${escapeAttr(resolved.src)}" />`;

  return Object.freeze({
    picture,
    img,
    srcset,
    sizes,
    resolved,
    preload,
  });
}

/** Authoring sugar namespace — data over intent, no behavior authority. */
export const ResponsiveMedia = {
  /** Seal a responsive-media intent from authoring input. */
  intent(input: ResponsiveMediaIntentInput): ResponsiveMediaIntent {
    return Object.freeze({ _tag: 'ResponsiveMediaIntent', ...input });
  },
} as const;
