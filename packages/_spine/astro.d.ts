/**
 * @liteship/astro type spine -- Astro 7 integration + <Quantize> component.
 */

import type { Boundary, Quantizer, CapTier } from './core.js';
import type {
  CompiledOutputs,
  EdgeHostAdapterConfig,
  EdgeHostBoundaryResolution,
  EdgeHostCacheStatus,
  EdgeHostResolution,
  ThemeCompileResult,
} from './edge.js';
import type { CapabilityAxisValues, CapabilityTierEvidence, ExtendedDeviceCapabilities } from './detect.js';
import type { PluginConfig } from './vite.js';
import type { RuntimeEndpointPolicy } from './web.js';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Options projected into the LiteShip Astro integration and its nested Vite host. */
export interface IntegrationConfig {
  readonly vite?: PluginConfig;
  readonly adaptive?: boolean;
  readonly exclude?: readonly string[];
  readonly detect?: boolean;
  readonly wasm?: { readonly enabled?: boolean; readonly path?: string };
  readonly gpu?: { readonly enabled?: boolean; readonly preferWebGPU?: boolean };
  readonly workers?: { readonly enabled?: boolean; readonly coep?: CrossOriginEmbedderPolicy };
  readonly stream?: { readonly enabled?: boolean };
  readonly llm?: { readonly enabled?: boolean };
  readonly motion?: { readonly enabled?: boolean };
  /** Dev-only boundary inspector overlay (default enabled in `astro dev`). */
  readonly inspector?: boolean;
  readonly middleware?: boolean;
  readonly security?: {
    readonly endpointPolicy?: RuntimeEndpointPolicy;
    readonly htmlPolicy?: RuntimeHtmlPolicy;
  };
}

export declare function integration(config?: IntegrationConfig): import('astro').AstroIntegration;
export declare function liteship(config?: IntegrationConfig): import('astro').AstroIntegration;

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. QUANTIZE COMPONENT PROPS
// ═══════════════════════════════════════════════════════════════════════════════

/** Props accepted by the Astro `<Quantize>` component for one boundary-owned region. */
export interface QuantizeProps<B extends Boundary = Boundary> {
  readonly boundary: B;
  readonly quantizer?: Quantizer<B>;
  readonly initialState?: string;
  readonly fallback?: string;
  readonly class?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. SERVER ISLAND RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

/** Request evidence used to choose an Astro server island's initial boundary state. */
export interface ServerIslandContext {
  readonly userAgent?: string;
  readonly clientHints?: Record<string, string>;
  readonly detectedCapTier?: CapTier;
}

export declare function resolveInitialState<B extends Boundary>(boundary: B, context?: ServerIslandContext): string;

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. MIDDLEWARE / FETCH LAYER / DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════════

/** Cross-origin isolation modes supported by the Astro worker integration. */
export type CrossOriginEmbedderPolicy = 'require-corp' | 'credentialless';

/** HTML handling modes accepted by the Astro runtime policy. */
type HtmlPolicy = 'text' | 'sanitized-html' | 'trusted-html';
/** Host HTML policy projected into the Astro integration. */
interface RuntimeHtmlPolicy {
  readonly llmDefault?: HtmlPolicy;
  readonly streamDefault?: HtmlPolicy;
  readonly allowTrustedHtml?: boolean;
}

/** One responsive-media source candidate. */
interface ResponsiveMediaVariant {
  readonly src: string;
  readonly width?: number;
  readonly descriptor?: string;
}
/** Sealed responsive-media authoring intent consumed by Astro locals. */
interface ResponsiveMediaIntent {
  readonly _tag: 'ResponsiveMediaIntent';
  readonly id: string;
  readonly alt: string;
  readonly variants: readonly ResponsiveMediaVariant[];
  readonly saveDataVariant?: ResponsiveMediaVariant;
  readonly sizes?: string;
}
/** Reason Astro selected one responsive-media source. */
type ResponsiveMediaResolutionReason = 'save-data' | 'save-data-floor' | 'dpr-match' | 'dpr-floor' | 'fallback';
/** Render-ready responsive-media projection returned by Astro locals. */
interface ResponsiveMediaPictureProjection {
  readonly picture: string;
  readonly img: string;
  readonly srcset: string;
  readonly sizes: string;
  readonly resolved: { readonly src: string; readonly reason: ResponsiveMediaResolutionReason };
  readonly preload: string;
}

/** Configuration shared by Astro middleware and fetch-layer adapters. */
export interface LiteshipMiddlewareConfig {
  readonly edge?: EdgeHostAdapterConfig;
  readonly detect?: boolean;
  readonly workers?: { readonly enabled?: boolean; readonly coep?: CrossOriginEmbedderPolicy };
}

/** LiteShip request-local evidence exposed to Astro pages and middleware. */
export interface LiteshipLocals {
  readonly tiers: CapabilityAxisValues;
  readonly tierEvidence: CapabilityTierEvidence;
  readonly capabilities: ExtendedDeviceCapabilities;
  readonly responsiveMedia: (intent: ResponsiveMediaIntent) => ResponsiveMediaPictureProjection;
  readonly edge?: {
    readonly theme?: ThemeCompileResult;
    readonly compiledOutputs?: CompiledOutputs;
    readonly assetUrl?: string;
    readonly boundaries?: Readonly<Record<string, EdgeHostBoundaryResolution>>;
    readonly htmlAttributes: string;
    readonly htmlAttributesMap: Readonly<Record<string, string>>;
    readonly cacheStatus: EdgeHostCacheStatus;
  };
}

export declare function liteshipMiddleware(config?: LiteshipMiddlewareConfig): unknown;

/** Downstream request handler invoked by a LiteShip fetch layer. */
export type FetchLayerNext = (request: Request) => Response | Promise<Response>;
/** Composable fetch-layer function used outside Astro's middleware object model. */
export type LiteshipFetchLayer = (request: Request, next: FetchLayerNext) => Promise<Response>;

/** Fetch-layer options including edge-serving and host-rendering decisions. */
export interface LiteshipFetchLayerConfig extends LiteshipMiddlewareConfig {
  readonly serveFromEdge?: (request: Request, resolution: EdgeHostResolution) => boolean;
  readonly render?: (resolution: EdgeHostResolution) => Response;
}

export declare function liteshipFetchLayer(config?: LiteshipFetchLayerConfig): LiteshipFetchLayer;
export declare function serializeBoundaryCss(resolution: EdgeHostResolution): string;

/** Minimal Astro logger capability required by the diagnostic bridge. */
export interface AstroLoggerLike {
  warn(message: string): void;
  error(message: string): void;
}

export declare function bridgeDiagnosticsToAstroLogger(logger: AstroLoggerLike): unknown;
export declare function installDiagnosticsBridge(logger: AstroLoggerLike): () => void;
