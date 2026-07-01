/**
 * Main Vite 8 plugin for czap -- processes `@token`, `@theme`,
 * `@style`, and `@quantize` CSS blocks, handles HMR, serves virtual
 * modules, and configures build environments.
 *
 * Transform pipeline order: tokens -- themes -- styles -- quantize.
 * This ordering ensures themes / styles can reference token custom
 * properties that were already compiled earlier in the pipeline.
 *
 * The factory is thin: it builds the explicit per-instance state — a
 * {@link PrimitiveResolutionCache} (the resolution + watch caches) and a
 * {@link WasmState} (the compute-binary state machine) — then wires the
 * standalone hook logic over it. The 4-phase CSS walk lives in
 * {@link transformCss} (testable without the Vite lifecycle), and the WASM
 * transitions live in `wasm-state.ts`; no hook communicates through hidden
 * closure `let`s.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import type { EnvironmentModuleGraph, EnvironmentModuleNode, Plugin, UserConfig } from 'vite';
import { ValidationError } from '@czap/error';
import { contentAddressOf } from '@czap/core';
import type { BoundaryManifest, BoundaryManifestEntry, BoundaryManifestFile } from '@czap/edge';
import {
  collectBoundaryDefinitions,
  collectBoundaryManifest,
  serializeBoundaryOutput,
  type BoundaryDefinitionMap,
} from './boundary-manifest.js';
import { collectTokenManifest, collectThemeManifest } from './token-manifest.js';
import { resolveVirtualId, loadVirtualModule, type BoundaryAssetUrlMap } from './virtual-modules.js';
import { buildEnvironments, type CzapEnvironmentName } from './environments.js';
import { formatWasmSearchPaths } from './wasm-resolve.js';
import { transformHTML } from './html-transform.js';
import { transformCss } from './transform-css.js';
import {
  createPrimitiveResolutionCache,
  invalidateAllPrimitives,
  type TokenThemeManifest,
} from './primitive-resolution-cache.js';
import {
  normalizeWasmConfig,
  createWasmState,
  resolveWasmForRoot,
  refreshWasmAtBuildStart,
  setEmittedWasmRef,
} from './wasm-state.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Configuration options for the {@link plugin} factory. Every field
 * is optional; omitted values use convention-based defaults.
 */
export interface PluginConfig {
  /** Override source directories for each primitive kind. */
  readonly dirs?: Partial<Record<'boundary' | 'token' | 'theme' | 'style', string>>;
  /** Toggle surgical HMR emission (default `true`). */
  readonly hmr?: boolean;
  /**
   * `@quantize` viewport-containment options.
   *
   * `container` is the selector the auto-emitted viewport `@container`
   * containment is declared on — `:root` by default. Set it to a named
   * selector (e.g. `'.czap-vp'`) when `:root` can't be a container in your
   * layout (size containment removes `:root` from its parent's size calc,
   * which a fixed/absolute viewport-locked wrapper conflicts with); you then
   * own sizing that element to the viewport. Applies to both the CSS
   * transform and the emitted boundary assets.
   */
  readonly quantize?: { readonly container?: string };
  /** Named Vite environments to configure (browser / server / shader). Defaults to browser when omitted. */
  readonly environments?: readonly ('browser' | 'server' | 'shader')[];
  /**
   * Emit each deduplicated boundary CSS output as an immutable build asset and
   * add `assetUrls` to `virtual:czap/boundaries`. Default `false`: manifests
   * still carry compiled strings only.
   */
  readonly emitBoundaryAssets?: boolean;
  /**
   * WASM runtime configuration. Omitted (the default) **auto-detects**: the
   * deterministic 3-step search in {@link resolveWASM} runs, and the compute
   * binary is wired up automatically when one is found (no flag needed). Pass
   * `false` (or `{ enabled: false }`) to force it off, `true` (or
   * `{ enabled: true }`) to require it (warn if no binary resolves), or
   * `{ path }` to point at a specific binary.
   */
  readonly wasm?: boolean | { readonly enabled?: boolean; readonly path?: string };
}

/** Default Vite environments when {@link PluginConfig.environments} is omitted. */
const DEFAULT_ENVIRONMENTS: readonly CzapEnvironmentName[] = ['browser'];

/** The environment names {@link buildEnvironments} knows how to configure. */
const VALID_ENVIRONMENTS: readonly CzapEnvironmentName[] = ['browser', 'server', 'shader'];

/**
 * Resolve the requested environment names, defaulting to `['browser']` when
 * omitted. Validates each name up front: an unknown environment (e.g. a typo
 * like `'sever'`) would otherwise silently produce an empty / wrong
 * environment map that no-ops at build time, so it throws a clear early error
 * instead — naming the bad value and the supported set.
 */
function resolveEnvironmentNames(configured?: readonly string[]): readonly CzapEnvironmentName[] {
  if (configured === undefined) return DEFAULT_ENVIRONMENTS;
  const unknown = configured.filter((name) => !VALID_ENVIRONMENTS.includes(name as CzapEnvironmentName));
  if (unknown.length > 0) {
    throw ValidationError(
      'vite-plugin',
      `[@czap/vite] Unknown environment ${unknown.map((n) => `"${n}"`).join(', ')} in czap({ environments }). ` +
        `Supported environments are: ${VALID_ENVIRONMENTS.map((n) => `'${n}'`).join(', ')}. ` +
        `Omit the option to default to ['browser'].`,
    );
  }
  return configured as readonly CzapEnvironmentName[];
}

type EmitAssetFile = (asset: { readonly type: 'asset'; readonly fileName: string; readonly source: string }) => string;

interface BoundaryAssetState {
  readonly manifest: BoundaryManifest;
  readonly urls: BoundaryAssetUrlMap;
}

function boundaryIdShort(id: string): string {
  return id.replace(/^fnv1a:/, '');
}

function boundaryAssetFileName(boundaryId: string, index: number, source: string): string {
  const hash = contentAddressOf({ css: source }).replace(/^fnv1a:/, '');
  return `_czap/${boundaryIdShort(boundaryId)}/${index}.${hash}.css`;
}

function publicAssetUrl(fileName: string, base: string): string {
  const normalized = fileName.replace(/\\/g, '/').replace(/^\/+/, '');
  const normalizedBase = base.length === 0 ? '/' : base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${normalized}`;
}

function attachAssetUrls(
  manifest: BoundaryManifest,
  urls: Readonly<Record<string, Readonly<Record<number, string>>>>,
): BoundaryManifest {
  const enriched: Record<string, BoundaryManifestEntry> = {};
  for (const [name, entry] of Object.entries(manifest)) {
    const assetUrls = urls[name];
    enriched[name] = {
      ...entry,
      ...(assetUrls && Object.keys(assetUrls).length > 0 ? { assetUrls } : {}),
    };
  }
  return enriched;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Create the czap Vite plugin.
 *
 * Transforms CSS files containing `@token`, `@theme`, `@style`, and
 * `@quantize` blocks into native CSS custom properties,
 * `html[data-theme]` selectors, scoped `@layer` / `@scope` rules, and
 * `@container` queries respectively. Uses convention-based definition
 * resolution and provides HMR support for surgical CSS and shader
 * uniform updates.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { czap } from '@czap/vite';
 * const config = { plugins: [czap()] };
 * ```
 */
export function plugin(config?: PluginConfig): Plugin {
  const hmrEnabled = config?.hmr !== false;
  const emitBoundaryAssets = config?.emitBoundaryAssets === true;

  // Per-instance state, lifted out of the closure into explicit records:
  //  - `cache`     : resolution + watch caches shared across transform/HMR.
  //  - `wasmState` : the compute-binary state machine (resolve/enable/emit).
  const cache = createPrimitiveResolutionCache();
  const wasmState = createWasmState(normalizeWasmConfig(config?.wasm), process.cwd());

  let projectRoot = process.cwd();
  let isBuild = false;
  let publicBase = '/';
  let boundaryAssetState: Promise<BoundaryAssetState> | null = null;
  let boundaryDefinitions: Promise<BoundaryDefinitionMap> | null = null;

  function ensureBoundaryManifest(): Promise<BoundaryManifest> {
    if (!cache.boundaryManifest.value) {
      cache.boundaryManifest.value = collectBoundaryManifest(projectRoot, {
        boundaryDir: config?.dirs?.boundary,
        container: config?.quantize?.container,
      });
    }
    return cache.boundaryManifest.value;
  }

  function ensureBoundaryDefinitions(): Promise<BoundaryDefinitionMap> {
    if (!boundaryDefinitions) {
      boundaryDefinitions = collectBoundaryDefinitions(projectRoot, {
        boundaryDir: config?.dirs?.boundary,
      });
    }
    return boundaryDefinitions;
  }

  function ensureBoundaryAssets(emitAsset: EmitAssetFile): Promise<BoundaryAssetState> {
    if (!boundaryAssetState) {
      boundaryAssetState = ensureBoundaryManifest().then((manifest) => {
        const urls: Record<string, Record<number, string>> = {};
        for (const [name, entry] of Object.entries(manifest)) {
          if (entry.outputs.length === 0) continue;
          const byIndex: Record<number, string> = {};
          entry.outputs.forEach((output, index) => {
            const source = serializeBoundaryOutput(output);
            const fileName = boundaryAssetFileName(entry.id, index, source);
            emitAsset({
              type: 'asset',
              fileName,
              source,
            });
            byIndex[index] = publicAssetUrl(fileName, publicBase);
          });
          urls[name] = byIndex;
        }
        return { manifest, urls };
      });
    }
    return boundaryAssetState;
  }

  function invalidateDesignVirtualModules(
    moduleGraph: EnvironmentModuleGraph,
    affected: EnvironmentModuleNode[],
  ): void {
    for (const virtualId of ['\0virtual:czap/tokens', '\0virtual:czap/tokens.css', '\0virtual:czap/themes'] as const) {
      const mod = moduleGraph.getModuleById(virtualId);
      if (mod) {
        moduleGraph.invalidateModule(mod);
        affected.push(mod);
      }
    }
  }

  return {
    name: '@czap/vite',
    enforce: 'pre' as const,

    configResolved(resolvedConfig) {
      projectRoot = resolvedConfig.root;
      isBuild = resolvedConfig.command === 'build';
      publicBase = resolvedConfig.base;
      resolveWasmForRoot(wasmState, projectRoot);
    },

    buildStart() {
      boundaryAssetState = null;
      const resolved = refreshWasmAtBuildStart(wasmState, projectRoot);
      if (wasmState.config.mode !== 'off' && !resolved && wasmState.config.mode === 'on') {
        const searched = formatWasmSearchPaths(projectRoot, wasmState.config.path);
        this.warn(
          `WASM support was enabled, but no czap-compute binary could be resolved. Searched: ${searched}. ` +
            'Fix: the binary ships inside @czap/core (>=0.2.1) — ensure it is installed so it resolves from ' +
            'node_modules automatically. In the monorepo, build the crate (`cargo build --target ' +
            'wasm32-unknown-unknown --release` in crates/czap-compute) or run `pnpm run build:wasm`. ' +
            'Otherwise copy the binary to public/czap-compute.wasm, or point the plugin at it explicitly ' +
            "via czap({ wasm: { path: './path/to.wasm' } }). Runtime will fall back to TypeScript kernels.",
        );
      }

      if (wasmState.config.mode !== 'off' && resolved && isBuild) {
        setEmittedWasmRef(
          wasmState,
          this.emitFile({
            type: 'asset',
            name: 'czap-compute.wasm',
            source: readFileSync(resolved.filePath),
          }),
        );
      }

      if (isBuild && emitBoundaryAssets) {
        return ensureBoundaryAssets((asset) => this.emitFile(asset)).then(() => undefined);
      }
    },

    // -----------------------------------------------------------------------
    // HMR client script injection
    // -----------------------------------------------------------------------

    transformIndexHtml() {
      if (!hmrEnabled) return [];
      return [
        {
          tag: 'script' as const,
          attrs: { type: 'module' },
          children: `import 'virtual:czap/hmr-client';`,
          injectTo: 'head' as const,
        },
      ];
    },

    // -----------------------------------------------------------------------
    // Virtual module resolution
    // -----------------------------------------------------------------------

    resolveId(id: string) {
      return resolveVirtualId(id);
    },

    load(id: string) {
      if (id === '\0virtual:czap/boundaries') {
        // Async only on this branch: the manifest scan imports definition
        // modules. Other virtual modules stay synchronous.
        if (isBuild && emitBoundaryAssets) {
          return ensureBoundaryAssets((asset) => this.emitFile(asset)).then(({ manifest, urls }) =>
            loadVirtualModule(id, { boundaries: manifest, boundaryAssetUrls: urls }),
          );
        }
        return ensureBoundaryManifest().then((boundaries) => loadVirtualModule(id, { boundaries }));
      }

      if (id === '\0virtual:czap/tokens' || id === '\0virtual:czap/tokens.css' || id === '\0virtual:czap/themes') {
        if (!cache.tokenThemeManifest.value) {
          cache.tokenThemeManifest.value = Promise.all([
            collectTokenManifest(projectRoot, { tokenDir: config?.dirs?.token }),
            collectThemeManifest(projectRoot, { themeDir: config?.dirs?.theme }),
          ]).then(([tokens, themes]): TokenThemeManifest => ({ tokens, themes }));
        }
        return cache.tokenThemeManifest.value.then(({ tokens, themes }) => loadVirtualModule(id, { tokens, themes }));
      }

      if (id === '\0virtual:czap/wasm-url') {
        if (!wasmState.resolution.enabled) {
          return 'export const wasmUrl = null;';
        }

        const resolved = wasmState.resolution.resolved;
        if (!resolved) {
          return 'export const wasmUrl = null;';
        }

        if (isBuild && wasmState.resolution.emittedRefId) {
          return `export const wasmUrl = import.meta.ROLLUP_FILE_URL_${wasmState.resolution.emittedRefId};`;
        }

        // Distinct op (NOT repo-path normalization, CUT B5b): a `/@fs/` browser URL
        // segment for the Vite dev server — a URL, not a filesystem path. Left inline.
        const browserUrl =
          resolved.source === 'public' ? '/czap-compute.wasm' : `/@fs/${resolved.filePath.replace(/\\/g, '/')}`;

        return `export const wasmUrl = ${JSON.stringify(browserUrl)};`;
      }

      return loadVirtualModule(id);
    },

    async generateBundle() {
      if (!isBuild || !emitBoundaryAssets) return;
      const { manifest, urls } = await ensureBoundaryAssets((asset) => this.emitFile(asset));
      if (Object.keys(manifest).length === 0) return;

      const manifestFile: BoundaryManifestFile = {
        _tag: 'CzapBoundaryManifest',
        _version: 2,
        boundaries: attachAssetUrls(manifest, urls),
      };
      this.emitFile({
        type: 'asset',
        fileName: 'czap-boundary-manifest.json',
        source: JSON.stringify(manifestFile, null, 2),
      });
    },

    // -----------------------------------------------------------------------
    // CSS transform pipeline: tokens -> themes -> styles -> quantize
    // -----------------------------------------------------------------------

    async transform(code: string, id: string) {
      if (id.endsWith('.html') || id.endsWith('.astro')) {
        const transformed = await transformHTML(code, id, projectRoot, config?.dirs?.boundary);
        if (transformed === code) {
          return null;
        }

        return {
          code: transformed,
          map: null,
        };
      }

      // Only process CSS files
      if (!id.endsWith('.css')) return null;

      const discoveredBoundaries = code.includes('@quantize') ? await ensureBoundaryDefinitions() : undefined;
      const transformed = await transformCss(code, id, {
        warn: (message) => this.warn(message),
        addWatchFile: typeof this.addWatchFile === 'function' ? (file) => this.addWatchFile(file) : undefined,
        cache,
        projectRoot,
        dirs: config?.dirs,
        boundaryDefinitions: discoveredBoundaries,
        quantizeContainer: config?.quantize?.container,
      });

      if (transformed === null) return null;

      return {
        code: transformed,
        map: null,
      };
    },

    // -----------------------------------------------------------------------
    // HMR: invalidate caches + re-transform on definition file changes
    // -----------------------------------------------------------------------

    hotUpdate(options) {
      if (!hmrEnabled) return;

      const file = options.file;

      // Invalidate definition caches when source files change
      const isDefFile =
        file.endsWith('.boundaries.ts') ||
        file.endsWith('/boundaries.ts') ||
        file.endsWith('.tokens.ts') ||
        file.endsWith('/tokens.ts') ||
        file.endsWith('.themes.ts') ||
        file.endsWith('/themes.ts') ||
        file.endsWith('.styles.ts') ||
        file.endsWith('/styles.ts');

      if (isDefFile) {
        // Clear all caches since definitions may cross-reference
        invalidateAllPrimitives(cache);
        boundaryDefinitions = null;

        const moduleGraph = this.environment.moduleGraph;
        const transformModules = Array.from(moduleGraph.idToModuleMap.values()).filter((mod) => {
          const moduleId = mod.id;
          return (
            typeof moduleId === 'string' &&
            (moduleId.endsWith('.css') || moduleId.endsWith('.astro') || moduleId.endsWith('.html'))
          );
        });

        // Definitions feed the boundary manifest; re-load the virtual module
        // so `import { boundaries } from 'virtual:czap/boundaries'` stays fresh.
        const manifestModule = moduleGraph.getModuleById('\0virtual:czap/boundaries');
        if (manifestModule) {
          moduleGraph.invalidateModule(manifestModule);
          transformModules.push(manifestModule);
        }

        invalidateDesignVirtualModules(moduleGraph, transformModules);

        if (transformModules.length > 0) {
          return transformModules;
        }
      }

      if (file.endsWith('.css') || file.endsWith('.astro') || file.endsWith('.html')) {
        const moduleGraph = this.environment.moduleGraph;
        // Returning an array from hotUpdate REPLACES Vite's own affected
        // list — start from options.modules (Vite's computed set, which
        // covers query-bearing ids like `Page.astro?astro&type=style`
        // that an exact getModuleById(file) lookup would miss) so the
        // edited file's own HMR is never suppressed.
        const affectedModules: EnvironmentModuleNode[] = [...options.modules];

        // @quantize states contribute to the boundary manifest, so a CSS
        // or .astro-style edit must re-load `virtual:czap/boundaries` too
        // (same as the definition-file path above) -- otherwise importers
        // keep the stale module even though the cached manifest was
        // dropped. (.astro components carry @quantize in <style> blocks
        // and feed the manifest scan since the .astro-scan fix.)
        if (file.endsWith('.css') || file.endsWith('.astro')) {
          cache.boundaryManifest.value = null;
          const manifestModule = moduleGraph.getModuleById('\0virtual:czap/boundaries');
          if (manifestModule) {
            moduleGraph.invalidateModule(manifestModule);
            affectedModules.push(manifestModule);
          }
        }

        if (affectedModules.length > 0) {
          return affectedModules;
        }
      }

      return;
    },

    config(): UserConfig {
      const envNames = resolveEnvironmentNames(config?.environments);
      const next: UserConfig = {};

      if (envNames.length > 0) {
        next.environments = buildEnvironments(envNames);
      }

      return next;
    },
  };
}
