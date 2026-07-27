/**
 * @liteship/edge type spine -- CDN-edge tier detection, boundary caching, theme compilation.
 */

import type { CapTier, ContentAddress, MotionTier, ResponsiveMediaCapabilities } from './core.js';
import type {
  CapabilityEvidenceInputs,
  CapabilityTierEvidence,
  CapabilityTierProjection,
  CapAxis,
  DesignTier,
  ExtendedDeviceCapabilities,
} from './detect.js';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. CLIENT HINTS
// ═══════════════════════════════════════════════════════════════════════════════

/** HTTP client-hint headers consumed by edge capability resolution. */
export interface ClientHintsHeaders {
  readonly 'sec-ch-device-memory'?: string;
  readonly 'sec-ch-dpr'?: string;
  readonly 'sec-ch-viewport-width'?: string;
  readonly 'sec-ch-viewport-height'?: string;
  readonly 'sec-ch-prefers-reduced-motion'?: string;
  readonly 'sec-ch-prefers-color-scheme'?: string;
  readonly 'sec-ch-ua-mobile'?: string;
  readonly 'save-data'?: string;
  readonly downlink?: string;
  readonly ect?: string;
  readonly 'user-agent'?: string;
}

/** One canonical Client-Hints parse: complete values plus input-level provenance. */
export interface ClientHintsEvidence {
  readonly capabilities: ExtendedDeviceCapabilities;
  readonly inputEvidence: CapabilityEvidenceInputs;
}

export declare const ClientHints: {
  parseEvidence(headers: Headers | ClientHintsHeaders): ClientHintsEvidence;
  parseClientHints(headers: Headers | ClientHintsHeaders): ExtendedDeviceCapabilities;
  acceptCHHeader(): string;
  criticalCHHeader(): string;
  varyCHHeader(): string;
  responsiveMediaCapabilities(
    headersOrCaps: Headers | ClientHintsHeaders | ExtendedDeviceCapabilities,
  ): ResponsiveMediaCapabilities;
  responsiveMediaVaryHeader(): string;
};

/** Parsers and normalizers for edge-visible client-hint evidence. */
export declare namespace ClientHints {
  export type Headers = ClientHintsHeaders;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. EDGE TIER
// ═══════════════════════════════════════════════════════════════════════════════

/** Provisional tier decision and the evidence available at the edge. */
export interface EdgeTierResult {
  readonly capTier: CapTier;
  readonly motionTier: MotionTier;
  readonly designTier: DesignTier;
  readonly tierEvidence: CapabilityTierEvidence;
}

export declare const EdgeTier: {
  detectTier(headers: Headers | ClientHintsHeaders): EdgeTierResult;
  tierFromEvidence(parsed: ClientHintsEvidence): EdgeTierResult;
  tierDataAttributes(result: CapabilityTierProjection): string;
  tierDataAttributesMap(result: CapabilityTierProjection): Readonly<Record<`data-liteship-${CapAxis}`, string>>;
};

/** Conservative edge-tier inference helpers. */
export declare namespace EdgeTier {
  export type Result = EdgeTierResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. KV BOUNDARY CACHE
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimal key-value namespace capability required by the edge cache. */
export interface KVNamespace {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete?(key: string): Promise<void>;
  list?(options: {
    prefix: string;
    cursor?: string;
  }): Promise<{ keys: ReadonlyArray<{ name: string }>; list_complete: boolean; cursor?: string }>;
}

/** Precompiled CSS, shader, accessibility, and agent projections for a boundary. */
export interface CompiledOutputs {
  readonly css: string;
  readonly propertyRegistrations: string;
  readonly containerQueries: string;
  readonly aria?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly glsl?: CompiledGLSLOutput;
  readonly wgsl?: CompiledWGSLOutput;
}

/** GLSL source and numeric uniforms stored in an edge manifest. */
export interface CompiledGLSLOutput {
  readonly declarations: string;
  readonly uniformValues: Readonly<Record<string, number>>;
  readonly stateUniforms?: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

/** Fixed-width WGSL vector retained in an edge manifest. */
type EdgeWGSLUniformVector =
  readonly [number, number] | readonly [number, number, number] | readonly [number, number, number, number];

/** Scalar or vector WGSL uniform retained in an edge manifest. */
type EdgeWGSLUniformValue = number | EdgeWGSLUniformVector;

/** WGSL source and uniform values stored in an edge manifest. */
export interface CompiledWGSLOutput {
  readonly declarations: string;
  readonly bindingValues: Readonly<Record<string, EdgeWGSLUniformValue>>;
  readonly stateBindings?: Readonly<Record<string, Readonly<Record<string, EdgeWGSLUniformValue>>>>;
}

/** Async cache contract for content-addressed boundary outputs. */
export interface BoundaryCache {
  /**
   * `qualifier` joins the key when two NAMES share one boundary
   * `ContentAddress` but carry different compiled CSS (the same
   * `defineBoundary` definition referenced by two `@quantize` blocks) —
   * without it, the first name's compile result would serve every name.
   * `themeFp` likewise segregates outputs compiled under different resolved
   * themes (a per-request theme is a real input to the cached CSS).
   */
  getCompiledOutputs(
    boundaryId: ContentAddress,
    tierResult: Pick<EdgeTierResult, 'motionTier' | 'designTier'>,
    qualifier?: string,
    themeFp?: string,
  ): Promise<CompiledOutputs | null>;
  putCompiledOutputs(
    boundaryId: ContentAddress,
    tierResult: Pick<EdgeTierResult, 'motionTier' | 'designTier'>,
    outputs: CompiledOutputs,
    qualifier?: string,
    themeFp?: string,
    tags?: readonly string[],
  ): Promise<void>;
  invalidateByPath(boundaryId: ContentAddress): Promise<number>;
  invalidateByTag(tag: string): Promise<number>;
}

export declare function createBoundaryCache(
  kv: KVNamespace,
  options?: { ttl?: number; prefix?: string },
): BoundaryCache;

export declare const KVCache: {
  createBoundaryCache(kv: KVNamespace, options?: { ttl?: number; prefix?: string }): BoundaryCache;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 3b. BOUNDARY MANIFEST (build-to-edge handoff)
// ═══════════════════════════════════════════════════════════════════════════════

export declare const MOTION_TIERS: readonly MotionTier[];
export declare const DESIGN_TIERS: readonly DesignTier[];

/** Stable cache partition composed from motion and design tiers. */
export type TierKey = `${MotionTier}:${DesignTier}`;

export declare function tierKey(tier: Pick<EdgeTierResult, 'motionTier' | 'designTier'>): TierKey;
export declare function enumerateTierKeys(): readonly TierKey[];

/** One boundary's precompiled target outputs indexed by tier pair. */
export interface BoundaryManifestEntry {
  readonly id: ContentAddress;
  readonly outputs: readonly CompiledOutputs[];
  readonly outputsByTier: Readonly<Partial<Record<TierKey, number>>>;
  readonly assetUrls?: Readonly<Record<number, string>>;
}

export declare function dedupeOutputsByTier(
  outputsByTier: Readonly<Partial<Record<TierKey, CompiledOutputs>>>,
): Pick<BoundaryManifestEntry, 'outputs' | 'outputsByTier'>;

export declare function resolveOutputsByTier(
  entry: Pick<BoundaryManifestEntry, 'outputs' | 'outputsByTier'>,
): Readonly<Partial<Record<TierKey, CompiledOutputs>>>;

export declare function resolveAssetUrlByTier(
  entry: Pick<BoundaryManifestEntry, 'outputsByTier' | 'assetUrls'>,
  key: TierKey,
): string | undefined;

/** Immutable boundary-manifest index keyed by boundary content address. */
export type BoundaryManifest = Readonly<Record<string, BoundaryManifestEntry>>;

/** Versioned, content-addressed serialized boundary manifest. */
export interface BoundaryManifestFile {
  readonly _tag: 'LiteshipBoundaryManifest';
  readonly _version: 2;
  readonly boundaries: BoundaryManifest;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. THEME COMPILER
// ═══════════════════════════════════════════════════════════════════════════════

/** Options controlling edge-side theme stylesheet generation. */
export interface ThemeCompileConfig {
  readonly tokens: Readonly<Record<string, string | number>>;
  readonly prefix?: string;
}

/** Internal normalized custom-property declaration for one theme variant. */
interface ThemeDeclaration {
  readonly property: string;
  readonly value: string;
}

/** Compiled theme CSS and its normalized declaration inventory. */
export interface ThemeCompileResult {
  readonly declarations: readonly ThemeDeclaration[];
  readonly css: string;
  readonly inlineStyle: string;
}

export declare function compileTheme(config: ThemeCompileConfig): ThemeCompileResult;

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. EDGE HOST ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

/** Request evidence available to an edge host adapter. */
export interface EdgeHostContext {
  readonly capabilities: ExtendedDeviceCapabilities;
  readonly tier: EdgeTierResult;
}

/** Edge host context extended with the selected manifest entry and tiers. */
export interface EdgeHostCompileContext extends EdgeHostContext {
  readonly theme?: ThemeCompileResult;
  readonly boundaryId: ContentAddress;
  readonly boundaryName?: string;
}

/** Static cache tags or a resolver derived from one edge compile context. */
export type EdgeHostCacheTags =
  readonly string[] | ((context: EdgeHostCompileContext) => readonly string[] | null | undefined);

/** Boundary manifest and precompiled-asset inputs for edge host resolution. */
export interface EdgeHostBoundaryConfig {
  readonly boundaryId: ContentAddress;
  readonly precompiled?: Readonly<Partial<Record<TierKey, CompiledOutputs>>>;
  readonly assetUrlsByTier?: Readonly<Partial<Record<TierKey, string>>>;
  readonly compile?: (context: EdgeHostCompileContext) => Promise<CompiledOutputs> | CompiledOutputs;
  readonly tags?: EdgeHostCacheTags;
}

/** TTL, tags, and cache implementation used by an edge host. */
export interface EdgeHostCacheConfig {
  readonly kv: KVNamespace;
  readonly boundaryId?: ContentAddress;
  readonly precompiled?: Readonly<Partial<Record<TierKey, CompiledOutputs>>>;
  readonly assetUrlsByTier?: Readonly<Partial<Record<TierKey, string>>>;
  readonly compile?: (context: EdgeHostCompileContext) => Promise<CompiledOutputs> | CompiledOutputs;
  readonly tags?: EdgeHostCacheTags;
  readonly boundaries?: Readonly<Record<string, EdgeHostBoundaryConfig>>;
  readonly ttl?: number;
  readonly prefix?: string;
}

/** Observable cache disposition of an edge host resolution. */
export type EdgeHostCacheStatus = 'disabled' | 'precompiled' | 'hit' | 'miss';

/** Resolved state and compiled outputs for one boundary. */
export interface EdgeHostBoundaryResolution {
  readonly boundaryId: ContentAddress;
  readonly compiledOutputs?: CompiledOutputs;
  readonly assetUrl?: string;
  readonly cacheStatus: Exclude<EdgeHostCacheStatus, 'disabled'>;
}

/** Complete configuration accepted by an edge host adapter. */
export interface EdgeHostAdapterConfig {
  readonly theme?: ThemeCompileConfig | ((context: EdgeHostContext) => ThemeCompileConfig | null | undefined);
  readonly cache?: EdgeHostCacheConfig;
  readonly background?: EdgeHostBackground;
}

/** Workers background hook for deferring cache write-back off the request path. */
export interface EdgeHostBackground {
  readonly waitUntil: (promise: Promise<unknown>) => void;
}

/** Tier, theme, boundary, asset, and cache evidence returned by an edge host. */
export interface EdgeHostResolution extends EdgeHostContext {
  readonly theme?: ThemeCompileResult;
  readonly compiledOutputs?: CompiledOutputs;
  readonly assetUrl?: string;
  readonly boundaries?: Readonly<Record<string, EdgeHostBoundaryResolution>>;
  readonly htmlAttributes: string;
  /** Spreadable map form of {@link htmlAttributes}, keyed by `data-liteship-<axis>` (auto-includes every `CAP_AXES` axis). */
  readonly htmlAttributesMap: Readonly<Record<string, string>>;
  readonly responseHeaders: {
    readonly acceptCH: string;
    readonly criticalCH: string;
  };
  readonly cacheStatus: EdgeHostCacheStatus;
}

/** Host-neutral edge adapter that resolves request evidence into LiteShip outputs. */
export interface EdgeHostAdapter {
  resolve(headers: Headers | ClientHintsHeaders): Promise<EdgeHostResolution>;
}

export declare function createEdgeHostAdapter(config?: EdgeHostAdapterConfig): EdgeHostAdapter;

export declare const EdgeHostAdapter: {
  create(config?: EdgeHostAdapterConfig): EdgeHostAdapter;
};

export declare namespace EdgeHostAdapter {
  export type Config = EdgeHostAdapterConfig;
  export type Resolution = EdgeHostResolution;
  export type CacheStatus = EdgeHostCacheStatus;
  export type Context = EdgeHostContext;
  export type CompileContext = EdgeHostCompileContext;
  export type BoundaryConfig = EdgeHostBoundaryConfig;
  export type CacheTags = EdgeHostCacheTags;
  export type BoundaryResolution = EdgeHostBoundaryResolution;
}
