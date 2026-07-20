/**
 * Main Vite 8 plugin for liteship -- processes `@token`, `@theme`,
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
 * standalone hook logic over it. The staged CSS walk lives in
 * {@link transformCss} (testable without the Vite lifecycle), and the WASM
 * transitions live in `wasm-state.ts`; no hook communicates through hidden
 * closure `let`s.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import type { EnvironmentModuleGraph, EnvironmentModuleNode, Plugin, UserConfig } from 'vite';
import { ValidationError } from '@liteship/error';
import { contentAddressOf, normalizeRepoPath } from '@liteship/core';
import type { BoundaryManifest, BoundaryManifestEntry, BoundaryManifestFile } from '@liteship/edge';
import {
  collectBoundaryDefinitionsFromScan,
  collectBoundaryManifestFromScan,
  scanProject,
  serializeBoundaryOutput,
  type BoundaryDefinitionMap,
  type ProjectScan,
} from './boundary-manifest.js';
import { collectTokenManifest, collectThemeManifest } from './token-manifest.js';
import { resolveVirtualId, loadVirtualModule, type BoundaryAssetUrlMap } from './virtual-modules.js';
import { buildEnvironments, type LiteshipEnvironmentName } from './environments.js';
import { formatWasmSearchPaths } from './wasm-resolve.js';
import { resolvePackagedWasm } from './wasm-package-resolve.js';
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
   * selector (e.g. `'.liteship-vp'`) when `:root` can't be a container in your
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
   * add `assetUrls` to `virtual:liteship/boundaries`. Default `false`: manifests
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
const DEFAULT_ENVIRONMENTS: readonly LiteshipEnvironmentName[] = ['browser'];

/** The environment names {@link buildEnvironments} knows how to configure. */
const VALID_ENVIRONMENTS: readonly LiteshipEnvironmentName[] = ['browser', 'server', 'shader'];

/**
 * Resolve the requested environment names, defaulting to `['browser']` when
 * omitted. Validates each name up front: an unknown environment (e.g. a typo
 * like `'sever'`) would otherwise silently produce an empty / wrong
 * environment map that no-ops at build time, so it throws a clear early error
 * instead — naming the bad value and the supported set.
 */
function resolveEnvironmentNames(configured?: readonly string[]): readonly LiteshipEnvironmentName[] {
  if (configured === undefined) return DEFAULT_ENVIRONMENTS;
  const unknown = configured.filter((name) => !VALID_ENVIRONMENTS.includes(name as LiteshipEnvironmentName));
  if (unknown.length > 0) {
    throw ValidationError(
      'vite-plugin',
      `[@liteship/vite] Unknown environment ${unknown.map((n) => `"${n}"`).join(', ')} in liteship({ environments }). ` +
        `Supported environments are: ${VALID_ENVIRONMENTS.map((n) => `'${n}'`).join(', ')}. ` +
        `Omit the option to default to ['browser'].`,
    );
  }
  return configured as readonly LiteshipEnvironmentName[];
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
  return `_liteship/${boundaryIdShort(boundaryId)}/${index}.${hash}.css`;
}

function publicAssetUrl(fileName: string, base: string): string {
  const normalized = normalizeRepoPath(fileName).replace(/^\/+/, '');
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
 * Create the liteship Vite plugin.
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
 * import { liteship } from '@liteship/vite';
 * const config = { plugins: [liteship()] };
 * ```
 *
 * `resolvePackaged` is an internal seam: the packaged-`@liteship/core` binary
 * resolver, defaulting to the real {@link resolvePackagedWasm}. Production leaves
 * it defaulted (call sites are `plugin(config)`, byte-identical); a test injects a
 * stub to force the `'package'` WASM source absent against a synthetic project root.
 */
export function plugin(config?: PluginConfig, resolvePackaged: () => string | null = resolvePackagedWasm): Plugin {
  const hmrEnabled = config?.hmr !== false;
  const emitBoundaryAssets = config?.emitBoundaryAssets === true;

  // Per-instance state, lifted out of the closure into explicit records:
  //  - `cache`     : resolution + watch caches shared across transform/HMR.
  //  - `wasmState` : the compute-binary state machine (resolve/enable/emit).
  const cache = createPrimitiveResolutionCache();
  const wasmState = createWasmState(normalizeWasmConfig(config?.wasm), process.cwd(), resolvePackaged);

  let projectRoot = process.cwd();
  let isBuild = false;
  let publicBase = '/';
  let boundaryAssetState: Promise<BoundaryAssetState> | null = null;
  let boundaryDefinitions: Promise<BoundaryDefinitionMap> | null = null;
  // One project tree-walk shared across the manifest + definitions derivations. The
  // scan is a FILE LIST, so it survives content edits and is only invalidated when a
  // scannable file is created/deleted (see hotUpdate) -- no re-scan on every save.
  let projectScan: ProjectScan | null = null;

  function ensureProjectScan(): ProjectScan {
    if (!projectScan) projectScan = scanProject(projectRoot);
    return projectScan;
  }

  function ensureBoundaryManifest(): Promise<BoundaryManifest> {
    if (!cache.boundaryManifest.value) {
      cache.boundaryManifest.value = collectBoundaryManifestFromScan(projectRoot, ensureProjectScan(), {
        boundaryDir: config?.dirs?.boundary,
        container: config?.quantize?.container,
      });
    }
    return cache.boundaryManifest.value;
  }

  function ensureBoundaryDefinitions(): Promise<BoundaryDefinitionMap> {
    if (!boundaryDefinitions) {
      boundaryDefinitions = collectBoundaryDefinitionsFromScan(projectRoot, ensureProjectScan(), {
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
    for (const virtualId of [
      '\0virtual:liteship/tokens',
      '\0virtual:liteship/tokens.css',
      '\0virtual:liteship/themes',
    ] as const) {
      const mod = moduleGraph.getModuleById(virtualId);
      if (mod) {
        moduleGraph.invalidateModule(mod);
        affected.push(mod);
      }
    }
  }

  return {
    name: '@liteship/vite',
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
        const searched = formatWasmSearchPaths(projectRoot, wasmState.config.path, resolvePackaged);
        this.warn(
          `WASM support was enabled, but no liteship-compute binary could be resolved. Searched: ${searched}. ` +
            'Fix: the binary ships inside @liteship/core (>=0.2.1) — ensure it is installed so it resolves from ' +
            'node_modules automatically. In the monorepo, build the crate (`cargo build --target ' +
            'wasm32-unknown-unknown --release` in crates/liteship-compute) or run `pnpm run build:wasm`. ' +
            'Otherwise copy the binary to public/liteship-compute.wasm, or point the plugin at it explicitly ' +
            "via liteship({ wasm: { path: './path/to.wasm' } }). Runtime will fall back to TypeScript kernels.",
        );
      }

      if (wasmState.config.mode !== 'off' && resolved && isBuild) {
        setEmittedWasmRef(
          wasmState,
          this.emitFile({
            type: 'asset',
            name: 'liteship-compute.wasm',
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
          children: `import 'virtual:liteship/hmr-client';`,
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
      if (id === '\0virtual:liteship/boundaries') {
        // Async only on this branch: the manifest scan imports definition
        // modules. Other virtual modules stay synchronous.
        if (isBuild && emitBoundaryAssets) {
          return ensureBoundaryAssets((asset) => this.emitFile(asset)).then(({ manifest, urls }) =>
            loadVirtualModule(id, { boundaries: manifest, boundaryAssetUrls: urls }),
          );
        }
        return ensureBoundaryManifest().then((boundaries) => loadVirtualModule(id, { boundaries }));
      }

      if (
        id === '\0virtual:liteship/tokens' ||
        id === '\0virtual:liteship/tokens.css' ||
        id === '\0virtual:liteship/themes'
      ) {
        if (!cache.tokenThemeManifest.value) {
          cache.tokenThemeManifest.value = Promise.all([
            collectTokenManifest(projectRoot, { tokenDir: config?.dirs?.token }),
            collectThemeManifest(projectRoot, { themeDir: config?.dirs?.theme }),
          ]).then(([tokens, themes]): TokenThemeManifest => ({ tokens, themes }));
        }
        return cache.tokenThemeManifest.value.then(({ tokens, themes }) => loadVirtualModule(id, { tokens, themes }));
      }

      if (id === '\0virtual:liteship/wasm-url') {
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

        // The `/@fs/` prefix makes this a Vite dev-server browser URL rather than a repo
        // id, but the separator canonicalization is the same backslash→slash rewrite.
        const browserUrl =
          resolved.source === 'public' ? '/liteship-compute.wasm' : `/@fs/${normalizeRepoPath(resolved.filePath)}`;

        return `export const wasmUrl = ${JSON.stringify(browserUrl)};`;
      }

      return loadVirtualModule(id);
    },

    async generateBundle() {
      if (!isBuild || !emitBoundaryAssets) return;
      const { manifest, urls } = await ensureBoundaryAssets((asset) => this.emitFile(asset));
      if (Object.keys(manifest).length === 0) return;

      const manifestFile: BoundaryManifestFile = {
        _tag: 'LiteshipBoundaryManifest',
        _version: 2,
        boundaries: attachAssetUrls(manifest, urls),
      };
      this.emitFile({
        type: 'asset',
        fileName: 'liteship-boundary-manifest.json',
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

      // A created/deleted scannable file changes the shared scan's FILE LIST (a content
      // edit does not), so drop the shared scan only here -- it survives every .css /
      // .astro save, skipping a redundant project tree-walk.
      if (options.type === 'create' || options.type === 'delete') {
        const scannable =
          file.endsWith('.boundaries.ts') ||
          file.endsWith('/boundaries.ts') ||
          file.endsWith('.css') ||
          file.endsWith('.astro');
        if (scannable) projectScan = null;
      }

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
        // so `import { boundaries } from 'virtual:liteship/boundaries'` stays fresh.
        const manifestModule = moduleGraph.getModuleById('\0virtual:liteship/boundaries');
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
        // or .astro-style edit must re-load `virtual:liteship/boundaries` too
        // (same as the definition-file path above) -- otherwise importers
        // keep the stale module even though the cached manifest was
        // dropped. (.astro components carry @quantize in <style> blocks
        // and feed the manifest scan since the .astro-scan fix.)
        if (file.endsWith('.css') || file.endsWith('.astro')) {
          cache.boundaryManifest.value = null;
          const manifestModule = moduleGraph.getModuleById('\0virtual:liteship/boundaries');
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
