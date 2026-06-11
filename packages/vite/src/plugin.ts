/**
 * Main Vite 8 plugin for czap -- processes `@token`, `@theme`,
 * `@style`, and `@quantize` CSS blocks, handles HMR, serves virtual
 * modules, and configures build environments.
 *
 * Transform pipeline order: tokens -- themes -- styles -- quantize.
 * This ordering ensures themes / styles can reference token custom
 * properties that were already compiled earlier in the pipeline.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type { Plugin } from 'vite';
import type { Boundary, Token, Theme, Style } from '@czap/core';
import { parseQuantizeBlocks, compileQuantizeBlock } from './css-quantize.js';
import { resolvePrimitive, primitiveSearchPatterns, type PrimitiveKind } from './primitive-resolve.js';
import { transformHTML } from './html-transform.js';
import { parseTokenBlocks, compileTokenBlock } from './token-transform.js';
import { parseThemeBlocks, compileThemeBlock } from './theme-transform.js';
import { parseStyleBlocks, compileStyleBlock } from './style-transform.js';
import { resolveVirtualId, loadVirtualModule } from './virtual-modules.js';
import { buildEnvironments, type CzapEnvironmentName } from './environments.js';
import { resolveWASM } from './wasm-resolve.js';
import { normalizeCssLineEndings } from './normalize-css-eol.js';

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
  /** Named Vite environments to configure (browser / server / shader). */
  readonly environments?: readonly ('browser' | 'server' | 'shader')[];
  /** Opt-in WASM runtime configuration. */
  readonly wasm?: { readonly enabled?: boolean; readonly path?: string };
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/** Factory namespace users type to produce each primitive kind. */
const KIND_FACTORY: Record<PrimitiveKind, string> = {
  boundary: 'Boundary',
  token: 'Token',
  theme: 'Theme',
  style: 'Style',
};

/**
 * Doctor-style warning for an unresolved primitive: what happened (the
 * name and the file that referenced it), why probably (none of the
 * searched convention modules exported it), and the literal next thing
 * to type (the factory export, or the `dirs` override).
 */
function unresolvedPrimitiveWarning(
  kind: PrimitiveKind,
  name: string,
  id: string,
  line: number,
  projectRoot: string,
  userDir: string | undefined,
): string {
  const searched = primitiveSearchPatterns(kind, id, projectRoot, userDir)
    .map((pattern) => {
      const rel = path.relative(projectRoot, pattern);
      return rel.startsWith('..') ? pattern : rel;
    })
    .join(', ');
  return (
    `Could not resolve ${kind} "${name}" referenced in ${id}:${line}. ` +
    `Searched for an export named "${name}" in: ${searched} (none matched). ` +
    `Fix: add \`export const ${name} = ${KIND_FACTORY[kind]}.make({ ... })\` to one of those files, ` +
    `or point the plugin at your ${kind} definitions: czap({ dirs: { ${kind}: './path/to/dir' } }).`
  );
}

/** Supported authoring grammar per at-rule, quoted verbatim in parse-miss warnings. */
const SUPPORTED_GRAMMAR: Record<'@token' | '@quantize', string> = {
  '@token': '`@token <name> { /* optional overrides: prop: value; */ }` where <name> matches a Token.make() export',
  '@quantize':
    '`@quantize <boundaryName> { <stateName> { prop: value; <selector> { prop: value; } } }` where <boundaryName> matches a Boundary.make() export and each <stateName> is one of its states',
};

/**
 * Blank out block comments while preserving every newline, so marker
 * detection ignores commented-out at-rules without shifting line numbers.
 */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

/**
 * 1-based line of the first occurrence of `marker` in `css`, or `null`
 * when the marker does not appear (e.g. it only lived inside a comment).
 */
function markerLine(css: string, marker: string): number | null {
  const idx = css.indexOf(marker);
  if (idx === -1) return null;
  return css.slice(0, idx).split('\n').length;
}

/**
 * Doctor-style warning for a parse miss: the file contains an at-rule
 * marker, but the parser matched zero blocks — the at-rule is left
 * untransformed and the browser will silently discard it. Names the
 * file:line, the probable cause, and the exact supported grammar.
 */
function parseMissWarning(marker: '@token' | '@quantize', id: string, line: number): string {
  return (
    `Found ${marker} in ${id}:${line} but no ${marker} block parsed, so it was left untransformed ` +
    `(browsers discard unknown at-rules, so it contributes no CSS). ` +
    `Probable cause: an unsupported dialect such as an anonymous block (\`${marker} { ... }\`) ` +
    `or an inline declaration (\`${marker} name: value;\`). ` +
    `Fix: rewrite it to the supported grammar ${SUPPORTED_GRAMMAR[marker]}.`
  );
}

/**
 * Doctor-style warning for a `@quantize` block whose states all parsed
 * to zero declarations: the block matched, but its body produced no CSS.
 */
function emptyQuantizeWarning(boundaryName: string, id: string, line: number): string {
  return (
    `@quantize ${boundaryName} in ${id}:${line} parsed to zero declarations — every state body is empty, ` +
    `so the block compiles to no @container rules. ` +
    `Probable cause: the state bodies use a syntax the parser does not support. ` +
    `Fix: write each state per the supported grammar ${SUPPORTED_GRAMMAR['@quantize']}.`
  );
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
 * import { plugin as czap } from '@czap/vite';
 * const config = { plugins: [czap()] };
 * ```
 */
export function plugin(config?: PluginConfig): Plugin {
  const hmrEnabled = config?.hmr !== false;
  const wasmEnabled = config?.wasm?.enabled === true;
  let projectRoot = process.cwd();
  let isBuild = false;
  let resolvedWasm: ReturnType<typeof resolveWASM> = null;
  if (wasmEnabled) {
    resolvedWasm = resolveWASM(projectRoot, config?.wasm?.path);
  }
  let emittedWasmRefId: string | null = null;

  // Caches for resolved definitions to avoid re-importing on every transform
  const boundaryCache = new Map<string, Boundary.Shape | null>();
  const tokenCache = new Map<string, Token.Shape | null>();
  const themeCache = new Map<string, Theme.Shape | null>();
  const styleCache = new Map<string, Style.Shape | null>();

  return {
    name: '@czap/vite',
    enforce: 'pre' as const,

    configResolved(resolvedConfig) {
      projectRoot = resolvedConfig.root;
      isBuild = resolvedConfig.command === 'build';
      resolvedWasm = null;
      if (wasmEnabled) {
        resolvedWasm = resolveWASM(projectRoot, config?.wasm?.path);
      }
    },

    buildStart() {
      if (!wasmEnabled) {
        return;
      }

      resolvedWasm = resolveWASM(projectRoot, config?.wasm?.path);
      if (!resolvedWasm) {
        this.warn(
          'WASM support was enabled, but no czap-compute binary could be resolved. Runtime will fall back to TypeScript kernels.',
        );
        return;
      }

      if (isBuild) {
        emittedWasmRefId = this.emitFile({
          type: 'asset',
          name: 'czap-compute.wasm',
          source: readFileSync(resolvedWasm.filePath),
        });
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
      if (id === '\0virtual:czap/wasm-url') {
        if (!wasmEnabled) {
          return 'export const wasmUrl = null;';
        }

        if (!resolvedWasm) {
          return 'export const wasmUrl = null;';
        }

        if (isBuild && emittedWasmRefId) {
          return `export const wasmUrl = import.meta.ROLLUP_FILE_URL_${emittedWasmRefId};`;
        }

        // Distinct op (NOT repo-path normalization, CUT B5b): a `/@fs/` browser URL
        // segment for the Vite dev server — a URL, not a filesystem path. Left inline.
        const browserUrl =
          resolvedWasm.source === 'public' ? '/czap-compute.wasm' : `/@fs/${resolvedWasm.filePath.replace(/\\/g, '/')}`;

        return `export const wasmUrl = ${JSON.stringify(browserUrl)};`;
      }

      return loadVirtualModule(id);
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

      // Quick check -- skip files with no @czap at-rules
      const hasToken = code.includes('@token');
      const hasTheme = code.includes('@theme');
      const hasStyle = code.includes('@style');
      const hasQuantize = code.includes('@quantize');

      if (!hasToken && !hasTheme && !hasStyle && !hasQuantize) return null;

      let transformed = normalizeCssLineEndings(code);
      // Comment-blanked copy of the original source for parse-miss
      // diagnostics: marker positions stay stable across phases.
      const commentStripped = stripCssComments(transformed);

      // ---- Phase 1: @token -> CSS custom properties + @property ----
      if (hasToken) {
        const tokenBlocks = parseTokenBlocks(transformed, id);

        if (tokenBlocks.length === 0) {
          const line = markerLine(commentStripped, '@token');
          if (line !== null) {
            this.warn(parseMissWarning('@token', id, line));
          }
        }

        for (const block of tokenBlocks) {
          const cacheKey = `${block.tokenName}:${id}`;
          let token: Token.Shape | null | undefined = tokenCache.get(cacheKey);

          if (token === undefined) {
            const resolution = await resolvePrimitive('token', block.tokenName, id, projectRoot, config?.dirs?.token);
            token = resolution?.primitive ?? null;
            tokenCache.set(cacheKey, token);
          }

          if (token === null) {
            this.warn(
              unresolvedPrimitiveWarning('token', block.tokenName, id, block.line, projectRoot, config?.dirs?.token),
            );
            continue;
          }

          const compiled = compileTokenBlock(block, token);
          const blockSpan = findAtRuleBlock(transformed, '@token', block.tokenName);

          if (blockSpan) {
            transformed = transformed.substring(0, blockSpan.start) + compiled + transformed.substring(blockSpan.end);
          }
        }
      }

      // ---- Phase 2: @theme -> html[data-theme] selectors + transitions ----
      if (hasTheme) {
        const themeBlocks = parseThemeBlocks(transformed, id);

        for (const block of themeBlocks) {
          const cacheKey = `${block.themeName}:${id}`;
          let theme: Theme.Shape | null | undefined = themeCache.get(cacheKey);

          if (theme === undefined) {
            const resolution = await resolvePrimitive('theme', block.themeName, id, projectRoot, config?.dirs?.theme);
            theme = resolution?.primitive ?? null;
            themeCache.set(cacheKey, theme);
          }

          if (theme === null) {
            this.warn(
              unresolvedPrimitiveWarning('theme', block.themeName, id, block.line, projectRoot, config?.dirs?.theme),
            );
            continue;
          }

          const compiled = compileThemeBlock(block, theme);
          const blockSpan = findAtRuleBlock(transformed, '@theme', block.themeName);

          if (blockSpan) {
            transformed = transformed.substring(0, blockSpan.start) + compiled + transformed.substring(blockSpan.end);
          }
        }
      }

      // ---- Phase 3: @style -> scoped CSS with @layer/@scope/@starting-style ----
      if (hasStyle) {
        const styleBlocks = parseStyleBlocks(transformed, id);

        for (const block of styleBlocks) {
          const cacheKey = `${block.styleName}:${id}`;
          let style: Style.Shape | null | undefined = styleCache.get(cacheKey);

          if (style === undefined) {
            const resolution = await resolvePrimitive('style', block.styleName, id, projectRoot, config?.dirs?.style);
            style = resolution?.primitive ?? null;
            styleCache.set(cacheKey, style);
          }

          if (style === null) {
            this.warn(
              unresolvedPrimitiveWarning('style', block.styleName, id, block.line, projectRoot, config?.dirs?.style),
            );
            continue;
          }

          const compiled = compileStyleBlock(block, style);
          const blockSpan = findAtRuleBlock(transformed, '@style', block.styleName);

          if (blockSpan) {
            transformed = transformed.substring(0, blockSpan.start) + compiled + transformed.substring(blockSpan.end);
          }
        }
      }

      // ---- Phase 4: @quantize -> @container queries (existing) ----
      if (hasQuantize) {
        const quantizeBlocks = parseQuantizeBlocks(transformed, id);

        if (quantizeBlocks.length === 0) {
          const line = markerLine(commentStripped, '@quantize');
          if (line !== null) {
            this.warn(parseMissWarning('@quantize', id, line));
          }
        }

        for (const block of quantizeBlocks) {
          const stateBodies = Object.values(block.states);
          const allStatesEmpty =
            stateBodies.length > 0 &&
            stateBodies.every(
              (body) =>
                Object.keys(body.bareProps).length === 0 &&
                body.rules.every((rule) => Object.keys(rule.props).length === 0),
            );
          if (allStatesEmpty) {
            this.warn(emptyQuantizeWarning(block.boundaryName, id, block.line));
          }
        }

        for (const block of quantizeBlocks) {
          const cacheKey = `${block.boundaryName}:${id}`;
          let boundary: Boundary.Shape | null | undefined = boundaryCache.get(cacheKey);

          if (boundary === undefined) {
            const resolution = await resolvePrimitive(
              'boundary',
              block.boundaryName,
              id,
              projectRoot,
              config?.dirs?.boundary,
            );
            boundary = resolution?.primitive ?? null;
            boundaryCache.set(cacheKey, boundary);
          }

          if (boundary === null) {
            this.warn(
              unresolvedPrimitiveWarning(
                'boundary',
                block.boundaryName,
                id,
                block.line,
                projectRoot,
                config?.dirs?.boundary,
              ),
            );
            continue;
          }

          const compiled = compileQuantizeBlock(block, boundary);
          const blockSpan = findAtRuleBlock(transformed, '@quantize', block.boundaryName);

          if (blockSpan) {
            transformed = transformed.substring(0, blockSpan.start) + compiled + transformed.substring(blockSpan.end);
          }
        }
      }

      if (transformed === code) return null;

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
        boundaryCache.clear();
        tokenCache.clear();
        themeCache.clear();
        styleCache.clear();

        const moduleGraph = this.environment.moduleGraph;
        const transformModules = Array.from(moduleGraph.idToModuleMap.values()).filter((mod) => {
          const moduleId = mod.id;
          return (
            typeof moduleId === 'string' &&
            (moduleId.endsWith('.css') || moduleId.endsWith('.astro') || moduleId.endsWith('.html'))
          );
        });

        if (transformModules.length > 0) {
          return transformModules;
        }
      }

      if (file.endsWith('.css') || file.endsWith('.astro') || file.endsWith('.html')) {
        const moduleGraph = this.environment.moduleGraph;
        const mod = moduleGraph.getModuleById(file);
        if (mod) {
          return [mod];
        }
      }

      return;
    },

    config() {
      if (!config?.environments || config.environments.length === 0) return {};

      const envNames = config.environments as readonly CzapEnvironmentName[];
      const envs = buildEnvironments(envNames);

      return {
        environments: envs,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the full span of an at-rule block in CSS source.
 * Returns the start/end character offsets, or null if not found.
 *
 * Works for any at-rule pattern: `@token`, `@theme`, `@style`,
 * `@quantize`. Uses a state machine to correctly skip block comments,
 * quoted strings, and `url(...)` tokens (which may contain braces in
 * data URIs) before counting brace depth.
 */
function findAtRuleBlock(css: string, marker: string, name: string): { start: number; end: number } | null {
  let searchFrom = 0;

  while (searchFrom < css.length) {
    const idx = css.indexOf(marker, searchFrom);
    if (idx === -1) return null;

    // Verify this at-rule is followed by the target name
    const afterMarker = css.substring(idx + marker.length).trimStart();
    if (!afterMarker.startsWith(name)) {
      searchFrom = idx + marker.length;
      continue;
    }

    // Ensure the name isn't just a prefix of a longer identifier
    const charAfterName = afterMarker[name.length];
    if (charAfterName !== undefined && /[a-zA-Z0-9_-]/.test(charAfterName)) {
      searchFrom = idx + marker.length;
      continue;
    }

    // Find the opening brace
    const braceStart = css.indexOf('{', idx);
    /* v8 ignore next — unreachable under real call sites: `findAtRuleBlock` runs only
       after `parseTokenBlocks`/etc. matched a `@marker name { ... }` block with braces,
       so the `{` is always still present in the transformed source. Defensive against
       future multi-phase edits that strip braces between parse and lookup. */
    if (braceStart === -1) return null;

    // Walk forward tracking depth with full comment/string/url awareness
    let depth = 1;
    let pos = braceStart + 1;

    while (pos < css.length && depth > 0) {
      const ch = css[pos]!;

      // Skip block comments: /* ... */
      if (ch === '/' && css[pos + 1] === '*') {
        pos += 2;
        while (pos < css.length - 1 && !(css[pos] === '*' && css[pos + 1] === '/')) {
          pos++;
        }
        pos += 2;
        continue;
      }

      // Skip quoted strings: "..." and '...' (with backslash escapes)
      if (ch === '"' || ch === "'") {
        const quote = ch;
        pos++;
        while (pos < css.length && css[pos] !== quote) {
          if (css[pos] === '\\') pos++;
          pos++;
        }
        pos++;
        continue;
      }

      // Skip url(...) tokens: may contain unquoted data URIs with braces
      if (ch === 'u' && css.slice(pos, pos + 4).toLowerCase() === 'url(') {
        pos += 4;
        // url() may use a quoted or unquoted value
        if (css[pos] === '"' || css[pos] === "'") {
          const quote = css[pos]!;
          pos++;
          while (pos < css.length && css[pos] !== quote) {
            if (css[pos] === '\\') pos++;
            pos++;
          }
          pos++; // closing quote
        } else {
          // unquoted -- scan until the matching ')'
          let parenDepth = 1;
          while (pos < css.length && parenDepth > 0) {
            if (css[pos] === '(') parenDepth++;
            else if (css[pos] === ')') parenDepth--;
            pos++;
          }
        }
        continue;
      }

      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      pos++;
    }

    if (depth === 0) {
      return { start: idx, end: pos };
    }
    return null;
  }
  /* v8 ignore next — unreachable under real call sites: the inner `while` only runs
     when `parseTokenBlocks` has already matched a `@marker name { ... }` block, so the
     first indexOf hit returns either a `{start,end}` span or null inside the loop.
     This terminal `return null` is a defense against pathological CSS where the
     marker+name hits but searchFrom exhausts without a `{` match. */
  return null;
}
