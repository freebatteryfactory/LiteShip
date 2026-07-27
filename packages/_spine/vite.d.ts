/**
 * @liteship/vite type spine -- Vite 8 plugin for @token, @theme, @style, @quantize processing + HMR.
 */

import type { Boundary, ContentAddress } from './core.js';
import type { Token, Theme, Style } from './design.js';
import type { BoundaryManifest, BoundaryManifestEntry, CompiledOutputs } from './edge.js';

// ═══════════════════════════════════════════════════════════════════════════════
// § 0. PRIMITIVE KIND
// ═══════════════════════════════════════════════════════════════════════════════

/** Authored definition kinds discovered by the Vite integration. */
export type PrimitiveKind = 'boundary' | 'token' | 'theme' | 'style';

/** Definition type selected by a Vite primitive kind. */
type VitePrimitive<K extends PrimitiveKind> = K extends 'boundary'
  ? Boundary
  : K extends 'token'
    ? Token
    : K extends 'theme'
      ? Theme
      : Style;

/** Resolved authored definition and the source file that owns it. */
export interface PrimitiveResolution<K extends PrimitiveKind> {
  readonly primitive: VitePrimitive<K>;
  readonly source: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. PLUGIN CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

/** LiteShip Vite plugin discovery, HMR, environment, and WASM options. */
export interface PluginConfig {
  readonly dirs?: Partial<Record<PrimitiveKind, string>>;
  readonly hmr?: boolean;
  readonly environments?: readonly ('browser' | 'server' | 'shader')[];
  readonly emitBoundaryAssets?: boolean;
  readonly wasm?: boolean | { readonly enabled?: boolean; readonly path?: string };
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. PLUGIN ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

export declare function plugin(config?: PluginConfig): import('vite').Plugin;

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. @quantize CSS TRANSFORM
// ═══════════════════════════════════════════════════════════════════════════════

/** Nested selector or at-rule preserved inside a quantized state block. */
export interface QuantizeNestedRule {
  readonly selector: string;
  readonly props: Record<string, string>;
}

/** Parsed declarations and nested rules for one quantized state. */
export interface QuantizeStateBody {
  readonly bareProps: Record<string, string>;
  readonly rules: readonly QuantizeNestedRule[];
}

/** Parsed `@quantize` block and its source location. */
export interface QuantizeBlock {
  readonly boundaryName: string;
  readonly states: Record<string, QuantizeStateBody>;
  readonly sourceFile: string;
  readonly line: number;
}

export declare function parseQuantizeBlocks(css: string, sourceFile: string): readonly QuantizeBlock[];

/**
 * Sheet-level aggregation context for viewport containment: thread ONE
 * instance through every `compileQuantizeBlock` call of a stylesheet and
 * emit a single `:root` rule via `viewportContainmentRule`
 * (`container-name` is a replaced property -- per-block rules would
 * overwrite each other).
 */
export interface QuantizeSheetContext {
  readonly viewportContainerNames: Set<string>;
}

export declare function compileQuantizeBlock(
  block: QuantizeBlock,
  boundary: Boundary,
  sheet?: QuantizeSheetContext,
): string;

export declare function viewportContainmentRule(names: Iterable<string>): string | null;

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. @token CSS TRANSFORM
// ═══════════════════════════════════════════════════════════════════════════════

/** Parsed token directive and its normalized declaration data. */
export interface TokenBlock {
  readonly tokenName: string;
  readonly declarations: Record<string, string>;
  readonly sourceFile: string;
  readonly line: number;
}

export declare function parseTokenBlocks(css: string, sourceFile: string): readonly TokenBlock[];

export declare function compileTokenBlock(block: TokenBlock, token: Token): string;

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. @theme CSS TRANSFORM
// ═══════════════════════════════════════════════════════════════════════════════

/** Parsed theme directive and its named variant declarations. */
export interface ThemeBlock {
  readonly themeName: string;
  readonly declarations: Record<string, string>;
  readonly sourceFile: string;
  readonly line: number;
}

export declare function parseThemeBlocks(css: string, sourceFile: string): readonly ThemeBlock[];

export declare function compileThemeBlock(block: ThemeBlock, theme: Theme): string;

// ═══════════════════════════════════════════════════════════════════════════════
// § 6. @style CSS TRANSFORM
// ═══════════════════════════════════════════════════════════════════════════════

/** Parsed style directive and its state-layer declarations. */
export interface StyleBlock {
  readonly styleName: string;
  readonly states: Record<string, Record<string, string>>;
  readonly sourceFile: string;
  readonly line: number;
}

export declare function parseStyleBlocks(css: string, sourceFile: string): readonly StyleBlock[];

export declare function compileStyleBlock(block: StyleBlock, style: Style): string;

// ═══════════════════════════════════════════════════════════════════════════════
// § 7. PRIMITIVE RESOLUTION (generic)
// ═══════════════════════════════════════════════════════════════════════════════

export declare function resolvePrimitive<K extends PrimitiveKind>(
  kind: K,
  name: string,
  fromFile: string,
  projectRoot: string,
  userDir?: string,
): Promise<PrimitiveResolution<K> | null>;

/**
 * The convention module paths {@link resolvePrimitive} searches for a
 * primitive kind, in search order — the single source of truth behind the
 * unresolved-primitive warnings and available to custom Vite plugin layers
 * that surface their own resolution diagnostics.
 */
export declare function primitiveSearchPatterns(
  kind: PrimitiveKind,
  fromFile: string,
  projectRoot: string,
  userDir?: string,
): readonly string[];

// ═══════════════════════════════════════════════════════════════════════════════
// § 11. VIRTUAL MODULES
// ═══════════════════════════════════════════════════════════════════════════════

/** Closed virtual-module identifiers served by the Vite plugin. */
export type VirtualModuleId =
  | 'virtual:liteship/tokens'
  | 'virtual:liteship/tokens.css'
  | 'virtual:liteship/boundaries'
  | 'virtual:liteship/themes'
  | 'virtual:liteship/hmr-client'
  | 'virtual:liteship/wasm-url'
  | 'virtual:liteship/config';

/** Boundary threshold-to-asset URL table emitted for host consumption. */
export type BoundaryAssetUrlMap = Readonly<Record<string, Readonly<Record<number, string>>>>;

/** Data projected into LiteShip's generated Vite virtual modules. */
export interface VirtualModuleData {
  readonly boundaries?: BoundaryManifest;
  readonly boundaryAssetUrls?: BoundaryAssetUrlMap;
}

export declare function resolveVirtualId(id: string): string | undefined;
export declare function isVirtualId(id: string): boolean;
export declare function loadVirtualModule(id: string, data?: VirtualModuleData): string | undefined;

// ═══════════════════════════════════════════════════════════════════════════════
// § 11b. BOUNDARY MANIFEST COLLECTION (build-to-edge handoff)
// ═══════════════════════════════════════════════════════════════════════════════

/** Inputs required to assemble a build-time boundary manifest. */
export interface CollectBoundaryManifestOptions {
  readonly boundaryDir?: string;
}

export declare function collectBoundaryManifest(
  projectRoot: string,
  options?: CollectBoundaryManifestOptions,
): Promise<BoundaryManifest>;

export declare function serializeBoundaryOutput(output: CompiledOutputs): string;

// ═══════════════════════════════════════════════════════════════════════════════
// § 12. HMR
// ═══════════════════════════════════════════════════════════════════════════════

/** JSON-safe boundary identity sent by the Vite HMR channel. */
export interface HMRBoundaryIdentity {
  readonly id: ContentAddress;
  readonly input: string;
  readonly thresholds: readonly number[];
  readonly states: readonly [string, ...string[]];
  readonly hysteresis?: number;
  readonly spec?: {
    readonly timeRange?: { readonly from?: number; readonly until?: number };
    readonly experimentId?: string;
  };
}

/** Canonical payload sent when a LiteShip boundary changes during HMR. */
export interface HMRPayload {
  readonly type: 'liteship:update';
  readonly boundaryName: string;
  readonly previousBoundaryId: ContentAddress;
  readonly boundary: HMRBoundaryIdentity;
  readonly manifest: Pick<BoundaryManifestEntry, 'id' | 'outputs' | 'outputsByTier'>;
}

export declare function isHMRPayload(value: unknown): value is HMRPayload;
export declare function handleHMR(input: unknown): number;
