/**
 * Client Hints header parsing for edge-side device capability detection.
 *
 * Converts HTTP Client Hints headers into the same `ExtendedDeviceCapabilities`
 * structure that `@liteship/detect` uses, enabling reuse of the pure tier mapping
 * functions at the edge without browser APIs.
 *
 * @module
 */

import type {
  CapabilityEvidenceInput,
  CapabilityEvidenceInputs,
  CapabilityInputEvidence,
  ExtendedDeviceCapabilities,
  GPUTier,
} from '@liteship/detect';
import type { ResponsiveMediaCapabilities } from '@liteship/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Plain-object header bag accepted by {@link ClientHints.parseClientHints}.
 *
 * All names are lowercased because Client Hints headers are always lowercase
 * in spec. Values that are missing simply fall back to conservative
 * defaults during parsing.
 */
export interface ClientHintsHeaders {
  /** `Sec-CH-Device-Memory` in GiB (one of the standard buckets). */
  readonly 'sec-ch-device-memory'?: string;
  /** `Sec-CH-DPR` — devicePixelRatio as a decimal string. */
  readonly 'sec-ch-dpr'?: string;
  /** `Sec-CH-Viewport-Width` in CSS pixels. */
  readonly 'sec-ch-viewport-width'?: string;
  /** `Sec-CH-Viewport-Height` in CSS pixels. */
  readonly 'sec-ch-viewport-height'?: string;
  /** `Sec-CH-Prefers-Reduced-Motion` (`reduce` / `no-preference`). */
  readonly 'sec-ch-prefers-reduced-motion'?: string;
  /** `Sec-CH-Prefers-Color-Scheme` (`light` / `dark`). */
  readonly 'sec-ch-prefers-color-scheme'?: string;
  /** `Sec-CH-UA-Mobile` as a structured boolean (`?1` / `?0`). */
  readonly 'sec-ch-ua-mobile'?: string;
  /** `Save-Data` (`on`). */
  readonly 'save-data'?: string;
  /** `Downlink` estimate in Mb/s. */
  readonly downlink?: string;
  /** `ECT` effective connection type. */
  readonly ect?: string;
  /** `User-Agent` fallback for GPU-tier heuristics. */
  readonly 'user-agent'?: string;
}

/** One canonical Client-Hints parse: complete values plus input-level provenance. */
export interface ClientHintsEvidence {
  readonly capabilities: ExtendedDeviceCapabilities;
  readonly inputEvidence: CapabilityEvidenceInputs;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Type guard for Web API Headers objects (fetch Headers).
 * Checks for the `get` method that distinguishes Headers from plain objects.
 */
function isWebHeaders(value: ClientHintsHeaders | Headers): value is Headers {
  return typeof (value as Record<string, unknown>).get === 'function';
}

/**
 * Normalise a Headers-like input (Web API Headers or plain object) into
 * a case-insensitive getter function.
 */
function headerGetter(headers: ClientHintsHeaders | Headers): (name: string) => string | undefined {
  if (isWebHeaders(headers)) {
    return (name: string) => headers.get(name) ?? undefined;
  }
  // Client Hints headers are always lowercase in spec, but normalise anyway
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v !== undefined) lower[k.toLowerCase()] = v;
  }
  return (name: string) => lower[name.toLowerCase()];
}

/**
 * Parse a numeric header, returning undefined for missing / malformed values.
 */
function parseFloat_(get: (name: string) => string | undefined, name: string): number | undefined {
  const raw = get(name);
  if (raw === undefined || raw === '') return undefined;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Clamp device memory to the set of valid values browsers actually report.
 */
function clampMemory(raw: number): number {
  const buckets = [0.25, 0.5, 1, 2, 4, 8] as const;
  let closest: number = buckets[0]!;
  for (const b of buckets) {
    if (Math.abs(b - raw) < Math.abs(closest - raw)) closest = b;
  }
  return closest;
}

/**
 * Crude GPU tier heuristic from User-Agent string.
 * Without WebGL renderer info we can only make rough guesses.
 */
function gpuTierFromUA(ua: string | undefined): GPUTier {
  if (!ua) return 1;
  const lower = ua.toLowerCase();

  // Very low-end indicators
  if (/kaios|nokia|feature/i.test(lower)) return 0;

  // High-end mobile
  if (/iphone\s*1[4-9]|iphone\s*[2-9]\d/i.test(lower)) return 2;
  if (/sm-s9|sm-s2[4-9]|pixel\s*[8-9]/i.test(lower)) return 2;

  // Desktop with common high-end hints
  if (/windows nt.*win64|macintosh.*mac os x 1[4-9]/i.test(lower)) return 2;

  // Default to low-mid -- conservative
  return 1;
}

/**
 * Map the ECT (effective connection type) string to a normalised form.
 */
function normaliseECT(ect: string | undefined): string {
  if (!ect) return '4g';
  const lower = ect.toLowerCase().trim();
  if (['slow-2g', '2g', '3g', '4g'].includes(lower)) return lower;
  return '4g';
}

// ---------------------------------------------------------------------------
// Accept-CH / Critical-CH header values
// ---------------------------------------------------------------------------

const ALL_HINTS = [
  'Sec-CH-Device-Memory',
  'Sec-CH-DPR',
  'Sec-CH-Viewport-Width',
  'Sec-CH-Viewport-Height',
  'Sec-CH-Prefers-Reduced-Motion',
  'Sec-CH-Prefers-Color-Scheme',
  'Sec-CH-UA-Mobile',
  'Save-Data',
  'Downlink',
  'ECT',
] as const;

/** Inputs actually parsed into the host compile context or tier decision. */
const RESPONSE_SHAPING_HEADERS = [...ALL_HINTS, 'User-Agent'] as const;

// Boot-required hints: listed in `Critical-CH` so the browser RESENDS them before the
// first render if they were absent (one retry, all at once). `Sec-CH-Viewport-Width` is
// here because SSR boundary resolution (`resolveInitialState`) reads it to pick the
// initial state — with it omitted, a cold first paint fell back to a User-Agent estimate
// that could disagree with the container-query CSS. Every entry MUST also be in
// `ALL_HINTS` (the `Accept-CH` set), and `@liteship/astro`'s `CLIENT_HINTS_HEADERS` derives
// from here (one source, no hand-mirrored list) — both pinned by
// tests/unit/astro/critical-ch-drift.test.ts.
const CRITICAL_HINTS = [
  'Sec-CH-Viewport-Width',
  'Sec-CH-Prefers-Reduced-Motion',
  'Sec-CH-Prefers-Color-Scheme',
  'Sec-CH-UA-Mobile',
  'Sec-CH-Device-Memory',
] as const;

// ---------------------------------------------------------------------------
// Public API -- namespace object pattern
// ---------------------------------------------------------------------------

/**
 * Parse Client Hints into complete capability values plus input-level provenance.
 *
 * For properties that cannot be determined from headers (GPU tier, WebGPU
 * support, CPU cores), conservative defaults are used.
 *
 * @example
 * ```ts
 * import { ClientHints } from '@liteship/edge';
 *
 * const evidence = ClientHints.parseEvidence({
 *   'sec-ch-device-memory': '8',
 *   'sec-ch-dpr': '2',
 *   'sec-ch-viewport-width': '1440',
 *   'sec-ch-prefers-color-scheme': 'dark',
 *   'sec-ch-ua-mobile': '?0',
 * });
 * console.log(evidence.capabilities.memory);             // 8
 * console.log(evidence.capabilities.devicePixelRatio);    // 2
 * console.log(evidence.capabilities.prefersColorScheme);  // 'dark'
 * console.log(evidence.inputEvidence.memory.support);      // 'observed'
 * ```
 *
 * @param headers - Client Hints headers (plain object or Web API Headers)
 * @returns Complete capabilities and an exhaustive provenance receipt
 */
function inputEvidence<const Input extends CapabilityEvidenceInput>(
  input: Input,
  support: CapabilityInputEvidence['support'],
  source: string,
): CapabilityInputEvidence & { readonly input: Input } {
  return Object.freeze({ input, support, source });
}

function parseEvidence(headers: ClientHintsHeaders | Headers): ClientHintsEvidence {
  const get = headerGetter(headers);

  // Memory
  const parsedMemory = parseFloat_(get, 'sec-ch-device-memory');
  const rawMemory = parsedMemory !== undefined && parsedMemory > 0 ? parsedMemory : undefined;
  const memory = rawMemory !== undefined ? clampMemory(rawMemory) : 4;

  // DPR
  const dpr = parseFloat_(get, 'sec-ch-dpr') ?? 1;

  // Viewport
  const viewportWidth = parseFloat_(get, 'sec-ch-viewport-width') ?? 1920;
  const viewportHeight = parseFloat_(get, 'sec-ch-viewport-height') ?? 1080;

  // Preferences
  const reducedMotionRaw = get('sec-ch-prefers-reduced-motion');
  const prefersReducedMotion = reducedMotionRaw === 'reduce' || reducedMotionRaw === '"reduce"';
  const reducedMotionObserved =
    reducedMotionRaw === 'reduce' ||
    reducedMotionRaw === '"reduce"' ||
    reducedMotionRaw === 'no-preference' ||
    reducedMotionRaw === '"no-preference"';

  const colorSchemeRaw = get('sec-ch-prefers-color-scheme');
  const prefersColorScheme: 'light' | 'dark' =
    colorSchemeRaw === 'dark' || colorSchemeRaw === '"dark"' ? 'dark' : 'light';

  // Touch (mobile hint)
  const mobileRaw = get('sec-ch-ua-mobile');
  const touchPrimary = mobileRaw === '?1' || mobileRaw === 'true';

  // Save-Data
  const saveDataRaw = get('save-data');
  const saveData = saveDataRaw === 'on' || saveDataRaw === '1' || saveDataRaw === 'true';

  // Network
  const downlink = parseFloat_(get, 'downlink') ?? 10;
  const ect = normaliseECT(get('ect'));

  // GPU tier heuristic from UA
  const gpu = gpuTierFromUA(get('user-agent'));

  const capabilities: ExtendedDeviceCapabilities = {
    // Base DeviceCapabilities
    gpu,
    cores: 4, // Conservative default -- not available via Client Hints
    memory,
    webgpu: false, // Cannot determine from headers
    touchPrimary,
    prefersReducedMotion,
    prefersColorScheme,
    viewportWidth,
    viewportHeight,
    devicePixelRatio: dpr,
    connection: {
      effectiveType: ect,
      downlink,
      saveData,
    },

    // Extended properties -- conservative defaults for edge
    prefersContrast: 'no-preference',
    forcedColors: false,
    prefersReducedTransparency: false,
    dynamicRange: 'standard',
    colorGamut: 'srgb',
    updateRate: 'fast',
  };
  const inputEvidenceMap: CapabilityEvidenceInputs = Object.freeze({
    gpu: inputEvidence(
      'gpu',
      'inferred',
      get('user-agent') === undefined ? 'integrated-gpu-fallback' : 'user-agent-gpu-heuristic',
    ),
    cores: inputEvidence('cores', 'inferred', 'four-core-edge-fallback'),
    memory: inputEvidence(
      'memory',
      rawMemory === undefined ? 'inferred' : 'observed',
      rawMemory === undefined ? 'four-gib-fallback' : 'sec-ch-device-memory',
    ),
    webgpu: inputEvidence('webgpu', 'inferred', 'webgpu-unavailable-at-edge'),
    prefersReducedMotion: inputEvidence(
      'prefersReducedMotion',
      reducedMotionObserved ? 'observed' : 'inferred',
      reducedMotionObserved ? 'sec-ch-prefers-reduced-motion' : 'no-preference-fallback',
    ),
    prefersContrast: inputEvidence('prefersContrast', 'inferred', 'no-preference-edge-fallback'),
    forcedColors: inputEvidence('forcedColors', 'inferred', 'inactive-edge-fallback'),
    prefersReducedTransparency: inputEvidence('prefersReducedTransparency', 'inferred', 'no-preference-edge-fallback'),
    dynamicRange: inputEvidence('dynamicRange', 'inferred', 'standard-range-edge-fallback'),
    colorGamut: inputEvidence('colorGamut', 'inferred', 'srgb-edge-fallback'),
    updateRate: inputEvidence('updateRate', 'inferred', 'fast-update-edge-fallback'),
  });
  return Object.freeze({ capabilities: Object.freeze(capabilities), inputEvidence: inputEvidenceMap });
}

/**
 * Values-only projection of the canonical richer {@link parseEvidence} producer.
 *
 * Use this for conservative rendering. Use `parseEvidence` when a consumer
 * needs to distinguish observed inputs from inferred fallbacks.
 */
function parseClientHints(headers: ClientHintsHeaders | Headers): ExtendedDeviceCapabilities {
  return parseEvidence(headers).capabilities;
}

/**
 * Generate the `Accept-CH` header value for requesting all useful Client Hints
 * on subsequent requests.
 *
 * @example
 * ```ts
 * import { ClientHints } from '@liteship/edge';
 *
 * const response = new Response('OK', {
 *   headers: { 'Accept-CH': ClientHints.acceptCHHeader() },
 * });
 * ```
 *
 * @returns A comma-separated list of Client Hint header names
 */
function acceptCHHeader(): string {
  return ALL_HINTS.join(', ');
}

/**
 * Generate the `Critical-CH` header value for hints needed on the very first
 * request (triggers a browser retry if missing).
 *
 * @example
 * ```ts
 * import { ClientHints } from '@liteship/edge';
 *
 * const response = new Response('OK', {
 *   headers: {
 *     'Accept-CH': ClientHints.acceptCHHeader(),
 *     'Critical-CH': ClientHints.criticalCHHeader(),
 *   },
 * });
 * ```
 *
 * @returns A comma-separated list of critical Client Hint header names
 */
function criticalCHHeader(): string {
  return CRITICAL_HINTS.join(', ');
}

/**
 * Produce the `Vary` response header value listing every Client Hint (and
 * network hint) that shapes tier-specific HTML. CDN caches must vary on these
 * inputs or they can serve the wrong tier's representation (#122).
 */
function varyCHHeader(): string {
  return RESPONSE_SHAPING_HEADERS.join(', ');
}

/**
 * Derive Save-Data / DPR capabilities for responsive-media projection (#125).
 * Hosts that already parsed caps can also call this with the result of
 * {@link parseClientHints}.
 */
function responsiveMediaCapabilities(
  headersOrCaps: Headers | ClientHintsHeaders | ExtendedDeviceCapabilities,
): ResponsiveMediaCapabilities {
  const caps =
    'connection' in headersOrCaps && 'devicePixelRatio' in headersOrCaps
      ? (headersOrCaps as ExtendedDeviceCapabilities)
      : parseClientHints(headersOrCaps as Headers | ClientHintsHeaders);
  return Object.freeze({
    devicePixelRatio: caps.devicePixelRatio,
    saveData: caps.connection?.saveData === true,
  });
}

/**
 * `Vary` inputs that shape responsive-media projection (DPR + Save-Data).
 * CDN caches must vary on these or they can serve the wrong srcset (#125).
 */
function responsiveMediaVaryHeader(): string {
  return 'Sec-CH-DPR, Save-Data';
}

// ---------------------------------------------------------------------------
// Namespace export
// ---------------------------------------------------------------------------

/**
 * Client Hints namespace.
 *
 * Parses HTTP Client Hints headers into the same
 * {@link ExtendedDeviceCapabilities} structure used by `@liteship/detect`,
 * enabling server-side / edge-side tier mapping without browser APIs.
 * Also generates the `Accept-CH` and `Critical-CH` response headers needed
 * to request hints from the browser.
 *
 * @example
 * ```ts
 * import { ClientHints } from '@liteship/edge';
 *
 * // In an edge handler:
 * const caps = ClientHints.parseClientHints(request.headers);
 * const response = new Response(body, {
 *   headers: {
 *     'Accept-CH': ClientHints.acceptCHHeader(),
 *     'Critical-CH': ClientHints.criticalCHHeader(),
 *   },
 * });
 * ```
 */
export const ClientHints = {
  /** Parse Client Hints once into complete values and input-level provenance. */
  parseEvidence,
  /** Parse Client Hints headers into {@link ExtendedDeviceCapabilities}. */
  parseClientHints,
  /** Produce the `Accept-CH` response header value listing all useful hints. */
  acceptCHHeader,
  /** Produce the `Critical-CH` response header value listing boot-required hints. */
  criticalCHHeader,
  /** Produce the `Vary` response header value for tier-varying HTML (#122). */
  varyCHHeader,
  /** Derive Save-Data/DPR capabilities for responsive-media projection (#125). */
  responsiveMediaCapabilities,
  /** Produce the `Vary` value for responsive-media representations (#125). */
  responsiveMediaVaryHeader,
} as const;

export declare namespace ClientHints {
  /** Alias for {@link ClientHintsHeaders} — plain-object header bag shape. */
  export type Headers = ClientHintsHeaders;
}
