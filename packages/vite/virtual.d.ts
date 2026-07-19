/**
 * Ambient module declarations for `virtual:liteship/*` modules served by the
 * `@liteship/vite` plugin.
 *
 * Reference from an app's env declarations:
 *
 * ```ts
 * /// <reference types="@liteship/vite/virtual" />
 * ```
 */

declare module 'virtual:liteship/boundaries' {
  /**
   * Build-derived boundary manifest: boundary export name to
   * `{ id, outputs, outputsByTier, assetUrls? }` (see
   * `collectBoundaryManifest` in `@liteship/vite` and `BoundaryManifest` in
   * `@liteship/edge`). Empty when the project defines no boundaries.
   */
  export const boundaries: import('@liteship/edge').BoundaryManifest;
}

declare module 'virtual:liteship/tokens' {
  /** Build-collected token definitions (see `collectTokenManifest` in `@liteship/vite`). */
  export const tokens: import('@liteship/vite').TokenManifest;
}

declare module 'virtual:liteship/tokens.css' {
  /** Compiled `:root` custom properties for all collected tokens. */
  const css: string;
  export default css;
}

declare module 'virtual:liteship/themes' {
  /** Build-collected theme definitions (see `collectThemeManifest` in `@liteship/vite`). */
  export const themes: import('@liteship/vite').ThemeManifest;
}

declare module 'virtual:liteship/wasm-url' {
  /** Resolved liteship-compute WASM URL, or `null` when WASM is disabled. */
  export const wasmUrl: string | null;
}

declare module 'virtual:liteship/config' {
  /** Typed handle for the workspace `liteship.config.ts` hub (stub). */
  export const config: unknown;
}
