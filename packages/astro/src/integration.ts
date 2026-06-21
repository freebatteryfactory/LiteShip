/**
 * Astro 6 `AstroIntegration` for czap.
 *
 * Registers the `@czap/vite` plugin, injects the detect/boot scripts,
 * registers every client directive (`client:satellite`,
 * `client:stream`, `client:llm`, `client:worker`, `client:gpu`,
 * `client:wasm`) that the host opts into, and (in `astro dev`) registers
 * the boundary inspector as a dev-toolbar app.
 *
 * @module
 */

import { writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import type { BoundaryManifestFile } from '@czap/edge';
import { collectBoundaryManifest, plugin } from '@czap/vite';
import type { PluginConfig } from '@czap/vite';
import { DETECT_UPGRADE_SCRIPT } from './detect-upgrade.js';
import { DETECT_INLINE_SCRIPT } from './detect-provisional.js';
import { getCzapHeaderEntries } from './headers.js';
import type { CrossOriginEmbedderPolicy } from './headers.js';
import type { RuntimeEndpointPolicy } from '@czap/web';
import type { DirectiveName } from './runtime/directive-boot.js';
import { publishIntegrationToggles, resolveIntegrationToggles } from './integration-toggles.js';
import {
  normalizeRuntimeSecurityPolicy,
  type RuntimeHtmlPolicy,
  type RuntimeSecurityPolicy,
} from './runtime/policy.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options passed to {@link integration} from `astro.config.mjs`. Every
 * field is optional; omitted features fall back to conservative
 * defaults (detect enabled, stream/llm/gpu enabled, workers/wasm
 * opt-in).
 */
export interface IntegrationConfig {
  /** Overrides passed through to `@czap/vite`'s plugin. */
  readonly vite?: PluginConfig;
  /**
   * Route globs on which czap's costly runtime scripts (detect, the GPU probe,
   * wasm, the dev inspector) should NOT run. For embedding czap alongside another
   * Astro sub-app (e.g. a Starlight `/docs/**` section) that never consumes czap,
   * so those pages don't pay for a pointless GPU probe or attr writes. Astro's
   * `injectScript` is global (no build-time route filter), so this is a runtime
   * guard: a tiny inline script matches `location.pathname` and short-circuits
   * the rest (re-evaluating on View-Transition swaps). The directive bootstrap
   * stays wired — it's a no-op without czap markers, and keeps View Transitions
   * working across the boundary. Supports exact paths and a trailing `**` (e.g.
   * `'/docs/**'` matches `/docs` and everything under it). Default `[]` (czap
   * runs everywhere).
   */
  readonly exclude?: readonly string[];
  /** Enable the inline detect script (default `true`). */
  readonly detect?: boolean;
  /**
   * @deprecated No-op. Server Islands is stable in Astro (since v5); there is
   * no experimental flag to toggle on Astro 6. Using `server:defer` with a
   * configured adapter is all that's needed — czap does nothing here. This
   * option is retained only so existing configs keep type-checking; it will
   * be removed in a future major.
   */
  readonly serverIslands?: boolean;
  /** WASM runtime configuration. */
  readonly wasm?: { readonly enabled?: boolean; readonly path?: string };
  /** GPU runtime configuration. */
  readonly gpu?: { readonly enabled?: boolean; readonly preferWebGPU?: boolean };
  /**
   * Off-thread worker runtime configuration. `coep` selects the
   * Cross-Origin-Embedder-Policy value emitted with COOP (default
   * `'require-corp'`); `'credentialless'` keeps cross-origin isolation
   * while tolerating CORP-less third-party assets.
   */
  readonly workers?: { readonly enabled?: boolean; readonly coep?: CrossOriginEmbedderPolicy };
  /** SSE streaming runtime configuration. */
  readonly stream?: { readonly enabled?: boolean };
  /** LLM streaming runtime configuration. */
  readonly llm?: { readonly enabled?: boolean };
  /**
   * Dev-only boundary inspector (default enabled in `astro dev`). Registered
   * as an Astro dev-toolbar app — toggle it from the toolbar icon. Pass
   * `false` to skip registering the toolbar app.
   */
  readonly inspector?: boolean;
  /**
   * Opt in (`true`) to auto-register a zero-config capability-detection
   * middleware, so a consumer needs no `src/middleware.ts` for the common case;
   * it populates `Astro.locals.czap` from Client Hints. The edge boundary cache
   * (whose `theme`/`compile` carry functions) always needs a consumer
   * `src/middleware.ts` calling `czapMiddleware({ edge })`; when both are present
   * this auto entry runs first (`order: 'pre'`) and the consumer middleware
   * refines the same locals. Default off (wire middleware yourself).
   */
  readonly middleware?: boolean;
  /** Security policies applied to runtime fetch/HTML boundaries. */
  readonly security?: {
    readonly endpointPolicy?: RuntimeEndpointPolicy;
    readonly htmlPolicy?: RuntimeHtmlPolicy;
  };
}

// ---------------------------------------------------------------------------
// Route scope guard
// ---------------------------------------------------------------------------

/**
 * Build the head-inline guard that disables czap's runtime scripts on excluded
 * routes. Injected FIRST (before the detect inline script and ahead of every
 * `page` module), so `window.__CZAP_OFF__` is set before anything reads it. Each
 * czap script early-returns when the flag is set; when no routes are excluded
 * the guard is not injected at all and the flag stays undefined (falsy), so the
 * scripts run as before. Matching: exact pathname, or a trailing `**` glob
 * (`/docs/**` matches `/docs` and `/docs/...`). Patterns are JSON-embedded.
 */
function scopeGuardScript(exclude: readonly string[]): string {
  return `
(function(){
  var patterns = ${JSON.stringify(exclude)};
  function evaluate() {
    try {
      var path = location.pathname;
      var off = false;
      for (var i = 0; i < patterns.length; i++) {
        var p = patterns[i];
        // Trailing ** only (the documented semantics); anything else is exact.
        if (p.slice(-2) === '**') {
          var prefix = p.slice(0, -2);
          var bare = prefix.replace(/\\/$/, '');
          if (path === bare || path.indexOf(prefix) === 0) { off = true; break; }
        } else if (path === p) { off = true; break; }
      }
      // Always assign (not just when matched) so the flag is never sticky: a
      // same-document navigation (Astro View Transitions) from an excluded path
      // to an included one must re-enable czap.
      window.__CZAP_OFF__ = off;
    } catch(e) {}
  }
  evaluate();
  try { document.addEventListener('astro:after-swap', evaluate); } catch(e) {}
})();
`.trim();
}

// ---------------------------------------------------------------------------
// Detect Script
// ---------------------------------------------------------------------------
//
// The provisional head-inline detect script (`DETECT_INLINE_SCRIPT`) is
// GENERATED from canonical `@czap/detect` in `./detect-provisional.js` — it
// emits the same `headProbeCapTier` cap-tier ladder the deferred GPU-probe
// upgrade uses, so the provisional `data-czap-tier` can never be a divergent
// hand-copy (the 0.2.3/0.3.0 detect-ladder drift bug-class). The hand-rolled
// inline ladder that used to live here was the last surviving copy; it is gone.

function serializeInlineRuntimePolicy(policy: RuntimeSecurityPolicy): string {
  return JSON.stringify(policy).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function runtimeBootstrapScript(policy: RuntimeSecurityPolicy, directives: readonly DirectiveName[]): string {
  // NOT gated on __CZAP_OFF__: the directive bootstrap is idempotent and a cheap
  // no-op on a page with no czap markers (an excluded Starlight route), and its
  // astro:after-swap scan listener MUST stay wired so a View Transition from an
  // excluded landing to an included route still binds directives. The real
  // exclusion savings (the GPU probe, detect, wasm, inspector) are guarded at
  // their own scripts; this machinery is invisible where nothing uses it.
  return `
import { bootstrapSlots, bootstrapDirectives, configureRuntimePolicy, installSwapReinit } from '@czap/astro/runtime';

configureRuntimePolicy(${serializeInlineRuntimePolicy(policy)});
bootstrapSlots();
bootstrapDirectives(${JSON.stringify(directives)});
installSwapReinit();
`.trim();
}

// When wasm is enabled, advertise the resolved URL AND eagerly load the kernel
// at the document level. configureWasmRuntime only sets data-czap-wasm-url —
// the actual load lives in loadWasmRuntime, which otherwise fires only via a
// per-element `client:wasm` directive. Without this auto-load, enabling wasm in
// config silently no-ops (URL set, kernel never loaded, czap:wasm-ready never
// fires) unless the page happens to carry a wasm directive element — a dogfood
// sharp edge. `boot` also runs on `astro:after-swap` (registered unconditionally)
// so a View Transition from an excluded landing to an included route still loads
// the kernel — page-module scripts don't re-execute on swap. WASMDispatch.load is
// idempotent after completion, so the repeat is free.
const WASM_RUNTIME_SCRIPT = `
import { wasmUrl } from 'virtual:czap/wasm-url';
import { configureWasmRuntime, loadWasmRuntime } from '@czap/astro/runtime';

function boot() {
  if (window.__CZAP_OFF__ || !wasmUrl) return;
  configureWasmRuntime(wasmUrl);
  void loadWasmRuntime(document.documentElement);
}
boot();
document.addEventListener('astro:after-swap', boot);
`.trim();

// Inline SVG for the dev-toolbar inspector icon (a boundary/threshold glyph).
// Astro's `addDevToolbarApp` accepts an inline SVG string for `icon`.
const INSPECTOR_TOOLBAR_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>' +
  '<line x1="15" y1="3" x2="15" y2="21"/></svg>';

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

/**
 * Build the czap `AstroIntegration`.
 *
 * Plug the returned object into `astro.config.mjs`'s `integrations`
 * array. The integration wires Astro's `astro:config:setup`,
 * `astro:config:done`, `astro:server:setup`, and `astro:build:done`
 * hooks.
 *
 * @example
 * ```ts
 * // astro.config.mjs
 * import { integration as czap } from '@czap/astro';
 *
 * const config = defineConfig({
 *   integrations: [czap({ detect: true, workers: { enabled: true } })],
 * });
 * ```
 */
export function integration(config?: IntegrationConfig): AstroIntegration {
  const runtimeToggles = resolveIntegrationToggles(config);
  publishIntegrationToggles(runtimeToggles);
  const detectEnabled = runtimeToggles.detectEnabled;
  const workersEnabled = runtimeToggles.workersEnabled;
  const coep = runtimeToggles.coep;
  const gpuEnabled = config?.gpu?.enabled !== false;
  const streamEnabled = config?.stream?.enabled !== false;
  const llmEnabled = config?.llm?.enabled !== false;
  const wasmEnabled = config?.wasm?.enabled === true;
  const inspectorEnabled = config?.inspector !== false;
  const excludeRoutes = (config?.exclude ?? []).filter((route): route is string => typeof route === 'string');
  const runtimePolicy = normalizeRuntimeSecurityPolicy({
    endpointPolicy: config?.security?.endpointPolicy,
    htmlPolicy: config?.security?.htmlPolicy,
  });
  // Mirrors the addClientDirective registrations below exactly; the boot
  // scanner activates the same set on plain elements / .astro output.
  const enabledDirectives: readonly DirectiveName[] = [
    'satellite',
    // `graph` is the DocumentGraph-loader counterpart of `satellite`: an
    // always-on runtime primitive (no escalation tier / config gate), so it
    // activates wherever a `data-czap-graph` payload is present.
    'graph',
    ...(streamEnabled ? (['stream'] as const) : []),
    ...(llmEnabled ? (['llm'] as const) : []),
    ...(workersEnabled ? (['worker'] as const) : []),
    ...(gpuEnabled ? (['gpu'] as const) : []),
    ...(wasmEnabled ? (['wasm'] as const) : []),
    'svg',
  ];

  let projectRoot: string | null = null;

  return {
    name: '@czap/astro',

    hooks: {
      'astro:config:setup': ({
        updateConfig,
        addClientDirective,
        addDevToolbarApp,
        addMiddleware,
        injectScript,
        logger,
        command,
      }) => {
        type AstroViteConfig = Parameters<typeof updateConfig>[0]['vite'];
        logger.info('Setting up @czap integration');

        // Astro may carry a different Vite type graph than @czap/vite. The plugin
        // runtime contract is still compatible, so the host integration owns the
        // version bridge here instead of leaking duplicate plugin shapes downstream.
        const astroViteConfig = {
          plugins: [
            plugin({
              ...(config?.vite ?? {}),
              ...(wasmEnabled ? { wasm: { enabled: true, path: config?.wasm?.path } } : {}),
            }),
          ],
        } as AstroViteConfig;

        updateConfig({
          vite: astroViteConfig,
        });

        // Register client directives
        addClientDirective({
          name: 'satellite',
          entrypoint: '@czap/astro/client-directives/satellite',
        });
        logger.info('Registered satellite client directive');

        // `graph` — the DocumentGraph-loader primitive, always-on like satellite.
        addClientDirective({
          name: 'graph',
          entrypoint: '@czap/astro/client-directives/graph',
        });
        logger.info('Registered graph client directive');

        if (streamEnabled) {
          addClientDirective({
            name: 'stream',
            entrypoint: '@czap/astro/client-directives/stream',
          });
          logger.info('Registered stream client directive');
        }

        if (llmEnabled) {
          addClientDirective({
            name: 'llm',
            entrypoint: '@czap/astro/client-directives/llm',
          });
          logger.info('Registered llm client directive');
        }

        if (workersEnabled) {
          addClientDirective({
            name: 'worker',
            entrypoint: '@czap/astro/client-directives/worker',
          });
          logger.info('Registered worker client directive');
        }

        if (gpuEnabled) {
          addClientDirective({
            name: 'gpu',
            entrypoint: '@czap/astro/client-directives/gpu',
          });
          logger.info('Registered gpu client directive');
        }

        if (wasmEnabled) {
          addClientDirective({
            name: 'wasm',
            entrypoint: '@czap/astro/client-directives/wasm',
          });
          logger.info('Registered wasm client directive');
        }

        // SVG last-mile: always-on (parity with satellite) — a pure DOM
        // applicator with no capability gate, so the SVG cast arm reaches the
        // live DOM wherever a `[data-czap-entity]` SVG element is authored.
        addClientDirective({
          name: 'svg',
          entrypoint: '@czap/astro/client-directives/svg',
        });
        logger.info('Registered svg client directive');

        // Route scope guard FIRST (head-inline, ahead of every other czap
        // script) so `__CZAP_OFF__` is set before anything reads it. Only when
        // routes are excluded — otherwise no guard, no flag, scripts run as before.
        if (excludeRoutes.length > 0) {
          injectScript('head-inline', scopeGuardScript(excludeRoutes));
          logger.info(`Injected route scope guard (excluded: ${excludeRoutes.join(', ')})`);
        }

        // Inject detect script for client-side capability detection
        if (detectEnabled) {
          injectScript('head-inline', DETECT_INLINE_SCRIPT);
          logger.info('Injected detect script');

          // Inject GPU probe upgrade (deferred, non-blocking)
          if (gpuEnabled) {
            injectScript('page', DETECT_UPGRADE_SCRIPT);
            logger.info('Injected GPU probe upgrade');
          }
        }

        injectScript('page', runtimeBootstrapScript(runtimePolicy, enabledDirectives));

        if (wasmEnabled) {
          injectScript('page', WASM_RUNTIME_SCRIPT);
          logger.info('Injected wasm runtime bootstrap');
        }

        // Zero-config detection: auto-wire the detection-only middleware so a
        // consumer needs no src/middleware.ts for the common case. It inherits
        // the integration's detect/workers toggles (published-toggles channel)
        // and populates Astro.locals.czap. Edge/theme config carries functions
        // that can't ride a static integration option, so the edge cache still
        // needs a consumer middleware — it runs after this 'pre' one and refines
        // the same locals. Opt in with `middleware: true` (default off).
        if (config?.middleware === true) {
          addMiddleware({ order: 'pre', entrypoint: '@czap/astro/middleware-entry' });
          logger.info('Auto-wired capability-detection middleware');
        }

        // Register the boundary inspector as a dev-toolbar app (dev only).
        // Astro mounts the entrypoint in the main page realm and toggles it
        // from a toolbar icon — no injected page script, no custom hotkey.
        if (command === 'dev' && inspectorEnabled) {
          addDevToolbarApp({
            id: 'czap-inspector',
            name: 'czap boundaries',
            icon: INSPECTOR_TOOLBAR_ICON,
            // Resolved through @czap/astro's package exports so the `development`
            // condition maps to the TS source in `astro dev` and to `dist` in a
            // built integration — never a bare `.js` path that misses in dev.
            entrypoint: '@czap/astro/runtime/inspector-toolbar-app',
          });
          logger.info('Registered dev boundary inspector toolbar app');
        }
      },

      'astro:config:done': ({ config: astroConfig, logger }) => {
        projectRoot = fileURLToPath(astroConfig.root);
        logger.info(`@czap configured for ${astroConfig.output} output`);
      },

      'astro:server:setup': ({ server, logger }) => {
        logger.info('@czap dev server middleware active');

        if (detectEnabled || workersEnabled) {
          server.middlewares.use((_req: unknown, res: { setHeader(k: string, v: string): void }, next: () => void) => {
            for (const [header, value] of getCzapHeaderEntries({
              detectEnabled,
              workersEnabled,
              ...(coep ? { coep } : {}),
            })) {
              res.setHeader(header, value);
            }
            next();
          });
        }
      },

      'astro:build:done': async ({ dir, logger }) => {
        // Emit the build-derived boundary manifest for hosts that read it
        // from disk instead of importing `virtual:czap/boundaries` (e.g. a
        // worker entry assembled outside this Vite build).
        if (projectRoot && dir) {
          const boundaries = await collectBoundaryManifest(projectRoot, {
            boundaryDir: config?.vite?.dirs?.boundary,
          });
          if (Object.keys(boundaries).length > 0) {
            const manifestFile: BoundaryManifestFile = {
              _tag: 'CzapBoundaryManifest',
              _version: 2,
              boundaries,
            };
            const outPath = path.join(fileURLToPath(dir), 'czap-boundary-manifest.json');
            writeFileSync(outPath, JSON.stringify(manifestFile, null, 2));
            logger.info(`Emitted boundary manifest (${Object.keys(boundaries).length} boundaries) to ${outPath}`);
          }
        }
        logger.info('@czap build integration complete');
      },
    },
  };
}
