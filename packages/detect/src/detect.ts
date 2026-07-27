/**
 * Device capability detection -- probes browser APIs for GPU tier,
 * CPU cores, memory, input modality, preferences, and network info.
 *
 * Every probe is a plain synchronous function with internal try/catch for
 * graceful fallback on environments where APIs are unavailable (SSR,
 * restricted contexts, etc.).
 */

import type { CapTier, CapSet } from '@liteship/core';
import { Diagnostics } from '@liteship/core';
import { projectCapabilityTierEvidence } from './cap-axes.js';
import type {
  CapabilityEvidenceInput,
  CapabilityEvidenceInputs,
  CapabilityInputEvidence,
  CapabilityTierEvidence,
} from './cap-axes.js';

// ---------------------------------------------------------------------------
// Navigator augmentation -- non-standard but widely-shipped APIs
// ---------------------------------------------------------------------------

declare global {
  interface Navigator {
    /** Device RAM in GiB (rounded). Chrome 63+, not in Safari/Firefox. */
    readonly deviceMemory?: number;
    /** Network Information API. Chrome 61+, not in Safari/Firefox. */
    readonly connection?: NavigatorConnectionInfo;
  }
}

/**
 * The structural shape the connection probe reads off `navigator.connection`.
 * Exported so test doubles (tests/helpers/mock-browser.ts) conform to the
 * SAME shape the probe consumes — probe/double drift breaks the build.
 * Forward-declared here; the probe lives below alongside its alias.
 */
export interface NavigatorConnectionInfo {
  readonly effectiveType: string;
  readonly downlink: number;
  readonly saveData: boolean;
}
import {
  capTierFromCapabilities,
  capSetFromCapabilities,
  designTierFromCapabilities,
  motionTierFromCapabilities,
} from './tiers.js';
import type { DesignTier, MotionTier } from './tiers.js';
import { GPU_TIER_PATTERNS, GPU_TIER_PRECEDENCE, GPU_TIER_DEFAULT } from './gpu-patterns.js';
import type { Disposer } from './detect-ready.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Coarse GPU fidelity bucket inferred from the WebGL renderer string.
 *
 * `0` = software/virtualized, `1` = integrated (Intel UHD, early Adreno),
 * `2` = mid-range (Adreno 5xx+, Apple M1/M2), `3` = discrete high-end
 * (RTX, RX 6xxx+, Apple M3+). Drives motion and design tier resolution.
 */
export type GPUTier = 0 | 1 | 2 | 3;

/**
 * Baseline detected device capabilities.
 *
 * All probes gracefully fall back to conservative defaults when APIs are
 * unavailable (SSR, hardened browsers, CI environments). See
 * {@link ExtendedDeviceCapabilities} for the superset that also carries
 * accessibility-related media-query results.
 */
export interface DeviceCapabilities {
  /** GPU fidelity bucket; see {@link GPUTier}. */
  readonly gpu: GPUTier;
  /** Logical CPU cores reported by `navigator.hardwareConcurrency`. */
  readonly cores: number;
  /** Device memory in GiB (rounded by the Device Memory API). */
  readonly memory: number;
  /** Whether `navigator.gpu` is present (WebGPU available). */
  readonly webgpu: boolean;
  /** Whether touch is a primary input modality (maxTouchPoints or ontouchstart). */
  readonly touchPrimary: boolean;
  /** `prefers-reduced-motion: reduce` match. */
  readonly prefersReducedMotion: boolean;
  /** Effective color scheme (`prefers-color-scheme`). */
  readonly prefersColorScheme: 'light' | 'dark';
  /** `window.innerWidth` at detection time. */
  readonly viewportWidth: number;
  /** `window.innerHeight` at detection time. */
  readonly viewportHeight: number;
  /** `window.devicePixelRatio` at detection time. */
  readonly devicePixelRatio: number;
  /** Network Information API snapshot; undefined when unsupported. */
  readonly connection?: {
    /** `'slow-2g' | '2g' | '3g' | '4g'`. */
    readonly effectiveType: string;
    /** Downlink estimate in Mb/s. */
    readonly downlink: number;
    /** Whether the user has opted into data-saving mode. */
    readonly saveData: boolean;
  };
}

/**
 * Result of a single detection sweep.
 *
 * Bundles the probed capabilities together with the derived {@link CapTier}
 * tier, its monotone {@link CapSet}, and per-axis evidence that distinguishes
 * observed inputs from conservative fallbacks.
 */
export interface DetectionResult {
  /** The probed capabilities. */
  readonly capabilities: DeviceCapabilities;
  /** Highest {@link CapTier} the device qualifies for. */
  readonly capTier: CapTier;
  /** Monotone set of every {@link CapTier} at or below `capTier`. */
  readonly capSet: CapSet;
  /** Per-axis provenance for the complete tier values. */
  readonly tierEvidence: CapabilityTierEvidence;
}

/**
 * Extended capabilities adding accessibility and display metadata.
 *
 * Superset of {@link DeviceCapabilities} with media-query-derived fields that
 * feed the {@link DesignTier} resolver: contrast preferences, forced colors,
 * reduced transparency, HDR/dynamic range, color gamut, and update rate.
 */
export interface ExtendedDeviceCapabilities extends DeviceCapabilities {
  /** `prefers-contrast` value. */
  readonly prefersContrast: 'no-preference' | 'more' | 'less' | 'custom';
  /** `forced-colors: active` match (high-contrast/OS theme). */
  readonly forcedColors: boolean;
  /** `prefers-reduced-transparency: reduce` match. */
  readonly prefersReducedTransparency: boolean;
  /** Display dynamic range (HDR) from `(dynamic-range: high)`. */
  readonly dynamicRange: 'standard' | 'high';
  /** Display color gamut from `(color-gamut: ...)`. */
  readonly colorGamut: 'srgb' | 'p3' | 'rec2020';
  /** Update rate from `(update: ...)`; `none` = e-ink / print. */
  readonly updateRate: 'fast' | 'slow' | 'none';
}

/**
 * Full detection result including design and motion tiers.
 *
 * Returned by {@link Detect.detect}. Consumers typically destructure
 * `{ capSet, designTier, motionTier }` and pass them to boundary evaluation
 * and compiler dispatch.
 */
export interface ExtendedDetectionResult extends DetectionResult {
  /** Extended capabilities (superset of `DeviceCapabilities`). */
  readonly capabilities: ExtendedDeviceCapabilities;
  /** Visual fidelity tier derived from display metadata. */
  readonly designTier: DesignTier;
  /** Motion complexity tier derived from GPU, cores, and reduced-motion. */
  readonly motionTier: MotionTier;
}

type ProbeResult<T> =
  | { readonly status: 'ok'; readonly value: T }
  | { readonly status: 'unavailable' }
  | { readonly status: 'error'; readonly error: unknown };

interface DetectionProbes {
  readonly renderer: ProbeResult<string>;
  readonly webgpu: ProbeResult<boolean>;
  readonly cores: ProbeResult<number>;
  readonly memory: ProbeResult<number>;
  readonly touch: ProbeResult<boolean>;
  readonly reducedMotion: ProbeResult<boolean>;
  readonly colorScheme: ProbeResult<'light' | 'dark'>;
  readonly viewport: ProbeResult<{ width: number; height: number }>;
  readonly dpr: ProbeResult<number>;
  readonly connection: ProbeResult<NavigatorConnection>;
  readonly contrast: ProbeResult<'no-preference' | 'more' | 'less' | 'custom'>;
  readonly forcedColors: ProbeResult<boolean>;
  readonly reducedTransparency: ProbeResult<boolean>;
  readonly dynamicRange: ProbeResult<'standard' | 'high'>;
  readonly colorGamut: ProbeResult<'srgb' | 'p3' | 'rec2020'>;
  readonly updateRate: ProbeResult<'fast' | 'slow' | 'none'>;
}

function probeOk<T>(value: T): ProbeResult<T> {
  return { status: 'ok', value };
}

function probeUnavailable<T>(): ProbeResult<T> {
  return { status: 'unavailable' };
}

function probeError<T>(error: unknown): ProbeResult<T> {
  return { status: 'error', error };
}

function valueOr<T>(result: ProbeResult<T>, fallback: T): T {
  return result.status === 'ok' ? result.value : fallback;
}

function hasProbeValue<T>(result: ProbeResult<T>): result is Extract<ProbeResult<T>, { readonly status: 'ok' }> {
  return result.status === 'ok';
}

// ---------------------------------------------------------------------------
// GPU Tier Heuristics
// ---------------------------------------------------------------------------

/**
 * Classify an unmasked WebGL renderer string into a {@link GPUTier} (0–3).
 * Pure and side-effect-free apart from a one-time diagnostic on an unrecognized
 * string (which still classifies conservatively as tier 1).
 *
 * Both this runtime classifier AND the `@liteship/astro` head-inline probe derive
 * from the SAME {@link GPU_TIER_PATTERNS} datum — the probe's script is
 * generated from it by `emitDetectUpgradeScript` — so the two can never be
 * hand-copies that drift. There is one list of patterns, consumed here and
 * folded into the emitted alternation regexes; never a second text to mistype.
 *
 * @param renderer - The `UNMASKED_RENDERER_WEBGL` string from a WebGL context.
 * @returns The GPU tier: `0` software · `1` integrated · `2` mid · `3` high-end.
 */
export function classifyGPURenderer(renderer: string): GPUTier {
  for (const tier of GPU_TIER_PRECEDENCE) {
    for (const pattern of GPU_TIER_PATTERNS[tier]!) {
      if (pattern.test(renderer)) return tier;
    }
  }
  // Unmatched renderers (e.g. next year's GPU) classify conservatively. The
  // probe remains observed, but its heuristic fallback must still be audible.
  Diagnostics.warnOnceRegistered({
    source: 'liteship/detect',
    code: 'detect/unrecognized-gpu-renderer',
    message: `unrecognized GPU renderer "${renderer}" — defaulting to tier 1 (integrated). If this is a real GPU, file the renderer string at https://github.com/freebatteryfactory/LiteShip/issues so a pattern can be added.`,
    detail: { renderer },
  });
  return GPU_TIER_DEFAULT;
}

// ---------------------------------------------------------------------------
// Detection Probes (safe -- never throw, always return structured outcomes)
// ---------------------------------------------------------------------------

/**
 * Acquire a WebGLRenderingContext from a canvas, falling back to the
 * prefixed 'experimental-webgl' context (required in some older browsers).
 * The cast is contained here; callers receive a typed context or null.
 */
function getWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  const modern = canvas.getContext('webgl2');
  if (modern !== null) return modern;
  const standard = canvas.getContext('webgl');
  if (standard !== null) return standard;
  // 'experimental-webgl' returns RenderingContext | null; we validate it is a
  // WebGLRenderingContext by checking the isContextLost method which is specific
  // to WebGL contexts and not present on 2D/ImageBitmap contexts.
  const experimental = canvas.getContext('experimental-webgl');
  if (experimental === null || typeof (experimental as WebGLRenderingContext).isContextLost !== 'function') {
    return null;
  }
  return experimental as WebGLRenderingContext;
}

// The GPU cannot change while the page lives, so a successful renderer probe
// is memoized for the session — browsers cap live WebGL contexts (~16), and
// every probe allocates one.
let rendererProbeCache: ProbeResult<string> | null = null;

function probeWebGLRenderer(): ProbeResult<string> {
  if (rendererProbeCache !== null) return rendererProbeCache;
  const result = probeWebGLRendererUncached();
  if (result.status === 'ok') {
    rendererProbeCache = result;
  }
  return result;
}

function probeWebGLRendererUncached(): ProbeResult<string> {
  try {
    if (typeof document === 'undefined') return probeUnavailable();
    const canvas = document.createElement('canvas');
    const gl = getWebGLContext(canvas);
    if (!gl) return probeUnavailable();
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string | null;
        if (renderer && renderer.length > 0) return probeOk(renderer);
      }
      const direct = gl.getParameter(gl.RENDERER) as string | null;
      return direct && direct.length > 0 ? probeOk(direct) : probeUnavailable();
    } finally {
      // Release the throwaway context so repeated probes never exhaust the
      // browser's live-context budget.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch (error) {
    return probeError(error);
  }
}

/**
 * Clear memoized session-stable probe results (currently the GPU renderer
 * string). The GPU cannot change while a page lives, so production code never
 * needs this — it exists for test isolation, mirroring `Diagnostics.reset`.
 */
export function resetDetectionCaches(): void {
  rendererProbeCache = null;
}

function probeWebGPU(): ProbeResult<boolean> {
  try {
    if (typeof navigator === 'undefined') return probeUnavailable();
    return probeOk('gpu' in navigator && navigator.gpu !== undefined);
  } catch (error) {
    return probeError(error);
  }
}

function probeCores(): ProbeResult<number> {
  try {
    if (typeof navigator === 'undefined') return probeUnavailable();
    const cores = navigator.hardwareConcurrency;
    return Number.isFinite(cores) && cores > 0 ? probeOk(cores) : probeUnavailable();
  } catch (error) {
    return probeError(error);
  }
}

function probeMemory(): ProbeResult<number> {
  try {
    if (typeof navigator === 'undefined') return probeUnavailable();
    if ('deviceMemory' in navigator) {
      return probeOk(navigator.deviceMemory ?? 4);
    }
    return probeUnavailable();
  } catch (error) {
    return probeError(error);
  }
}

function probeTouch(): ProbeResult<boolean> {
  try {
    if (typeof window === 'undefined') return probeUnavailable();
    return probeOk('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0));
  } catch (error) {
    return probeError(error);
  }
}

function probeReducedMotion(): ProbeResult<boolean> {
  try {
    if (typeof window === 'undefined') return probeUnavailable();
    return probeOk(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (error) {
    return probeError(error);
  }
}

function probeColorScheme(): ProbeResult<'light' | 'dark'> {
  try {
    if (typeof window === 'undefined') return probeUnavailable();
    return probeOk(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch (error) {
    return probeError(error);
  }
}

function probeViewport(): ProbeResult<{ width: number; height: number }> {
  try {
    if (typeof window === 'undefined') return probeUnavailable();
    return probeOk({
      width: window.innerWidth ?? 1920,
      height: window.innerHeight ?? 1080,
    });
  } catch (error) {
    return probeError(error);
  }
}

function probeDPR(): ProbeResult<number> {
  try {
    if (typeof window === 'undefined') return probeUnavailable();
    return probeOk(window.devicePixelRatio ?? 1);
  } catch (error) {
    return probeError(error);
  }
}

// NavigatorConnection is aliased to the augmented NavigatorConnectionInfo above.
type NavigatorConnection = NavigatorConnectionInfo;

function probeConnection(): ProbeResult<NavigatorConnection> {
  try {
    if (typeof navigator === 'undefined') return probeUnavailable();
    const conn = navigator.connection;
    if (!conn) return probeUnavailable();
    return probeOk({
      effectiveType: conn.effectiveType ?? '4g',
      downlink: conn.downlink ?? 10,
      saveData: conn.saveData ?? false,
    });
  } catch (error) {
    return probeError(error);
  }
}

function probeContrast(): ProbeResult<'no-preference' | 'more' | 'less' | 'custom'> {
  try {
    if (typeof window === 'undefined') return probeUnavailable();
    if (window.matchMedia('(prefers-contrast: more)').matches) return probeOk('more');
    if (window.matchMedia('(prefers-contrast: less)').matches) return probeOk('less');
    if (window.matchMedia('(prefers-contrast: custom)').matches) return probeOk('custom');
    return probeOk('no-preference');
  } catch (error) {
    return probeError(error);
  }
}

function probeForcedColors(): ProbeResult<boolean> {
  try {
    if (typeof window === 'undefined') return probeUnavailable();
    return probeOk(window.matchMedia('(forced-colors: active)').matches);
  } catch (error) {
    return probeError(error);
  }
}

function probeReducedTransparency(): ProbeResult<boolean> {
  try {
    if (typeof window === 'undefined') return probeUnavailable();
    return probeOk(window.matchMedia('(prefers-reduced-transparency: reduce)').matches);
  } catch (error) {
    return probeError(error);
  }
}

function probeDynamicRange(): ProbeResult<'standard' | 'high'> {
  try {
    if (typeof window === 'undefined') return probeUnavailable();
    return probeOk(window.matchMedia('(dynamic-range: high)').matches ? 'high' : 'standard');
  } catch (error) {
    return probeError(error);
  }
}

function probeColorGamut(): ProbeResult<'srgb' | 'p3' | 'rec2020'> {
  try {
    if (typeof window === 'undefined') return probeUnavailable();
    if (window.matchMedia('(color-gamut: rec2020)').matches) return probeOk('rec2020');
    if (window.matchMedia('(color-gamut: p3)').matches) return probeOk('p3');
    return probeOk('srgb');
  } catch (error) {
    return probeError(error);
  }
}

function probeUpdateRate(): ProbeResult<'fast' | 'slow' | 'none'> {
  try {
    if (typeof window === 'undefined') return probeUnavailable();
    if (window.matchMedia('(update: none)').matches) return probeOk('none');
    if (window.matchMedia('(update: slow)').matches) return probeOk('slow');
    return probeOk('fast');
  } catch (error) {
    return probeError(error);
  }
}

/**
 * Probes whose values cannot change while the page lives (hardware identity).
 * `watchCapabilities` runs these once and reuses the results on every
 * re-detection; only the dynamic probes (viewport/DPR/media queries) re-run.
 */
interface StaticDetectionProbes {
  readonly renderer: ProbeResult<string>;
  readonly webgpu: ProbeResult<boolean>;
  readonly cores: ProbeResult<number>;
  readonly memory: ProbeResult<number>;
}

function collectStaticProbes(): StaticDetectionProbes {
  return {
    renderer: probeWebGLRenderer(),
    webgpu: probeWebGPU(),
    cores: probeCores(),
    memory: probeMemory(),
  };
}

function collectDetectionProbes(staticProbes: StaticDetectionProbes = collectStaticProbes()): DetectionProbes {
  return {
    ...staticProbes,
    touch: probeTouch(),
    reducedMotion: probeReducedMotion(),
    colorScheme: probeColorScheme(),
    viewport: probeViewport(),
    dpr: probeDPR(),
    connection: probeConnection(),
    contrast: probeContrast(),
    forcedColors: probeForcedColors(),
    reducedTransparency: probeReducedTransparency(),
    dynamicRange: probeDynamicRange(),
    colorGamut: probeColorGamut(),
    updateRate: probeUpdateRate(),
  };
}

function buildCapabilitiesFromProbes(probes: DetectionProbes): ExtendedDeviceCapabilities {
  const renderer = hasProbeValue(probes.renderer) ? probes.renderer.value : null;
  const viewport = valueOr(probes.viewport, { width: 1920, height: 1080 });
  return {
    gpu: renderer ? classifyGPURenderer(renderer) : (1 as GPUTier),
    cores: valueOr(probes.cores, 2),
    memory: valueOr(probes.memory, 4),
    webgpu: valueOr(probes.webgpu, false),
    touchPrimary: valueOr(probes.touch, false),
    prefersReducedMotion: valueOr(probes.reducedMotion, false),
    prefersColorScheme: valueOr(probes.colorScheme, 'light'),
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    devicePixelRatio: valueOr(probes.dpr, 1),
    connection: hasProbeValue(probes.connection) ? probes.connection.value : undefined,
    prefersContrast: valueOr(probes.contrast, 'no-preference'),
    forcedColors: valueOr(probes.forcedColors, false),
    prefersReducedTransparency: valueOr(probes.reducedTransparency, false),
    dynamicRange: valueOr(probes.dynamicRange, 'standard'),
    colorGamut: valueOr(probes.colorGamut, 'srgb'),
    updateRate: valueOr(probes.updateRate, 'fast'),
  };
}

function probeEvidence<const Input extends CapabilityEvidenceInput>(
  input: Input,
  result: ProbeResult<unknown>,
  observedSource: string,
  inferredSource: string,
): CapabilityInputEvidence & { readonly input: Input } {
  return Object.freeze({
    input,
    support: hasProbeValue(result) ? 'observed' : 'inferred',
    source: hasProbeValue(result) ? observedSource : inferredSource,
  });
}

function buildCapabilityEvidenceInputs(probes: DetectionProbes): CapabilityEvidenceInputs {
  return Object.freeze({
    gpu: probeEvidence('gpu', probes.renderer, 'webgl-renderer', 'integrated-gpu-fallback'),
    cores: probeEvidence('cores', probes.cores, 'navigator.hardwareConcurrency', 'two-core-fallback'),
    memory: probeEvidence('memory', probes.memory, 'navigator.deviceMemory', 'four-gib-fallback'),
    webgpu: probeEvidence('webgpu', probes.webgpu, 'navigator.gpu-presence', 'webgpu-unavailable-fallback'),
    prefersReducedMotion: probeEvidence(
      'prefersReducedMotion',
      probes.reducedMotion,
      'matchMedia(prefers-reduced-motion)',
      'no-preference-fallback',
    ),
    prefersContrast: probeEvidence(
      'prefersContrast',
      probes.contrast,
      'matchMedia(prefers-contrast)',
      'no-preference-fallback',
    ),
    forcedColors: probeEvidence('forcedColors', probes.forcedColors, 'matchMedia(forced-colors)', 'inactive-fallback'),
    prefersReducedTransparency: probeEvidence(
      'prefersReducedTransparency',
      probes.reducedTransparency,
      'matchMedia(prefers-reduced-transparency)',
      'no-preference-fallback',
    ),
    dynamicRange: probeEvidence(
      'dynamicRange',
      probes.dynamicRange,
      'matchMedia(dynamic-range)',
      'standard-range-fallback',
    ),
    colorGamut: probeEvidence('colorGamut', probes.colorGamut, 'matchMedia(color-gamut)', 'srgb-fallback'),
    updateRate: probeEvidence('updateRate', probes.updateRate, 'matchMedia(update)', 'fast-update-fallback'),
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect GPU tier from WebGL renderer string heuristics.
 * Falls back to tier 1 (integrated) when WebGL is unavailable.
 *
 * You usually never call this yourself: the `@liteship/astro` boundary runs the
 * same classification automatically and publishes it for the runtime to read.
 *
 * Advanced — direct invocation (all probes are synchronous):
 * ```ts
 * import { Detect } from '@liteship/detect';
 *
 * const tier = Detect.detectGPUTier();
 * // tier => 0 (software) | 1 (integrated) | 2 (mid) | 3 (high-end)
 * ```
 *
 * @returns The {@link GPUTier} (0-3)
 */
export function detectGPUTier(): GPUTier {
  const renderer = probeWebGLRenderer();
  return hasProbeValue(renderer) ? classifyGPURenderer(renderer.value) : (1 as GPUTier);
}

function describeProbeFailure(result: ProbeResult<unknown>): string | null {
  if (result.status === 'unavailable') return 'API unavailable';
  if (result.status === 'error') return `threw: ${String(result.error)}`;
  return null;
}

/**
 * Probes never throw (the right contract), but an errored probe was
 * previously indistinguishable from an unavailable one — the caught error was
 * stored and discarded, leaving no axis-specific explanation. One
 * grouped warn-once names each defaulted probe and why. SSR is exempt: every
 * probe defaulting there is the documented isomorphic contract, not a signal.
 */
function reportDegradedProbes(probes: DetectionProbes): void {
  if (typeof window === 'undefined') return;
  const degraded: string[] = [];
  for (const [name, result] of Object.entries(probes)) {
    const why = describeProbeFailure(result as ProbeResult<unknown>);
    if (why !== null) degraded.push(`${name} (${why})`);
  }
  if (degraded.length === 0) return;
  Diagnostics.warnOnceRegistered({
    source: 'liteship/detect',
    code: 'detect/probes-defaulted',
    message: `${degraded.length} probe(s) defaulted: ${degraded.join(', ')} — conservative fallback values were used; every tier axis that depends on a defaulted input is marked inferred.`,
    detail: { degraded },
  });
}

function runDetection(probes: DetectionProbes): ExtendedDetectionResult {
  const capabilities = buildCapabilitiesFromProbes(probes);

  const capTier = capTierFromCapabilities(capabilities);
  const capSet = capSetFromCapabilities(capabilities);
  const designTier = designTierFromCapabilities(capabilities);
  const motionTier = motionTierFromCapabilities(capabilities);
  const tierEvidence = projectCapabilityTierEvidence(
    { capTier, motionTier, designTier },
    buildCapabilityEvidenceInputs(probes),
  );

  reportDegradedProbes(probes);

  return { capabilities, capTier, capSet, tierEvidence, designTier, motionTier };
}

/**
 * Run a full device capability detection sweep.
 * All probes are synchronous with internal error handling -- gracefully
 * falls back to conservative defaults when APIs are unavailable.
 *
 * You usually never call this yourself: in an Astro project the `@liteship/astro`
 * boundary runs detection after DOMContentLoaded and publishes the result as
 * `window.__LITESHIP_DETECT__`, so adaptives and the directive runtime read it
 * for free.
 *
 * Advanced — direct invocation (all probes are synchronous):
 * ```ts
 * import { Detect } from '@liteship/detect';
 *
 * const result = Detect.detect();
 * console.log(result.capabilities.gpu);       // 0-3
 * console.log(result.capTier);                   // 'static' | 'styled' | 'reactive' | 'animated' | 'gpu'
 * console.log(result.designTier);             // 'minimal' | 'standard' | 'enhanced' | 'rich'
 * console.log(result.motionTier);             // 'none' | 'transitions' | ...
 * console.log(result.tierEvidence.motion.support); // 'observed' | 'inferred'
 * ```
 *
 * @returns The {@link ExtendedDetectionResult}
 */
export function detect(): ExtendedDetectionResult {
  return runDetection(collectDetectionProbes());
}

/**
 * Device capability detection namespace.
 *
 * Probes browser APIs for GPU tier, CPU cores, memory, input modality,
 * user preferences, and network info. Maps detected capabilities to
 * {@link CapTier}, {@link CapSet}, {@link DesignTier}, and {@link MotionTier}.
 * Supports live watching for preference and viewport changes.
 *
 * You usually never call these yourself — the `@liteship/astro` boundary runs
 * detection automatically and publishes `window.__LITESHIP_DETECT__` for the
 * runtime to read.
 *
 * Advanced — direct invocation:
 * ```ts
 * import { Detect } from '@liteship/detect';
 *
 * const result = Detect.detect();
 * console.log(result.capabilities.prefersColorScheme); // 'light' | 'dark'
 * console.log(result.motionTier); // 'none' | 'transitions' | 'animations' | ...
 *
 * // Watch for changes
 * const dispose = Detect.watchCapabilities((r) => console.log('capTier:', r.capTier));
 * // later: dispose()
 * ```
 */
export const Detect = {
  detect,
  detectGPUTier,
  watchCapabilities,
  resetDetectionCaches,
} as const;

/**
 * Watch for capability changes via matchMedia listeners and resize observer.
 * Emits a fresh DetectionResult whenever viewport, color scheme, or
 * reduced motion preferences change.
 *
 * Listeners are torn down when the returned {@link Disposer} is called.
 *
 * Event bursts are coalesced: re-detection is debounced to one sweep per
 * animation frame, and hardware-identity probes (GPU renderer, WebGPU, cores,
 * memory) are run once and reused — only viewport/DPR/media-query probes
 * re-run on change.
 *
 * @example
 * ```ts
 * import { Detect } from '@liteship/detect';
 *
 * const dispose = Detect.watchCapabilities((result) => {
 *   console.log('Capabilities changed:', result.capTier);
 * });
 * // later: dispose()
 * ```
 *
 * @param onChange - Callback invoked with fresh detection results on change
 * @returns A {@link Disposer} that removes the listeners it added
 */
export function watchCapabilities(onChange: (result: ExtendedDetectionResult) => void): Disposer {
  if (typeof window === 'undefined') return () => {};

  // Hardware identity cannot change while the page lives — probe once so a
  // resize storm never allocates fresh WebGL contexts.
  const staticProbes = collectStaticProbes();

  let closed = false;
  let updateScheduled = false;
  const runUpdate = () => {
    updateScheduled = false;
    if (closed) return;
    onChange(runDetection(collectDetectionProbes(staticProbes)));
  };
  // Resize can fire per pixel; coalesce bursts to one sweep per frame.
  const triggerUpdate = () => {
    if (updateScheduled) return;
    updateScheduled = true;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(runUpdate);
    } else {
      setTimeout(runUpdate, 16);
    }
  };

  const resizeHandler = () => triggerUpdate();
  window.addEventListener('resize', resizeHandler);

  const reducedMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colorSchemeMql = window.matchMedia('(prefers-color-scheme: dark)');
  const contrastMql = window.matchMedia('(prefers-contrast: more)');
  const forcedColorsMql = window.matchMedia('(forced-colors: active)');
  const reducedTransparencyMql = window.matchMedia('(prefers-reduced-transparency: reduce)');

  const mqlHandler = () => triggerUpdate();
  reducedMotionMql.addEventListener('change', mqlHandler);
  colorSchemeMql.addEventListener('change', mqlHandler);
  contrastMql.addEventListener('change', mqlHandler);
  forcedColorsMql.addEventListener('change', mqlHandler);
  reducedTransparencyMql.addEventListener('change', mqlHandler);

  return () => {
    closed = true;
    window.removeEventListener('resize', resizeHandler);
    reducedMotionMql.removeEventListener('change', mqlHandler);
    colorSchemeMql.removeEventListener('change', mqlHandler);
    contrastMql.removeEventListener('change', mqlHandler);
    forcedColorsMql.removeEventListener('change', mqlHandler);
    reducedTransparencyMql.removeEventListener('change', mqlHandler);
  };
}
