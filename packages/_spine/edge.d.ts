/**
 * @czap/edge type spine -- CDN-edge tier detection, boundary caching, theme compilation.
 */

import type { CapTier, ContentAddress } from './core.d.ts';
import type { DeviceCapabilities, DesignTier, MotionTier, ExtendedDeviceCapabilities } from './detect.d.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. CLIENT HINTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClientHintsHeaders {
  readonly 'sec-ch-ua-arch'?: string;
  readonly 'sec-ch-ua-model'?: string;
  readonly 'sec-ch-ua-platform'?: string;
  readonly 'sec-ch-ua-mobile'?: string;
  readonly 'device-memory'?: string;
  readonly 'sec-ch-viewport-width'?: string;
  readonly 'sec-ch-dpr'?: string;
  readonly 'sec-ch-prefers-color-scheme'?: string;
  readonly 'sec-ch-prefers-reduced-motion'?: string;
  readonly 'save-data'?: string;
  readonly 'user-agent'?: string;
}

export declare const ClientHints: {
  parseClientHints(headers: Headers | ClientHintsHeaders): ExtendedDeviceCapabilities;
  acceptCHHeader(): string;
  criticalCHHeader(): string;
};

export declare namespace ClientHints {
  export type Headers = ClientHintsHeaders;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. EDGE TIER
// ═══════════════════════════════════════════════════════════════════════════════

export interface EdgeTierResult {
  readonly capTier: CapTier;
  readonly motionTier: MotionTier;
  readonly designTier: DesignTier;
}

export declare const EdgeTier: {
  detectTier(headers: Headers | ClientHintsHeaders): EdgeTierResult;
  tierFromParsed(caps: ExtendedDeviceCapabilities): EdgeTierResult;
  tierDataAttributes(result: EdgeTierResult): string;
};

export declare namespace EdgeTier {
  export type Result = EdgeTierResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. KV BOUNDARY CACHE
// ═══════════════════════════════════════════════════════════════════════════════

export interface KVNamespace {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete?(key: string): Promise<void>;
  list?(options: {
    prefix: string;
    cursor?: string;
  }): Promise<{ keys: ReadonlyArray<{ name: string }>; list_complete: boolean; cursor?: string }>;
}

export interface CompiledOutputs {
  readonly css: string;
  readonly propertyRegistrations: string;
  readonly containerQueries: string;
}

export interface BoundaryCache {
  /**
   * `qualifier` joins the key when two NAMES share one boundary
   * `ContentAddress` but carry different compiled CSS (the same
   * `Boundary.make` definition referenced by two `@quantize` blocks) —
   * without it, the first name's compile result would serve every name.
   * `themeFp` likewise segregates outputs compiled under different resolved
   * themes (a per-request theme is a real input to the cached CSS).
   */
  getCompiledOutputs(
    boundaryId: ContentAddress,
    tierResult: EdgeTierResult,
    qualifier?: string,
    themeFp?: string,
  ): Promise<CompiledOutputs | null>;
  putCompiledOutputs(
    boundaryId: ContentAddress,
    tierResult: EdgeTierResult,
    outputs: CompiledOutputs,
    qualifier?: string,
    themeFp?: string,
  ): Promise<void>;
}

export declare function createBoundaryCache(kv: KVNamespace, options?: { ttl?: number; prefix?: string }): BoundaryCache;

export declare const KVCache: {
  createBoundaryCache(kv: KVNamespace, options?: { ttl?: number; prefix?: string }): BoundaryCache;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 3b. BOUNDARY MANIFEST (build-to-edge handoff)
// ═══════════════════════════════════════════════════════════════════════════════

export declare const MOTION_TIERS: readonly MotionTier[];
export declare const DESIGN_TIERS: readonly DesignTier[];

export type TierKey = `${MotionTier}:${DesignTier}`;

export declare function tierKey(tier: Pick<EdgeTierResult, 'motionTier' | 'designTier'>): TierKey;
export declare function enumerateTierKeys(): readonly TierKey[];

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

export type BoundaryManifest = Readonly<Record<string, BoundaryManifestEntry>>;

export interface BoundaryManifestFile {
  readonly _tag: 'CzapBoundaryManifest';
  readonly _version: 2;
  readonly boundaries: BoundaryManifest;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. THEME COMPILER
// ═══════════════════════════════════════════════════════════════════════════════

export interface ThemeCompileConfig {
  readonly themeName: string;
  readonly tokens: Record<string, unknown>;
}

export interface ThemeCompileResult {
  readonly css: string;
  readonly selector: string;
}

export declare function compileTheme(config: ThemeCompileConfig): ThemeCompileResult;

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. EDGE HOST ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

export interface EdgeHostContext {
  readonly capabilities: ExtendedDeviceCapabilities;
  readonly tier: EdgeTierResult;
}

export interface EdgeHostCompileContext extends EdgeHostContext {
  readonly theme?: ThemeCompileResult;
  readonly boundaryId: ContentAddress;
  readonly boundaryName?: string;
}

export interface EdgeHostBoundaryConfig {
  readonly boundaryId: ContentAddress;
  readonly precompiled?: Readonly<Partial<Record<TierKey, CompiledOutputs>>>;
  readonly assetUrlsByTier?: Readonly<Partial<Record<TierKey, string>>>;
  readonly compile?: (context: EdgeHostCompileContext) => Promise<CompiledOutputs> | CompiledOutputs;
}

export interface EdgeHostCacheConfig {
  readonly kv: KVNamespace;
  readonly boundaryId?: ContentAddress;
  readonly precompiled?: Readonly<Partial<Record<TierKey, CompiledOutputs>>>;
  readonly assetUrlsByTier?: Readonly<Partial<Record<TierKey, string>>>;
  readonly compile?: (context: EdgeHostCompileContext) => Promise<CompiledOutputs> | CompiledOutputs;
  readonly boundaries?: Readonly<Record<string, EdgeHostBoundaryConfig>>;
  readonly ttl?: number;
  readonly prefix?: string;
}

export type EdgeHostCacheStatus = 'disabled' | 'precompiled' | 'hit' | 'miss';

export interface EdgeHostBoundaryResolution {
  readonly boundaryId: ContentAddress;
  readonly compiledOutputs?: CompiledOutputs;
  readonly assetUrl?: string;
  readonly cacheStatus: Exclude<EdgeHostCacheStatus, 'disabled'>;
}

export interface EdgeHostAdapterConfig {
  readonly theme?:
    | ThemeCompileConfig
    | ((context: EdgeHostContext) => ThemeCompileConfig | null | undefined);
  readonly cache?: EdgeHostCacheConfig;
}

export interface EdgeHostResolution extends EdgeHostContext {
  readonly theme?: ThemeCompileResult;
  readonly compiledOutputs?: CompiledOutputs;
  readonly assetUrl?: string;
  readonly boundaries?: Readonly<Record<string, EdgeHostBoundaryResolution>>;
  readonly htmlAttributes: string;
  readonly responseHeaders: {
    readonly acceptCH: string;
    readonly criticalCH: string;
  };
  readonly cacheStatus: EdgeHostCacheStatus;
}

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
  export type BoundaryResolution = EdgeHostBoundaryResolution;
}
