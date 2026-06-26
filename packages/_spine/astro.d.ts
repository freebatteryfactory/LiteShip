/**
 * @czap/astro type spine -- Astro 7 integration + <Quantize> component.
 */

import type { Boundary, Quantizer, CapTier } from './core.d.ts';
import type { EdgeHostAdapterConfig, EdgeHostResolution } from './edge.d.ts';
import type { PluginConfig } from './vite.d.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface IntegrationConfig {
  readonly vite?: PluginConfig;
  readonly exclude?: readonly string[];
  readonly detect?: boolean;
  readonly serverIslands?: boolean;
  readonly wasm?: { readonly enabled?: boolean; readonly path?: string };
  readonly gpu?: { readonly enabled?: boolean; readonly preferWebGPU?: boolean };
  readonly workers?: { readonly enabled?: boolean; readonly coep?: CrossOriginEmbedderPolicy };
  readonly stream?: { readonly enabled?: boolean };
  readonly llm?: { readonly enabled?: boolean };
  /** Dev-only boundary inspector overlay (default enabled in `astro dev`). */
  readonly inspector?: boolean;
  readonly middleware?: boolean;
  readonly security?: {
    readonly endpointPolicy?: unknown;
    readonly htmlPolicy?: unknown;
  };
}

export declare function integration(config?: IntegrationConfig): import('astro').AstroIntegration;
export declare function czap(config?: IntegrationConfig): import('astro').AstroIntegration;

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. QUANTIZE COMPONENT PROPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuantizeProps<B extends Boundary.Shape = Boundary.Shape> {
  readonly boundary: B;
  readonly quantizer?: Quantizer<B>;
  readonly initialState?: string;
  readonly fallback?: string;
  readonly class?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. SERVER ISLAND RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ServerIslandContext {
  readonly userAgent?: string;
  readonly clientHints?: Record<string, string>;
  readonly detectedCapTier?: CapTier;
}

export declare function resolveInitialState<B extends Boundary.Shape>(
  boundary: B,
  context?: ServerIslandContext,
): string;

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. MIDDLEWARE / FETCH LAYER / DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════════

export type CrossOriginEmbedderPolicy = 'require-corp' | 'credentialless';

export interface CzapMiddlewareConfig {
  readonly edge?: EdgeHostAdapterConfig;
  readonly detect?: boolean;
  readonly workers?: { readonly enabled?: boolean; readonly coep?: CrossOriginEmbedderPolicy };
}

export interface CzapLocals {
  readonly tiers: Readonly<Record<string, string>>;
  readonly capabilities: unknown;
  readonly edge?: {
    readonly theme?: unknown;
    readonly compiledOutputs?: unknown;
    readonly assetUrl?: string;
    readonly boundaries?: EdgeHostResolution['boundaries'];
    readonly htmlAttributes: string;
    readonly cacheStatus: EdgeHostResolution['cacheStatus'];
  };
}

export declare function czapMiddleware(config?: CzapMiddlewareConfig): unknown;

export type FetchLayerNext = (request: Request) => Response | Promise<Response>;
export type CzapFetchLayer = (request: Request, next: FetchLayerNext) => Promise<Response>;

export interface CzapFetchLayerConfig extends CzapMiddlewareConfig {
  readonly serveFromEdge?: (request: Request, resolution: EdgeHostResolution) => boolean;
  readonly render?: (resolution: EdgeHostResolution) => Response;
}

export declare function czapFetchLayer(config?: CzapFetchLayerConfig): CzapFetchLayer;
export declare function serializeBoundaryCss(resolution: EdgeHostResolution): string;

export interface AstroLoggerLike {
  warn(message: string): void;
  error(message: string): void;
}

export declare function bridgeDiagnosticsToAstroLogger(logger: AstroLoggerLike): unknown;
export declare function installDiagnosticsBridge(logger: AstroLoggerLike): () => void;
