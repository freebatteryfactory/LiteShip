/**
 * @liteship config type spine -- Config and defineConfig() contract.
 */

import type { ContentAddress, Boundary } from './core.js';
import type { Token, Theme, Style } from './design.js';

type ReadonlyConfigValue<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends string | number | boolean | bigint | symbol | null | undefined
    ? T
    : T extends readonly unknown[]
      ? { readonly [K in keyof T]: ReadonlyConfigValue<T[K]> }
      : T extends object
        ? { readonly [K in keyof T]: ReadonlyConfigValue<T[K]> }
        : T;

export interface Config {
  readonly _tag: 'ConfigDef';
  readonly id: ContentAddress;
  readonly boundaries: ReadonlyConfigValue<Record<string, Boundary>>;
  readonly tokens: ReadonlyConfigValue<Record<string, Token>>;
  readonly themes: ReadonlyConfigValue<Record<string, Theme>>;
  readonly styles: ReadonlyConfigValue<Record<string, Style>>;
  readonly vite?: ReadonlyConfigValue<NonNullable<ConfigInput['vite']>>;
  readonly astro?: ReadonlyConfigValue<NonNullable<ConfigInput['astro']>>;
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
