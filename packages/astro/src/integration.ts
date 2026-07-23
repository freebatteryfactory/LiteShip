/**
 * Astro 7 `AstroIntegration` for liteship.
 *
 * Registers the `@liteship/vite` plugin, injects the detect/boot scripts,
 * registers every client directive (`client:adaptive`,
 * `client:stream`, `client:llm`, `client:worker`, `client:gpu`,
 * `client:wasm`, `client:motion`) that the host opts into, and (in `astro dev`) registers
 * the boundary inspector as a dev-toolbar app.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import type { BoundaryManifestFile } from '@liteship/edge';
import { InvariantViolationError } from '@liteship/error';
import { collectBoundaryManifest, loadProjectConfig, plugin, primitiveSearchPatterns } from '@liteship/vite';
import type { PluginConfig, PrimitiveKind } from '@liteship/vite';
import type { LoadedProjectConfig, ProjectConfigLoader } from '@liteship/vite';
import { DETECT_UPGRADE_SCRIPT } from './detect-upgrade.js';
import { DETECT_INLINE_SCRIPT } from './detect-provisional.js';
import { getLiteshipHeaderEntries, mergeVaryHeader } from './headers.js';
import type { CrossOriginEmbedderPolicy } from './headers.js';
import type { RuntimeEndpointPolicy } from '@liteship/web';
import type { DirectiveName } from './runtime/directive-boot.js';
import { publishIntegrationToggles, resolveIntegrationToggles } from './integration-toggles.js';
import { installDiagnosticsBridge } from './diagnostics-bridge.js';
import {
  normalizeRuntimeSecurityPolicy,
  type RuntimeHtmlPolicy,
  type RuntimeSecurityPolicy,
} from './runtime/policy.js';

/**
 * Resolve an Astro runtime entrypoint from this package's own module location.
 * A consumer that installs only `liteship` must not need the Astro package publicly
 * hoisted into its application root for Astro/esbuild to find these modules.
 */
function ownedEntrypoint(relativePath: string): string {
  const builtPath = fileURLToPath(new URL(relativePath, import.meta.url));
  if (existsSync(builtPath)) return builtPath;
  const sourcePath = builtPath.endsWith('.js') ? `${builtPath.slice(0, -3)}.ts` : builtPath;
  if (existsSync(sourcePath)) return sourcePath;
  throw InvariantViolationError(
    'astro-owned-entrypoint',
    `@liteship/astro owns no runtime entrypoint at ${relativePath}`,
  );
}

const OWNED_ENTRYPOINTS = Object.freeze({
  adaptive: ownedEntrypoint('./client-directives/adaptive.js'),
  graph: ownedEntrypoint('./client-directives/graph.js'),
  stream: ownedEntrypoint('./client-directives/stream.js'),
  llm: ownedEntrypoint('./client-directives/llm.js'),
  worker: ownedEntrypoint('./client-directives/worker.js'),
  gpu: ownedEntrypoint('./client-directives/gpu.js'),
  wasm: ownedEntrypoint('./client-directives/wasm.js'),
  motion: ownedEntrypoint('./client-directives/motion.js'),
  svg: ownedEntrypoint('./client-directives/svg.js'),
  middleware: ownedEntrypoint('./middleware-entry.js'),
  inspector: ownedEntrypoint('./runtime/inspector-toolbar-app.js'),
});

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
  /** Overrides passed through to `@liteship/vite`'s plugin. */
  readonly vite?: PluginConfig;
  /** Enable the adaptive client directive (default true). Root project config supplies the same field. */
  readonly adaptive?: boolean;
  /**
   * Route globs on which liteship's costly runtime scripts (detect, the GPU probe,
   * wasm, the dev inspector) should NOT run. For embedding liteship alongside another
   * Astro sub-app (e.g. a Starlight `/docs/**` section) that never consumes liteship,
   * so those pages don't pay for a pointless GPU probe or attr writes. Astro's
   * `injectScript` is global (no build-time route filter), so this is a runtime
   * guard: a tiny inline script matches `location.pathname` and short-circuits
   * the rest (re-evaluating on View-Transition swaps). The directive bootstrap
   * stays wired — it's a no-op without liteship markers, and keeps View Transitions
   * working across the boundary. Supports exact paths and a trailing `**` (e.g.
   * `'/docs/**'` matches `/docs` and everything under it). Default `[]` (liteship
   * runs everywhere).
   */
  readonly exclude?: readonly string[];
  /** Enable the inline detect script (default `true`). */
  readonly detect?: boolean;
  /**
   * @deprecated No-op. Server Islands is stable in Astro (since v5); there is
   * no experimental flag to toggle on Astro 7. Using `server:defer` with a
   * configured adapter is all that's needed — liteship does nothing here. This
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
   * Continuous-motion runtime (`client:motion`). Opt-in (default off): registers
   * the JS motion FLOOR that scrubs `data-liteship-motion-program` when native
   * `animation-timeline` is unavailable. The native CSS path (`MotionCompiler`)
   * needs no runtime and is unaffected.
   */
  readonly motion?: { readonly enabled?: boolean };
  /**
   * Dev-only boundary inspector (default enabled in `astro dev`). Registered
   * as an Astro dev-toolbar app — toggle it from the toolbar icon. Pass
   * `false` to skip registering the toolbar app.
   */
  readonly inspector?: boolean;
  /**
   * Opt in (`true`) to auto-register a zero-config capability-detection
   * middleware, so a consumer needs no `src/middleware.ts` for the common case;
   * it populates `Astro.locals.liteship` from Client Hints. The edge boundary cache
   * (whose `theme`/`compile` carry functions) always needs a consumer
   * `src/middleware.ts` calling `liteshipMiddleware({ edge })`; when both are present
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
 * Build the head-inline guard that disables liteship's runtime scripts on excluded
 * routes. Injected FIRST (before the detect inline script and ahead of every
 * `page` module), so `window.__LITESHIP_OFF__` is set before anything reads it. Each
 * liteship script early-returns when the flag is set; when no routes are excluded
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
      // to an included one must re-enable liteship.
      window.__LITESHIP_OFF__ = off;
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
// GENERATED from canonical `@liteship/detect` in `./detect-provisional.js` — it
// emits the same `headProbeCapTier` cap-tier ladder the deferred GPU-probe
// upgrade uses, so the provisional `data-liteship-tier` can never be a divergent
// hand-copy (the 0.2.3/0.3.0 detect-ladder drift bug-class). The hand-rolled
// inline ladder that used to live here was the last surviving copy; it is gone.

function serializeInlineRuntimePolicy(policy: RuntimeSecurityPolicy): string {
  return JSON.stringify(policy).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function runtimeBootstrapScript(policy: RuntimeSecurityPolicy, directives: readonly DirectiveName[]): string {
  // NOT gated on __LITESHIP_OFF__: the directive bootstrap is idempotent and a cheap
  // no-op on a page with no liteship markers (an excluded Starlight route), and its
  // astro:after-swap scan listener MUST stay wired so a View Transition from an
  // excluded landing to an included route still binds directives. The real
  // exclusion savings (the GPU probe, detect, wasm, inspector) are guarded at
  // their own scripts; this machinery is invisible where nothing uses it.
  return `
import { bootstrapSlots, bootstrapDirectives, configureRuntimePolicy, installSwapPipeline } from '@liteship/astro/runtime';

configureRuntimePolicy(${serializeInlineRuntimePolicy(policy)});
bootstrapSlots();
bootstrapDirectives(${JSON.stringify(directives)});
// One ordered after-swap pipeline: rescan slots → boot fresh directives → reinit
// persisted ones, in that guaranteed order (F-1) — not three racing listeners.
installSwapPipeline(${JSON.stringify(directives)});
`.trim();
}

// When wasm is enabled, advertise the resolved URL AND eagerly load the kernel
// at the document level. configureWasmRuntime only sets data-liteship-wasm-url —
// the actual load lives in loadWasmRuntime, which otherwise fires only via a
// per-element `client:wasm` directive. Without this auto-load, enabling wasm in
// config silently no-ops (URL set, kernel never loaded, liteship:wasm-ready never
// fires) unless the page happens to carry a wasm directive element — a dogfood
// sharp edge. `boot` also runs on `astro:after-swap` (registered unconditionally)
// so a View Transition from an excluded landing to an included route still loads
// the kernel — page-module scripts don't re-execute on swap. WASMDispatch.load is
// idempotent after completion, so the repeat is free.
const WASM_RUNTIME_SCRIPT = `
import { wasmUrl } from 'virtual:liteship/wasm-url';
import { configureWasmRuntime, loadWasmRuntime } from '@liteship/astro/runtime';

function boot() {
  if (window.__LITESHIP_OFF__ || !wasmUrl) return;
  configureWasmRuntime(wasmUrl);
  void loadWasmRuntime(document.documentElement);
}
boot();
document.addEventListener('astro:after-swap', boot);
`.trim();

const LITESHIP_ASSET_HEADERS = ['/_liteship/*', '  Cache-Control: public, max-age=31536000, immutable'].join('\n');

function ensureLiteshipAssetHeaders(outDir: string): boolean {
  const headersPath = path.join(outDir, '_headers');
  const current = existsSync(headersPath) ? readFileSync(headersPath, 'utf8') : '';
  if (current.includes('/_liteship/*')) return false;
  const prefix = current.length === 0 || current.endsWith('\n') ? current : `${current}\n`;
  writeFileSync(headersPath, `${prefix}${LITESHIP_ASSET_HEADERS}\n`);
  return true;
}

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
 * Build the liteship `AstroIntegration`.
 *
 * Plug the returned object into `astro.config.mjs`'s `integrations`
 * array. The integration wires Astro's `astro:config:setup`,
 * `astro:config:done`, `astro:server:setup`, and `astro:build:done`
 * hooks.
 *
 * @example
 * ```ts
 * // astro.config.mjs
 * import { integration as liteship } from '@liteship/astro';
 *
 * const config = defineConfig({
 *   integrations: [liteship({ detect: true, workers: { enabled: true } })],
 * });
 * ```
 */
export function integration(config?: IntegrationConfig): AstroIntegration {
  let effectiveConfig = config;
  let detectEnabled = true;
  let workersEnabled = false;
  let coep: CrossOriginEmbedderPolicy | undefined;
  let adaptiveEnabled = true;
  let gpuEnabled = true;
  let streamEnabled = true;
  let llmEnabled = true;
  let motionEnabled = false;
  let wasmEnabled = false;
  let inspectorEnabled = true;
  let excludeRoutes: readonly string[] = [];
  let runtimePolicy = normalizeRuntimeSecurityPolicy({});
  let enabledDirectives: readonly DirectiveName[] = [];

  const applyConfig = (next: IntegrationConfig | undefined): void => {
    effectiveConfig = next;
    const runtimeToggles = resolveIntegrationToggles(next);
    publishIntegrationToggles(runtimeToggles);
    detectEnabled = runtimeToggles.detectEnabled;
    workersEnabled = runtimeToggles.workersEnabled;
    coep = runtimeToggles.coep;
    adaptiveEnabled = next?.adaptive !== false;
    gpuEnabled = next?.gpu?.enabled !== false;
    streamEnabled = next?.stream?.enabled !== false;
    llmEnabled = next?.llm?.enabled !== false;
    motionEnabled = next?.motion?.enabled === true;
    wasmEnabled = next?.wasm?.enabled === true;
    inspectorEnabled = next?.inspector !== false;
    excludeRoutes = (next?.exclude ?? []).filter((route): route is string => typeof route === 'string');
    runtimePolicy = normalizeRuntimeSecurityPolicy({
      endpointPolicy: next?.security?.endpointPolicy,
      htmlPolicy: next?.security?.htmlPolicy,
    });
    // Mirrors the addClientDirective registrations below exactly.
    enabledDirectives = [
      ...(adaptiveEnabled ? (['adaptive'] as const) : []),
      'graph',
      ...(streamEnabled ? (['stream'] as const) : []),
      ...(llmEnabled ? (['llm'] as const) : []),
      ...(workersEnabled ? (['worker'] as const) : []),
      ...(gpuEnabled ? (['gpu'] as const) : []),
      ...(wasmEnabled ? (['wasm'] as const) : []),
      ...(motionEnabled ? (['motion'] as const) : []),
      'svg',
    ];
  };
  applyConfig(config);

  // Astro and its nested Vite plugin evaluate the authored config through one
  // memoized Vite loader. Both projections consume the same loaded value.
  let projectConfigLoad: ReturnType<ProjectConfigLoader> | undefined;
  const projectConfigLoader: ProjectConfigLoader = (env, file, root) => {
    projectConfigLoad ??= (async () => {
      const viteModule = 'vite';
      const { loadConfigFromFile } = await import(viteModule);
      return loadConfigFromFile(env, file, root);
    })();
    return projectConfigLoad;
  };

  let projectRoot: string | null = null;
  let restoreDiagnostics: (() => void) | null = null;

  const restoreDiagnosticsBridge = (): void => {
    restoreDiagnostics?.();
    restoreDiagnostics = null;
  };

  return {
    name: '@liteship/astro',

    hooks: {
      'astro:config:setup': ({
        updateConfig,
        addClientDirective,
        addDevToolbarApp,
        addMiddleware,
        addWatchFile,
        injectScript,
        logger,
        command,
        config: astroConfig,
      }) => {
        type AstroViteConfig = Parameters<typeof updateConfig>[0]['vite'];
        logger.info('Setting up @liteship integration');

        const root = astroConfig?.root ? fileURLToPath(astroConfig.root) : process.cwd();
        const configure = (project: LoadedProjectConfig | null): void => {
          applyConfig({
            ...(project?.astro.adaptive !== undefined ? { adaptive: project.astro.adaptive } : {}),
            ...(project?.astro.edgeRuntime !== undefined ? { middleware: project.astro.edgeRuntime } : {}),
            ...(config ?? {}),
          });

          // Watch the convention primitive source files so definition edits restart
          // the dev server and re-collect the manifest (Astro battery: addWatchFile).
          // Guarded: real Astro always provides these, but keep it null-safe.
          if (typeof addWatchFile === 'function' && astroConfig?.root && astroConfig.srcDir) {
            watchConventionPrimitives(
              addWatchFile,
              fileURLToPath(astroConfig.root),
              fileURLToPath(astroConfig.srcDir),
              effectiveConfig?.vite?.dirs,
            );
          }

          // Route @liteship/* runtime diagnostics through Astro's logger so they carry
          // the liteship label and flow into `astro dev --json` structured output —
          // one log stream the host (and CI / agents) already parse.
          restoreDiagnosticsBridge();
          restoreDiagnostics = installDiagnosticsBridge(logger);

          // Astro may carry a different Vite type graph than @liteship/vite. The plugin
          // runtime contract is still compatible, so the host integration owns the
          // version bridge here instead of leaking duplicate plugin shapes downstream.
          const astroViteConfig = {
            plugins: [
              plugin(
                {
                  ...(effectiveConfig?.vite ?? {}),
                  ...(wasmEnabled ? { wasm: { enabled: true, path: effectiveConfig?.wasm?.path } } : {}),
                },
                undefined,
                projectConfigLoader,
              ),
            ],
          } as AstroViteConfig;

          updateConfig({
            vite: astroViteConfig,
          });

          // Register client directives
          if (adaptiveEnabled) {
            addClientDirective({
              name: 'adaptive',
              entrypoint: OWNED_ENTRYPOINTS.adaptive,
            });
            logger.info('Registered adaptive client directive');
          }

          // `graph` — the DocumentGraph-loader primitive, always-on like adaptive.
          addClientDirective({
            name: 'graph',
            entrypoint: OWNED_ENTRYPOINTS.graph,
          });
          logger.info('Registered graph client directive');

          if (streamEnabled) {
            addClientDirective({
              name: 'stream',
              entrypoint: OWNED_ENTRYPOINTS.stream,
            });
            logger.info('Registered stream client directive');
          }

          if (llmEnabled) {
            addClientDirective({
              name: 'llm',
              entrypoint: OWNED_ENTRYPOINTS.llm,
            });
            logger.info('Registered llm client directive');
          }

          if (workersEnabled) {
            addClientDirective({
              name: 'worker',
              entrypoint: OWNED_ENTRYPOINTS.worker,
            });
            logger.info('Registered worker client directive');
          }

          if (gpuEnabled) {
            addClientDirective({
              name: 'gpu',
              entrypoint: OWNED_ENTRYPOINTS.gpu,
            });
            logger.info('Registered gpu client directive');
          }

          if (wasmEnabled) {
            addClientDirective({
              name: 'wasm',
              entrypoint: OWNED_ENTRYPOINTS.wasm,
            });
            logger.info('Registered wasm client directive');
          }

          if (motionEnabled) {
            addClientDirective({
              name: 'motion',
              entrypoint: OWNED_ENTRYPOINTS.motion,
            });
            logger.info('Registered motion client directive');
          }

          // SVG last-mile: always-on (parity with adaptive) — a pure DOM
          // applicator with no capability gate, so the SVG cast arm reaches the
          // live DOM wherever a `[data-liteship-entity]` SVG element is authored.
          addClientDirective({
            name: 'svg',
            entrypoint: OWNED_ENTRYPOINTS.svg,
          });
          logger.info('Registered svg client directive');

          // Route scope guard FIRST (head-inline, ahead of every other liteship
          // script) so `__LITESHIP_OFF__` is set before anything reads it. Only when
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
          // and populates Astro.locals.liteship. Edge/theme config carries functions
          // that can't ride a static integration option, so the edge cache still
          // needs a consumer middleware — it runs after this 'pre' one and refines
          // the same locals. Opt in with `middleware: true` (default off).
          if (effectiveConfig?.middleware === true) {
            addMiddleware({ order: 'pre', entrypoint: OWNED_ENTRYPOINTS.middleware });
            logger.info('Auto-wired capability-detection middleware');
          }

          // Register the boundary inspector as a dev-toolbar app (dev only).
          // Astro mounts the entrypoint in the main page realm and toggles it
          // from a toolbar icon — no injected page script, no custom hotkey.
          if (command === 'dev' && inspectorEnabled) {
            addDevToolbarApp({
              id: 'liteship-inspector',
              name: 'liteship boundaries',
              icon: INSPECTOR_TOOLBAR_ICON,
              // Resolve from this module's physical owner. A transitive installation
              // therefore never depends on the consumer hoisting @liteship/astro.
              entrypoint: OWNED_ENTRYPOINTS.inspector,
            });
            logger.info('Registered dev boundary inspector toolbar app');
          }
        };

        // Keep convention-only and explicit-only Astro integrations synchronous.
        // A present authored project hub is the sole path that needs Vite's async loader.
        if (!existsSync(path.resolve(root, 'liteship.config.ts'))) {
          configure(null);
          return;
        }
        return loadProjectConfig(
          root,
          { command: command === 'dev' ? 'serve' : 'build', mode: command === 'dev' ? 'development' : 'production' },
          projectConfigLoader,
        ).then(configure);
      },

      'astro:config:done': ({ config: astroConfig, logger }) => {
        projectRoot = fileURLToPath(astroConfig.root);
        logger.info(`@liteship configured for ${astroConfig.output} output`);
      },

      'astro:server:setup': ({ server, logger }) => {
        logger.info('@liteship dev server middleware active');

        if (detectEnabled || workersEnabled) {
          server.middlewares.use(
            (
              _req: unknown,
              res: {
                setHeader(k: string, v: string): void;
                getHeader?(k: string): string | number | string[] | undefined;
              },
              next: () => void,
            ) => {
              for (const [header, value] of getLiteshipHeaderEntries({
                detectEnabled,
                workersEnabled,
                ...(coep ? { coep } : {}),
              })) {
                if (header === 'Vary' && typeof res.getHeader === 'function') {
                  // Additive header — union with any existing Vary rather than clobber it.
                  const current = res.getHeader('Vary');
                  const existing = Array.isArray(current)
                    ? current.join(', ')
                    : current === undefined
                      ? null
                      : String(current);
                  res.setHeader('Vary', mergeVaryHeader(existing, value));
                  continue;
                }
                res.setHeader(header, value);
              }
              next();
            },
          );
        }
      },

      'astro:server:done': () => {
        restoreDiagnosticsBridge();
      },

      'astro:build:done': async ({ dir, logger }) => {
        try {
          if (effectiveConfig?.vite?.emitBoundaryAssets === true) {
            if (dir) {
              const outDir = fileURLToPath(dir);
              if (ensureLiteshipAssetHeaders(outDir)) {
                logger.info(
                  `Added immutable Cache-Control headers for /_liteship/* in ${path.join(outDir, '_headers')}`,
                );
              }
            }
            logger.info('@liteship/vite emitted the boundary manifest with static asset URLs');
            return;
          }

          // Emit the build-derived boundary manifest for hosts that read it
          // from disk instead of importing `virtual:liteship/boundaries` (e.g. a
          // worker entry assembled outside this Vite build).
          if (projectRoot && dir) {
            const boundaries = await collectBoundaryManifest(projectRoot, {
              boundaryDir: effectiveConfig?.vite?.dirs?.boundary,
              container: effectiveConfig?.vite?.quantize?.container,
            });
            if (Object.keys(boundaries).length > 0) {
              const manifestFile: BoundaryManifestFile = {
                _tag: 'LiteshipBoundaryManifest',
                _version: 2,
                boundaries,
              };
              const outPath = path.join(fileURLToPath(dir), 'liteship-boundary-manifest.json');
              writeFileSync(outPath, JSON.stringify(manifestFile, null, 2));
              logger.info(`Emitted boundary manifest (${Object.keys(boundaries).length} boundaries) to ${outPath}`);
            }
          }
          logger.info('@liteship build integration complete');
        } finally {
          restoreDiagnosticsBridge();
        }
      },
    },
  };
}

/**
 * addWatchFile battery: tell Astro to watch the convention primitive source
 * files (boundaries / tokens / themes / styles) so editing a definition
 * restarts the dev server and re-collects the boundary manifest — even for
 * definitions not yet imported by a CSS `@quantize`/`@token` block, which is
 * all the Vite transform layer watches. Reuses `primitiveSearchPatterns` (the
 * resolver's own convention) rather than re-deriving filenames; concrete
 * convention files that exist are watched (Astro's `addWatchFile` takes a path,
 * not a glob, so the `*`-globbed per-name patterns are enumerated on disk).
 */
function watchConventionPrimitives(
  addWatchFile: (file: string) => void,
  projectRoot: string,
  srcDir: string,
  dirs: PluginConfig['dirs'],
): void {
  const kinds: readonly PrimitiveKind[] = ['boundary', 'token', 'theme', 'style'];
  const candidates: string[] = [];
  for (const kind of kinds) {
    for (const pattern of primitiveSearchPatterns(kind, path.join(srcDir, 'index.ts'), projectRoot, dirs?.[kind])) {
      if (!pattern.includes('*')) {
        candidates.push(pattern);
        continue;
      }
      // `<dir>/*<suffix>` — enumerate the existing convention files on disk.
      const dir = path.dirname(pattern);
      const suffix = path.basename(pattern).slice(1);
      if (!existsSync(dir)) continue;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith(suffix)) candidates.push(path.join(dir, entry.name));
      }
    }
  }
  const watched = new Set<string>();
  for (const file of candidates) {
    if (watched.has(file) || !existsSync(file)) continue;
    watched.add(file);
    addWatchFile(file);
  }
}
