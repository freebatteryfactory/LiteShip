/**
 * Directive boot scanner -- activates czap client directives on plain
 * HTML elements and `.astro` component output.
 *
 * Astro's `addClientDirective` API only fires custom `client:*`
 * directives on framework-component islands; on plain elements the
 * attribute serializes verbatim into the HTML and nothing runs, and on
 * `.astro` components it vanishes entirely. czap's island primitive is
 * a plain annotated div (see `Satellite.astro`), so the integration
 * injects this scanner on every page to activate directive markers the
 * Astro runtime never sees.
 *
 * Two marker forms are scanned:
 *
 * - `data-czap-directive="satellite"` -- the canonical form, emitted by
 *   `satelliteAttrs()`; space-separated tokens allowed.
 * - literal `client:satellite`-style attributes -- best-effort
 *   back-compat for plain-element authoring. Astro strips `client:*`
 *   from real framework islands at render time, so the scanner cannot
 *   double-activate an island.
 *
 * @module
 */

import { Diagnostics } from '@czap/core';
import { DIRECTIVE_ATTRIBUTE_REGISTRY, DIRECTIVE_MARKER_ATTRIBUTE, implicitDirectiveSelectors } from './slots.js';
import { readRuntimeGlobal, writeRuntimeGlobal } from './globals.js';
import { boundNames, markBound, unmarkBound } from './directive-bound.js';
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
};

function directiveEnableFix(name: DirectiveName): string {
  const configKey = DIRECTIVE_CONFIG_KEYS[name];
  if (!configKey) {
    return 'Fix: ensure the directive is registered in czap({ ... }).';
  }
  const coepNote = name === 'worker' ? ' COOP/COEP response headers are emitted automatically.' : '';
  return `Fix: czap({ ${configKey}: { enabled: true } }).${coepNote}`;
}

const DIRECTIVE_NAMES: readonly DirectiveName[] = [
  'satellite',
  'stream',
  'llm',
  'worker',
  'gpu',
  'wasm',
  'graph',
  'svg',
];

// Static thunk map so the bundler code-splits each directive into the
// same chunk Astro's island path would load.
const LOADERS: Record<DirectiveName, () => Promise<{ readonly default: DirectiveEntry }>> = {
  satellite: () => import('../client-directives/satellite.js'),
  stream: () => import('../client-directives/stream.js'),
  llm: () => import('../client-directives/llm.js'),
  worker: () => import('../client-directives/worker.js'),
  gpu: () => import('../client-directives/gpu.js'),
  wasm: () => import('../client-directives/wasm.js'),
  graph: () => import('../client-directives/graph.js'),
  svg: () => import('../client-directives/svg.js'),
};

function isDirectiveName(value: string): value is DirectiveName {
  return (DIRECTIVE_NAMES as readonly string[]).includes(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function collectMarkedElements(name: DirectiveName, root: ParentNode): HTMLElement[] {
  // CSS.escape is unnecessary: both selectors are built from the fixed
  // DirectiveName union, never from page content.
  const canonical = `[data-czap-directive~="${name}"]`;
  const legacy = `[client\\:${name}]`;
  const selector = [canonical, legacy, ...implicitDirectiveSelectors(name)].join(',');
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

function hasImplicitDirectiveAttribute(element: HTMLElement): boolean {
  return Object.values(DIRECTIVE_ATTRIBUTE_REGISTRY)
    .flat()
    .some((entry) => entry.implicitBoot && element.hasAttribute(entry.attribute));
}

function warnExplicitOnlyDirectiveAttributes(root: ParentNode): void {
  const explicitAttributes = new Set(
    Object.values(DIRECTIVE_ATTRIBUTE_REGISTRY)
      .flat()
      .filter((entry) => !entry.implicitBoot)
      .map((entry) => entry.attribute),
  );

  for (const attribute of explicitAttributes) {
    for (const element of collectElements(root, `[${attribute}]`)) {
      if (hasDirectiveMarker(element) || hasImplicitDirectiveAttribute(element)) {
        continue;
      }
      Diagnostics.warnOnce({
        source: 'czap/astro.directive-boot',
        code: `directive-attribute-requires-marker:${attribute}`,
        message:
          `Found ${attribute} without a czap directive marker, so the runtime will not infer which directive to boot. ` +
          `Fix: spread satelliteAttrs({ boundary }) / <Satellite>, or add data-czap-directive="satellite" or "worker".`,
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
 * `data-czap-*` attributes and only calls `load()` for parity with
 * Astro's directive contract.
 */
export async function scanAndBootDirectives(
  enabled: readonly DirectiveName[],
  root: ParentNode = document,
): Promise<void> {
  warnExplicitOnlyDirectiveAttributes(root);

  const enabledSet = new Set(enabled.filter(isDirectiveName));

  const activations: Promise<void>[] = [];

  for (const name of DIRECTIVE_NAMES) {
    const elements = collectMarkedElements(name, root);
    if (elements.length === 0) {
      continue;
    }

    if (!enabledSet.has(name)) {
      Diagnostics.warnOnce({
        source: 'czap/astro.directive-boot',
        code: `directive-not-enabled:${name}`,
        message: `Found ${name} directive markers but the ${name} directive is not enabled in the czap integration config. ${directiveEnableFix(name)}`,
      });
      continue;
    }

    for (const element of elements) {
      if (boundNames(element).has(name)) {
        continue;
      }
      // Directive COLLISION: this element is already claimed by a DIFFERENT
      // directive. Each directive takes over the element (a satellite consumes
      // the very node a GPU shader needs), so two on one element silently fight
      // and one loses without a trace -- the exact trap where `client:gpu` +
      // `satelliteAttrs()` on one canvas booted the satellite and the shader
      // never started. Make it loud (the activation still proceeds as before;
      // the warning is the fix the author was missing).
      const alreadyBound = [...boundNames(element)];
      if (alreadyBound.length > 0) {
        // Sort the conflicting names ONCE and reuse the ordered list for both the
        // dedup `code` and the `message`, so the warning is deterministic and
        // dedupes correctly regardless of which directive bound first (CodeRabbit).
        const conflicting = [...alreadyBound, name].sort();
        Diagnostics.warnOnce({
          source: 'czap/astro.directive-boot',
          code: `directive-collision:${conflicting.join('+')}`,
          message:
            `Element carries conflicting czap directives (${conflicting.join(', ')}) -- ` +
            `each directive takes over the element, so they collide and one silently loses ` +
            `(e.g. a satellite consumes the node a GPU shader needs). ` +
            `Fix: put each directive on its own element.`,
        });
      }
      // Pre-mark so overlapping scans can't double-activate; a failed
      // activation unmarks below so a later re-scan (astro:after-swap)
      // can retry after a transient chunk-load error.
      markBound(element, name);
      activations.push(
        LOADERS[name]()
          .then((mod) => {
            mod.default(() => Promise.resolve(), {}, element);
          })
          .catch((error: unknown) => {
            unmarkBound(element, name);
            Diagnostics.warn({
              source: 'czap/astro.directive-boot',
              code: 'directive-activation-failed',
              message: `Failed to activate ${name} directive.`,
              detail: error instanceof Error ? error.message : String(error),
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
 * via the `czap:reinit` step of the same pipeline).
 */
export function bootstrapDirectives(enabled: readonly DirectiveName[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (readRuntimeGlobal('__CZAP_DIRECTIVE_BOOTSTRAPPED__', isBoolean)) {
    return;
  }
  writeRuntimeGlobal('__CZAP_DIRECTIVE_BOOTSTRAPPED__', true);

  const scan = (): void => {
    void scanAndBootDirectives(enabled);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }
}
