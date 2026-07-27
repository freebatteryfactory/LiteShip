/**
 * Explicit resolution-cache state for the liteship Vite plugin's transform
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

import type { Boundary, Token, Theme, Style } from '@liteship/core';
import type { BoundaryManifest } from '@liteship/edge';
import type { collectTokenManifest, collectThemeManifest } from './token-manifest.js';

/** Lazily-collected token/theme manifest backing `virtual:liteship/tokens(.css)` + `themes`. */
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
  readonly boundary: Map<string, Boundary | null>;
  readonly token: Map<string, Token | null>;
  readonly theme: Map<string, Theme | null>;
  readonly style: Map<string, Style | null>;
  /** Resolved convention-file path per cache key (`${name}:${id}`). */
  readonly source: Map<string, string>;
  /** Lazily-collected boundary manifest backing `virtual:liteship/boundaries`. */
  readonly boundaryManifest: { value: Promise<BoundaryManifest> | null };
  /** Lazily-collected token/theme manifest backing the design virtual modules. */
  readonly tokenThemeManifest: { value: Promise<TokenThemeManifest> | null };
  /**
   * Complete compiled \@quantize CSS per module id (#114 shadowing
   * diagnostic). One entry contains every block emitted by that module, so a
   * re-transform atomically replaces the prior evidence instead of retaining
   * historical output or collapsing repeated boundary names.
   */
  readonly lastCompiledBoundaryCss: Map<string, string>;
  /**
   * Latest non-quantize CSS per module id for the boundary-shadow diagnostic.
   * Keeping one bounded entry per module makes the diagnostic independent of
   * Vite transform order: a foreign sheet transformed before its boundary
   * sheet is checked when the boundary output becomes available, while the
   * opposite order is checked when the foreign sheet arrives.
   */
  readonly lastForeignCss: Map<string, string>;
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
    lastCompiledBoundaryCss: new Map(),
    lastForeignCss: new Map(),
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
  cache.lastCompiledBoundaryCss.clear();
  cache.lastForeignCss.clear();
}

function physicalModuleId(id: string): string {
  return id.replace(/[?#].*$/s, '');
}

/**
 * Remove shadow-diagnostic evidence for a deleted/renamed physical module,
 * including every query-bearing Vite module id for that file.
 */
export function purgeModuleEvidence(cache: PrimitiveResolutionCache, file: string): void {
  const physicalFile = physicalModuleId(file);
  for (const evidence of [cache.lastCompiledBoundaryCss, cache.lastForeignCss]) {
    for (const id of evidence.keys()) {
      if (physicalModuleId(id) === physicalFile) evidence.delete(id);
    }
  }
}
