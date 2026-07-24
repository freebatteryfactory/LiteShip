/**
 * Directive boot scanner -- activates liteship client directives on plain
 * HTML elements and `.astro` component output.
 *
 * Astro's `addClientDirective` API only fires custom `client:*`
 * directives on framework-component islands; on plain elements the
 * attribute serializes verbatim into the HTML and nothing runs, and on
 * `.astro` components it vanishes entirely. liteship's island primitive is
 * a plain annotated div (see `Adaptive.astro`), so the integration
 * injects this scanner on every page to activate directive markers the
 * Astro runtime never sees.
 *
 * Two marker forms are scanned (both first-class per ADR-0028):
 *
 * - `data-liteship-directive="adaptive"` -- explicit marker, emitted by
 *   `adaptiveAttrs()`; space-separated tokens allowed.
 * - literal `client:adaptive`-style attributes -- compiled to runtime
 *   `data-liteship-*` roots and booted on plain elements. Astro strips
 *   `client:*` from real framework islands at render time, so the
 *   scanner cannot double-activate an island.
 *
 * @module
 */

import { Diagnostics } from '@liteship/core';
import {
  DIRECTIVE_ATTRIBUTE_REGISTRY,
  DIRECTIVE_MARKER_ATTRIBUTE,
  implicitDirectiveSelectors,
  isClaimedDirectiveDescendant,
} from './slots.js';
import { readRuntimeGlobal, writeRuntimeGlobal } from './globals.js';
import { boundNames, unmarkBound } from './directive-bound.js';
import type { DirectiveName, DirectiveEntry } from './directive-bound.js';

// The bound-marker primitives live in the dependency-free leaf `./directive-bound.js`
// so a runtime directive that only needs to mark its host does NOT drag this
// scanner's code-split `LOADERS` graph into its bundle. Re-exported here so existing
// importers of `./directive-boot.js` keep resolving them.
export type { DirectiveName } from './directive-bound.js';
export { bootDirectiveEntry, markDirectiveBound } from './directive-bound.js';

const DIRECTIVE_CONFIG_KEYS: Partial<Record<DirectiveName, string>> = {
  stream: 'stream',
  llm: 'llm',
  worker: 'workers',
  gpu: 'gpu',
  wasm: 'wasm',
  graph: 'graph',
  motion: 'motion',
};

function directiveEnableFix(name: DirectiveName): string {
  const configKey = DIRECTIVE_CONFIG_KEYS[name];
  if (!configKey) {
    return 'Fix: ensure the directive is registered in liteship({ ... }).';
  }
  const coepNote = name === 'worker' ? ' COOP/COEP response headers are emitted automatically.' : '';
  return `Fix: liteship({ ${configKey}: { enabled: true } }).${coepNote}`;
}

const DIRECTIVE_NAMES: readonly DirectiveName[] = [
  'adaptive',
  'stream',
  'llm',
  'worker',
  'gpu',
  'wasm',
  'graph',
  'motion',
  'svg',
];

/**
 * The dynamic-import map the scanner boots each directive through — each thunk
 * resolves to a client-directive module's `{ default }` entry. Unexported: a
 * `Partial` of it is the injectable seam on {@link scanAndBootDirectives}, so a
 * test scripts a specific directive (a throwing entry, a no-op) without
 * interaction-mocking the `../client-directives/*.js` modules.
 */
type DirectiveLoaders = Record<DirectiveName, () => Promise<{ readonly default: DirectiveEntry }>>;

// Static thunk map so the bundler code-splits each directive into the
// same chunk Astro's island path would load.
const LOADERS: DirectiveLoaders = {
  adaptive: () => import('../client-directives/adaptive.js'),
  stream: () => import('../client-directives/stream.js'),
  llm: () => import('../client-directives/llm.js'),
  worker: () => import('../client-directives/worker.js'),
  gpu: () => import('../client-directives/gpu.js'),
  wasm: () => import('../client-directives/wasm.js'),
  graph: () => import('../client-directives/graph.js'),
  motion: () => import('../client-directives/motion.js'),
  svg: () => import('../client-directives/svg.js'),
};

function isDirectiveName(value: string): value is DirectiveName {
  return (DIRECTIVE_NAMES as readonly string[]).includes(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// CSS.escape is unnecessary: every selector is built from the fixed DirectiveName
// union, never from page content.
function directiveSelector(name: DirectiveName): string {
  const canonical = `[data-liteship-directive~="${name}"]`;
  const legacy = `[client\\:${name}]`;
  return [canonical, legacy, ...implicitDirectiveSelectors(name)].join(',');
}

function collectMarkedElements(name: DirectiveName, root: ParentNode): HTMLElement[] {
  const selector = directiveSelector(name);
  const matches = Array.from(root.querySelectorAll<HTMLElement>(selector));
  // querySelectorAll only sees descendants; a marked element passed AS the
  // scan root (e.g. a freshly swapped-in fragment) must activate too.
  if (root instanceof HTMLElement && root.matches(selector)) {
    matches.unshift(root);
  }
  return matches;
}

function collectElements(root: ParentNode, selector: string): HTMLElement[] {
  const matches = Array.from(root.querySelectorAll<HTMLElement>(selector));
  if (root instanceof HTMLElement && root.matches(selector)) {
    matches.unshift(root);
  }
  return matches;
}

function hasDirectiveMarker(element: HTMLElement): boolean {
  if (element.hasAttribute(DIRECTIVE_MARKER_ATTRIBUTE)) {
    return true;
  }
  return DIRECTIVE_NAMES.some((name) => element.hasAttribute(`client:${name}`));
}

function warnExplicitOnlyDirectiveAttributes(root: ParentNode): void {
  const explicitAttributes = new Set(
    Object.values(DIRECTIVE_ATTRIBUTE_REGISTRY)
      .flat()
      .filter((entry) => entry.scope === 'root' && !entry.implicitBoot)
      .map((entry) => entry.attribute),
  );

  for (const attribute of explicitAttributes) {
    for (const element of collectElements(root, `[${attribute}]`)) {
      // Suppress when an explicit marker owns this element or when the registry proves
      // it is a complete descendant-owned payload (SVG). An unrelated implicit peer
      // attribute (e.g. `data-liteship-shader-src`) does not consume the boundary.
      if (hasDirectiveMarker(element)) {
        continue;
      }
      if (isClaimedDirectiveDescendant(element, attribute)) {
        continue;
      }
      Diagnostics.warnOnceRegistered({
        source: 'liteship/astro.directive-boot',
        code: 'astro/directive-boot/directive-attribute-requires-marker',
        message:
          `Found ${attribute} without a liteship directive marker, so the runtime will not infer which directive to boot. ` +
          `Fix: spread adaptiveAttrs({ boundary }) / <Adaptive>, add data-liteship-directive="adaptive" or "worker", ` +
          `or, for SVG state, place the boundary on a data-liteship-entity + data-liteship-svg child inside a marked SVG root.`,
        detail: { attribute },
      });
    }
  }
}

/**
 * Scan `root` for canonical and legacy markers of the `enabled`
 * directives and activate each marked element once. Elements carrying a
 * marker for a directive that is NOT enabled get a one-time diagnostic
 * instead of silence -- that authoring mistake was previously invisible.
 *
 * The no-op `load` thunk passed to each directive entry is correct:
 * every runtime init does its real work synchronously off the element's
 * `data-liteship-*` attributes and only calls `load()` for parity with
 * Astro's directive contract.
 *
 * `loaders` overrides specific directive entries (merged over the real
 * code-split {@link LOADERS}); it defaults to `{}`, so production boots the
 * real client-directive modules unchanged. Tests pass scripted entries to
 * exercise the scanner's collision / transient-failure handling without
 * interaction-mocking the client-directive modules.
 */
export async function scanAndBootDirectives(
  enabled: readonly DirectiveName[],
  root: ParentNode = document,
  loaders: Partial<DirectiveLoaders> = {},
): Promise<void> {
  const activeLoaders: DirectiveLoaders = { ...LOADERS, ...loaders };
  warnExplicitOnlyDirectiveAttributes(root);

  const enabledSet = new Set(enabled.filter(isDirectiveName));

  const activations: Promise<void>[] = [];

  for (const name of DIRECTIVE_NAMES) {
    const elements = collectMarkedElements(name, root);
    if (elements.length === 0) {
      continue;
    }

    if (!enabledSet.has(name)) {
      Diagnostics.warnOnceRegistered({
        source: 'liteship/astro.directive-boot',
        code: 'astro/directive-boot/directive-not-enabled',
        message: `Found ${name} directive markers but the ${name} directive is not enabled in the liteship integration config. ${directiveEnableFix(name)}`,
        detail: { name },
      });
      continue;
    }

    for (const element of elements) {
      if (boundNames(element).has(name)) {
        continue;
      }
      // Directive COLLISION (marker-based, so it fires even for a directive whose
      // own tier/capability gate no-ops before it ever boots): if this element ALSO
      // carries a marker for another ENABLED directive, warn -- each directive takes
      // over the host, so two on one element silently fight and one loses.
      const colliding = [...enabledSet].filter((other) => other !== name && element.matches(directiveSelector(other)));
      if (colliding.length > 0) {
        // Sort the conflicting names ONCE so the diagnostic detail and message are deterministic.
        const conflicting = [...colliding, name].sort();
        Diagnostics.warnOnceRegistered({
          source: 'liteship/astro.directive-boot',
          code: 'astro/directive-boot/directive-collision',
          message:
            `Element carries conflicting liteship directives (${conflicting.join(', ')}) -- ` +
            `each directive takes over the element, so they collide and one silently loses ` +
            `(e.g. an adaptive consumes the node a GPU shader needs). ` +
            `Fix: put each directive on its own element.`,
          detail: { conflicting },
        });
      }
      // Boot through the shared directive entry, which owns the idempotence guard
      // (so Astro's island hydration of the same element cannot double-boot it). A
      // failed activation unmarks below so a later re-scan (astro:after-swap) can
      // retry after a transient chunk-load error.
      activations.push(
        activeLoaders[name]()
          .then((mod) => {
            mod.default(() => Promise.resolve(), {}, element);
          })
          .catch((error: unknown) => {
            unmarkBound(element, name);
            Diagnostics.warnRegistered({
              source: 'liteship/astro.directive-boot',
              code: 'astro/directive-boot/directive-activation-failed',
              message: `Failed to activate ${name} directive.`,
              detail: { name, cause: error instanceof Error ? error.message : String(error) },
            });
          }),
      );
    }
  }

  await Promise.all(activations);
}

/**
 * One-shot INITIAL page bootstrap: scan for directive markers on
 * `DOMContentLoaded` (or immediately if the document is already ready).
 * Idempotent across repeated module loads via a window global, matching
 * `bootstrapSlots()`.
 *
 * The post-swap re-scan is NOT registered here: it is the second step of the
 * single ordered swap pipeline (`./swap-pipeline.ts`, F-1). On a swap, fresh
 * server HTML never carries the bound attribute, so new elements activate while
 * `transition:persist` elements are skipped (their directives re-read attributes
 * via the `liteship:reinit` step of the same pipeline).
 */
export function bootstrapDirectives(enabled: readonly DirectiveName[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (readRuntimeGlobal('__LITESHIP_DIRECTIVE_BOOTSTRAPPED__', isBoolean)) {
    return;
  }
  writeRuntimeGlobal('__LITESHIP_DIRECTIVE_BOOTSTRAPPED__', true);

  const scan = (): void => {
    void scanAndBootDirectives(enabled);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }
}
