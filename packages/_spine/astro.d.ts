/**
 * @czap/astro type spine -- Astro 7 integration + <Quantize> component.
 */

import type { Boundary, Quantizer, CapTier } from './core.d.ts';
import type { PluginConfig } from './vite.d.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface IntegrationConfig {
  readonly vite?: PluginConfig;
  readonly detect?: boolean;
  readonly serverIslands?: boolean;
  /** Dev-only boundary inspector overlay (default enabled in `astro dev`). */
  readonly inspector?: boolean;
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
