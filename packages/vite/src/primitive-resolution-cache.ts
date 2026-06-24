/**
 * Explicit resolution-cache state for the czap Vite plugin's transform
 * pipeline.
 *
 * The CSS `transform` hook resolves `@token` / `@theme` / `@style` /
 * `@quantize` references to their convention-file definitions, and the
 * `hotUpdate` + virtual-module hooks share the same memoised results. This
 * module lifts those caches out of the `plugin()` closure into one explicit
 * {@link PrimitiveResolutionCache} record threaded through the standalone
 * hook functions, so each hook is a pure function over an explicit state
 * argument rather than a closure over hidden `let`s/`const`s — testable in
 * isolation.
 *
 * Composition over inheritance: a record plus standalone accessor/transition
 * functions, no classes.
 *
 * Two distinct cache families live here:
 *
 * - **Definition caches** (`boundary`/`token`/`theme`/`style`): a resolved
 *   primitive shape (or `null` for "resolution exhausted") per `${name}:${id}`
 *   key, to avoid re-importing definition modules on every transform.
 * - **Source-path cache**: the absolute convention-file path a key resolved
 *   from, re-`addWatchFile`d on every transform so editing a definition file
 *   (which lives OUTSIDE the importing CSS/.astro module graph) re-runs the
 *   transform instead of serving stale output.
 *
 * Plus two lazily-collected manifest promises backing the virtual modules.
 *
 * @module
 */

import type { Boundary, Token, Theme, Style } from '@czap/core';
import type { BoundaryManifest } from '@czap/edge';
import type { collectTokenManifest, collectThemeManifest } from './token-manifest.js';

/** Lazily-collected token/theme manifest backing `virtual:czap/tokens(.css)` + `themes`. */
export interface TokenThemeManifest {
  readonly tokens: Awaited<ReturnType<typeof collectTokenManifest>>;
  readonly themes: Awaited<ReturnType<typeof collectThemeManifest>>;
}

/**
 * Mutable resolution-cache state for one plugin instance. Built once per
 * `plugin()` call by {@link createPrimitiveResolutionCache} and threaded
 * (by reference) into the standalone hook functions, which read and mutate
 * it through the accessor/transition functions below.
 *
 * The `Map`s and the manifest-promise slots are intentionally mutable: a
 * Rollup/Vite plugin is a long-lived per-build object and the dev server's
 * `hotUpdate` clears these in place on a definition-file change. Holding the
 * promise slots in a single-field wrapper (`boundaryManifest.value`) lets the
 * standalone functions reassign them without losing the by-reference handle.
 */
export interface PrimitiveResolutionCache {
  readonly boundary: Map<string, Boundary.Shape | null>;
  readonly token: Map<string, Token.Shape | null>;
  readonly theme: Map<string, Theme.Shape | null>;
  readonly style: Map<string, Style.Shape | null>;
  /** Resolved convention-file path per cache key (`${name}:${id}`). */
  readonly source: Map<string, string>;
  /** Lazily-collected boundary manifest backing `virtual:czap/boundaries`. */
  readonly boundaryManifest: { value: Promise<BoundaryManifest> | null };
  /** Lazily-collected token/theme manifest backing the design virtual modules. */
  readonly tokenThemeManifest: { value: Promise<TokenThemeManifest> | null };
}

/** Build a fresh, empty {@link PrimitiveResolutionCache} for one plugin instance. */
export function createPrimitiveResolutionCache(): PrimitiveResolutionCache {
  return {
    boundary: new Map(),
    token: new Map(),
    theme: new Map(),
    style: new Map(),
    source: new Map(),
    boundaryManifest: { value: null },
    tokenThemeManifest: { value: null },
  };
}

/**
 * Drop every cached resolution and both manifest promises. Called from
 * `hotUpdate` when a definition file changes: definitions may cross-reference,
 * so a single edit invalidates the whole resolution set, and the manifests
 * are re-collected lazily on next access.
 */
export function invalidateAllPrimitives(cache: PrimitiveResolutionCache): void {
  cache.boundary.clear();
  cache.token.clear();
  cache.theme.clear();
  cache.style.clear();
  cache.source.clear();
  cache.boundaryManifest.value = null;
  cache.tokenThemeManifest.value = null;
}
