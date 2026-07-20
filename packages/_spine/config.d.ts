/**
 * @liteship config type spine -- Config and defineConfig() contract.
 */

import type { ContentAddress, Boundary } from './core.d.ts';
import type { Token, Theme, Style } from './design.d.ts';

export interface Config {
  readonly _tag: 'ConfigDef';
  readonly id: ContentAddress;
  readonly boundaries: Record<string, Boundary>;
  readonly tokens: Record<string, Token>;
  readonly themes: Record<string, Theme>;
  readonly styles: Record<string, Style>;
  readonly vite?: ConfigInput['vite'];
  readonly astro?: ConfigInput['astro'];
}

/** User-facing input — no id, no _tag */
export interface ConfigInput {
  readonly boundaries?: Record<string, Boundary>;
  readonly tokens?: Record<string, Token>;
  readonly themes?: Record<string, Theme>;
  readonly styles?: Record<string, Style>;
  readonly vite?: {
    readonly dirs?: Partial<Record<'boundary' | 'token' | 'theme' | 'style', string>>;
    readonly hmr?: boolean;
    readonly environments?: readonly ('browser' | 'server' | 'shader')[];
    readonly wasm?: boolean | { readonly enabled?: boolean; readonly path?: string };
  };
  readonly astro?: {
    readonly adaptive?: boolean;
    readonly edgeRuntime?: boolean;
  };
}

/** Ergonomic alias for liteship.config.ts usage at the workspace root */
export declare function defineConfig(input: ConfigInput): Config;
