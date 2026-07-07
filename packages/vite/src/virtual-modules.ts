/**
 * Virtual module resolution and loading for czap design primitives.
 *
 * Handles Vite's `resolveId` and `load` for virtual module specifiers
 * that provide runtime access to token, boundary, and theme
 * definitions.
 *
 * Virtual IDs:
 *
 * - `virtual:czap/tokens` -- JS exports of token definitions (from
 *   `collectTokenManifest`); degrades to an empty-object stub outside the
 *   plugin.
 * - `virtual:czap/tokens.css` -- CSS custom properties compiled from all
 *   collected tokens (`compileCollectedTokensCss`); degrades to `:root {}`
 *   outside the plugin.
 * - `virtual:czap/boundaries` -- the build-derived boundary manifest
 *   (`{ [name]: { id, outputs, outputsByTier } }`); the plugin supplies the
 *   manifest collected by `collectBoundaryManifest`, and the module
 *   degrades to an empty-object stub only when loaded outside the
 *   plugin (e.g. by a bare type-checker pass).
 * - `virtual:czap/themes` -- JS exports of theme definitions (from
 *   `collectThemeManifest`); degrades to an empty-object stub outside the
 *   plugin.
 * - `virtual:czap/hmr-client` -- Client-side HMR handler for
 *   `czap:update` events.
 * - `virtual:czap/wasm-url` -- Resolved WASM runtime URL (or `null`).
 * - `virtual:czap/config` -- Typed handle for the workspace
 *   `czap.config.ts` hub.
 *
 * @module
 */

import type { BoundaryManifest } from '@czap/edge';
import { compileCollectedTokensCss, type ThemeManifest, type TokenManifest } from './token-manifest.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIRTUAL_PREFIX = '\0virtual:czap/';

const VIRTUAL_IDS = [
  'virtual:czap/tokens',
  'virtual:czap/tokens.css',
  'virtual:czap/boundaries',
  'virtual:czap/themes',
  'virtual:czap/hmr-client',
  'virtual:czap/wasm-url',
  'virtual:czap/config',
] as const;

/** Recognised virtual module specifiers. */
export type VirtualModuleId = (typeof VIRTUAL_IDS)[number];

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a virtual module ID to its internal null-byte-prefixed form
 * (as expected by Vite's module graph). Returns `undefined` when `id`
 * is not a recognised czap virtual module.
 */
export function resolveVirtualId(id: string): string | undefined {
  if (VIRTUAL_IDS.includes(id as VirtualModuleId)) {
    return VIRTUAL_PREFIX + id.slice('virtual:czap/'.length);
  }
  return undefined;
}

/**
 * Return `true` when `id` is a fully-resolved czap virtual module
 * (null-byte-prefixed). Callers use this to gate `load` handler
 * dispatch.
 */
export function isVirtualId(id: string): boolean {
  return id.startsWith(VIRTUAL_PREFIX);
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/**
 * Optional dynamic data threaded from the plugin into
 * {@link loadVirtualModule} for virtual modules whose content is derived
 * at build time rather than stubbed.
 */
export interface VirtualModuleData {
  /** Boundary manifest for `virtual:czap/boundaries` (from `collectBoundaryManifest`). */
  readonly boundaries?: BoundaryManifest;
  /** Public asset URLs per boundary output-pool index. */
  readonly boundaryAssetUrls?: BoundaryAssetUrlMap;
  /** Token manifest for `virtual:czap/tokens` and `virtual:czap/tokens.css`. */
  readonly tokens?: TokenManifest;
  /** Theme manifest for `virtual:czap/themes`. */
  readonly themes?: ThemeManifest;
}

/** Public asset URLs keyed by boundary export name and output-pool index. */
export type BoundaryAssetUrlMap = Readonly<Record<string, Readonly<Record<number, string>>>>;

function renderBoundaryManifestModule(boundaries: BoundaryManifest, urls?: BoundaryAssetUrlMap): string {
  if (!urls) {
    return `export const boundaries = ${JSON.stringify(boundaries)};`;
  }

  const withUrls: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(boundaries)) {
    const assetUrls = urls[name];
    withUrls[name] = {
      ...entry,
      ...(assetUrls && Object.keys(assetUrls).length > 0 ? { assetUrls } : {}),
    };
  }

  return `export const boundaries = ${JSON.stringify(withUrls)};`;
}

/**
 * Return the source for a resolved virtual module ID.
 *
 * `virtual:czap/boundaries` exports the build-derived boundary manifest
 * when the plugin passes one via `data.boundaries`; without data it
 * degrades to an empty-object stub (valid JS for type-checkers and
 * bundlers running outside the plugin).
 *
 * Token and theme virtual modules export build-collected definitions when
 * the plugin passes manifest data; without data they degrade to empty stubs
 * (valid for type-checkers and bundlers running outside the plugin).
 *
 * The `hmr-client` module is the client-side HMR handler that the
 * plugin injects into the page via `transformIndexHtml`.
 */
export function loadVirtualModule(id: string, data?: VirtualModuleData): string | undefined {
  if (!id.startsWith(VIRTUAL_PREFIX)) return undefined;

  const name = id.slice(VIRTUAL_PREFIX.length);

  switch (name) {
    case 'tokens':
      return `export const tokens = ${JSON.stringify(data?.tokens ?? {})};`;

    case 'tokens.css':
      return compileCollectedTokensCss(data?.tokens ?? {});

    case 'boundaries':
      return renderBoundaryManifestModule(data?.boundaries ?? {}, data?.boundaryAssetUrls);

    case 'themes':
      return `export const themes = ${JSON.stringify(data?.themes ?? {})};`;

    case 'hmr-client':
      return HMR_CLIENT_SOURCE;

    case 'wasm-url':
      return 'export const wasmUrl = null;';

    case 'config':
      return [
        '/** czap/config virtual module -- typed stub served by czap/vite */',
        '/** Full config is available via czap.config.ts at the workspace root */',
        'export const config = null;',
      ].join('\n');

    default:
      return undefined;
  }
}

/**
 * Client-side HMR handler injected via virtual module.
 * Listens for czap:update events on import.meta.hot and applies
 * CSS or shader uniform updates surgically without full reload.
 */
const HMR_CLIENT_SOURCE = `
import { dispatchCzapEvent } from '@czap/web';

if (import.meta.hot) {
  import.meta.hot.on('czap:update', (payload) => {
    if (typeof document === 'undefined') return;
    if (payload.css !== undefined) {
      const sel = 'style[data-czap-boundary="' + payload.boundary + '"]';
      let el = document.querySelector(sel);
      if (!el) {
        el = document.createElement('style');
        el.setAttribute('data-czap-boundary', payload.boundary);
        document.head.appendChild(el);
      }
      el.textContent = payload.css;
    }
    if (payload.uniforms !== undefined) {
      dispatchCzapEvent(document, 'czap:uniform-update', { glsl: payload.uniforms });
      document.querySelectorAll('canvas[data-czap-boundary="' + payload.boundary + '"]').forEach((canvas) => {
        const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
        if (!gl) return;
        const program = canvas.__czapProgram;
        if (!program) return;
        Object.entries(payload.uniforms).forEach(([name, value]) => {
          const loc = gl.getUniformLocation(program, name);
          if (loc !== null) gl.uniform1f(loc, value);
        });
      });
    }
  });
}
`.trim();
