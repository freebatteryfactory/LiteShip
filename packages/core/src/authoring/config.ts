/**
 * Config -- unified project configuration hub.
 *
 * defineConfig() produces a frozen, FNV-1a content-addressed Config.
 * Projection functions are pure — no side effects, no I/O.
 */

import type { ContentAddress } from '../schema/brands.js';
import type { Boundary } from './boundary.js';
import type { Token } from './token.js';
import type { Theme } from './theme.js';
import type { Style } from './style.js';
import { fnv1aBytes } from '../internal/fnv.js';
import { CanonicalCbor } from '../schema/cbor.js';
import { normalizeRepoPath } from '../internal/path-normalize.js';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

/** Top-level discriminator for liteship primitives: which bucket a declaration belongs to. */
export type PrimitiveKind = 'boundary' | 'token' | 'theme' | 'style';

/**
 * Vite-plugin slice of a liteship {@link Config}: source directories per
 * primitive kind, HMR opt-in, environment targeting, and optional WASM hints.
 */
export interface PluginConfig {
  readonly dirs?: Partial<Record<PrimitiveKind, string>>;
  readonly hmr?: boolean;
  readonly environments?: readonly ('browser' | 'server' | 'shader')[];
  readonly wasm?: boolean | { readonly enabled?: boolean; readonly path?: string };
}

/** Astro-integration slice of a liteship {@link Config}. */
export interface AstroConfig {
  readonly adaptive?: boolean;
  readonly edgeRuntime?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config namespace + value object (declaration merging — same pattern as Boundary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Config namespace — the single hub that every liteship adapter (Vite, Astro, test
 * runners, edge runtime) projects from. Construction lives in the standalone
 * {@link defineConfig}, which produces a frozen, FNV-1a content-addressed
 * {@link Config}; every projection function here (`toViteConfig`, `toAstroConfig`,
 * `toTestAliases`) is pure.
 */
export const Config = {
  /** Project the Vite-plugin slice of a config for `@liteship/vite`. */
  toViteConfig(cfg: Config): PluginConfig {
    return {
      ...(cfg.vite?.dirs !== undefined && { dirs: cfg.vite.dirs }),
      ...(cfg.vite?.hmr !== undefined && { hmr: cfg.vite.hmr }),
      ...(cfg.vite?.environments !== undefined && { environments: cfg.vite.environments }),
      ...(cfg.vite?.wasm !== undefined && { wasm: cfg.vite.wasm }),
    };
  },

  /** Project the Astro-integration slice of a config for `@liteship/astro`. */
  toAstroConfig(cfg: Config): AstroConfig {
    return {
      ...(cfg.astro?.adaptive !== undefined && { adaptive: cfg.astro.adaptive }),
      ...(cfg.astro?.edgeRuntime !== undefined && { edgeRuntime: cfg.astro.edgeRuntime }),
    };
  },

  /** Materialize the `@liteship/*` → source-path alias map used by the vitest runner. */
  toTestAliases(cfg: Config, repoRoot: string): Record<string, string> {
    void cfg; // cfg reserved for future per-project customisation
    const r = (sub: string) => `${normalizeRepoPath(repoRoot)}/${sub}`;
    // NOTE: longer prefixes MUST come before shorter ones — vitest's alias
    // resolver matches the first prefix in iteration order, so e.g.
    // `@liteship/core/testing` would be intercepted by `@liteship/core` if listed first.
    return {
      '@liteship/canonical': r('packages/canonical/src/index.ts'),
      '@liteship/genui': r('packages/genui/src/index.ts'),
      '@liteship/core/testing': r('packages/core/src/testing.ts'),
      '@liteship/core/harness': r('packages/core/src/harness/index.ts'),
      '@liteship/core/simulation': r('packages/core/src/simulation/index.ts'),
      '@liteship/core/fs-walk': r('packages/core/src/fs-walk.ts'),
      '@liteship/core': r('packages/core/src/index.ts'),
      '@liteship/quantizer/testing': r('packages/quantizer/src/testing.ts'),
      '@liteship/quantizer': r('packages/quantizer/src/index.ts'),
      '@liteship/compiler': r('packages/compiler/src/index.ts'),
      '@liteship/web/lite': r('packages/web/src/lite.ts'),
      '@liteship/web': r('packages/web/src/index.ts'),
      '@liteship/detect': r('packages/detect/src/index.ts'),
      '@liteship/vite/html-transform': r('packages/vite/src/html-transform.ts'),
      '@liteship/vite': r('packages/vite/src/index.ts'),
      '@liteship/astro/runtime': r('packages/astro/src/runtime/index.ts'),
      '@liteship/astro': r('packages/astro/src/index.ts'),
      '@liteship/stage/ffmpeg': r('packages/stage/src/ffmpeg.ts'),
      '@liteship/stage': r('packages/stage/src/index.ts'),
      '@liteship/remotion': r('packages/remotion/src/index.ts'),
      '@liteship/scene/dev': r('packages/scene/src/dev/server.ts'),
      '@liteship/scene': r('packages/scene/src/index.ts'),
      '@liteship/assets': r('packages/assets/src/index.ts'),
      '@liteship/audit': r('packages/audit/src/index.ts'),
      '@liteship/cli': r('packages/cli/src/index.ts'),
      '@liteship/mcp-server': r('packages/mcp-server/src/index.ts'),
      '@liteship/edge': r('packages/edge/src/index.ts'),
      '@liteship/cloudflare/testing': r('packages/cloudflare/src/testing.ts'),
      '@liteship/cloudflare': r('packages/cloudflare/src/index.ts'),
      '@liteship/worker': r('packages/worker/src/index.ts'),
      '@liteship/_spine': r('packages/_spine'),
    };
  },
};

/** Frozen, content-addressed result of {@link defineConfig}. */
export interface Config {
  readonly _tag: 'ConfigDef';
  readonly id: ContentAddress;
  readonly boundaries: Record<string, Boundary>;
  readonly tokens: Record<string, Token>;
  readonly themes: Record<string, Theme>;
  readonly styles: Record<string, Style>;
  readonly vite?: Partial<PluginConfig>;
  readonly astro?: Partial<AstroConfig>;
}

/** Raw user-facing input to {@link defineConfig} — every field is optional. */
export interface ConfigInput {
  readonly boundaries?: Record<string, Boundary>;
  readonly tokens?: Record<string, Token>;
  readonly themes?: Record<string, Theme>;
  readonly styles?: Record<string, Style>;
  readonly vite?: Partial<PluginConfig>;
  readonly astro?: Partial<AstroConfig>;
}

/**
 * Define a liteship {@link Config} — the single project-configuration hub every
 * adapter (Vite, Astro, test runners, edge runtime) projects from. Produces a
 * frozen, FNV-1a content-addressed value from raw {@link ConfigInput}.
 */
export function defineConfig(input: ConfigInput): Config {
  // CUT B5a — mint the internal identity through the CanonicalCbor doctrine
  // (RFC 8949 §4.2.1, recursive key sort, always-float64), the same path as
  // every other `fnv1a:` content address. This replaces the old top-level-only
  // `JSON.stringify` sort, which left nested non-`id` fields insertion-order
  // dependent. CanonicalCbor sorts keys recursively, so no manual sort is needed.
  const id = fnv1aBytes(
    CanonicalCbor.encode({
      boundaries: input.boundaries ?? {},
      tokens: input.tokens ?? {},
      themes: input.themes ?? {},
      styles: input.styles ?? {},
      vite: input.vite,
      astro: input.astro,
    }),
  );
  return Object.freeze({
    _tag: 'ConfigDef' as const,
    id,
    boundaries: input.boundaries ?? {},
    tokens: input.tokens ?? {},
    themes: input.themes ?? {},
    styles: input.styles ?? {},
    vite: input.vite,
    astro: input.astro,
  });
}
