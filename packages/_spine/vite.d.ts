/**
 * @czap/vite type spine -- Vite 8 plugin for @token, @theme, @style, @quantize processing + HMR.
 */

import type { Boundary } from './core.d.ts';
import type { Token, Theme, Style } from './design.d.ts';
import type { BoundaryManifest } from './edge.d.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// § 0. PRIMITIVE KIND
// ═══════════════════════════════════════════════════════════════════════════════

export type PrimitiveKind = 'boundary' | 'token' | 'theme' | 'style';

export type PrimitiveShape<K extends PrimitiveKind> =
  K extends 'boundary' ? Boundary.Shape :
  K extends 'token' ? Token.Shape :
  K extends 'theme' ? Theme.Shape :
  Style.Shape;

export interface PrimitiveResolution<K extends PrimitiveKind> {
  readonly primitive: PrimitiveShape<K>;
  readonly source: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. PLUGIN CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export interface PluginConfig {
  readonly dirs?: Partial<Record<PrimitiveKind, string>>;
  readonly hmr?: boolean;
  readonly environments?: readonly ('browser' | 'server' | 'shader')[];
  readonly wasm?: { readonly enabled?: boolean; readonly path?: string };
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. PLUGIN ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

export declare function plugin(config?: PluginConfig): import('vite').Plugin;

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. @quantize CSS TRANSFORM
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuantizeNestedRule {
  readonly selector: string;
  readonly props: Record<string, string>;
}

export interface QuantizeStateBody {
  readonly bareProps: Record<string, string>;
  readonly rules: readonly QuantizeNestedRule[];
}

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
 * emit a single `:root` rule via {@link viewportContainmentRule}
 * (`container-name` is a replaced property -- per-block rules would
 * overwrite each other).
 */
export interface QuantizeSheetContext {
  readonly viewportContainerNames: Set<string>;
}

export declare function compileQuantizeBlock(
  block: QuantizeBlock,
  boundary: Boundary.Shape,
  sheet?: QuantizeSheetContext,
): string;

export declare function viewportContainmentRule(names: Iterable<string>): string | null;

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. @token CSS TRANSFORM
// ═══════════════════════════════════════════════════════════════════════════════

export interface TokenBlock {
  readonly tokenName: string;
  readonly declarations: Record<string, string>;
  readonly sourceFile: string;
  readonly line: number;
}

export declare function parseTokenBlocks(css: string, sourceFile: string): readonly TokenBlock[];

export declare function compileTokenBlock(block: TokenBlock, token: Token.Shape): string;

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. @theme CSS TRANSFORM
// ═══════════════════════════════════════════════════════════════════════════════

export interface ThemeBlock {
  readonly themeName: string;
  readonly declarations: Record<string, string>;
  readonly sourceFile: string;
  readonly line: number;
}

export declare function parseThemeBlocks(css: string, sourceFile: string): readonly ThemeBlock[];

export declare function compileThemeBlock(block: ThemeBlock, theme: Theme.Shape): string;

// ═══════════════════════════════════════════════════════════════════════════════
// § 6. @style CSS TRANSFORM
// ═══════════════════════════════════════════════════════════════════════════════

export interface StyleBlock {
  readonly styleName: string;
  readonly states: Record<string, Record<string, string>>;
  readonly sourceFile: string;
  readonly line: number;
}

export declare function parseStyleBlocks(css: string, sourceFile: string): readonly StyleBlock[];

export declare function compileStyleBlock(block: StyleBlock, style: Style.Shape): string;

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

export type VirtualModuleId =
  | 'virtual:czap/tokens'
  | 'virtual:czap/tokens.css'
  | 'virtual:czap/boundaries'
  | 'virtual:czap/themes'
  | 'virtual:czap/config';

export interface VirtualModuleData {
  readonly boundaries?: BoundaryManifest;
}

export declare function resolveVirtualId(id: string): string | undefined;
export declare function isVirtualId(id: string): boolean;
export declare function loadVirtualModule(id: string, data?: VirtualModuleData): string | undefined;

// ═══════════════════════════════════════════════════════════════════════════════
// § 11b. BOUNDARY MANIFEST COLLECTION (build-to-edge handoff)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CollectBoundaryManifestOptions {
  readonly boundaryDir?: string;
}

export declare function collectBoundaryManifest(
  projectRoot: string,
  options?: CollectBoundaryManifestOptions,
): Promise<BoundaryManifest>;

// ═══════════════════════════════════════════════════════════════════════════════
// § 12. HMR
// ═══════════════════════════════════════════════════════════════════════════════

export interface HMRPayload {
  readonly type: 'czap:update';
  readonly boundary: string;
  readonly css?: string;
  readonly uniforms?: Record<string, number>;
}

export declare function handleHMR(payload: HMRPayload): void;
