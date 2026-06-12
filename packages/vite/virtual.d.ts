/**
 * Ambient module declarations for `virtual:czap/*` modules served by the
 * `@czap/vite` plugin.
 *
 * Reference from an app's env declarations:
 *
 * ```ts
 * /// <reference types="@czap/vite/virtual" />
 * ```
 */

declare module 'virtual:czap/boundaries' {
  /**
   * Build-derived boundary manifest: boundary export name to
   * `{ id, outputs, outputsByTier }` (see `collectBoundaryManifest` in
   * `@czap/vite` and `BoundaryManifest` in `@czap/edge`). Empty when the
   * project defines no boundaries.
   */
  export const boundaries: import('@czap/edge').BoundaryManifest;
}

declare module 'virtual:czap/tokens' {
  /** Token definitions stub (real content flows through the CSS transform). */
  export const tokens: Readonly<Record<string, unknown>>;
}

declare module 'virtual:czap/themes' {
  /** Theme definitions stub (real content flows through the CSS transform). */
  export const themes: Readonly<Record<string, unknown>>;
}

declare module 'virtual:czap/wasm-url' {
  /** Resolved czap-compute WASM URL, or `null` when WASM is disabled. */
  export const wasmUrl: string | null;
}

declare module 'virtual:czap/config' {
  /** Typed handle for the workspace `czap.config.ts` hub (stub). */
  export const config: unknown;
}
