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
export function buildResponsiveImageSet(variants: readonly ResponsiveMediaVariant[]): string {
  const parts: string[] = [];
  for (const variant of variants) {
    const descriptor =
      variant.descriptor ?? (variant.width !== undefined && variant.width > 0 ? `${variant.width}w` : '1x');
    parts.push(`url("${variant.src}") ${descriptor}`);
  }
  if (parts.length === 0) return 'none';
  return `image-set(${parts.join(', ')})`;
}

/**
 * Resolve the single best `src` for SSR / fallback `<img>` given capabilities.
 *
 * Save-Data wins over DPR: the authored `saveDataVariant` when present, else
 * the LIGHTEST available variant (`save-data-floor`) — a Save-Data user must
 * never be served the heavy DPR-matched asset just because the author skipped
 * the explicit light variant. Otherwise pick the variant whose DPR is closest
 * without going under the device ratio (floor), else the largest available.
 */
export function resolveResponsiveMedia(
  intent: ResponsiveMediaIntent,
  caps: ResponsiveMediaCapabilities,
): ResolvedResponsiveMedia {
  if (intent.variants.length === 0) {
    throw ValidationError('resolveResponsiveMedia', 'ResponsiveMediaIntent.variants must be non-empty');
  }

  const dpr = Number.isFinite(caps.devicePixelRatio) && caps.devicePixelRatio > 0 ? caps.devicePixelRatio : 1;

  if (caps.saveData && intent.saveDataVariant !== undefined) {
    return Object.freeze({ src: intent.saveDataVariant.src, reason: 'save-data' });
  }

  const baseWidth = intent.variants.find((v) => v.width !== undefined && v.width > 0)?.width ?? 0;
  const scored = intent.variants
    .map((variant) => ({ variant, dpr: variantDpr(variant, baseWidth) ?? 1 }))
    .sort((a, b) => a.dpr - b.dpr);

  if (caps.saveData) {
    // No authored light variant — honor Save-Data with the smallest candidate
    // rather than silently falling through to the heavy DPR match.
    return Object.freeze({ src: scored[0]!.variant.src, reason: 'save-data-floor' });
  }

  const atOrAbove = scored.filter((entry) => entry.dpr >= dpr);
  if (atOrAbove.length > 0) {
    const best = atOrAbove[0]!;
    return Object.freeze({ src: best.variant.src, reason: 'dpr-match' });
  }

  const floor = scored[scored.length - 1];
  if (floor !== undefined) {
    return Object.freeze({ src: floor.variant.src, reason: 'dpr-floor' });
  }

  return Object.freeze({ src: intent.variants[0]!.src, reason: 'fallback' });
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
  const resolved = resolveResponsiveMedia(intent, caps);
  const sizes = intent.sizes ?? '100vw';
  const srcset = buildResponsiveSrcset(intent.variants);
  const saveDataSrcset = intent.saveDataVariant !== undefined ? buildResponsiveSrcset([intent.saveDataVariant]) : '';

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
