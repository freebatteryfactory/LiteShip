/**
 * Quantize component helpers -- server-side initial state resolution.
 *
 * Maps {@link ServerIslandContext} (user agent, client hints, detected
 * tier) to the best initial boundary state for SSR and server islands.
 *
 * @module
 */

import type { Boundary, CapTier, Quantizer, StateResolutionReceipt } from '@liteship/core';
import { Diagnostics, VIEWPORT } from '@liteship/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Server-only context that {@link resolveInitialState} consumes. Astro
 * builds this from the incoming request (user agent + Client Hints)
 * and the tier detected by the edge middleware.
 */
export interface ServerIslandContext {
  /** Raw `User-Agent` header (default `''`). */
  readonly userAgent?: string;
  /** Flat Client Hints header map (default `{}`). Build from `Astro.request.headers`. */
  readonly clientHints?: Record<string, string>;
  /** Tier detected by `@liteship/edge` (default `'reactive'` → synthetic 960px). */
  readonly detectedCapTier?: CapTier;
}

/**
 * Props accepted by the `Quantize` Astro component and by
 * {@link resolveInitialState}.
 */
export interface QuantizeProps<B extends Boundary.Shape = Boundary.Shape> {
  /** Boundary to quantize. */
  readonly boundary: B;
  /** Optional explicit quantizer definition. */
  readonly quantizer?: Quantizer<B>;
  /** Explicit initial state (skips resolution). */
  readonly initialState?: string;
  /** Final fallback if resolution fails. */
  readonly fallback?: string;
  /** Extra CSS class names. */
  readonly class?: string;
}

/** SSR resolution outcome — state plus evidence of which source drove it (#118). */
export interface ResolvedInitialState {
  readonly state: string;
  readonly resolution: StateResolutionReceipt;
}

interface ResolutionContext {
  readonly value: number;
  readonly resolution: StateResolutionReceipt;
}

// ---------------------------------------------------------------------------
// Client Hint Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a viewport width from client hints.
 * Supports Sec-CH-Viewport-Width and Sec-CH-Width headers.
 */
function parseViewportWidth(clientHints: Record<string, string>): number | undefined {
  const raw =
    clientHints['sec-ch-viewport-width'] ??
    clientHints['Sec-CH-Viewport-Width'] ??
    clientHints['sec-ch-width'] ??
    clientHints['Sec-CH-Width'];

  if (raw === undefined) return undefined;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Parse prefers-reduced-motion from client hints.
 */
function parsePrefersReducedMotion(clientHints: Record<string, string>): boolean | undefined {
  const raw = clientHints['sec-ch-prefers-reduced-motion'] ?? clientHints['Sec-CH-Prefers-Reduced-Motion'];

  if (raw === undefined) return undefined;
  return raw === 'reduce';
}

// ---------------------------------------------------------------------------
// User Agent Heuristics
// ---------------------------------------------------------------------------

/**
 * Estimate a viewport width from user agent string for common device classes.
 */
function estimateViewportFromUA(ua: string): number {
  const lower = ua.toLowerCase();

  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
    return VIEWPORT.mobile;
  }
  if (lower.includes('tablet') || lower.includes('ipad')) {
    return VIEWPORT.tablet;
  }
  return VIEWPORT.desktop;
}

// ---------------------------------------------------------------------------
// Tier-Based Heuristic
// ---------------------------------------------------------------------------

const CAP_TIER_ORDINALS: Record<CapTier, number> = {
  static: 0,
  styled: 1,
  reactive: 2,
  animated: 3,
  gpu: 4,
};

/**
 * Map a CapTier to a synthetic viewport-like value for boundary evaluation.
 * This bridges between the capability tier system and viewport-based boundaries.
 */
function syntheticValueFromCapTier(capTier: CapTier): number {
  const ord = CAP_TIER_ORDINALS[capTier];
  // Map tier ordinal to viewport-like breakpoints: 320, 640, 960, 1280, 1920
  return 320 + ord * 320;
}

// ---------------------------------------------------------------------------
// Request-shape guard (#109)
// ---------------------------------------------------------------------------

/** True when `value` looks like a raw `Request` passed where `ServerIslandContext` was expected. */
function isRequestLike(value: unknown): value is Request {
  if (typeof value !== 'object' || value === null) return false;
  const headers = (value as { headers?: unknown }).headers;
  return typeof headers === 'object' && headers !== null && typeof (headers as Headers).get === 'function';
}

function warnRawRequestContext(value: unknown): void {
  if (!isRequestLike(value)) return;
  Diagnostics.warnOnce({
    source: 'liteship/astro.quantize',
    code: 'resolve-initial-state-raw-request',
    message:
      'resolveInitialState received a raw Request object — every ServerIslandContext field reads undefined and SSR falls back to synthetic 960px (reactive tier). ' +
      'Build a ServerIslandContext from the request instead: { userAgent: request.headers.get("user-agent") ?? "", clientHints: …, detectedCapTier: … }.',
  });
}

/**
 * Resolve the initial boundary state for server-side rendering.
 *
 * Priority:
 *   1. Use viewport width from client hints if available
 *   2. Estimate viewport from user agent
 *   3. Fall back to tier-based synthetic value
 *
 * Evaluates the boundary thresholds to find the matching state.
 */
export function resolveInitialState<B extends Boundary.Shape>(boundary: B, context: ServerIslandContext = {}): string {
  return resolveInitialStateWithReceipt(boundary, context).state;
}

/**
 * Like {@link resolveInitialState} but carries a `StateResolutionReceipt`
 * (`@liteship/core`) naming which signal drove SSR — client hints, UA estimate,
 * cap-tier synthetic, or policy (reduced-motion bias).
 */
export function resolveInitialStateWithReceipt<B extends Boundary.Shape>(
  boundary: B,
  context: ServerIslandContext = {},
): ResolvedInitialState {
  warnRawRequestContext(context);
  const stateNames = boundary.states as readonly string[];
  const thresholds = boundary.thresholds as readonly number[];
  const userAgent = context.userAgent ?? '';
  const clientHints = context.clientHints ?? {};
  const detectedCapTier = context.detectedCapTier ?? 'reactive';

  if (stateNames.length === 0) {
    return { state: '', resolution: { source: 'synthetic', detail: 'empty-boundary' } };
  }
  if (stateNames.length === 1) {
    return { state: stateNames[0]!, resolution: { source: 'synthetic', detail: 'single-state' } };
  }

  const reducedMotion = parsePrefersReducedMotion(clientHints);
  if (reducedMotion === true && CAP_TIER_ORDINALS[detectedCapTier] <= 1) {
    return {
      state: stateNames[0]!,
      resolution: { source: 'policy', detail: 'prefers-reduced-motion' },
    };
  }

  const { value, resolution } = resolveSignalContext(userAgent, clientHints, detectedCapTier, context);
  const state = stateFromValue(stateNames, thresholds, value);
  return { state, resolution };
}

function resolveSignalContext(
  userAgent: string,
  clientHints: Record<string, string>,
  detectedCapTier: CapTier,
  context: ServerIslandContext,
): ResolutionContext {
  const hintWidth = parseViewportWidth(clientHints);
  if (hintWidth !== undefined) {
    return { value: hintWidth, resolution: { source: 'tier', detail: 'client-hints:viewport-width' } };
  }
  if (userAgent) {
    return {
      value: estimateViewportFromUA(userAgent),
      resolution: { source: 'tier', detail: 'user-agent:viewport-estimate' },
    };
  }
  if (isRequestLike(context)) {
    return {
      value: syntheticValueFromCapTier(detectedCapTier),
      resolution: { source: 'synthetic', detail: 'raw-request-fallback' },
    };
  }
  return {
    value: syntheticValueFromCapTier(detectedCapTier),
    resolution: { source: 'synthetic', detail: `cap-tier:${detectedCapTier}` },
  };
}

function stateFromValue(stateNames: readonly string[], thresholds: readonly number[], value: number): string {
  for (let i = stateNames.length - 1; i >= 0; i--) {
    const threshold = thresholds[i];
    if (threshold !== undefined && value >= threshold) {
      return stateNames[i]!;
    }
  }
  return stateNames[0]!;
}
